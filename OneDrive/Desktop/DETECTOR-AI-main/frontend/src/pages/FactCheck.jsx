// pages/FactCheck.jsx — AI Fact-Checking Engine v2.0
import React, { useState, useRef } from "react";
import { Card, CardHeader, Button, Spinner } from "../components/UI";
import api from "../utils/api";

const FACTCHECK_TIMEOUT_MS = 300000;

const VERDICT_CFG = {
  "True":            { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  icon: "✅", glow: "0 0 12px rgba(34,197,94,0.3)" },
  "False":           { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: "❌", glow: "0 0 12px rgba(239,68,68,0.3)" },
  "Partially True":  { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "⚠️", glow: "0 0 12px rgba(245,158,11,0.3)" },
  "Unverifiable":    { color: "#6b7280", bg: "rgba(107,114,128,0.12)",icon: "❓", glow: "none" },
  "Opinion":         { color: "#a78bfa", bg: "rgba(167,139,250,0.12)",icon: "💬", glow: "none" },
  "Error":           { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: "⚠️", glow: "none" },
  "AI Generated":    { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: "🤖", glow: "0 0 12px rgba(239,68,68,0.3)" },
  "Human Written":   { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  icon: "👤", glow: "0 0 12px rgba(34,197,94,0.3)" },
};

const GRADE_COLORS = { A: "#22c55e", B: "#6dffb3", C: "#f59e0b", D: "#f97316", F: "#ef4444" };

function getVCfg(v) { return VERDICT_CFG[v] || VERDICT_CFG["Error"]; }

export default function FactCheck() {
  const [mode, setMode]       = useState("text"); // "text" or "url"
  const [text, setText]       = useState("");
  const [url, setUrl]         = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState("");
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let res;
      if (mode === "url") {
        if (!url.trim().startsWith("http")) throw new Error("Enter a valid URL starting with http");
        setStatus("Fetching article from URL…");
        res = await api.post("/factcheck/url", { url: url.trim() }, { timeout: FACTCHECK_TIMEOUT_MS });
      } else {
        if (!text.trim() || text.trim().length < 10) throw new Error("Enter at least one sentence");
        setStatus("Extracting claims…");
        res = await api.post("/factcheck/text", { text: text.trim() }, { timeout: FACTCHECK_TIMEOUT_MS });
      }
      setResult(res.data);
    } catch (err) {
      if (err.code === "ECONNABORTED" || String(err.message || "").toLowerCase().includes("timeout")) {
        setError("Fact-check timed out. Try a shorter input or URL with less content, then retry.");
      } else {
        setError(err.response?.data?.error || err.message || "Analysis failed");
      }
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  const reset = () => { setResult(null); setError(null); setText(""); setUrl(""); };
  const wc = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.hero}>
        <h1 style={S.h1}>
          Sentence-Level <span style={S.accent}>Fact-Checker</span>
        </h1>
        <p style={S.sub}>
          Every sentence is split, verified, and scored individually · Optimized for 10-20 second runs on typical inputs · Real-time web evidence
        </p>
      </div>

      {/* Input */}
      {!result && !loading && (
        <Card>
          <CardHeader>Input Source</CardHeader>

          {/* Mode tabs */}
          <div style={S.tabs}>
            {[["text","✏️","Text"],["url","🌐","URL"]].map(([id,ic,lb]) => (
              <button key={id} onClick={() => setMode(id)} style={S.tab(mode === id)}>
                {ic} {lb}
              </button>
            ))}
          </div>

          <div style={{ padding: 20 }}>
            {mode === "text" ? (
              <>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={"Paste any article, essay, or set of claims.\nEvery sentence will be individually verified against real-time web data…"}
                  style={S.textarea}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border2)"}
                  rows={8}
                />
                <div style={S.wc(wc > 0)}>
                  {wc} words
                </div>
              </>
            ) : (
              <>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  style={S.urlInput}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border2)"}
                  onKeyDown={e => e.key === "Enter" && analyze()}
                />
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
                  💡 Paste a news article, blog post, or Wikipedia URL. The full text will be extracted and fact-checked.
                </div>
              </>
            )}

            <Button
              onClick={analyze}
              disabled={loading || (mode === "text" ? wc < 3 : !url.trim().startsWith("http"))}
              style={{ width: "100%", marginTop: 16, height: 52, fontSize: 14 }}
            >
              🛡️ Verify Every Claim
            </Button>
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <div style={S.loadBox}>
            <Spinner size={72} />
            <div style={S.loadLabel}>Analyzing…</div>
            {status && <div style={S.statusBubble}>{status}</div>}
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, textAlign: "center", lineHeight: 1.6 }}>
              Extracting claims → Searching web → Cross-referencing evidence<br/>
              Typical runs finish in about 10-20 seconds; longer texts may take a bit more
            </div>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div style={S.errBox}>
          <span>⚠️</span>
          <div style={{ flex: 1 }}>{error}</div>
          <button onClick={() => { setError(null); }} style={S.errClose}>✕</button>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <FactCheckReport result={result} />
          <Button variant="ghost" onClick={reset} style={{ width: "100%", marginTop: 24 }}>
            ← Fact-Check Another Text
          </Button>
        </>
      )}
    </div>
  );
}

/* ─── Report Component ─────────────────────────────────────────────────────── */

export function FactCheckReport({ result }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (i) => setExpanded(p => ({ ...p, [i]: !p[i] }));

  const { claims, stats, overall_score, grade } = result;
  const gc = GRADE_COLORS[grade] || "#fff";

  return (
    <div>
      {/* Score card */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ padding: "30px 20px", textAlign: "center" }}>
          <div style={S.gradeRow}>
            <div>
              <div style={S.scoreLabel}>Overall Accuracy</div>
              <div style={{ ...S.bigScore, color: gc }}>{overall_score}%</div>
            </div>
            <div style={{ ...S.gradeBadge, borderColor: gc, color: gc }}>{grade}</div>
          </div>

          {/* Stats row */}
          <div style={S.statsRow}>
            <StatPill icon="✅" label="True"     count={stats.true}           color="#22c55e" />
            <StatPill icon="⚠️" label="Partial"  count={stats.partially_true} color="#f59e0b" />
            <StatPill icon="❌" label="False"    count={stats.false}          color="#ef4444" />
            <StatPill icon="❓" label="Unknown"  count={stats.unverifiable}   color="#6b7280" />
            {stats.opinions > 0 && (
              <StatPill icon="💬" label="Opinion" count={stats.opinions}      color="#a78bfa" />
            )}
          </div>

          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 16 }}>
            {stats.total_claims} claims extracted · {stats.factual_claims} verifiable · avg confidence {stats.average_confidence}
          </div>
        </div>
      </Card>

      {/* Source URL if applicable */}
      {result.source_url && (
        <div style={S.sourceBar}>
          🌐 Source: <a href={result.source_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", marginLeft: 6 }}>
            {result.source_url.slice(0, 60)}{result.source_url.length > 60 ? "…" : ""}
          </a>
          <span style={{ marginLeft: 12, color: "var(--muted)" }}>({result.extracted_word_count} words extracted)</span>
        </div>
      )}

      {/* Bonus: Media Analysis */}
      {result.media_analysis && (
        <Card style={{ marginBottom: 24, borderLeft: `4px solid ${result.media_analysis.verdict === 'AI' ? '#ef4444' : '#22c55e'}` }}>
          <CardHeader dot={false}>📷 Bonus: Deepfake Media Analysis</CardHeader>
          <div style={{ padding: 20, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 24 }}>{result.media_analysis.verdict === 'AI' ? '🤖' : '👤'}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: result.media_analysis.verdict === 'AI' ? '#ef4444' : '#22c55e' }}>
                    {result.media_analysis.verdict === 'AI' ? 'AI Generated Image Detected' : 'Likely Authentic Image'}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {result.media_analysis.ai_probability}% AI Probability · {result.media_analysis.confidence} Confidence
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>{result.media_analysis.summary}</p>
              {result.media_analysis.ai_flags && result.media_analysis.ai_flags.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.media_analysis.ai_flags.map((f, i) => (
                    <span key={i} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: 4, textTransform: "uppercase" }}>{f}</span>
                  ))}
                </div>
              )}
            </div>
            {result.media_analysis.source_url && (
              <img src={result.media_analysis.source_url} alt="Analyzed Media" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
            )}
          </div>
        </Card>
      )}

      {/* Granular report */}
      <h3 style={S.sectionTitle}>
        Sentence-Level Accuracy Report
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginLeft: 10 }}>
          {claims.length} claims
        </span>
      </h3>

      {claims.map((item, idx) => {
        const vcfg  = getVCfg(item.verdict);
        const isOpen = expanded[idx];
        const conf  = Math.round((item.confidence || 0) * 100);

        return (
          <div key={idx} style={{ ...S.claimCard, borderLeftColor: vcfg.color }} onClick={() => toggle(idx)}>
            {/* Header row */}
            <div style={S.claimHeader}>
              <span style={{ ...S.verdictBadge, background: vcfg.bg, color: vcfg.color, borderColor: vcfg.color + "60" }}>
                {vcfg.icon} {item.verdict}
              </span>
              <span style={S.claimIndex}>#{item.id || idx + 1}</span>
              <div style={{ ...S.confBadge, color: vcfg.color }}>
                {conf}%
              </div>
            </div>

            {/* Claim text */}
            <div style={S.claimText}>{item.claim}</div>

            {/* Confidence bar */}
            <div style={S.barTrack}>
              <div style={{ ...S.barFill, width: `${conf}%`, background: vcfg.color, boxShadow: vcfg.glow }} />
            </div>

            {/* Reasoning */}
            <div style={S.reasoning}>
              <strong style={{ color: "var(--text)" }}>Reasoning:</strong> {item.reasoning}
            </div>

            {/* Correction for false claims */}
            {item.correction && (
              <div style={S.correction}>
                <strong>✏️ Correction:</strong> {item.correction}
              </div>
            )}

            {/* Expandable details */}
            {isOpen && (
              <div style={S.details}>
                {/* Original sentence */}
                {item.original_sentence && (
                  <div style={S.detailBlock}>
                    <div style={S.detailLabel}>Original Sentence</div>
                    <div style={S.detailValue}>"{item.original_sentence}"</div>
                  </div>
                )}

                {/* Claim type */}
                <div style={S.detailBlock}>
                  <div style={S.detailLabel}>Claim Type</div>
                  <div style={{ ...S.typeBadge }}>{item.type || "factual"}</div>
                </div>

                {/* Evidence snippets */}
                {item.evidence_snippets && item.evidence_snippets.length > 0 && (
                  <div style={S.detailBlock}>
                    <div style={S.detailLabel}>Web Evidence Retrieved</div>
                    {item.evidence_snippets.map((ev, ei) => (
                      <div key={ei} style={S.evidenceCard}>
                        <div style={S.evTitle}>{ev.title}</div>
                        <div style={S.evSnippet}>{ev.snippet}</div>
                        {ev.url && (
                          <a href={ev.url} target="_blank" rel="noreferrer" style={S.evLink}
                             onClick={e => e.stopPropagation()}>
                            🔗 {ev.url.slice(0, 70)}{ev.url.length > 70 ? "…" : ""}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Citations */}
                {item.citations && item.citations.length > 0 && (
                  <div style={S.detailBlock}>
                    <div style={S.detailLabel}>Citations</div>
                    {item.citations.map((u, ci) => (
                      <a key={ci} href={u} target="_blank" rel="noreferrer" style={S.citationLink}
                         onClick={e => e.stopPropagation()}>
                        [{ci + 1}] {u}
                      </a>
                    ))}
                  </div>
                )}

                {/* Search queries used */}
                {item.search_queries && item.search_queries.length > 0 && (
                  <div style={S.detailBlock}>
                    <div style={S.detailLabel}>Search Queries Used</div>
                    {item.search_queries.map((q, qi) => (
                      <div key={qi} style={S.queryTag}>🔍 {q}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={S.expandHint}>{isOpen ? "▲ Collapse" : "▼ Click to expand evidence & citations"}</div>
          </div>
        );
      })}

    </div>
  );
}

function StatPill({ icon, label, count, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 12px", borderRadius: 8,
      background: `${color}15`, border: `1px solid ${color}30`,
    }}>
      <span>{icon}</span>
      <span style={{ fontWeight: 800, color, fontSize: 16 }}>{count}</span>
      <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}

/* ─── Styles ───────────────────────────────────────────────────────────────── */

const S = {
  page: { maxWidth: 900, margin: "0 auto", padding: "48px 20px 80px" },
  hero: { textAlign: "center", marginBottom: 44 },
  h1: {
    fontFamily: "var(--head)", fontSize: "clamp(28px,5vw,48px)", fontWeight: 800,
    letterSpacing: -1.5, color: "#fff", lineHeight: 1.1, marginBottom: 12,
  },
  accent: { color: "var(--accent)", textShadow: "0 0 30px rgba(0,229,255,0.4)" },
  sub: { fontSize: 13, color: "var(--muted)", letterSpacing: 0.5 },

  tabs: { display: "flex", borderBottom: "1px solid var(--border)" },
  tab: a => ({
    flex: 1, padding: "13px 20px", border: "none",
    fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700,
    letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    transition: "all 0.2s",
    background: a ? "rgba(0,229,255,0.07)" : "var(--surface2)",
    color: a ? "var(--accent)" : "var(--muted)",
    borderBottom: a ? "2px solid var(--accent)" : "2px solid transparent",
  }),

  textarea: {
    width: "100%", minHeight: 180, background: "var(--bg)",
    border: "1px solid var(--border2)", borderRadius: 8,
    padding: 16, color: "var(--text)", fontFamily: "var(--mono)",
    fontSize: 13, lineHeight: 1.7, resize: "vertical", outline: "none",
    transition: "border-color 0.2s",
  },
  urlInput: {
    width: "100%", background: "var(--bg)", border: "1px solid var(--border2)",
    borderRadius: 8, padding: "14px 16px", color: "var(--text)",
    fontFamily: "var(--mono)", fontSize: 13, outline: "none",
    transition: "border-color 0.2s",
  },
  wc: ok => ({
    fontSize: 11, textAlign: "right", marginTop: 6,
    color: ok ? "var(--accent3)" : "var(--muted)",
  }),

  loadBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", gap: 16 },
  loadLabel: { fontSize: 13, letterSpacing: 2, color: "var(--muted)", textTransform: "uppercase" },
  statusBubble: {
    fontSize: 12, color: "var(--accent)", letterSpacing: 0.5,
    padding: "10px 18px", background: "rgba(0,229,255,0.06)",
    border: "1px solid rgba(0,229,255,0.2)", borderRadius: 8,
  },

  errBox: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
    background: "rgba(255,60,110,0.08)", border: "1px solid rgba(255,60,110,0.3)",
    borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#ff8aa8",
  },
  errClose: {
    background: "none", border: "none", color: "#ff8aa8", cursor: "pointer", fontSize: 16,
  },

  // Report styles
  gradeRow: {
    display: "flex", justifyContent: "center", alignItems: "center", gap: 30, marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 11, color: "var(--muted)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4,
  },
  bigScore: {
    fontSize: 52, fontWeight: 900, fontFamily: "var(--head)", lineHeight: 1,
  },
  gradeBadge: {
    width: 60, height: 60, borderRadius: 12, display: "flex",
    alignItems: "center", justifyContent: "center",
    fontSize: 28, fontWeight: 900, fontFamily: "var(--head)",
    border: "2px solid", background: "rgba(255,255,255,0.03)",
  },
  statsRow: {
    display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 16,
  },
  sourceBar: {
    fontSize: 12, color: "var(--text)", padding: "10px 16px", marginBottom: 16,
    background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.15)",
    borderRadius: 8,
  },
  sectionTitle: {
    fontFamily: "var(--head)", color: "#fff", marginBottom: 16, fontSize: 18,
    display: "flex", alignItems: "baseline",
  },

  // Claim cards
  claimCard: {
    background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)",
    borderLeft: "3px solid", borderRadius: 10, padding: "16px 20px",
    marginBottom: 12, cursor: "pointer", transition: "background 0.2s",
  },
  claimHeader: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
  },
  verdictBadge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 10px", borderRadius: 6, fontSize: 11,
    fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8,
    border: "1px solid",
  },
  claimIndex: {
    fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)", letterSpacing: 1,
  },
  confBadge: {
    marginLeft: "auto", fontSize: 13, fontWeight: 800, fontFamily: "var(--head)",
  },
  claimText: {
    fontSize: 14, color: "#fff", fontWeight: 500, lineHeight: 1.6, marginBottom: 8,
  },
  barTrack: {
    height: 4, width: "100%", background: "rgba(255,255,255,0.05)",
    borderRadius: 2, overflow: "hidden", marginBottom: 10,
  },
  barFill: {
    height: "100%", borderRadius: 2, transition: "width 1s ease-out",
  },
  reasoning: {
    fontSize: 12, color: "var(--muted)", lineHeight: 1.6,
  },
  correction: {
    fontSize: 12, color: "#f59e0b", lineHeight: 1.6, marginTop: 8,
    padding: "8px 12px", background: "rgba(245,158,11,0.08)",
    border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6,
  },
  expandHint: {
    fontSize: 10, color: "var(--muted)", textAlign: "center", marginTop: 10,
    letterSpacing: 0.5, opacity: 0.6,
  },

  // Expanded details
  details: {
    marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  detailBlock: { marginBottom: 14 },
  detailLabel: {
    fontSize: 10, color: "var(--muted)", textTransform: "uppercase",
    letterSpacing: 1.5, marginBottom: 6, fontWeight: 700,
  },
  detailValue: {
    fontSize: 12, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic",
  },
  typeBadge: {
    display: "inline-block", fontSize: 10, padding: "2px 8px",
    borderRadius: 4, background: "rgba(0,229,255,0.08)",
    color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1,
  },
  evidenceCard: {
    background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)",
    borderRadius: 8, padding: 12, marginBottom: 8,
  },
  evTitle: { fontSize: 12, color: "var(--text)", fontWeight: 600, marginBottom: 4 },
  evSnippet: { fontSize: 11, color: "var(--muted)", lineHeight: 1.5 },
  evLink: {
    display: "block", fontSize: 10, color: "var(--accent)", textDecoration: "none",
    marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  citationLink: {
    display: "block", fontSize: 11, color: "var(--accent)", textDecoration: "none",
    marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  queryTag: {
    display: "inline-block", fontSize: 10, padding: "3px 8px", marginRight: 6, marginBottom: 4,
    borderRadius: 4, background: "rgba(255,255,255,0.04)", color: "var(--muted)",
    border: "1px solid var(--border)",
  },
};
