import React, { useState } from 'react';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
  onCancel?: () => void;
}

export function LoginForm({ onLogin, onRegister, onCancel }: LoginFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }
        await onRegister(email, password);
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
      padding: '40px',
      width: '100%',
      maxWidth: '420px',
      margin: '0 auto',
      border: '1px solid #e5e7eb'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          backgroundColor: '#f0f9ff',
          borderRadius: '14px',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '28px' }}>{isRegister ? '✨' : '👋'}</span>
        </div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '6px'
        }}>
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          {isRegister ? 'Sign up to get started' : 'Sign in to continue'}
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Email Field */}
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="email" 
            style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '15px',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="password" 
            style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '15px',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>

        {/* Confirm Password (Register only) */}
        {isRegister && (
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="confirmPassword" 
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px'
          }}>
            <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            backgroundColor: '#2563eb',
            color: 'white',
            fontWeight: '500',
            fontSize: '15px',
            padding: '14px 24px',
            borderRadius: '10px',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s'
          }}
        >
          {isLoading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      {/* Toggle Register/Login */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError(null);
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '14px',
            color: '#2563eb',
            cursor: 'pointer'
          }}
        >
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
        </button>
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '14px',
              color: '#6b7280',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
