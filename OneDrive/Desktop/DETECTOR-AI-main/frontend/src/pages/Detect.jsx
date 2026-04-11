// pages/Detect.jsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { detectText, detectUrl, detectImage, factCheckText, factCheckUrl } from "../utils/api";
import Results from "../components/Results";
import { FactCheckReport } from "./FactCheck";
import { Card, CardHeader, Button, Spinner } from "../components/UI";
import RealisticFigure from "../components/RealisticFigure";

const TAB_ITEMS = [
  ["text", <RealisticFigure symbol="✏️" className="animated-emoji emoji-icon" />, "Text"],
  ["url", <RealisticFigure symbol="🌐" className="animated-emoji emoji-icon" />, "URL"],
  ["file", <RealisticFigure symbol="🖼️" className="animated-emoji emoji-icon" />, "Image"],
];

const LOADING_HINTS = [
  "Calibrating linguistic fingerprint signals...",
  "Comparing sentence rhythm and perplexity patterns...",
  "Cross-checking confidence signals before final verdict...",
];

export default function Detect() {
  const [tab, setTab] = useState("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [factResult, setFactResult] = useState(null);
  const [factLoading, setFactLoading] = useState(false);
  const [factError, setFactError] = useState(null);

  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [hintIndex, setHintIndex] = useState(0);

  const fileRef = useRef();
  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const pastedWc = pastedText.trim() ? pastedText.trim().split(/\s+/).filter(Boolean).length : 0;

  useEffect(() => {
    if (!loading) {
      setHintIndex(0);
      return;
    }
    const id = setInterval(() => {
      setHintIndex(prev => (prev + 1) % LOADING_HINTS.length);
    }, 2100);
    return () => clearInterval(id);
  }, [loading]);

  const canAnalyze = !loading && (
    (tab === "text" && wordCount >= 20) ||
    (tab === "url" && (url.trim().startsWith("http") || (showPasteFallback && pastedWc >= 20))) ||
    (tab === "file" && file)
  );

  const analyze = useCallback(async () => {
    setError(null);
    setResult(null);
    setFactResult(null);
    setFactError(null);
    setLoading(true);
    setStatusMsg("Starting...");

    try {
      let res;

      if (tab === "text") {
        setStatusMsg("Analyzing...");
        res = await detectText(text.trim());

        setFactLoading(true);
        factCheckText(text.trim())
          .then(setFactResult)
          .catch(e => setFactError(e.response?.data?.error || e.message))
          .finally(() => setFactLoading(false));
      } else if (tab === "url") {
        if (showPasteFallback && pastedWc >= 20) {
          setStatusMsg("Analyzing pasted text...");
          res = await detectText(pastedText.trim());
          res._source_url = url;

          setFactLoading(true);
          factCheckText(pastedText.trim())
            .then(setFactResult)
            .catch(e => setFactError(e.response?.data?.error || e.message))
            .finally(() => setFactLoading(false));
        } else {
          res = await detectUrl(url.trim(), msg => setStatusMsg(msg));

          setFactLoading(true);
          factCheckUrl(url.trim())
            .then(setFactResult)
            .catch(e => setFactError(e.response?.data?.error || e.message))
            .finally(() => setFactLoading(false));
        }
      } else {
        setStatusMsg("Analyzing image forensic patterns...");
        res = await detectImage(file);
      }

      setResult(res);
    } catch (e) {
      if (e.extractionFailed) {
        setShowPasteFallback(true);
        setStatusMsg("");
        setLoading(false);
        return;
      }
      setError(e.response?.data?.error || e.message || "Detection failed.");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  }, [tab, text, url, file, showPasteFallback, pastedText, pastedWc]);

  const reset = () => {
    setResult(null);
    setError(null);
    setStatusMsg("");
    setFactResult(null);
    setFactError(null);
    setFactLoading(false);
    setText("");
    setUrl("");
    setFile(null);
    setPreview(null);
    setShowPasteFallback(false);
    setPastedText("");
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const onFileChange = e => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      if (f.type.startsWith("image/")) setPreview(URL.createObjectURL(f));
    }
  };

  const stageLabels = ["Extract", "Analyze", "Finalize"];
  const lowerStatus = String(statusMsg || "").toLowerCase();
  const activeStage = lowerStatus.includes("analy") ? 1 : lowerStatus.includes("final") ? 2 : 0;

  const tabHelper = tab === "text"
    ? "Best results come from 60+ words with natural paragraph flow and punctuation."
    : tab === "url"
      ? "Public article/document links work best. Private links may require paste fallback."
      : "Upload high-resolution images for stronger forensic confidence.";

  return (
    <div className="detect-workspace reveal-slow" style={{ maxWidth: 820, margin: "0 auto", padding: "48px 20px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 className="premium-heading" style={{ fontFamily: "var(--head)", fontSize: "clamp(28px,5vw,48px)", fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 12, animation: "gradientFlow 5s ease-in-out infinite" }}>
          Is it <span style={{ color: "var(--accent)", textShadow: "0 0 30px rgba(0,229,255,0.4)" }}>AI-generated?</span>
        </h1>
        <p className="premium-subtext" style={{ fontSize: 13, color: "var(--muted)", letterSpacing: 0.5, animation: "fadeInUpCascade 600ms cubic-bezier(0.34,1.56,0.64,1) backwards 100ms" }}>Multi-signal forensic analysis · Text · URLs · Images</p>
        <div className="hud-cluster">
          <span className="hud-chip">Live Inference</span>
          <span className="hud-chip">Signal Fusion</span>
          <span className="hud-chip">Forensic UX</span>
        </div>
      </div>

      {!result && !loading && (
        <div className="hud-frame fade-in-quick">
          <Card>
            <CardHeader>Input Source</CardHeader>

          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            {TAB_ITEMS.map(([id, icon, label]) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => { setTab(id); setShowPasteFallback(false); setError(null); }}
                  style={{
                    flex: 1,
                    padding: "13px 20px",
                    border: "none",
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                    background: active ? "rgba(0,229,255,0.07)" : "var(--surface2)",
                    color: active ? "var(--accent)" : "var(--muted)",
                    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "var(--accent)" : "rgba(120,145,170,0.45)", boxShadow: active ? "0 0 10px rgba(0,229,255,0.6)" : "none", transition: "all 300ms ease" }} />
                  {icon} {label}
                </button>
              );
            })}
          </div>

          <div style={{ padding: 20 }} className="fade-up-soft" key={tab}>
            {tab === "text" && (
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste the text you want to analyze here... (minimum 20 words)"
                style={{ width: "100%", minHeight: 180, background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 8, padding: 16, color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.7, resize: "vertical", outline: "none", transition: "all 200ms cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "inset 0 0 0 rgba(0,229,255,0)" }}
              />
            )}

            {tab === "url" && (
              <div>
                <input
                  type="url"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setShowPasteFallback(false); setError(null); }}
                  placeholder="https://example.com/article"
                  style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 8, padding: "14px 16px", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13, outline: "none", transition: "all 200ms cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "inset 0 0 0 rgba(0,229,255,0)" }}
                  onKeyDown={e => e.key === "Enter" && canAnalyze && analyze()}
                />

                {showPasteFallback && (
                  <div className="fade-in-quick" style={{ marginTop: 16, padding: 16, background: "rgba(255,184,48,0.06)", border: "1px solid rgba(255,184,48,0.3)", borderRadius: 10, animation: "fadeInUpCascade 400ms cubic-bezier(0.34,1.56,0.64,1)" }}>
                    <div style={{ fontSize: 13, color: "var(--warn)", fontWeight: 700, marginBottom: 8 }}><RealisticFigure symbol="⚠️" className="animated-emoji emoji-status" /> Could not auto-extract text from this URL</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, lineHeight: 1.6 }}>
                      The website blocks automated access. Open the page, copy text, and paste below.
                    </div>
                    <textarea
                      value={pastedText}
                      onChange={e => setPastedText(e.target.value)}
                      placeholder="Paste the article text here..."
                      style={{ width: "100%", minHeight: 150, background: "var(--bg)", border: `1px solid ${pastedWc >= 20 ? "var(--accent3)" : "var(--border2)"}`, borderRadius: 8, padding: 16, color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.7, resize: "vertical", outline: "none", transition: "all 200ms ease" }}
                    />
                    <div style={{ fontSize: 11, color: pastedWc >= 20 ? "var(--accent3)" : "var(--muted)", marginTop: 6, textAlign: "right", transition: "color 200ms ease" }}>
                      {pastedWc} words {pastedWc > 0 && pastedWc < 20 ? `· need ${20 - pastedWc} more` : pastedWc >= 20 ? "· ready ✓" : ""}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "file" && (
              <div
                onClick={() => fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{ border: `2px dashed ${dragging ? "var(--accent)" : "var(--border2)"}`, borderRadius: 8, padding: "40px 20px", textAlign: "center", cursor: "pointer", transition: "all 300ms cubic-bezier(0.34,1.56,0.64,1)", background: dragging ? "rgba(0,229,255,0.04)" : "var(--bg)", transform: dragging ? "scale(1.01)" : "scale(1)" }}
              >
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
                {preview ? (
                  <div className="zoom-in">
                    <img src={preview} alt="preview" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, border: "1px solid var(--border2)", animation: "blurInReveal 480ms cubic-bezier(0.34,1.56,0.64,1)" }} />
                    <div style={{ marginTop: 12, fontSize: 12, color: "var(--accent)", animation: "fadeInUpCascade 500ms ease-out 200ms backwards" }}>{file?.name}</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 10, animation: "fadeInUpCascade 400ms ease-out" }}><RealisticFigure symbol="🖼️" className="animated-emoji emoji-icon" size={36} /></div>
                    <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, animation: "fadeInUpCascade 500ms ease-out 100ms backwards" }}>Click or drag an image to analyze</p>
                  </>
                )}
              </div>
            )}

            <div style={{ marginTop: 12, border: "1px dashed var(--border2)", borderRadius: 10, padding: "11px 13px", background: "rgba(9,16,25,0.55)", color: "var(--muted2)", fontSize: 11, lineHeight: 1.65, transition: "all 200ms ease", animation: "fadeInUpCascade 600ms ease-out 150ms backwards" }}>
              <RealisticFigure symbol="💡" className="animated-emoji emoji-status" /> {tabHelper}
            </div>
          </div>

            <div style={{ padding: "0 20px 20px" }}>
            {tab === "text" && (
              <div style={{ fontSize: 11, color: wordCount >= 20 ? "var(--accent3)" : "var(--muted)", textAlign: "right", marginBottom: 12, transition: "color 200ms ease", animation: "fadeInUpCascade 500ms ease-out 200ms backwards" }}>
                {wordCount} words{wordCount > 0 && wordCount < 20 ? ` · need ${20 - wordCount} more` : ""}{wordCount >= 20 ? " · ready ✓" : ""}
              </div>
            )}
            <Button onClick={analyze} disabled={!canAnalyze} style={{ width: "100%", fontSize: 14, padding: 16 }}>
              <RealisticFigure symbol="🔍" className="animated-emoji emoji-action" /> {showPasteFallback && pastedWc >= 20 ? "Analyze Pasted Text" : "Analyze"}
            </Button>
            </div>
          </Card>
        </div>
      )}

      {loading && (
        <Card className="fade-in-quick" style={{ animation: "fadeInUpCascade 400ms ease-out" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", gap: 20 }}>
            <Spinner size={72} />
            <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: 2, textTransform: "uppercase", animation: "textShimmerSoft 2.2s ease-in-out infinite" }}>Scanning...</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", width: "100%", animation: "fadeInUpCascade 500ms ease-out 100ms backwards" }}>
              {stageLabels.map((label, idx) => (
                <span key={label} style={{ padding: "6px 11px", borderRadius: 999, border: `1px solid ${idx <= activeStage ? "rgba(0,229,255,0.32)" : "var(--border)"}`, background: idx <= activeStage ? "rgba(0,229,255,0.1)" : "rgba(8,14,22,0.72)", color: idx <= activeStage ? "var(--accent)" : "var(--muted)", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", transition: "all 300ms ease", animation: "fadeInUpCascade 600ms ease-out " + (idx * 80) + "ms backwards" }} className={idx <= activeStage ? "pulse-glow" : ""}>
                  {label}
                </span>
              ))}
            </div>
            {statusMsg && <div style={{ fontSize: 12, color: "var(--accent)", letterSpacing: 0.5, maxWidth: 380, textAlign: "center", lineHeight: 1.7, padding: "10px 18px", background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 8, animation: "fadeInUpCascade 700ms ease-out 200ms backwards" }}>{statusMsg}</div>}
            <div className="text-shimmer-soft" style={{ fontSize: 11, textAlign: "center", maxWidth: 430, animation: "fadeInUpCascade 800ms ease-out 300ms backwards" }}>{LOADING_HINTS[hintIndex]}</div>
          </div>
        </Card>
      )}

      {error && !showPasteFallback && (
        <>
          <div className="fade-in-quick" style={{ background: "rgba(255,60,110,0.08)", border: "1px solid rgba(255,60,110,0.3)", borderRadius: 10, padding: 20, fontSize: 13, color: "#ff8aa8", display: "flex", gap: 12, marginBottom: 16, animation: "errorShake 300ms ease-out" }}>
            <span style={{ flexShrink: 0 }}><RealisticFigure symbol="⚠️" className="animated-emoji emoji-status" /></span><div>{error}</div>
          </div>
          <Button variant="ghost" onClick={reset} style={{ width: "100%", animation: "fadeInUpCascade 400ms ease-out 100ms backwards" }}>← Try Again</Button>
        </>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32, animation: "fadeInUpCascade 500ms ease-out" }}>
          <Results result={result} onReset={reset} />

          {(tab === "text" || tab === "url") && (
            <div style={{ marginTop: 16 }}>
              {factLoading && (
                <Card className="fade-in-quick">
                  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "30px 20px" }}>
                    <Spinner size={30} />
                    <div>
                      <div style={{ fontSize: 13, letterSpacing: 1, color: "var(--accent)", animation: "textShimmerSoft 2.2s ease-in-out infinite" }}>FACT CHECKING IN PROGRESS</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                        Analyzing context, querying real-time web sources, and verifying sentences...
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {factError && (
                <div className="fade-in-quick" style={{ background: "rgba(255,60,110,0.08)", border: "1px solid rgba(255,60,110,0.3)", borderRadius: 10, padding: 20, fontSize: 13, color: "#ff8aa8", display: "flex", gap: 12, marginBottom: 16, animation: "errorShake 300ms ease-out" }}>
                  <span style={{ flexShrink: 0 }}><RealisticFigure symbol="⚠️" className="animated-emoji emoji-status" /></span>
                  <div>Fact Checking Failed: {factError}</div>
                </div>
              )}

              {factResult && (
                <div className="fade-in-slow">
                  <h2 style={{ fontFamily: "var(--head)", color: "#fff", marginBottom: 16, fontSize: 24, animation: "fadeInUpCascade 500ms ease-out" }}>
                    Fact & Claim Verification
                  </h2>
                  <FactCheckReport result={factResult} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
