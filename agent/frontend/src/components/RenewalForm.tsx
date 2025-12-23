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
      cpf: cpf.replace(/\D/g, ''), // Send only digits
      cnh_number: cnhNumber.trim(),
      cnh_mirror: cnhMirror.trim(),
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-green-100 p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">CNH Renewal</h2>
          <p className="text-sm text-gray-500">Driver's License Renewal</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
        <div className="flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-amber-800">
            <p className="font-medium">Fee: 1 satoshi (~$50 USD)</p>
            <p className="text-xs mt-1">Payment via Lightning Network</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
            CPF (Brazilian Tax ID)
          </label>
          <input
            id="cpf"
            type="text"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.cpf ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.cpf && (
            <p className="mt-1 text-sm text-red-600">{errors.cpf}</p>
          )}
        </div>

        <div>
          <label htmlFor="cnhNumber" className="block text-sm font-medium text-gray-700 mb-1">
            CNH Number
          </label>
          <input
            id="cnhNumber"
            type="text"
            value={cnhNumber}
            onChange={(e) => setCnhNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="Enter your CNH number"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.cnh_number ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.cnh_number && (
            <p className="mt-1 text-sm text-red-600">{errors.cnh_number}</p>
          )}
        </div>

        <div>
          <label htmlFor="cnhMirror" className="block text-sm font-medium text-gray-700 mb-1">
            CNH Mirror Number
          </label>
          <input
            id="cnhMirror"
            type="text"
            value={cnhMirror}
            onChange={(e) => setCnhMirror(e.target.value)}
            placeholder="Found on your CNH card"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.cnh_mirror ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.cnh_mirror && (
            <p className="mt-1 text-sm text-red-600">{errors.cnh_mirror}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            The mirror number is printed on the front of your CNH card
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: '#2563eb', color: 'white' }}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Continue to Payment'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
