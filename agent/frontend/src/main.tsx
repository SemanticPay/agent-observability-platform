import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { ChatProvider } from "./context/ChatContext"
import { CopilotKit } from "@copilotkit/react-core"

createRoot(document.getElementById("root")!).render(
  <CopilotKit runtimeUrl="http://localhost:8000/api/copilotkit">
    <ChatProvider>
      <App />
    </ChatProvider>
  </CopilotKit>
)