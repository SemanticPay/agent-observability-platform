import React from 'react';

interface PaymentStatusProps {
  status: 'pending' | 'paid';
  ticketId: string;
  onClose: () => void;
}

export function PaymentStatus({ status, ticketId, onClose }: PaymentStatusProps) {
  if (status === 'paid') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-auto text-center">
        {/* Success Animation */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
          <p className="text-gray-500 mt-2">Your CNH renewal has been processed</p>
        </div>

        {/* Ticket Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-green-800">
            <p className="font-medium">Ticket ID</p>
            <p className="font-mono text-xs mt-1 break-all">{ticketId}</p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <p className="font-medium text-gray-900 mb-2">Next Steps:</p>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Payment confirmed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">→</span>
              <span>Schedule your medical exam</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">○</span>
              <span>Complete biometric capture at DETRAN</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">○</span>
              <span>Receive your new CNH</span>
            </li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  // Pending status
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-auto text-center">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4">
          <svg className="animate-spin h-10 w-10 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Pending</h2>
        <p className="text-gray-500 mt-2">Waiting for Lightning payment confirmation</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-800">
          Your payment hasn't been confirmed yet. This usually takes a few seconds.
          If you've already paid, please wait a moment and try again.
        </p>
      </div>

      <button
        onClick={onClose}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Close
      </button>
    </div>
  );
}
