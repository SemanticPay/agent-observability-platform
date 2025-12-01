import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { queryAgent } from "../middleware/query";

interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
}

const normalizeMarkdownBullets = (text: string) =>
  text.replace(/^[ \t]*[•✓]\s?/gm, "- ");

export default function SimpleChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || loading) return;

    const userMsg: Message = { 
      id: crypto.randomUUID(), 
      role: "user", 
      text 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const res = await queryAgent(text);
      const agentMsg: Message = { 
        id: crypto.randomUUID(), 
        role: "agent", 
        text: res.response 
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (error) {
      const errorMsg: Message = { 
        id: crypto.randomUUID(), 
        role: "agent", 
        text: "Sorry, I encountered an error. Please try again." 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full flex items-center justify-center p-6"
        >
          <div className="w-full max-w-4xl h-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">AI Assistant</h1>
                  <p className="text-sm text-white/80">Powered by Your Agent Workforce</p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      Welcome! How can I help you today?
                    </h2>
                    <p className="text-gray-600 max-w-md">
                      Ask me about driver's license renewal, scheduling appointments, or any other citizen services.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                    {[
                      "What documents do I need to renew my license?",
                      "Schedule a medical exam",
                      "What are the renewal requirements?",
                      "Find available clinics"
                    ].map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInputValue(prompt);
                          setTimeout(() => handleSend(), 100);
                        }}
                        className="px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-sm text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "agent" && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}
                  >
                    {m.role === "agent" ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {normalizeMarkdownBullets(m.text)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="leading-relaxed">{m.text}</p>
                    )}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white/50">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="w-full h-12 pr-12 rounded-xl border-gray-300 focus-visible:ring-purple-500"
                />
                <Button
                  onClick={handleSend}
                  size="icon"
                  disabled={loading || !inputValue.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

