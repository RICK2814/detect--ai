// routes/history.js — Scan history & stats endpoints
const express = require("express");
const router  = express.Router();
const db      = require("../db");

// GET /api/history?limit=20&page=1
router.get("/", async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || "20"), 100);
    const page   = Math.max(parseInt(req.query.page   || "1"),  1);
    const offset = (page - 1) * limit;

    const scans = await db.getHistory({ limit, offset });
    const total = await db.countScans();

    res.json({
      scans,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("history error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history/stats
router.get("/stats", async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history/:id
router.get("/:id", async (req, res) => {
  try {
    const scan = await db.getScanById(req.params.id);
    if (!scan) return res.status(404).json({ error: "Scan not found" });
    res.json(scan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/history/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.deleteScan(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
