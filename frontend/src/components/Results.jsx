// components/Results.jsx — Ultra Detection Results
import React, { useState } from "react";
import { Gauge, SignalBar, VerdictBadge, Card, CardHeader, Button } from "./UI";

const getColor = v =>
  v === "AI" ? "var(--accent2)" : v === "Human" ? "var(--accent3)" : "var(--warn)";

// Mini gauge for paragraph analysis
function MiniGauge({ pct, verdict }) {
  const color = getColor(verdict);
  return (
    <div style={{
      width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
      background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color, position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 4, borderRadius: "50%",
        background: "var(--surface)", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 10, color,
      }}>{pct}%</div>
    </div>
  );
}

// Horizontal score bar with label
function ScoreRow({ label, value, max = 100, color, tooltip }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}/{max}</span>
      </div>
      <div style={{ background: "var(--bg)", borderRadius: 4, height: 5, overflow: "hidden" }}>
        <div style={{
          width: `${(value / max) * 100}%`, height: "100%",
          background: color, borderRadius: 4,
          boxShadow: `0 0 6px ${color}`,
          transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

export default function Results({ result, onReset }) {
  const [showParagraphs, setShowParagraphs] = useState(false);
  const [showRawStats,   setShowRawStats]   = useState(false);
  const color = getColor(result.verdict);
  const ds = result.detailed_stats || {};
  const pa = result.paragraph_analysis;

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .toggle-btn { background:none; border:1px solid var(--border2); border-radius:6px;
          padding:6px 12px; color:var(--muted); font-family:var(--mono); font-size:11px;
          cursor:pointer; letter-spacing:1px; transition:all 0.2s; }
        .toggle-btn:hover { border-color:var(--accent); color:var(--accent); }
      `}</style>

      {/* ── Main Verdict Card ── */}
      <div style={{
        background: "var(--surface)", border: `1px solid ${color}44`,
        borderRadius: 12, padding: "28px 28px", marginBottom: 16,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position:"absolute", inset:0, background:color, opacity:0.04 }} />
        <div style={{ display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
          <Gauge pct={result.ai_probability} color={color} size={120} />
          <div style={{ flex:1, minWidth: 200 }}>
            <VerdictBadge verdict={result.verdict} />
            <div style={{ fontSize:11, color:"var(--muted)", margin:"10px 0 4px" }}>
              Confidence: <strong style={{ color:"var(--text)" }}>{result.confidence}</strong>
              {result.id && <span style={{ marginLeft:12, color:"var(--muted)" }}>
                ID: <code style={{ color:"var(--accent)", fontSize:10 }}>{result.id.slice(0,8)}</code>
              </span>}
            </div>
            <div style={{
              fontSize:13, lineHeight:1.75, color:"var(--text)",
              borderLeft:`3px solid ${color}`, paddingLeft:14, opacity:0.9,
            }}>
              {result.summary}
            </div>
          </div>
        </div>

        {/* Dual score bar — stats vs LLM */}
        {result.stat_ai_score !== undefined && result.llm_ai_score !== undefined && (
          <div style={{
            marginTop:20, padding:"14px 16px",
            background:"rgba(0,0,0,0.3)", borderRadius:8,
            display:"grid", gridTemplateColumns:"1fr 1fr", gap:12,
          }}>
            <div>
              <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:1, marginBottom:6 }}>
                📊 STATISTICAL ANALYSIS
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{
                  flex:1, height:8, background:"var(--bg)", borderRadius:4, overflow:"hidden",
                }}>
                  <div style={{
                    width:`${result.stat_ai_score}%`, height:"100%",
                    background: result.stat_ai_score > 60 ? "var(--accent2)" : "var(--accent3)",
                    borderRadius:4, transition:"width 1s",
                  }} />
                </div>
                <span style={{ fontSize:13, fontWeight:700,
                  color: result.stat_ai_score > 60 ? "var(--accent2)" : "var(--accent3)" }}>
                  {result.stat_ai_score}%
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:1, marginBottom:6 }}>
                🧠 LLM ENSEMBLE (3 MODELS)
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{
                  flex:1, height:8, background:"var(--bg)", borderRadius:4, overflow:"hidden",
                }}>
                  <div style={{
                    width:`${result.llm_ai_score}%`, height:"100%",
                    background: result.llm_ai_score > 60 ? "var(--accent2)" : "var(--accent3)",
                    borderRadius:4, transition:"width 1s",
                  }} />
                </div>
                <span style={{ fontSize:13, fontWeight:700,
                  color: result.llm_ai_score > 60 ? "var(--accent2)" : "var(--accent3)" }}>
                  {result.llm_ai_score}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats Row ── */}
      <Card style={{ marginBottom:16 }}>
        <CardHeader>Document Statistics</CardHeader>
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(4,1fr)",
          padding:16, gap:8,
        }}>
          {[
            ["Words",      result.word_count?.toLocaleString(),      "var(--accent)"],
            ["Sentences",  result.sentence_count,                    "var(--accent)"],
            ["Avg Len",    result.avg_sentence_length + "w",         "var(--accent)"],
            ["Paragraphs", result.paragraph_count || "—",            "var(--accent)"],
          ].map(([label, val, c]) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"var(--head)", fontSize:22, fontWeight:800, color:c }}>{val}</div>
              <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:1, textTransform:"uppercase", marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Signal Bars ── */}
      {result.signals && (
        <Card style={{ marginBottom:16 }}>
          <CardHeader>Detection Signals</CardHeader>
          <div style={{ padding:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {Object.entries(result.signals).map(([key, sig]) => {
              const label = key.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
              const aiScore = sig.score;
              const barColor = aiScore >= 65 ? "var(--accent2)" : aiScore <= 35 ? "var(--accent3)" : "var(--warn)";
              return (
                <div key={key} style={{
                  background:"var(--bg)", border:"1px solid var(--border)",
                  borderRadius:8, padding:12,
                }}>
                  <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:1, textTransform:"uppercase", marginBottom:8, display:"flex", gap:6, alignItems:"center" }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:barColor, display:"inline-block", flexShrink:0 }} />
                    {label}
                  </div>
                  <div style={{ background:"var(--surface)", borderRadius:3, height:5, marginBottom:6, overflow:"hidden" }}>
                    <div style={{ width:`${sig.score}%`, height:"100%", background:barColor, borderRadius:3, transition:"width 1s" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--muted)" }}>
                    <span style={{ fontSize:10 }}>{sig.label}</span>
                    <span style={{ fontWeight:700, color:"var(--text)" }}>{sig.score}/100</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Forensic Analysis ── */}
      <Card style={{ marginBottom:16 }}>
        <CardHeader>Forensic Analysis</CardHeader>
        <div style={{ padding:20 }}>
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
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {result.suspicious_phrases.map((p,i) => (
                  <span key={i} style={{
                    fontFamily:"var(--mono)", fontSize:11, padding:"3px 9px", borderRadius:4,
                    border:"1px solid rgba(255,60,110,0.3)", background:"rgba(255,60,110,0.08)", color:"#ff8aa8",
                  }}>"{p}"</span>
                ))}
              </div>
            </Section>
          )}
        </div>
      </Card>

      {/* ── Paragraph Analysis ── */}
      {pa && pa.length > 0 && (
        <Card style={{ marginBottom:16 }}>
          <CardHeader>
            <span style={{ flex:1 }}>Paragraph-Level Analysis</span>
            <button className="toggle-btn" onClick={() => setShowParagraphs(!showParagraphs)}>
              {showParagraphs ? "Hide" : "Show"} →
            </button>
          </CardHeader>
          {showParagraphs && (
            <div style={{ padding:16 }}>
              <div style={{ fontSize:11, color:"var(--muted)", marginBottom:14 }}>
                Each text section analyzed independently — reveals mixed human/AI writing.
              </div>
              {pa.map((p, i) => {
                const c = getColor(p.verdict);
                return (
                  <div key={i} style={{
                    display:"flex", gap:12, padding:"12px 14px", marginBottom:8,
                    background:"var(--bg)", border:`1px solid ${c}33`, borderRadius:8,
                    borderLeft:`3px solid ${c}`,
                  }}>
                    <MiniGauge pct={p.ai_probability} verdict={p.verdict} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:11, color:"var(--muted)" }}>Section {i+1}</span>
                        <VerdictBadge verdict={p.verdict} size="sm" />
                      </div>
                      <div style={{ fontSize:12, color:"var(--text)", opacity:0.8, lineHeight:1.5 }}>{p.text}</div>
                      {p.signals?.length > 0 && (
                        <div style={{ marginTop:6, display:"flex", flexWrap:"wrap", gap:4 }}>
                          {p.signals.map((s,j) => (
                            <span key={j} style={{
                              fontSize:10, padding:"2px 7px", borderRadius:3,
                              background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)",
                              color:"var(--muted)",
                            }}>{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Detailed Stats ── */}
      {Object.keys(ds).length > 0 && (
        <Card style={{ marginBottom:16 }}>
          <CardHeader>
            <span style={{ flex:1 }}>Raw Statistical Breakdown</span>
            <button className="toggle-btn" onClick={() => setShowRawStats(!showRawStats)}>
              {showRawStats ? "Hide" : "Show"} →
            </button>
          </CardHeader>
          {showRawStats && (
            <div style={{ padding:16 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[
                  ["Sentence Burstiness",  ds.burstiness,            "var(--accent3)", "Higher = more human-like variation"],
                  ["Type-Token Ratio",     ds.type_token_ratio,      "var(--accent3)", "Higher = richer vocabulary"],
                  ["AI Vocab Score",       ds.ai_vocab_score,        "var(--accent2)", "Higher = more AI marker words"],
                  ["Transition Density",   Math.min(100,Math.round((ds.transition_ratio||0)*10)), "var(--accent2)", `${ds.transition_ratio} per 100 words`],
                  ["Informality Score",    ds.informality_score,     "var(--accent3)", "Higher = more informal/human"],
                  ["Para Uniformity",      ds.paragraph_uniformity,  "var(--accent2)", "Higher = more AI-like uniform paras"],
                  ["Repetition Score",     ds.repetition_score,      "var(--accent2)", "Higher = more repetitive (AI)"],
                ].map(([label, val, color, note]) => (
                  <div key={label} style={{
                    padding:10, background:"var(--bg)",
                    border:"1px solid var(--border)", borderRadius:6,
                  }}>
                    <div style={{ fontSize:10, color:"var(--muted)", marginBottom:6 }}>{label}</div>
                    <ScoreRow label="" value={val ?? 0} color={color} />
                    <div style={{ fontSize:10, color:"var(--muted)", marginTop:-4 }}>{note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Button variant="ghost" onClick={onReset} style={{ width:"100%" }}>
        ← Analyze Another Text
      </Button>
    </div>
  );
}

function Section({ title, color, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 20 }}>
      <div style={{
        fontSize:11, letterSpacing:1.5, textTransform:"uppercase",
        color, marginBottom:10, display:"flex", alignItems:"center", gap:8,
      }}>
        {title}
        <span style={{ flex:1, height:1, background:"var(--border)" }} />
      </div>
      {children}
    </div>
  );
}

function FlagList({ items, color }) {
  return (
    <ul style={{ listStyle:"none" }}>
      {items.map((f,i) => (
        <li key={i} style={{
          display:"flex", alignItems:"flex-start", gap:10,
          padding:"7px 0", borderBottom:"1px solid var(--border)",
          fontSize:13, lineHeight:1.6, color:"var(--text)",
        }}>
          <span style={{ color, flexShrink:0, marginTop:3 }}>▲</span>{f}
        </li>
      ))}
    </ul>
  );
}