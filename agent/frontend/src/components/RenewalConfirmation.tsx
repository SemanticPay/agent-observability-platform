import React from 'react';

export interface RenewalConfirmationProps {
  formData: {
    cpf: string;
    cnh_number: string;
    cnh_mirror: string;
  };
  operationPrice: number; // in satoshis
  onConfirm: () => void;
  onEdit: () => void;
  isLoading?: boolean;
}

/**
 * Confirmation step before creating the ticket.
 * Shows the user their entered data and allows them to edit or proceed.
 */
export function RenewalConfirmation({
  formData,
  operationPrice,
  onConfirm,
  onEdit,
  isLoading = false,
}: RenewalConfirmationProps) {
  // Format CPF for display (XXX.XXX.XXX-XX)
  const formatCPF = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    return cpf;
  };

  // Format satoshis for display
  const formatSats = (sats: number) => {
    return new Intl.NumberFormat('en-US').format(sats);
  };

  // Approximate USD value (rough estimate)
  const estimateUSD = (sats: number) => {
    // Assuming ~$100,000 per BTC = $0.001 per sat
    const usd = sats * 0.001;
    return usd.toFixed(2);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Confirm Your Details</h2>
        <p className="text-gray-500 text-sm mt-1">Please review your information before proceeding</p>
      </div>

      {/* License Information */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
          License Information
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">CPF:</span>
            <span className="font-mono text-gray-900">{formatCPF(formData.cpf)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">CNH Number:</span>
            <span className="font-mono text-gray-900">{formData.cnh_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">CNH Mirror:</span>
            <span className="font-mono text-gray-900">{formData.cnh_mirror}</span>
          </div>
        </div>
      </div>

      {/* Renewal Details */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Renewal Details
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-600">Service:</span>
            <span className="text-blue-900 font-medium">CNH Renewal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-600">Category:</span>
            <span className="text-blue-900 font-medium">Standard Renewal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-600">Toxicology Test:</span>
            <span className="text-blue-900 font-medium">Not Required</span>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-amber-50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Lightning Payment
        </h3>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-900">
            ⚡ {formatSats(operationPrice)} sats
          </div>
          <div className="text-amber-600 text-sm">
            ≈ ${estimateUSD(operationPrice)} USD
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onEdit}
          disabled={isLoading}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Edit Details
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#2563eb', color: 'white' }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              Proceed to Payment
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        By proceeding, you agree to pay via Lightning Network
      </p>
    </div>
  );
}
