import React, { useState } from 'react';
import { RenewalFormData } from '../hooks/useRenewalFlow';

interface RenewalFormProps {
  onSubmit: (data: RenewalFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// CPF mask: 000.000.000-00
function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// Validate CPF (basic check - 11 digits)
function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  return digits.length === 11;
}

export function RenewalForm({ onSubmit, onCancel, isLoading = false }: RenewalFormProps) {
  const [cpf, setCpf] = useState('');
  const [cnhNumber, setCnhNumber] = useState('');
  const [cnhMirror, setCnhMirror] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!isValidCPF(cpf)) {
      newErrors.cpf = 'Please enter a valid CPF (11 digits)';
    }
    
    if (!cnhNumber.trim() || cnhNumber.length < 9) {
      newErrors.cnh_number = 'Please enter a valid CNH number';
    }
    
    if (!cnhMirror.trim()) {
      newErrors.cnh_mirror = 'Please enter the CNH mirror number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    onSubmit({
      cpf: cpf.replace(/\D/g, ''),
      cnh_number: cnhNumber.trim(),
      cnh_mirror: cnhMirror.trim(),
    });
  };

  const inputStyle = (hasError: boolean) => ({
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: `1px solid ${hasError ? '#fca5a5' : '#d1d5db'}`,
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    backgroundColor: hasError ? '#fef2f2' : 'white',
    transition: 'border-color 0.2s'
  });

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
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '6px'
        }}>
          CNH Renewal
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Enter your license information
        </p>
      </div>

      {/* Payment Info */}
      <div style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fef3c7',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <span style={{ fontSize: '14px', color: '#92400e' }}>
          ⚡ Fee: 1 sat — Pay with Lightning Network
        </span>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* CPF Field */}
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="cpf" 
            style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}
          >
            CPF (Brazilian Tax ID)
          </label>
          <input
            id="cpf"
            type="text"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            style={inputStyle(!!errors.cpf)}
            onFocus={(e) => { if (!errors.cpf) e.target.style.borderColor = '#2563eb'; }}
            onBlur={(e) => { if (!errors.cpf) e.target.style.borderColor = '#d1d5db'; }}
          />
          {errors.cpf && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '6px' }}>{errors.cpf}</p>
          )}
        </div>

        {/* CNH Number Field */}
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="cnhNumber" 
            style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}
          >
            CNH Number
          </label>
          <input
            id="cnhNumber"
            type="text"
            value={cnhNumber}
            onChange={(e) => setCnhNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="Enter your CNH number"
            style={inputStyle(!!errors.cnh_number)}
            onFocus={(e) => { if (!errors.cnh_number) e.target.style.borderColor = '#2563eb'; }}
            onBlur={(e) => { if (!errors.cnh_number) e.target.style.borderColor = '#d1d5db'; }}
          />
          {errors.cnh_number && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '6px' }}>{errors.cnh_number}</p>
          )}
        </div>

        {/* CNH Mirror Field */}
        <div style={{ marginBottom: '24px' }}>
          <label 
            htmlFor="cnhMirror" 
            style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}
          >
            CNH Mirror Number
          </label>
          <input
            id="cnhMirror"
            type="text"
            value={cnhMirror}
            onChange={(e) => setCnhMirror(e.target.value)}
            placeholder="Found on your CNH card"
            style={inputStyle(!!errors.cnh_mirror)}
            onFocus={(e) => { if (!errors.cnh_mirror) e.target.style.borderColor = '#2563eb'; }}
            onBlur={(e) => { if (!errors.cnh_mirror) e.target.style.borderColor = '#d1d5db'; }}
          />
          {errors.cnh_mirror && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '6px' }}>{errors.cnh_mirror}</p>
          )}
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
            The mirror number is printed on the front of your CNH card
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              flex: 1,
              backgroundColor: '#f3f4f6',
              color: '#374151',
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              flex: 1,
              backgroundColor: '#2563eb',
              color: 'white',
              fontWeight: '500',
              fontSize: '15px',
              padding: '14px 24px',
              borderRadius: '10px',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? 'Processing...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
