// utils/api.js — Axios instance & API helpers
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

// ── Detect ────────────────────────────────────────────────────────────────────

export const detectText = (text) =>
  api.post("/detect/text", { text }).then((r) => r.data);

export const detectUrl = (url) =>
  api.post("/detect/url", { url }).then((r) => r.data);

export const detectFile = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/detect/file", form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

// ── History ───────────────────────────────────────────────────────────────────

export const getHistory = (page = 1, limit = 20) =>
  api.get(`/history?page=${page}&limit=${limit}`).then((r) => r.data);

export const getScanById = (id) =>
  api.get(`/history/${id}`).then((r) => r.data);

export const deleteScan = (id) =>
  api.delete(`/history/${id}`).then((r) => r.data);

export const getStats = () =>
  api.get("/history/stats").then((r) => r.data);

export const checkHealth = () =>
  api.get("/health").then((r) => r.data);

export default api;
