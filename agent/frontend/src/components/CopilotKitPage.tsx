"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useCopilotAction, useCopilotChat } from "@copilotkit/react-core";
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Hi! I'm your AI assistant.\n\nI can help you with:\n- **Driver's License**: Information about renewing, requirements, and documentation\n- **Appointments**: Schedule medical exams and clinic visits\n- **Document Processing**: Upload and verify your documents\n\nWhat can I help you with today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pendingLocationCallback, setPendingLocationCallback] = useState<((location: SelectedLocation) => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    handler: async ({ prompt }) => {
      return new Promise<string>((resolve) => {
        // Show a message that we're opening the map
        if (prompt) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `📍 ${prompt}\n\n*Opening map picker...*`,
            timestamp: new Date(),
          }]);
        }
        
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
      return null;
    },
  });

  // Renewal flow state
  const { user, isAuthenticated, login, register } = useAuth();
  const renewalFlow = useRenewalFlow();

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
    handler: async ({ renewal_type }) => {
      // Start the renewal flow
      renewalFlow.startRenewal();
      
      if (!isAuthenticated) {
        return "Please log in or create an account to start the renewal process. The login form is now displayed.";
      }
      
      return `Starting ${renewal_type || 'standard'} CNH renewal process. Please fill out the renewal form.`;
    },
    render: ({ status }) => {
      if (status === "executing" || renewalFlow.step !== "idle") {
        // Render the appropriate component based on flow state
        if (!isAuthenticated && renewalFlow.step !== "idle") {
          return (
            <div className="my-4">
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
          );
        }
        
        if (renewalFlow.step === "form") {
          return (
            <div className="my-4">
              <RenewalForm
                onSubmit={(data: RenewalFormData) => {
                  renewalFlow.submitFormForConfirmation(data);
                }}
                onCancel={() => renewalFlow.cancelRenewal()}
                isLoading={false}
              />
            </div>
          );
        }
        
        if (renewalFlow.step === "confirm" && renewalFlow.formData) {
          return (
            <div className="my-4">
              <RenewalConfirmation
                formData={renewalFlow.formData}
                operationPrice={renewalFlow.operationPrice}
                onConfirm={() => renewalFlow.confirmAndCreateTicket()}
                onEdit={() => renewalFlow.editForm()}
                isLoading={renewalFlow.step === "confirming"}
              />
            </div>
          );
        }
        
        if (renewalFlow.step === "confirming") {
          return (
            <div className="my-4">
              <RenewalConfirmation
                formData={renewalFlow.formData!}
                operationPrice={renewalFlow.operationPrice}
                onConfirm={() => {}}
                onEdit={() => {}}
                isLoading={true}
              />
            </div>
          );
        }
        
        if (renewalFlow.step === "payment" && renewalFlow.ticket) {
          return (
            <div className="my-4">
              <PaymentQR
                invoice={renewalFlow.ticket.ln_invoice}
                amountSats={renewalFlow.ticket.amount_sats}
                onConfirmPayment={() => renewalFlow.confirmPayment()}
                onCancel={() => renewalFlow.cancelRenewal()}
                isConfirming={false}
                error={renewalFlow.error}
                confirmAttempts={renewalFlow.confirmAttempts}
              />
            </div>
          );
        }
        
        if (renewalFlow.step === "success") {
          return (
            <div className="my-4">
              <PaymentStatus
                status="paid"
                ticketId={renewalFlow.ticket?.ticket_id || ''}
                onClose={() => renewalFlow.cancelRenewal()}
              />
            </div>
          );
        }
        
        if (renewalFlow.step === "error") {
          return (
            <div className="my-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{renewalFlow.error || "An error occurred"}</p>
              <button 
                onClick={() => renewalFlow.cancelRenewal()}
                className="mt-2 text-red-600 underline text-sm"
              >
                Try again
              </button>
            </div>
          );
        }
        
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
            <div className="flex items-center gap-2 text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Starting renewal process...</span>
            </div>
          </div>
        );
      }
      return null;
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageContent?: string) => {
    const content = messageContent || input.trim();
    if (!content || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: content,
          session_id: sessionId,
        }),
      });

      const data = await response.json();
      
      // Check if response contains clinic data in widgets
      let clinics: Clinic[] | undefined;
      let userLocation: { lat: number; lng: number } | undefined;
      
      // Parse widgets for clinic data
      if (data.widgets && Array.isArray(data.widgets)) {
        console.log("Parsing widgets:", data.widgets);
        for (const widget of data.widgets) {
          if (widget.type === 'clinics_map' && widget.data) {
            // Handle clinic data - could be array of objects or Pydantic models
            if (Array.isArray(widget.data.clinics)) {
              clinics = widget.data.clinics.map((c: any) => ({
                id: c.id || c.clinic_id || String(Math.random()),
                name: c.name,
                address: c.address,
                latitude: c.latitude,
                longitude: c.longitude,
                exam_types: c.exam_types || [],
                distance_km: c.distance_km || 0,
              }));
            }
            if (widget.data.userLocation) {
              userLocation = widget.data.userLocation;
            }
            console.log("Found clinics:", clinics?.length, "userLocation:", userLocation);
          }
        }
      }
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "Sorry, I couldn't process that request.",
        timestamp: new Date(),
        clinics,
        userLocation,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, there was an error connecting to the server. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
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
        className="flex-1 flex justify-center items-center p-8 transition-colors duration-500"
        style={{ background: `linear-gradient(135deg, #3b82f615 0%, white 100%)` }}
      >
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-2xl w-full border border-blue-100">
          <h1 className="text-4xl font-bold text-blue-600 mb-2 text-center">
            🚗 Driver's License Assistant
          </h1>
          <p className="text-gray-500 text-center text-lg mb-6">
            Powered by Google ADK
          </p>
          
          <div className="bg-blue-50 p-5 rounded-2xl">
            <h2 className="text-xl font-semibold mb-3 text-blue-800">How to Use</h2>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-center gap-2">
                <span>📄</span>
                <span>Ask about driver's license renewal requirements</span>
              </li>
              <li className="flex items-center gap-2">
                <span>🏥</span>
                <span>Schedule medical exam appointments</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📸</span>
                <span>Get help with document verification</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📍</span>
                <span>Select locations from the map when scheduling</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-[420px] min-w-[420px] max-w-[420px] bg-white border-l border-blue-100 flex flex-col shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-blue-100 bg-blue-600">
          <h2 className="text-white font-semibold text-lg">Agent Assistant</h2>
          <p className="text-blue-100 text-xs">Ask me anything about driver's licenses</p>
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
