// components/Results.jsx — Full detection results display
import React from "react";
import { Gauge, SignalBar, VerdictBadge, Card, CardHeader, Button } from "./UI";

function getVerdictColor(v) {
  if (v === "AI")    return "var(--accent2)";
  if (v === "Human") return "var(--accent3)";
  return "var(--warn)";
}

export default function Results({ result, onReset }) {
  const color = getVerdictColor(result.verdict);

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* ── Verdict ── */}
      <div style={{
        background: "var(--surface)", border: `1px solid ${color}33`,
        borderRadius: 12, padding: "28px 32px",
        display: "flex", gap: 32, alignItems: "center",
        marginBottom: 20, position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: color, opacity: 0.04, pointerEvents: "none",
        }} />
        <Gauge pct={result.ai_probability} color={color} size={120} />
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 10 }}>
            <VerdictBadge verdict={result.verdict} />
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>
            Confidence: <strong style={{ color: "var(--text)" }}>{result.confidence}</strong>
            {result.id && (
              <span style={{ marginLeft: 16 }}>
                ID: <span style={{ color: "var(--accent)", fontFamily: "var(--mono)" }}>{result.id.slice(0, 8)}…</span>
              </span>
            )}
          </div>
          <div style={{
            fontSize: 13, lineHeight: 1.75, color: "var(--text)",
            borderLeft: `3px solid ${color}`, paddingLeft: 14, opacity: 0.9,
          }}>
            {result.summary}
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader>Text Statistics</CardHeader>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", padding: 20, gap: 12 }}>
          {[
            ["Words",         result.word_count?.toLocaleString() || "—"],
            ["Sentences",     result.sentence_count || "—"],
            ["Avg Sent. Len", result.avg_sentence_length || "—"],
          ].map(([label, val]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <span style={{ display: "block", fontFamily: "var(--head)", fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>{val}</span>
              <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Signals grid ── */}
      {result.signals && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <SignalBar name="Predictability (AI↑)"   score={result.signals.perplexity?.score         || 50} label={result.signals.perplexity?.label         || ""} invert={false} />
          <SignalBar name="Burstiness (Human↑)"    score={result.signals.burstiness?.score         || 50} label={result.signals.burstiness?.label         || ""} invert={false} />
          <SignalBar name="Vocabulary (Human↑)"    score={result.signals.vocabulary?.score         || 50} label={result.signals.vocabulary?.label         || ""} invert={false} />
          <SignalBar name="Formulaic Structure (AI↑)" score={result.signals.sentence_structure?.score || 50} label={result.signals.sentence_structure?.label || ""} invert={false} />
        </div>
      )}

      {/* ── Forensic analysis ── */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader>Forensic Analysis</CardHeader>
        <div style={{ padding: 20 }}>

          {result.ai_flags?.length > 0 && (
            <Section title="🤖 AI Signals" color="var(--accent2)">
              <FlagList items={result.ai_flags} color="var(--accent2)" />
            </Section>
          )}

          {result.human_flags?.length > 0 && (
            <Section title="🧑 Human Signals" color="var(--accent3)">
              <FlagList items={result.human_flags} color="var(--accent3)" />
            </Section>
          )}

          {result.suspicious_phrases?.length > 0 && (
            <Section title="🚩 Flagged Phrases" color="var(--warn)" last>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.suspicious_phrases.map((p, i) => (
                  <span key={i} style={{
                    fontFamily: "var(--mono)", fontSize: 11,
                    padding: "4px 10px", borderRadius: 4,
                    border: "1px solid rgba(255,60,110,0.3)",
                    background: "rgba(255,60,110,0.08)", color: "#ff8aa8",
                  }}>"{p}"</span>
                ))}
              </div>
            </Section>
          )}
        </div>
      </Card>

      <Button variant="ghost" onClick={onReset} style={{ width: "100%" }}>
        ← Analyze Another Text
      </Button>
    </div>
  );
}

function Section({ title, color, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 20 }}>
      <div style={{
        fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
        color, marginBottom: 10,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {title}
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      {children}
    </div>
  );
}

function FlagList({ items, color }) {
  return (
    <ul style={{ listStyle: "none" }}>
      {items.map((f, i) => (
        <li key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "8px 0", borderBottom: "1px solid var(--border)",
          fontSize: 13, lineHeight: 1.6,
        }}>
          <span style={{ color, flexShrink: 0, marginTop: 2 }}>▲</span>
          {f}
        </li>
      ))}
    </ul>
  );
}
