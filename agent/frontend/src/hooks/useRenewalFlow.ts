import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// API base URL
const API_BASE = 'http://localhost:8000';

export type RenewalFlowStep = 'idle' | 'form' | 'payment' | 'confirming' | 'success' | 'error';

export interface RenewalFormData {
  cpf: string;
  cnh_number: string;
  cnh_mirror: string;
}

export interface TicketData {
  ticket_id: string;
  ln_invoice: string;
  amount_sats: number;
}

export interface RenewalFlowState {
  step: RenewalFlowStep;
  formData: RenewalFormData | null;
  ticket: TicketData | null;
  error: string | null;
  confirmAttempts: number;
}

export function useRenewalFlow() {
  const { getAuthHeader, isAuthenticated } = useAuth();
  
  const [state, setState] = useState<RenewalFlowState>({
    step: 'idle',
    formData: null,
    ticket: null,
    error: null,
    confirmAttempts: 0,
  });

  const startRenewal = useCallback(() => {
    if (!isAuthenticated) {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: 'Please log in to renew your license',
      }));
      return;
    }
    
    setState({
      step: 'form',
      formData: null,
      ticket: null,
      error: null,
      confirmAttempts: 0,
    });
  }, [isAuthenticated]);

  const submitForm = useCallback(async (formData: RenewalFormData) => {
    setState(prev => ({ ...prev, step: 'confirming', formData }));
    
    try {
      // Create ticket with form data
      const response = await fetch(`${API_BASE}/api/v1/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          operation_id: 1, // driver_license_renewal
          form_data: formData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail?.error || error.detail || 'Failed to create ticket');
      }

      const ticket: TicketData = await response.json();
      
      setState(prev => ({
        ...prev,
        step: 'payment',
        ticket,
        error: null,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: err instanceof Error ? err.message : 'Failed to create ticket',
      }));
    }
  }, [getAuthHeader]);

  const confirmPayment = useCallback(async () => {
    if (!state.ticket) {
      return;
    }

    setState(prev => ({ ...prev, step: 'confirming' }));

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/tickets/${state.ticket.ticket_id}/confirm-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail?.error || error.detail || 'Failed to confirm payment');
      }

      const result = await response.json();
      
      if (result.status === 'paid') {
        setState(prev => ({
          ...prev,
          step: 'success',
          error: null,
        }));
      } else {
        // Payment still pending
        setState(prev => ({
          ...prev,
          step: 'payment',
          confirmAttempts: prev.confirmAttempts + 1,
          error: 'Payment not detected yet. Please complete payment and try again.',
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        step: 'payment',
        error: err instanceof Error ? err.message : 'Failed to confirm payment',
      }));
    }
  }, [state.ticket, getAuthHeader]);

  const cancelRenewal = useCallback(() => {
    setState({
      step: 'idle',
      formData: null,
      ticket: null,
      error: null,
      confirmAttempts: 0,
    });
  }, []);

  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startRenewal,
    submitForm,
    confirmPayment,
    cancelRenewal,
    resetError,
  };
}
