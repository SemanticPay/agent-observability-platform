
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import RootLayout from "./layout.tsx";
  import "./styles/globals.css";
  import "./index.css";

  createRoot(document.getElementById("root")!).render(
    <RootLayout>
      <App />
    </RootLayout>
  );
  