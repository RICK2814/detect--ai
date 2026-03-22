// components/Navbar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";

const NAV = [
  { to: "/",        label: "Detect",  icon: "🔍" },
  { to: "/history", label: "History", icon: "📋" },
  { to: "/stats",   label: "Stats",   icon: "📊" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  return (
    <header style={{
      borderBottom: "1px solid var(--border)",
      padding: "0 40px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 60,
      background: "rgba(7,10,14,0.95)",
      backdropFilter: "blur(12px)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: "linear-gradient(135deg, var(--accent), #0055ff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, boxShadow: "0 0 16px rgba(0,229,255,0.3)",
        }}>🔬</div>
        <span style={{ fontFamily: "var(--head)", fontWeight: 800, fontSize: 18, color: "#fff", letterSpacing: -0.5 }}>
          Detect<span style={{ color: "var(--accent)" }}>AI</span>
        </span>
      </Link>

      <nav style={{ display: "flex", gap: 4 }}>
        {NAV.map(({ to, label, icon }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 6,
              fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700,
              letterSpacing: 1, textTransform: "uppercase",
              textDecoration: "none",
              color: active ? "var(--accent)" : "var(--muted)",
              background: active ? "rgba(0,229,255,0.08)" : "transparent",
              border: active ? "1px solid rgba(0,229,255,0.2)" : "1px solid transparent",
              transition: "all 0.2s",
            }}>
              {icon} {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{
          fontSize: 10, color: "var(--muted)",
          padding: "3px 8px", border: "1px solid var(--border)",
          borderRadius: 4, letterSpacing: 1,
        }}>
          v1.0 · BETA
        </span>
        <UserButton afterSignOutUrl="/sign-in" appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }} />
      </div>
    </header>
  );
}
