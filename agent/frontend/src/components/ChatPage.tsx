import React, { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { ArrowRight, Sparkles, ImagePlus } from "lucide-react"
import { useChat } from "../context/ChatContext"
import { queryAgent } from "../middleware/query"
import { uploadImage } from "../middleware/image"
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core"
import { CopilotSidebar } from "@copilotkit/react-ui"
import "@copilotkit/react-ui/styles.css"


const normalizeMarkdownBullets = (text: string) =>
  text.replace(/^[ \t]*[•✓]\s?/gm, "- ")

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / 1024).toFixed(1)} KB`
}

const formatClassification = (value: string) =>
  value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")


export default function ChatPage() {
  const { messages, addMessage } = useChat()
  const [inputValue, setInputValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Make chat history readable to CopilotKit
  useCopilotReadable({
    description: "The current conversation history with the user",
    value: messages.map(m => ({ role: m.role, content: m.text })),
  })

  // Register image upload action with CopilotKit
  useCopilotAction({
    name: "uploadDriverLicenseImage",
    description: "Upload and analyze a driver's license or passport image",
    parameters: [
      {
        name: "instruction",
        type: "string",
        description: "Instructions for the user about uploading an image",
        required: false,
      },
    ],
    handler: async () => {
      return "Image upload functionality is available. User can click the 'Upload image' button to upload their document."
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Add user message indicating image upload
    const userMsg = { 
      id: crypto.randomUUID(), 
      role: "user" as const, 
      text: `[Uploaded image: ${file.name}]` 
    }
    addMessage(userMsg)

    setLoading(true)
    setIsUploadingImage(true)
    try {
      const data = await uploadImage(file) 

      const responseLines = [
        "🖼️ **Image received & verified!**",
        "",
        `I ingested **${data.filename}** (${formatFileSize(data.size)}) and detected it as **${formatClassification(data.classification)}**.`,
        "",
        `Everything looks crisp and ready for the next step!`,
      ]
      const responseText = responseLines.join("\n")
      const agentMsg = { 
        id: crypto.randomUUID(), 
        role: "agent" as const, 
        text: responseText 
      }
      addMessage(agentMsg)
      setLoading(false)
    } catch (error) {
      const errorMessage = {
        role: "agent" as const,
        text: `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        id: crypto.randomUUID(),
      }
      addMessage(errorMessage)
    } finally {
      setLoading(false)
      setIsUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

async function handleSend(customMessage?: string) {
  const text = customMessage ?? inputValue.trim()
  if (!text) return
  const userMsg = { id: crypto.randomUUID(), role: "user" as const, text }
  addMessage(userMsg)
  setInputValue("")
  setLoading(true)
  try {
    const res = await queryAgent(text)
    const agentMsg = { id: crypto.randomUUID(), role: "agent" as const, text: res.response }
    addMessage(agentMsg)
  } catch {
    addMessage({ id: crypto.randomUUID(), role: "agent", text: "Error: could not get response." })
  } finally {
    setLoading(false)
  }
}
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend()
  }


  return (
    <CopilotSidebar
      defaultOpen={false}
      clickOutsideToClose={true}
      labels={{
        title: "AI Assistant",
        initial: "Hi! I can help with driver's license renewal, clinic booking, and more. Ask me anything!",
      }}
    >
      <div className="flex h-screen bg-white overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key="chat"
            initial={{ width: "100%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex items-center justify-center p-6"
          >
            <div className="w-full h-full bg-gray-50 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col relative overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 pt-8 pb-32 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start items-start gap-2"}`}
                  >
                    {m.role === "agent" && (
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                          <div className="bg-gradient-to-r from-[#B7B1F2] to-[#FDB7EA] bg-clip-text">
                            <Sparkles
                              className="w-3 h-3 text-transparent"
                              style={{ stroke: "url(#sparkle-gradient)" }}
                            />
                          </div>
                          <svg width="0" height="0">
                            <defs>
                              <linearGradient id="sparkle-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#B7B1F2" />
                                <stop offset="100%" stopColor="#FDB7EA" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] px-3 py-2 text-[13px] ${
                        m.role === "user"
                          ? "bg-[#FFDCCC] rounded-[14px] rounded-br-[4px]"
                          : "bg-white rounded-[14px] rounded-bl-[4px]"
                      }`}
                    >
                      {m.role === "agent" ? (
                        <div className="text-black leading-relaxed font-[500] space-y-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {normalizeMarkdownBullets(m.text)}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-black leading-relaxed font-[500]">{m.text}</p>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                        <div className="bg-gradient-to-r from-[#B7B1F2] to-[#FDB7EA] bg-clip-text">
                          <Sparkles
                            className="w-4 h-4 text-transparent animate-pulse"
                            style={{ stroke: "url(#sparkle-gradient)" }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="max-w-[70%] px-5 py-3.5 bg-white rounded-[18px] rounded-bl-[4px]">
                      <p className="text-gray-500 text-[16px] leading-relaxed font-[500] flex items-center gap-2">
                        {isUploadingImage ? "Uploading and analyzing image..." : "Thinking..."}
                        <span className="inline-flex gap-0.5">
                          <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                  id="image-upload"
                />
                <div className="flex flex-col gap-3">
                  <div>
                    <Button
                      type="button"
                      disabled={loading}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-gray-200 text-gray-700 text-sm font-medium shadow-sm transition-colors hover:border-[#cfc4ff] hover:bg-[#f5f0ff] hover:text-[#6650c4]"
                    >
                      <ImagePlus className="w-4 h-4" />
                      Upload image
                    </Button>
                  </div>
                  <div className="relative bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all duration-300 focus-within:shadow-[0_0_0_2px_rgba(183,177,242,0.4),0_0_0_4px_rgba(253,183,234,0.4)]">
                    <Input
                      type="text"
                      placeholder="Write your question here..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full h-14 pl-4 pr-14 rounded-2xl border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:outline-none text-[14px]"
                    />
                    <Button
                      onClick={() => handleSend()}
                      size="icon"
                      disabled={loading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-white bg-gradient-to-r from-[#B7B1F2] to-[#FDB7EA] z-10"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </AnimatePresence>
      </div>
    </CopilotSidebar>
  )
}
