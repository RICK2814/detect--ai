// pages/History.jsx — Scan history with pagination
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory, deleteScan } from "../utils/api";
import { VerdictBadge, Card, CardHeader, Button, Spinner } from "../components/UI";

function formatDate(dt) {
  return new Date(dt).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function History() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [page,    setPage]    = useState(1);
  const [deleting,setDeleting]= useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getHistory(page, 15);
      setData(res);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this scan?")) return;
    setDeleting(id);
    try {
      await deleteScan(id);
      load();
    } catch (err) {
      alert("Failed to delete scan.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 80px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--head)", fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
          Scan History
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
          All previous detection results stored in the database.
        </p>
      </div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Spinner size={48} />
        </div>
      )}

      {error && (
        <div style={{
          background: "rgba(255,60,110,0.08)", border: "1px solid rgba(255,60,110,0.3)",
          borderRadius: 10, padding: 20, fontSize: 13, color: "#ff8aa8",
        }}>
          ⚠️ {error} — <button onClick={load} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {!loading && data && (
        <>
          {data.scans.length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                <p>No scans yet. <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontFamily: "var(--mono)" }}>Run your first analysis →</button></p>
              </div>
            </Card>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>
                {data.pagination.total} total scans · Page {data.pagination.page} of {data.pagination.pages}
              </div>

              <Card>
                <CardHeader>Results</CardHeader>
                <div>
                  {data.scans.map((scan, i) => (
                    <div
                      key={scan.id}
                      onClick={() => navigate(`/history/${scan.id}`)}
                      style={{
                        display: "flex", alignItems: "center", gap: 16,
                        padding: "14px 20px",
                        borderBottom: i < data.scans.length - 1 ? "1px solid var(--border)" : "none",
                        cursor: "pointer", transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Source icon */}
                      <span style={{ fontSize: 20, flexShrink: 0 }}>
                        {scan.source_type === "url" ? "🌐" : scan.source_type === "file" ? "📄" : "✏️"}
                      </span>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {scan.source_ref || scan.summary?.slice(0, 80) || "Text scan"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          {formatDate(scan.created_at)} · {scan.word_count || "?"} words
                        </div>
                      </div>

                      {/* Verdict */}
                      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
                        <VerdictBadge verdict={scan.verdict} size="sm" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: scan.verdict === "AI" ? "var(--accent2)" : scan.verdict === "Human" ? "var(--accent3)" : "var(--warn)" }}>
                          {scan.ai_prob}%
                        </span>
                        <button
                          onClick={e => handleDelete(scan.id, e)}
                          disabled={deleting === scan.id}
                          style={{
                            background: "none", border: "none", fontSize: 16,
                            cursor: "pointer", color: "var(--muted)", padding: 4,
                            opacity: deleting === scan.id ? 0.4 : 1, transition: "color 0.2s",
                          }}
                          title="Delete"
                          onMouseEnter={e => e.target.style.color = "var(--accent2)"}
                          onMouseLeave={e => e.target.style.color = "var(--muted)"}
                        >
                          {deleting === scan.id ? "…" : "🗑"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Pagination */}
              {data.pagination.pages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
                  <Button variant="ghost" onClick={() => setPage(p => p - 1)} disabled={page === 1} style={{ padding: "8px 16px" }}>
                    ← Prev
                  </Button>
                  <span style={{ display: "flex", alignItems: "center", fontSize: 12, color: "var(--muted)", padding: "0 12px" }}>
                    {page} / {data.pagination.pages}
                  </span>
                  <Button variant="ghost" onClick={() => setPage(p => p + 1)} disabled={page === data.pagination.pages} style={{ padding: "8px 16px" }}>
                    Next →
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
