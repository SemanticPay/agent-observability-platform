"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useCopilotAction, useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import LocationPicker, { SelectedLocation } from "./LocationPicker";
import ClinicsMap, { Clinic } from "./ClinicsMap";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useRenewalFlow, RenewalFormData } from "../hooks/useRenewalFlow";
import { LoginForm } from "./LoginForm";
import { RenewalForm } from "./RenewalForm";
import { RenewalConfirmation } from "./RenewalConfirmation";
import { PaymentQR } from "./PaymentQR";
import { PaymentStatus } from "./PaymentStatus";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  clinics?: Clinic[]; // Optional clinics data to show on map
  userLocation?: { lat: number; lng: number }; // User's search location
}

function CopilotKitPageInner() {
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pendingLocationCallback, setPendingLocationCallback] = useState<((location: SelectedLocation) => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use CopilotKit's chat hook for proper agent communication
  const {
    visibleMessages,
    appendMessage,
    isLoading,
  } = useCopilotChat();

  // Convert CopilotKit messages to our Message format for display
  const messages: Message[] = [
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Hi! I'm your AI assistant.\n\nI can help you with:\n- **Driver's License**: Information about renewing, requirements, and documentation\n- **Appointments**: Schedule medical exams and clinic visits\n- **Document Processing**: Upload and verify your documents\n\nWhat can I help you with today?",
      timestamp: new Date(),
    },
    ...visibleMessages
      .filter((msg): msg is TextMessage => msg.type === "TextMessage" || (msg as any).content !== undefined)
      .map((msg) => ({
        id: msg.id,
        role: (msg.role === Role.User ? "user" : "assistant") as "user" | "assistant",
        content: (msg as TextMessage).content || "",
        timestamp: new Date(),
      })),
  ];

  const [input, setInput] = useState("");

  // CopilotKit action for selecting location from map
  useCopilotAction({
    name: "selectLocationFromMap",
    description: "Opens a map for the user to select a location. Use this when the user needs to provide an address or location for scheduling an appointment.",
    parameters: [
      {
        name: "prompt",
        type: "string",
        description: "A message to show the user explaining what location they should select",
        required: false,
      },
    ],
    handler: async () => {
      return new Promise<string>((resolve) => {
        // Set up the callback for when location is selected
        setPendingLocationCallback(() => (location: SelectedLocation) => {
          setShowLocationPicker(false);
          setPendingLocationCallback(null);
          resolve(`Selected location: ${location.address} (Coordinates: ${location.latitude}, ${location.longitude})`);
        });
        
        setShowLocationPicker(true);
      });
    },
    render: ({ status, result }) => {
      if (status === "executing") {
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
            <div className="flex items-center gap-2 text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Waiting for location selection...</span>
            </div>
          </div>
        );
      }
      if (status === "complete" && result) {
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 my-2">
            <div className="flex items-center gap-2 text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Location selected!</span>
            </div>
          </div>
        );
      }
      return <></>;
    },
  });

  // Renewal flow state
  const { isAuthenticated, login, register, logout } = useAuth();
  const renewalFlow = useRenewalFlow();

  // Handler to start renewal (can be called from button or agent)
  const handleStartRenewal = useCallback(() => {
    if (!isAuthenticated) {
      // Show login form first
      renewalFlow.startRenewal();
    } else {
      renewalFlow.startRenewal();
    }
  }, [isAuthenticated, renewalFlow]);

  // CopilotKit action for starting CNH renewal with Lightning payment
  useCopilotAction({
    name: "start_driver_license_renewal",
    description: "Starts the driver's license (CNH) renewal process with Lightning Network payment. Use this when the user wants to renew their driver's license and pay using Bitcoin Lightning.",
    parameters: [
      {
        name: "renewal_type",
        type: "string",
        description: "Type of renewal: 'standard' for regular renewal, 'change_category' for category change",
        required: false,
      },
    ],
    handler: async () => {
      // Start the renewal flow
      handleStartRenewal();
      
      if (!isAuthenticated) {
        return "Please log in or create an account to start the renewal process. The login form is now displayed in the main panel.";
      }
      
      return "Starting CNH renewal process. Please fill out the renewal form in the main panel.";
    },
    render: ({ status }) => {
      // Don't render anything in chat - forms are shown in main panel
      if (status === "executing") {
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
            <div className="flex items-center gap-2 text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Opening renewal form...</span>
            </div>
          </div>
        );
      }
      return <></>;
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message using CopilotKit's appendMessage
  const sendMessage = async (messageContent?: string) => {
    const content = messageContent || input.trim();
    if (!content || isLoading) return;

    setInput("");
    
    // Check if user is asking about license renewal - auto-trigger the form
    const lowerContent = content.toLowerCase();
    const renewalKeywords = ['renew', 'renewal', 'renovar', 'renovação', 'cnh', 'license', 'licença', 'carteira'];
    const isRenewalRequest = renewalKeywords.some(keyword => lowerContent.includes(keyword));
    
    if (isRenewalRequest && renewalFlow.step === 'idle') {
      // Auto-trigger the renewal form
      handleStartRenewal();
    }
    
    // Use CopilotKit's appendMessage to send message through the agent
    appendMessage(new TextMessage({
      id: crypto.randomUUID(),
      role: Role.User,
      content: content,
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLocationSelect = useCallback((location: SelectedLocation) => {
    if (pendingLocationCallback) {
      pendingLocationCallback(location);
    } else {
      // If no callback, send as a regular message
      setShowLocationPicker(false);
      const locationMessage = `I want to schedule at this location: ${location.address}`;
      sendMessage(locationMessage);
    }
  }, [pendingLocationCallback]);

  const handleLocationCancel = useCallback(() => {
    setShowLocationPicker(false);
    setPendingLocationCallback(null);
  }, []);

  const openLocationPicker = useCallback(() => {
    setShowLocationPicker(true);
  }, []);

  return (
    <div className="h-screen w-screen flex bg-gradient-to-br from-blue-50 to-white">
      {/* Main Content */}
      <div 
        className="flex-1 flex justify-center items-center p-8 transition-colors duration-500 overflow-auto"
        style={{ background: `linear-gradient(135deg, #3b82f615 0%, white 100%)` }}
      >
        {/* Show renewal flow UI when active */}
        {renewalFlow.step !== "idle" ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
            
            {/* Login Form */}
            {!isAuthenticated && (
              <div className="space-y-4">
                <LoginForm
                  onLogin={async (email, password) => {
                    await login(email, password);
                    renewalFlow.startRenewal();
                  }}
                  onRegister={async (email, password) => {
                    await register(email, password);
                    renewalFlow.startRenewal();
                  }}
                  onCancel={() => renewalFlow.cancelRenewal()}
                />
              </div>
            )}
            
            {/* Renewal Form */}
            {isAuthenticated && renewalFlow.step === "form" && (
              <RenewalForm
                onSubmit={(data: RenewalFormData) => {
                  renewalFlow.submitFormForConfirmation(data);
                }}
                onCancel={() => renewalFlow.cancelRenewal()}
                isLoading={false}
              />
            )}
            
            {/* Confirmation */}
            {isAuthenticated && (renewalFlow.step === "confirm" || renewalFlow.step === "confirming") && renewalFlow.formData && (
              <RenewalConfirmation
                formData={renewalFlow.formData}
                operationPrice={renewalFlow.operationPrice}
                onConfirm={() => renewalFlow.confirmAndCreateTicket()}
                onEdit={() => renewalFlow.editForm()}
                isLoading={renewalFlow.step === "confirming"}
              />
            )}
            
            {/* Payment */}
            {isAuthenticated && renewalFlow.step === "payment" && renewalFlow.ticket && (
              <PaymentQR
                invoice={renewalFlow.ticket.ln_invoice}
                amountSats={renewalFlow.ticket.amount_sats}
                onConfirmPayment={() => renewalFlow.confirmPayment()}
                onCancel={() => renewalFlow.cancelRenewal()}
                isConfirming={false}
                error={renewalFlow.error}
                confirmAttempts={renewalFlow.confirmAttempts}
              />
            )}
            
            {/* Success */}
            {renewalFlow.step === "success" && (
              <PaymentStatus
                status="paid"
                ticketId={renewalFlow.ticket?.ticket_id || ''}
                onClose={() => renewalFlow.cancelRenewal()}
              />
            )}
            
            {/* Error */}
            {renewalFlow.step === "error" && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px' }}>
                <p style={{ color: '#dc2626', marginBottom: '12px' }}>{renewalFlow.error || "An error occurred"}</p>
                <button 
                  onClick={() => renewalFlow.cancelRenewal()}
                  style={{ color: '#dc2626', textDecoration: 'underline', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Default welcome screen - Modern & Elegant */
          <div style={{ 
            backgroundColor: 'white', 
            padding: '48px', 
            borderRadius: '24px', 
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
            maxWidth: '520px',
            width: '100%',
            border: '1px solid #e5e7eb'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: '#111827',
                marginBottom: '8px',
                letterSpacing: '-0.025em'
              }}>
                Driver's License Assistant
              </h1>
              <p style={{ fontSize: '15px', color: '#6b7280' }}>
                DETRAN-SP Renewal Service
              </p>
            </div>
            
            {/* CTA Button */}
            <button
              onClick={handleStartRenewal}
              style={{ 
                width: '100%',
                backgroundColor: '#2563eb',
                color: 'white',
                fontWeight: '500',
                fontSize: '16px',
                padding: '16px 24px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            >
              <span>⚡</span>
              <span>Start License Renewal</span>
            </button>
            
            {/* Payment badge */}
            <div style={{ 
              textAlign: 'center', 
              marginTop: '16px',
              padding: '10px 16px',
              backgroundColor: '#fffbeb',
              borderRadius: '8px',
              border: '1px solid #fef3c7'
            }}>
              <span style={{ fontSize: '13px', color: '#92400e' }}>
                ⚡ Pay with Bitcoin Lightning — 1 sat
              </span>
            </div>
            
            {/* Divider */}
            <div style={{ 
              height: '1px', 
              backgroundColor: '#f3f4f6', 
              margin: '32px 0' 
            }}></div>
            
            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <span style={{ fontSize: '18px' }}>📋</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '2px' }}>Requirements</p>
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>Check documents and eligibility</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <span style={{ fontSize: '18px' }}>🏥</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '2px' }}>Medical Exams</p>
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>Find and schedule nearby clinics</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <span style={{ fontSize: '18px' }}>💬</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginBottom: '2px' }}>AI Assistant</p>
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>Chat for help on the right →</p>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <p style={{ 
              textAlign: 'center', 
              fontSize: '12px', 
              color: '#9ca3af',
              marginTop: '32px'
            }}>
              Powered by Google ADK
            </p>
          </div>
        )}
      </div>

      {/* Chat Sidebar */}
      <div className="w-[420px] min-w-[420px] max-w-[420px] bg-white border-l border-blue-100 flex flex-col shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-blue-100" style={{ backgroundColor: '#2563eb' }}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg" style={{ color: 'white' }}>Agent Assistant</h2>
              <p className="text-xs" style={{ color: '#bfdbfe' }}>
                {isAuthenticated ? '✓ Logged in' : 'Ask me anything about driver\'s licenses'}
              </p>
            </div>
            {isAuthenticated && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to logout?')) {
                    logout();
                    renewalFlow.cancelRenewal();
                  }
                }}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'white' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className="rounded-2xl px-4 py-3 bg-white text-gray-800 shadow-sm border border-gray-200 overflow-hidden"
                style={{ 
                  maxWidth: message.role === "assistant" ? "1000px" : "75%",
                  wordBreak: "break-word"
                }}
              >
                {message.role === "user" && (
                  <p className="text-xs text-blue-600 font-medium mb-1">You</p>
                )}
                {message.role === "assistant" && (
                  <p className="text-xs text-gray-500 font-medium mb-1">Assistant</p>
                )}
                <div className="prose prose-sm" style={{ maxWidth: "100%" }}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
              
              {/* Show Clinics Map if clinics data is present */}
              {message.clinics && message.clinics.length > 0 && (
                <div className="w-full mt-3">
                  <ClinicsMap
                    clinics={message.clinics}
                    userLocation={message.userLocation}
                    onClinicSelect={(clinic) => {
                      // When user selects a clinic from the map, send it as a message
                      sendMessage(`I want to book at ${clinic.name} (ID: ${clinic.id})`);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
          
          {/* Location Picker Modal */}
          {showLocationPicker && (
            <div className="my-4">
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                onCancel={handleLocationCancel}
              />
            </div>
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-blue-100 bg-white">
          <div className="flex gap-2">
            {/* Location Picker Button */}
            <button
              onClick={openLocationPicker}
              disabled={isLoading}
              className="bg-blue-100 hover:bg-blue-200 disabled:bg-gray-50 disabled:cursor-not-allowed text-blue-600 rounded-xl px-3 py-3 transition-colors border-2 border-blue-300 hover:border-blue-400"
              title="📍 Select location from map"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={isLoading}
              className="flex-1 bg-gray-50 text-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 placeholder-gray-400 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          
          {/* Quick action hint */}
          <p className="text-xs text-gray-400 mt-2 text-center">
            💡 Click the map button to select a location from the map when scheduling
          </p>
        </div>
      </div>
    </div>
  );
}

// Wrap with AuthProvider for auth context
export default function CopilotKitPageWithAuth() {
  return (
    <AuthProvider>
      <CopilotKitPageInner />
    </AuthProvider>
  );
}
