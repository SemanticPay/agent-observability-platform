import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <CopilotKit 
    runtimeUrl="http://localhost:8000/copilotkit"
    publicApiKey="ck_pub_36c9307f0ec85a0f736324d62c151e02"
  >
    <App />
  </CopilotKit>
);
  