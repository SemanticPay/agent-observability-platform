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

  // Format satoshis with commas
  const formattedAmount = amountSats.toLocaleString();
  
  // Estimate USD (rough estimate at ~$100k/BTC)
  const estimatedUsd = ((amountSats / 100_000_000) * 100_000).toFixed(2);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Lightning Payment</h2>
        <p className="text-sm text-gray-500 mt-1">Scan QR code with your Lightning wallet</p>
      </div>

      {/* QR Code */}
      <div className="bg-white p-4 rounded-lg border-2 border-gray-100 mb-4 flex justify-center">
        <QRCodeSVG 
          value={invoice} 
          size={200}
          level="M"
          includeMargin={true}
        />
      </div>

      {/* Amount Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
        <div className="text-2xl font-bold text-gray-900">
          ⚡ {formattedAmount} sats
        </div>
        <div className="text-sm text-gray-500 mt-1">
          ≈ ${estimatedUsd} USD
        </div>
      </div>

      {/* Invoice String (truncated with copy button) */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-xs text-gray-600 truncate">
            {invoice}
          </div>
          <button
            onClick={copyToClipboard}
            className="flex-shrink-0 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-amber-800">
              <p>{error}</p>
              {confirmAttempts > 0 && (
                <p className="text-xs mt-1">Attempt {confirmAttempts} of 3</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 mb-4">
        <p className="font-medium mb-2">How to pay:</p>
        <ol className="list-decimal list-inside space-y-1 text-gray-500">
          <li>Open your Lightning wallet (Phoenix, Muun, etc.)</li>
          <li>Scan the QR code or paste the invoice</li>
          <li>Confirm the payment in your wallet</li>
          <li>Click "I've Paid" below to verify</li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isConfirming}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirmPayment}
          disabled={isConfirming}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isConfirming ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Checking...
            </>
          ) : (
            "I've Paid ✓"
          )}
        </button>
      </div>
    </div>
  );
}
