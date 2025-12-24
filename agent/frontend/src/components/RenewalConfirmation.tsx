import React from 'react';

export interface RenewalConfirmationProps {
  formData: {
    cpf: string;
    cnh_number: string;
    cnh_mirror: string;
  };
  operationPrice: number;
  onConfirm: () => void;
  onEdit: () => void;
  isLoading?: boolean;
}

export function RenewalConfirmation({
  formData,
  operationPrice,
  onConfirm,
  onEdit,
  isLoading = false,
}: RenewalConfirmationProps) {
  const formatCPF = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    return cpf;
  };

  const formatSats = (sats: number) => new Intl.NumberFormat('en-US').format(sats);
  const estimateUSD = (sats: number) => (sats * 0.001).toFixed(2);

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
          <span style={{ fontSize: '28px' }}>✓</span>
        </div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '6px'
        }}>
          Confirm Details
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Review your information before payment
        </p>
      </div>

      {/* License Info */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px'
      }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          License Information
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>CPF</span>
            <span style={{ fontSize: '14px', color: '#111827', fontFamily: 'monospace' }}>{formatCPF(formData.cpf)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>CNH Number</span>
            <span style={{ fontSize: '14px', color: '#111827', fontFamily: 'monospace' }}>{formData.cnh_number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>CNH Mirror</span>
            <span style={{ fontSize: '14px', color: '#111827', fontFamily: 'monospace' }}>{formData.cnh_mirror}</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fef3c7',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '32px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Payment Amount
        </p>
        <p style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
          ⚡ {formatSats(operationPrice)} sats
        </p>
        <p style={{ fontSize: '13px', color: '#6b7280' }}>
          ≈ ${estimateUSD(operationPrice)} USD
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onEdit}
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
          Edit
        </button>
        <button
          onClick={onConfirm}
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
          {isLoading ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </div>
    </div>
  );
}
