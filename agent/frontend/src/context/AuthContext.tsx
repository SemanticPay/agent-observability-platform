import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// API base URL
const API_BASE = 'http://localhost:8000';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  getAuthHeader: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Initialize from localStorage
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    return {
      accessToken,
      refreshToken,
      isAuthenticated: !!accessToken,
    };
  });

  const login = useCallback(async (email: string, password: string) => {
    // OAuth2 password flow uses form data
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    
    localStorage.setItem('accessToken', data.access_token);
    localStorage.setItem('refreshToken', data.refresh_token);
    
    setAuthState({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      isAuthenticated: true,
    });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    // Auto-login after registration
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAuthState({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (!authState.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: authState.refreshToken }),
    });

    if (!response.ok) {
      logout();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    localStorage.setItem('accessToken', data.access_token);
    localStorage.setItem('refreshToken', data.refresh_token);
    
    setAuthState({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      isAuthenticated: true,
    });
  }, [authState.refreshToken, logout]);

  const getAuthHeader = useCallback((): Record<string, string> => {
    if (!authState.accessToken) {
      return {};
    }
    return {
      'Authorization': `Bearer ${authState.accessToken}`,
    };
  }, [authState.accessToken]);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout,
        refreshAccessToken,
        getAuthHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
