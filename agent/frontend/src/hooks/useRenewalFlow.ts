import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// API base URL
const API_BASE = 'http://localhost:8000';

// Default operation price in satoshis (will be fetched from API)
const DEFAULT_OPERATION_PRICE = 50000;

export type RenewalFlowStep = 'idle' | 'form' | 'confirm' | 'payment' | 'confirming' | 'success' | 'error';

export interface RenewalFormData {
  cpf: string;
  cnh_number: string;
  cnh_mirror: string;
}

export interface TicketData {
  ticket_id: string;
  ln_invoice: string;
  amount_sats: number;
  expires_at?: string;
}

export interface RenewalFlowState {
  step: RenewalFlowStep;
  formData: RenewalFormData | null;
  ticket: TicketData | null;
  operationPrice: number;
  error: string | null;
  confirmAttempts: number;
}

export function useRenewalFlow() {
  const { getAuthHeader, isAuthenticated } = useAuth();
  
  const [state, setState] = useState<RenewalFlowState>({
    step: 'idle',
    formData: null,
    ticket: null,
    operationPrice: DEFAULT_OPERATION_PRICE,
    error: null,
    confirmAttempts: 0,
  });

  const startRenewal = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: 'Please log in to renew your license',
      }));
      return;
    }
    
    // Fetch operation price
    try {
      const response = await fetch(`${API_BASE}/api/v1/operations/1`);
      if (response.ok) {
        const operation = await response.json();
        setState({
          step: 'form',
          formData: null,
          ticket: null,
          operationPrice: operation.price || DEFAULT_OPERATION_PRICE,
          error: null,
          confirmAttempts: 0,
        });
      } else {
        setState({
          step: 'form',
          formData: null,
          ticket: null,
          operationPrice: DEFAULT_OPERATION_PRICE,
          error: null,
          confirmAttempts: 0,
        });
      }
    } catch {
      setState({
        step: 'form',
        formData: null,
        ticket: null,
        operationPrice: DEFAULT_OPERATION_PRICE,
        error: null,
        confirmAttempts: 0,
      });
    }
  }, [isAuthenticated]);

  // Move to confirmation step after form submission
  const submitFormForConfirmation = useCallback((formData: RenewalFormData) => {
    setState(prev => ({
      ...prev,
      step: 'confirm',
      formData,
      error: null,
    }));
  }, []);

  // Go back to form from confirmation
  const editForm = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: 'form',
      error: null,
    }));
  }, []);

  // Confirm and create ticket
  const confirmAndCreateTicket = useCallback(async () => {
    if (!state.formData) return;
    
    setState(prev => ({ ...prev, step: 'confirming' }));
    
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
          form_data: state.formData,
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
  }, [state.formData, getAuthHeader]);

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
      } else if (result.status === 'expired') {
        // Invoice has expired
        setState(prev => ({
          ...prev,
          step: 'error',
          error: 'Invoice has expired. Please start a new renewal.',
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
      operationPrice: DEFAULT_OPERATION_PRICE,
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
    submitFormForConfirmation,
    editForm,
    confirmAndCreateTicket,
    confirmPayment,
    cancelRenewal,
    resetError,
  };
}
