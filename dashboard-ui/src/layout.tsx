// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: "Chat with your data - CopilotKit",
//   description: "AI-powered dashboard assistant for data visualization and insights",
// };

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
