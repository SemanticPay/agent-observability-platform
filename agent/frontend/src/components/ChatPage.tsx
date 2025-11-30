import { CopilotChat } from "@copilotkit/react-ui"

export default function ChatPage() {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="flex items-center justify-center p-6 w-full">
        <div className="w-full h-full bg-gray-50 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col relative overflow-hidden">
          <CopilotChat
            className="h-full"
            labels={{
              title: "AI Assistant",
              initial: "Hi! I'm your AI assistant. How can I help you today?",
              placeholder: "Write your question here...",
            }}
          />
        </div>
      </div>
    </div>
  )
}
