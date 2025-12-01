import { CopilotChat } from "@copilotkit/react-ui"
import { useCopilotAction } from "@copilotkit/react-core"

export default function ChatPage() {
  // Register a frontend action that calls our backend directly
  useCopilotAction({
    name: "askAssistant", 
    description: "Use this action to get answers about driver's license renewal, scheduling medical exams, or any other questions. This MUST be called for EVERY user message.",
    parameters: [
      {
        name: "userMessage",
        type: "string",
        description: "The user's complete message or question",
        required: true,
      },
    ],
    handler: async ({ userMessage }) => {
      try {
        const response = await fetch("http://localhost:8000/oldQuery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            question: userMessage,
            session_id: crypto.randomUUID()
          }),
        })
        const data = await response.json()
        return data.response || "I couldn't get a response."
      } catch (error) {
        console.error("Error calling backend:", error)
        return "Sorry, I encountered an error connecting to the assistant."
      }
    },
  })

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="flex items-center justify-center p-6 w-full">
        <div className="w-full h-full bg-gray-50 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col relative overflow-hidden">
          <CopilotChat
            className="h-full"
            instructions="You are a routing assistant. For EVERY user message, you MUST immediately call the askAssistant action with the user's complete message as userMessage. Do not respond directly - always use askAssistant first and return its response to the user."
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
