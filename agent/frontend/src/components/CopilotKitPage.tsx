"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#3b82f6");
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
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
          question: userMessage.content,
          session_id: sessionId,
        }),
      });

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "Sorry, I couldn't process that request.",
        timestamp: new Date(),
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

  return (
    <div className="h-screen w-screen flex bg-gradient-to-br from-blue-50 to-white">
      {/* Main Content */}
      <div 
        className="flex-1 flex justify-center items-center p-8 transition-colors duration-500"
        style={{ background: `linear-gradient(135deg, ${themeColor}15 0%, white 100%)` }}
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
            </ul>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-[420px] bg-white border-l border-blue-100 flex flex-col shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-blue-100 bg-blue-600">
          <h2 className="text-white font-semibold text-lg">Agent Assistant</h2>
          <p className="text-blue-100 text-xs">Ask me anything about driver's licenses</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3 bg-white text-gray-800 shadow-sm border border-gray-200"
              >
                {message.role === "user" && (
                  <p className="text-xs text-blue-600 font-medium mb-1">You</p>
                )}
                {message.role === "assistant" && (
                  <p className="text-xs text-gray-500 font-medium mb-1">Assistant</p>
                )}
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
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
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

