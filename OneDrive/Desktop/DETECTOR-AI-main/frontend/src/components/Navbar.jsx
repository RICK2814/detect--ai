// components/Navbar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";

const NAV = [
  { to: "/",          label: "Detect",     kind: "detect" },
  { to: "/factcheck", label: "Fact Check", kind: "shield" },
  { to: "/history",   label: "History",    kind: "history" },
  { to: "/stats",     label: "Stats",      kind: "stats" },
];

function NavGlyph({ kind, active }) {
  return (
    <span className={`nav-glyph nav-glyph-${kind}${active ? " is-active" : ""}`} aria-hidden="true">
      {kind === "detect" && (
        <>
          <span className="nav-glyph-ring" />
          <span className="nav-glyph-dot nav-glyph-dot-a" />
          <span className="nav-glyph-dot nav-glyph-dot-b" />
          <span className="nav-glyph-core" />
        </>
      )}
      {kind === "shield" && (
        <>
          <span className="nav-glyph-shield" />
          <span className="nav-glyph-check" />
          <span className="nav-glyph-glow" />
        </>
      )}
      {kind === "history" && (
        <>
          <span className="nav-glyph-clock" />
          <span className="nav-glyph-hand nav-glyph-hand-hour" />
          <span className="nav-glyph-hand nav-glyph-hand-minute" />
        </>
      )}
      {kind === "stats" && (
        <>
          <span className="nav-glyph-bars">
            <span />
            <span />
            <span />
          </span>
          <span className="nav-glyph-sweep" />
        </>
      )}
    </span>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();

  const userButtonAppearance = {
    baseTheme: "dark",
    elements: {
      avatarBox: "w-10 h-10 rounded-lg shadow-md shadow-cyan-500/25 border border-cyan-400/30 hover:shadow-cyan-500/40 transition-all duration-300",
      userButtonBox: "flex gap-3",
      userButtonTrigger: "hover:opacity-100 transition-opacity duration-300",
      cardBox: "border border-cyan-900/40 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-xl shadow-cyan-900/30 rounded-xl",
      userPreviewMainIdentifier: "text-cyan-200 font-semibold",
      userPreviewSecondaryIdentifier: "text-cyan-400/70",
      dividerLine: "bg-gradient-to-r from-transparent via-cyan-600/20 to-transparent",
      action: "text-cyan-300/80 hover:text-cyan-200 transition-colors duration-200 hover:bg-cyan-500/10 rounded-md",
      actionIcon: "text-cyan-400",
      badge: "bg-gradient-to-r from-cyan-500/30 to-blue-500/20 text-cyan-300 border border-cyan-400/40 px-2 py-1 rounded-full text-xs font-semibold",
    },
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-emblem" aria-hidden="true">
            <span className="navbar-brand-orbit navbar-brand-orbit-1" />
            <span className="navbar-brand-orbit navbar-brand-orbit-2" />
            <span className="navbar-brand-shield">
              <span className="navbar-brand-shield-core" />
              <span className="navbar-brand-shield-grid" />
            </span>
            <span className="navbar-brand-spark navbar-brand-spark-1" />
            <span className="navbar-brand-spark navbar-brand-spark-2" />
            <span className="navbar-brand-spark navbar-brand-spark-3" />
          </div>
          <span className="navbar-brand-copy">
            <span className="navbar-brand-title">
              DETECT <span>AI</span>
            </span>
            <span className="navbar-brand-kicker">Signal Intelligence</span>
          </span>
        </Link>

        <nav className="navbar-links">
          {NAV.map(({ to, label, kind }) => {
            const active = pathname === to;
            return (
              <Link key={to} to={to} className={"navbar-link" + (active ? " active" : "")}>
                <NavGlyph kind={kind} active={active} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="navbar-right">
          <span className="status-dot" aria-label="System online" />
          <span className="version-pill">v1.0 · Beta</span>
          <UserButton afterSignOutUrl="/sign-in" appearance={userButtonAppearance} />
        </div>
      </div>
    </header>
  );
}
