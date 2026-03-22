// pages/ScanDetail.jsx — Full detail view for a single scan
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getScanById } from "../utils/api";
import Results from "../components/Results";
import { Spinner, Button } from "../components/UI";

export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getScanById(id)
      .then(data => {
        // Reshape to match Results component's expected format
        setScan({
          ...data,
          ai_probability:    data.ai_prob,
          suspicious_phrases: data.phrases,
        });
      })
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "48px 20px 80px" }}>
      <Button variant="ghost" onClick={() => navigate("/history")} style={{ marginBottom: 24, padding: "8px 16px", fontSize: 11 }}>
        ← Back to History
      </Button>

      {loading && <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={48} /></div>}
      {error && <div style={{ color: "var(--accent2)", padding: 20 }}>⚠️ {error}</div>}
      {scan && <Results result={scan} onReset={() => navigate("/")} />}
    </div>
  );
}
