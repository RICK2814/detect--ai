// pages/Stats.jsx — Dashboard with detection statistics
import React, { useEffect, useState } from "react";
import { getStats, getHistory } from "../utils/api";
import { Card, CardHeader, Spinner } from "../components/UI";
import RealisticFigure from "../components/RealisticFigure";

function StatBox({ label, value, color = "var(--accent)", icon }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "24px 20px", textAlign: "center",
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: "var(--head)", fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginTop: 6 }}>
        {label}
      </div>
    </div>
  );
}

function PieBar({ ai, human, mixed, total }) {
  if (!total) return null;
  const pAI    = ((ai    / total) * 100).toFixed(1);
  const pHuman = ((human / total) * 100).toFixed(1);
  const pMixed = ((mixed / total) * 100).toFixed(1);
  return (
    <div>
      <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
        {ai    > 0 && <div style={{ width: `${pAI}%`,    background: "var(--accent2)", transition: "width 1s" }} title={`AI: ${pAI}%`} />}
        {human > 0 && <div style={{ width: `${pHuman}%`, background: "var(--accent3)", transition: "width 1s" }} title={`Human: ${pHuman}%`} />}
        {mixed > 0 && <div style={{ width: `${pMixed}%`, background: "var(--warn)",    transition: "width 1s" }} title={`Mixed: ${pMixed}%`} />}
      </div>
      <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
        {[
          ["AI Generated", pAI,    "var(--accent2)"],
          ["Human Written",pHuman, "var(--accent3)"],
          ["Mixed",        pMixed, "var(--warn)"],
        ].map(([label, pct, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
            <span style={{ color: "var(--muted)" }}>{label}</span>
            <span style={{ color, fontWeight: 700 }}>{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Stats() {
  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getHistory(1, 8)])
      .then(([s, h]) => { setStats(s); setRecent(h.scans || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
      <Spinner size={52} />
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 80px" }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: "var(--head)", fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
          Detection Statistics
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
          Aggregated data from all scans stored in the database.
        </p>
      </div>

      {/* Big numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        <StatBox icon={<RealisticFigure symbol="🔬" className="animated-emoji emoji-icon" />} label="Total Scans"    value={stats?.total_scans}  color="var(--accent)"  />
        <StatBox icon={<RealisticFigure symbol="⚠️" className="animated-emoji emoji-status" />} label="AI Generated"   value={stats?.total_ai}     color="var(--accent2)" />
        <StatBox icon={<RealisticFigure symbol="✅" className="animated-emoji emoji-status" />} label="Human Written"  value={stats?.total_human}  color="var(--accent3)" />
        <StatBox icon={<RealisticFigure symbol="⚡" className="animated-emoji emoji-icon" />} label="Mixed Content"  value={stats?.total_mixed}  color="var(--warn)"    />
      </div>

      {/* Distribution bar */}
      {stats?.total_scans > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>Verdict Distribution</CardHeader>
          <div style={{ padding: 20 }}>
            <PieBar
              ai={stats.total_ai} human={stats.total_human}
              mixed={stats.total_mixed} total={stats.total_scans}
            />
          </div>
        </Card>
      )}

      {/* Recent scans mini-list */}
      {recent.length > 0 && (
        <Card>
          <CardHeader>Recent Scans</CardHeader>
          <div>
            {recent.map((scan, i) => {
              const color = scan.verdict === "AI" ? "var(--accent2)" : scan.verdict === "Human" ? "var(--accent3)" : "var(--warn)";
              return (
                <div key={scan.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 20px",
                  borderBottom: i < recent.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <span style={{ fontSize: 18 }}>
                    <RealisticFigure symbol={scan.source_type === "url" ? "🌐" : scan.source_type === "file" ? "📄" : "✏️"} className="animated-emoji emoji-icon" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {scan.source_ref || "Text paste"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {new Date(scan.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{scan.verdict}</span>
                  <span style={{ fontSize: 13, color, fontWeight: 700 }}>{scan.ai_prob}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {stats?.total_scans === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}><RealisticFigure symbol="📊" className="animated-emoji emoji-icon" size={48} /></div>
          <p>No data yet. Run some scans to see statistics here.</p>
        </div>
      )}
    </div>
  );
}
