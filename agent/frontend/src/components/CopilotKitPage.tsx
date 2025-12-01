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
  const [themeColor, setThemeColor] = useState("#6366f1");
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
    <div className="h-screen w-screen flex" style={{ backgroundColor: "#0f0f23" }}>
      {/* Main Content */}
      <div 
        className="flex-1 flex justify-center items-center p-8 transition-colors duration-500"
        style={{ background: `linear-gradient(135deg, ${themeColor}40 0%, ${themeColor}20 100%)` }}
      >
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-2xl w-full border border-white/20">
          <h1 className="text-4xl font-bold text-white mb-2 text-center">
            🚗 Driver's License Assistant
          </h1>
          <p className="text-gray-300 text-center text-lg mb-6">
            Powered by Google ADK
          </p>
          
          <div className="bg-white/10 p-5 rounded-2xl text-white">
            <h2 className="text-xl font-semibold mb-3">How to Use</h2>
            <ul className="space-y-2 text-gray-200 text-sm">
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
      <div className="w-[420px] bg-[#1a1a2e] border-l border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-[#16162a]">
          <h2 className="text-white font-semibold text-lg">Agent Assistant</h2>
          <p className="text-gray-400 text-xs">Ask me anything about driver's licenses</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-md"
                    : "bg-[#252542] text-gray-100 rounded-bl-md"
                }`}
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#252542] text-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10 bg-[#16162a]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={isLoading}
              className="flex-1 bg-[#252542] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
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

