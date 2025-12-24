import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface PaymentQRProps {
  invoice: string;
  amountSats: number;
  onConfirmPayment: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
  error?: string | null;
  confirmAttempts?: number;
}

export function PaymentQR({
  invoice,
  amountSats,
  onConfirmPayment,
  onCancel,
  isConfirming = false,
  error = null,
  confirmAttempts = 0,
}: PaymentQRProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formattedAmount = amountSats.toLocaleString();
  const estimatedUsd = ((amountSats / 100_000_000) * 100_000).toFixed(2);

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
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          backgroundColor: '#fffbeb',
          borderRadius: '14px',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '28px' }}>⚡</span>
        </div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '6px'
        }}>
          Lightning Payment
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Scan with your Lightning wallet
        </p>
      </div>

      {/* QR Code */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <QRCodeSVG 
          value={invoice} 
          size={180}
          level="M"
          includeMargin={true}
        />
      </div>

      {/* Amount */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: '10px',
        padding: '16px',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
          ⚡ {formattedAmount} sats
        </p>
        <p style={{ fontSize: '13px', color: '#6b7280' }}>
          ≈ ${estimatedUsd} USD
        </p>
      </div>

      {/* Invoice with copy */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <p style={{
          flex: 1,
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#6b7280',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          margin: 0
        }}>
          {invoice}
        </p>
        <button
          onClick={copyToClipboard}
          style={{
            backgroundColor: '#e5e7eb',
            color: '#374151',
            fontSize: '13px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px'
        }}>
          <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>{error}</p>
          {confirmAttempts > 0 && (
            <p style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>Attempt {confirmAttempts} of 3</p>
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>How to pay:</p>
        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#6b7280', lineHeight: '1.8' }}>
          <li>Open your Lightning wallet</li>
          <li>Scan QR code or paste invoice</li>
          <li>Confirm payment</li>
          <li>Click "I've Paid" below</li>
        </ol>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onCancel}
          disabled={isConfirming}
          style={{
            flex: 1,
            backgroundColor: '#f3f4f6',
            color: '#374151',
            fontWeight: '500',
            fontSize: '15px',
            padding: '14px 24px',
            borderRadius: '10px',
            border: 'none',
            cursor: isConfirming ? 'not-allowed' : 'pointer',
            opacity: isConfirming ? 0.7 : 1
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirmPayment}
          disabled={isConfirming}
          style={{
            flex: 1,
            backgroundColor: '#16a34a',
            color: 'white',
            fontWeight: '500',
            fontSize: '15px',
            padding: '14px 24px',
            borderRadius: '10px',
            border: 'none',
            cursor: isConfirming ? 'not-allowed' : 'pointer',
            opacity: isConfirming ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {isConfirming ? 'Checking...' : "I've Paid ✓"}
        </button>
      </div>
    </div>
  );
}
