import { HashRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import ChatPage from "./components/ChatPage";
import SimpleChatPage from "./components/SimpleChatPage";
import CopilotKitPage from "./components/CopilotKitPage";
import { CopilotKitProvider } from "./components/CopilotKitProvider";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/simple" element={<SimpleChatPage />} />
        <Route 
          path="/copilot" 
          element={
            <CopilotKitProvider>
              <CopilotKitPage />
            </CopilotKitProvider>
          } 
        />
      </Routes>
    </Router>
  );
}
