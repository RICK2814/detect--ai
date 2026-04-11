console.log("[MAIN.JSX] Booting application...");
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import RealisticFigure from "./components/RealisticFigure";
import "./index.css";

// Trim — stray spaces/newlines in .env break Clerk.
const rawKey = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "").trim();
const publishableKey = (rawKey && !rawKey.includes("_your_")) ? rawKey : "";

function MissingClerkKeyScreen() {
  return (
    <div
      style={{
        background: "#1a1f26",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        padding: "60px 20px",
        textAlign: "center"
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 20 }}><RealisticFigure symbol="⚠️" className="animated-emoji emoji-status" size={48} /></div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Clerk publishable key missing</h1>
      <p style={{ lineHeight: 1.6, marginBottom: 12 }}>
        Vite did not load <code style={{ color: "#7dd3fc" }}>VITE_CLERK_PUBLISHABLE_KEY</code>. Create or fix{" "}
        <code style={{ color: "#7dd3fc" }}>frontend/.env</code> (same folder as <code>vite.config.js</code>):
      </p>
      <pre
        style={{
          background: "#151922",
          padding: 16,
          borderRadius: 8,
          overflow: "auto",
          fontSize: 13,
          border: "1px solid #2a3140",
        }}
      >
        {`VITE_CLERK_PUBLISHABLE_KEY=pk_test_...`}
      </pre>
      <p style={{ marginTop: 16, color: "#9aa0a6" }}>
        Then stop and run <code style={{ color: "#7dd3fc" }}>npm run dev</code> again. Only variables prefixed with{" "}
        <code>VITE_</code> are exposed to the browser.
      </p>
    </div>
  );
}

const root = document.getElementById("root");

if (!publishableKey) {
  console.error("VITE_CLERK_PUBLISHABLE_KEY is missing — check frontend/.env and restart Vite.");
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <MissingClerkKeyScreen />
    </React.StrictMode>
  );
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={publishableKey}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </React.StrictMode>
  );
}
