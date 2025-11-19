import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useNavigate } from "react-router-dom"
import { queryAgent } from "../middleware/query"
import { useChat } from "../context/ChatContext"


export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { addMessage } = useChat()

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      addMessage({ id: crypto.randomUUID(), role: "user", text: searchQuery })
      const res = await queryAgent(searchQuery)
      addMessage({ id: crypto.randomUUID(), role: "agent", text: res.response })
      navigate("/chat")
    } catch (err) {
      console.error("query error", err)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch()
  }

  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-black">How can I help you today?</h1>
            <p className="text-gray-600 max-w-xl mx-auto">I'll help you with your driver's license related questions.</p>
          </div>

          <div className="relative">
            <Input
              type="text"
              placeholder="Describe what you have in mind"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="w-full h-14 pl-6 pr-16 rounded-full border-0 bg-white text-gray-800 placeholder:text-gray-400 shadow-[0_4px_20px_rgba(183,177,242,0.15)] focus-visible:ring-0 focus-visible:shadow-[0_4px_24px_rgba(183,177,242,0.3),0_0_0_4px_rgba(183,177,242,0.2)] transition-shadow duration-200 ease-in-out"
            />

            <Button
              onClick={handleSearch}
              size="icon"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full text-white bg-gradient-to-r from-[#B7B1F2] to-[#FDB7EA] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 ease-out"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 backdrop-blur-md overflow-hidden">
                <div className="relative flex flex-col items-center">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#B7B1F2] border-r-[#FDB7EA] animate-spin"></div>
                    <div className="absolute inset-1 bg-gradient-to-r from-[#B7B1F2]/20 to-[#FDB7EA]/20 rounded-full blur-sm animate-pulse"></div>
                  </div>
                  <p className="mt-2 text-sm font-semibold bg-gradient-to-r from-[#B7B1F2] to-[#FDB7EA] bg-clip-text text-transparent animate-pulse">
                    Thinking...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
