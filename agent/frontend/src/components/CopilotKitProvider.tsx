import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { ReactNode } from "react";

interface CopilotKitProviderProps {
  children: ReactNode;
}

export function CopilotKitProvider({ children }: CopilotKitProviderProps) {
  // Connect to the FastAPI backend custom CopilotKit endpoint
  const runtimeUrl = "http://localhost:8000/api/copilotkit";

  return (
    <CopilotKit 
      runtimeUrl={runtimeUrl}
      agent="orchestrator_agent"
      showDevConsole={true}
    >
      {children}
    </CopilotKit>
  );
}

