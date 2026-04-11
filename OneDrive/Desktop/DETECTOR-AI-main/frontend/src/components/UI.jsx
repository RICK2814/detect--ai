// components/UI.jsx — Shared low-level components
import React from "react";
import RealisticFigure from "./RealisticFigure";

// ── Gauge ─────────────────────────────────────────────────────────────────────

export function Gauge({ pct, color, size = 120 }) {
  const r = size * 0.4;
  const c = 2 * Math.PI * r;
  const validPct = isNaN(pct) ? 0 : Math.max(0, Math.min(100, pct));
  const offset = c - (validPct / 100) * c;
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={size*0.083} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={size*0.083}
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 ${size*0.07}px ${color})`, transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: "var(--head)", fontSize: size*0.22, fontWeight: 800, color, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: size*0.09, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>AI</span>
      </div>
    </div>
  );
}

// ── Signal Bar ────────────────────────────────────────────────────────────────

export function SignalBar({ name, score, label, invert = false }) {
  const display = invert ? 100 - score : score;
  const aiScore = invert ? 100 - score : score;
  const color = aiScore >= 70 ? "var(--accent2)" : aiScore >= 40 ? "var(--warn)" : "var(--accent3)";

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: 16,
    }}>
      <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
        {name}
      </div>
      <div style={{ background: "var(--bg)", borderRadius: 4, height: 6, marginBottom: 8, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4, width: `${display}%`,
          background: color, boxShadow: `0 0 8px ${color}`,
          transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}>
        <span>{label}</span>
        <span style={{ color: "var(--text)", fontWeight: 700 }}>{display}/100</span>
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

export function VerdictBadge({ verdict, size = "md" }) {
  const config = {
    AI:     { color: "var(--accent2)", bg: "rgba(255,60,110,0.12)", icon: "⚠️", label: "AI Generated" },
    Human:  { color: "var(--accent3)", bg: "rgba(109,255,179,0.1)", icon: "✅", label: "Human Written" },
    Mixed:  { color: "var(--warn)",    bg: "rgba(255,184,48,0.1)",  icon: "⚡", label: "Mixed Content" },
  };
  const c = config[verdict] || config.Mixed;
  const fs = size === "sm" ? 11 : 14;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: size === "sm" ? "3px 8px" : "6px 14px",
      background: c.bg, border: `1px solid ${c.color}`,
      borderRadius: 6, fontSize: fs, color: c.color, fontWeight: 700,
    }}>
      <RealisticFigure symbol={c.icon} className="animated-emoji emoji-status" /> {c.label}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({ children, style }) {
  return (
    <div className="ui-card" style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ children, dot = true }) {
  return (
    <div className="ui-card-header">
      {dot && <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "var(--accent)", boxShadow: "0 0 8px var(--accent)",
        flexShrink: 0, animation: "pulse 2s infinite",
      }} />}
      {children}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 40 }) {
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          position: "absolute",
          inset: i * (size * 0.1),
          borderRadius: "50%",
          border: "2px solid transparent",
          borderTopColor: i === 0 ? "var(--accent)" : i === 1 ? "#0077ff" : "rgba(0,229,255,0.4)",
          animation: `spin ${1 + i * 0.5}s linear infinite`,
          animationDirection: i === 1 ? "reverse" : "normal",
        }} />
      ))}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

export function Button({ children, onClick, disabled, variant = "primary", style, className = "" }) {
  const base = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "13px 24px", borderRadius: 10,
    fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700,
    letterSpacing: 1, textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s",
    opacity: disabled ? 0.4 : 1,
    ...style,
  };
  const variantClass = variant === "danger" ? "ui-btn--danger" : variant === "ghost" ? "ui-btn--ghost" : "ui-btn--primary";
  return (
    <button onClick={onClick} disabled={disabled} className={`ui-btn ${variantClass} ${className}`.trim()} style={base}>
      {children}
    </button>
  );
}
