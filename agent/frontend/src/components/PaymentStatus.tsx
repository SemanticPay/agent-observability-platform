import React from 'react';

interface PaymentStatusProps {
  status: 'pending' | 'paid';
  ticketId: string;
  onClose: () => void;
}

export function PaymentStatus({ status, ticketId, onClose }: PaymentStatusProps) {
  if (status === 'paid') {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        {/* Success Icon */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '72px',
          height: '72px',
          backgroundColor: '#f0fdf4',
          borderRadius: '50%',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '36px' }}>✓</span>
        </div>

        <h2 style={{
          fontSize: '22px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '8px'
        }}>
          Payment Successful!
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '28px' }}>
          Your CNH renewal has been processed
        </p>

        {/* Ticket Info */}
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <p style={{ fontSize: '13px', color: '#16a34a', marginBottom: '6px', fontWeight: '500' }}>Ticket ID</p>
          <p style={{ fontSize: '12px', fontFamily: 'monospace', color: '#111827', wordBreak: 'break-all', margin: 0 }}>{ticketId}</p>
        </div>

        {/* Next Steps */}
        <div style={{
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '28px',
          textAlign: 'left'
        }}>
          <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '14px' }}>Next Steps:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#16a34a', fontSize: '14px' }}>✓</span>
              <span style={{ fontSize: '14px', color: '#374151' }}>Payment confirmed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#2563eb', fontSize: '14px' }}>→</span>
              <span style={{ fontSize: '14px', color: '#374151' }}>Schedule medical exam</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>○</span>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Complete biometric capture</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>○</span>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Receive new CNH</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            backgroundColor: '#2563eb',
            color: 'white',
            fontWeight: '500',
            fontSize: '15px',
            padding: '14px 24px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Done
        </button>
      </div>
    );
  }

  // Pending status
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
      padding: '40px',
      width: '100%',
      maxWidth: '420px',
      margin: '0 auto',
      border: '1px solid #e5e7eb',
      textAlign: 'center'
    }}>
      {/* Pending Icon */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '72px',
        height: '72px',
        backgroundColor: '#fffbeb',
        borderRadius: '50%',
        marginBottom: '20px'
      }}>
        <span style={{ fontSize: '36px' }}>⏳</span>
      </div>

      <h2 style={{
        fontSize: '22px',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '8px'
      }}>
        Payment Pending
      </h2>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '28px' }}>
        Waiting for Lightning payment confirmation
      </p>

      <div style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fef3c7',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '28px'
      }}>
        <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
          Your payment hasn't been confirmed yet. This usually takes a few seconds. If you've already paid, please wait a moment and try again.
        </p>
      </div>

      <button
        onClick={onClose}
        style={{
          width: '100%',
          backgroundColor: '#f3f4f6',
          color: '#374151',
          fontWeight: '500',
          fontSize: '15px',
          padding: '14px 24px',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Close
      </button>
    </div>
  );
}
