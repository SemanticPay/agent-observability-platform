import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { ReactNode } from "react";

interface CopilotKitProviderProps {
  children: ReactNode;
}

export function CopilotKitProvider({ children }: CopilotKitProviderProps) {
  // Connect to CopilotKit runtime server which handles frontend actions
  // The runtime server connects to the ADK backend at /copilot and 
  // properly exposes frontend actions to the agent
  const runtimeUrl = "http://localhost:3001/copilotkit";

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

