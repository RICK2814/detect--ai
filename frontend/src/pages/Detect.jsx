// pages/Detect.jsx — Main detection page
import React, { useState, useRef } from "react";
import { detectText, detectUrl, detectFile } from "../utils/api";
import Results from "../components/Results";
import { Card, CardHeader, Button, Spinner } from "../components/UI";

const STEPS = [
  "Fetching content…",
  "Running linguistic analysis…",
  "Querying detection model…",
  "Generating report…",
];

export default function Detect() {
  const [tab,     setTab]     = useState("text");
  const [text,    setText]    = useState("");
  const [url,     setUrl]     = useState("");
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [step,    setStep]    = useState(0);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [dragging,setDragging]= useState(false);
  const fileRef = useRef();

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const canAnalyze = !loading && (
    (tab === "text" && wordCount >= 20) ||
    (tab === "url"  && url.trim().startsWith("http")) ||
    (tab === "file" && file)
  );

  const analyze = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    setStep(0);

    try {
      let res;
      if (tab === "text") {
        setStep(1); await delay(300);
        setStep(2);
        res = await detectText(text.trim());
      } else if (tab === "url") {
        setStep(0); await delay(200);
        setStep(1); await delay(300);
        setStep(2);
        res = await detectUrl(url.trim());
      } else {
        setStep(0); await delay(200);
        setStep(1); await delay(300);
        setStep(2);
        res = await detectFile(file);
      }
      setStep(3);
      setResult(res);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Detection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setError(null); setText(""); setUrl(""); setFile(null); setStep(0); };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "48px 20px 80px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <h1 style={{
          fontFamily: "var(--head)", fontSize: "clamp(28px,5vw,48px)",
          fontWeight: 800, letterSpacing: -1.5, color: "#fff", lineHeight: 1.1, marginBottom: 12,
        }}>
          Is this text{" "}
          <span style={{ color: "var(--accent)", textShadow: "0 0 30px rgba(0,229,255,0.4)" }}>
            AI-generated?
          </span>
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", letterSpacing: 0.5 }}>
          Forensic analysis powered by Claude AI · Supports text, URLs, and file uploads
        </p>
      </div>

      {/* Input */}
      {!result && !loading && (
        <Card>
          <CardHeader>Input Source</CardHeader>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            {[["text","✏️","Paste Text"],["url","🌐","From URL"],["file","📁","Upload File"]].map(([id,icon,label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, padding: "13px 20px", border: "none",
                fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700,
                letterSpacing: 1, textTransform: "uppercase",
                cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: tab === id ? "rgba(0,229,255,0.07)" : "var(--surface2)",
                color:      tab === id ? "var(--accent)"        : "var(--muted)",
                borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
              }}>
                {icon} {label}
              </button>
            ))}
          </div>

          <div style={{ padding: 20 }}>
            {tab === "text" && (
              <textarea
                value={text} onChange={e => setText(e.target.value)}
                placeholder="Paste the text you want to analyze here… (minimum 20 words)"
                style={{
                  width: "100%", minHeight: 180, background: "var(--bg)",
                  border: "1px solid var(--border2)", borderRadius: 8,
                  padding: 16, color: "var(--text)", fontFamily: "var(--mono)",
                  fontSize: 13, lineHeight: 1.7, resize: "vertical", outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border2)"}
              />
            )}

            {tab === "url" && (
              <input
                type="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                style={{
                  width: "100%", background: "var(--bg)",
                  border: "1px solid var(--border2)", borderRadius: 8,
                  padding: "14px 16px", color: "var(--text)",
                  fontFamily: "var(--mono)", fontSize: 13, outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border2)"}
              />
            )}

            {tab === "file" && (
              <div
                onClick={() => fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragging ? "var(--accent)" : "var(--border2)"}`,
                  borderRadius: 8, padding: "40px 20px", textAlign: "center",
                  cursor: "pointer", transition: "all 0.2s",
                  background: dragging ? "rgba(0,229,255,0.04)" : "var(--bg)",
                }}
              >
                <input ref={fileRef} type="file" accept=".txt,.md,.html,.htm,.pdf"
                  style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
                <div style={{ fontSize: 36, marginBottom: 10 }}>{file ? "📄" : "📂"}</div>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
                  {file
                    ? <strong style={{ color: "var(--text)" }}>{file.name}</strong>
                    : <><strong style={{ color: "var(--text)" }}>Click or drag</strong> to upload<br />.txt · .md · .pdf files supported</>
                  }
                </p>
              </div>
            )}
          </div>

          <div style={{ padding: "0 20px 20px" }}>
            {tab === "text" && (
              <div style={{ fontSize: 11, color: wordCount >= 20 ? "var(--accent3)" : "var(--muted)", textAlign: "right", marginBottom: 12 }}>
                {wordCount} words {wordCount < 20 && wordCount > 0 ? `· need ${20 - wordCount} more` : wordCount >= 20 ? "· ready ✓" : ""}
              </div>
            )}
            <Button onClick={analyze} disabled={!canAnalyze} style={{ width: "100%", fontSize: 14, padding: 16 }}>
              🔍 Analyze Text
            </Button>
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", gap: 24 }}>
            <Spinner size={72} />
            <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: 2, textTransform: "uppercase" }}>
              Scanning…
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  fontSize: 12,
                  color: i < step ? "var(--accent3)" : i === step ? "var(--accent)" : "var(--muted)",
                  transition: "color 0.3s",
                }}>
                  <span style={{ width: 20, textAlign: "center" }}>
                    {i < step ? "✅" : i === step ? "⚡" : "○"}
                  </span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <>
          <div style={{
            background: "rgba(255,60,110,0.08)", border: "1px solid rgba(255,60,110,0.3)",
            borderRadius: 10, padding: 20, fontSize: 13, color: "#ff8aa8",
            display: "flex", gap: 12, marginBottom: 16,
          }}>
            <span>⚠️</span><div>{error}</div>
          </div>
          <Button variant="ghost" onClick={reset} style={{ width: "100%" }}>← Try Again</Button>
        </>
      )}

      {/* Results */}
      {result && <Results result={result} onReset={reset} />}
    </div>
  );
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));
