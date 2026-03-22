// App.jsx — Root with routing + Clerk
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, SignIn, SignUp } from "@clerk/clerk-react";
import Navbar       from "./components/Navbar";
import ClerkApiSetup from "./components/ClerkApiSetup";
import Detect       from "./pages/Detect";
import History      from "./pages/History";
import ScanDetail   from "./pages/ScanDetail";
import Stats        from "./pages/Stats";

const shellStyle = {
  minHeight: "100vh",
  background: "var(--bg)",
  backgroundImage: `
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,229,255,0.06) 0%, transparent 60%),
    repeating-linear-gradient(0deg,  transparent, transparent 39px, rgba(26,42,58,0.25) 39px, rgba(26,42,58,0.25) 40px),
    repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(26,42,58,0.12) 39px, rgba(26,42,58,0.12) 40px)
  `,
};

export default function App() {
  return (
    <>
      <ClerkApiSetup />
      <SignedIn>
        <div style={shellStyle}>
          <Navbar />
          <Routes>
            <Route path="/"            element={<Detect />}     />
            <Route path="/history"     element={<History />}    />
            <Route path="/history/:id" element={<ScanDetail />} />
            <Route path="/stats"       element={<Stats />}      />
            <Route path="/sign-in/*"   element={<Navigate to="/" replace />} />
            <Route path="/sign-up/*"   element={<Navigate to="/" replace />} />
            <Route path="*"            element={<NotFound />}   />
          </Routes>
        </div>
      </SignedIn>
      <SignedOut>
        <div style={{ ...shellStyle, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Routes>
            <Route
              path="/sign-in/*"
              element={<SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />}
            />
            <Route
              path="/sign-up/*"
              element={<SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />}
            />
            <Route path="*" element={<Navigate to="/sign-in" replace />} />
          </Routes>
        </div>
      </SignedOut>
    </>
  );
}

function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "100px 20px", color: "var(--muted)" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>404</div>
      <p style={{ fontFamily: "var(--head)", fontSize: 24, color: "var(--text)" }}>Page not found</p>
    </div>
  );
}
