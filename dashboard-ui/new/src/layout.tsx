import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Use environment variable or default to localhost:4000 for development
  const runtimeUrl = 'http://localhost:4000/api/copilotkit';
  
  return (
    <CopilotKit 
      runtimeUrl={runtimeUrl}
      showDevConsole={false}
    >
      {children}
    </CopilotKit>
  );
}
