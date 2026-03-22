// App.jsx — Root with routing
import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar     from "./components/Navbar";
import Detect     from "./pages/Detect";
import History    from "./pages/History";
import ScanDetail from "./pages/ScanDetail";
import Stats      from "./pages/Stats";

export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      backgroundImage: `
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,229,255,0.06) 0%, transparent 60%),
        repeating-linear-gradient(0deg,  transparent, transparent 39px, rgba(26,42,58,0.25) 39px, rgba(26,42,58,0.25) 40px),
        repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(26,42,58,0.12) 39px, rgba(26,42,58,0.12) 40px)
      `,
    }}>
      <Navbar />
      <Routes>
        <Route path="/"            element={<Detect />}     />
        <Route path="/history"     element={<History />}    />
        <Route path="/history/:id" element={<ScanDetail />} />
        <Route path="/stats"       element={<Stats />}      />
        <Route path="*"            element={<NotFound />}   />
      </Routes>
    </div>
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
