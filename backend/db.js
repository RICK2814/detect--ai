// db.js — SQLite database setup using sql.js (pure JS, no native build needed)
const initSqlJs = require("sql.js");
const path = require("path");
const fs   = require("fs");

const DATA_DIR = process.env.VERCEL ? "/tmp" : path.join(__dirname, "data");
const DB_PATH  = path.join(DATA_DIR, "detector.db");

if (!fs.existsSync(DATA_DIR) && !process.env.VERCEL) fs.mkdirSync(DATA_DIR, { recursive: true });

// sql.js is async to init — we expose a promise and a sync wrapper
let _db = null;

async function getDb() {
  if (_db) return _db;
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS scans (
      id          TEXT PRIMARY KEY,
      created_at  TEXT DEFAULT (datetime('now')),
      source_type TEXT NOT NULL,
      source_ref  TEXT,
      input_text  TEXT NOT NULL,
      word_count  INTEGER,
      verdict     TEXT NOT NULL,
      ai_prob     REAL NOT NULL,
      confidence  TEXT NOT NULL,
      summary     TEXT,
      signals     TEXT,
      ai_flags    TEXT,
      human_flags TEXT,
      phrases     TEXT,
      ip_address  TEXT
    );
    CREATE TABLE IF NOT EXISTS stats (
      id          INTEGER PRIMARY KEY CHECK(id = 1),
      total_scans INTEGER DEFAULT 0,
      total_ai    INTEGER DEFAULT 0,
      total_human INTEGER DEFAULT 0,
      total_mixed INTEGER DEFAULT 0,
      updated_at  TEXT DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO stats (id) VALUES (1);
  `);

  persist(_db);
  return _db;
}

function persist(db) {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error("Failed to persist database:", err.message);
  }
}

function rowsToObjects(res) {
  if (!res || res.length === 0) return [];
  const { columns, values } = res[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

module.exports = {
  async saveScan(scan) {
    const db = await getDb();
    db.run(
      `INSERT INTO scans
        (id,source_type,source_ref,input_text,word_count,verdict,ai_prob,
         confidence,summary,signals,ai_flags,human_flags,phrases,ip_address)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        scan.id, scan.source_type, scan.source_ref || null,
        scan.input_text, scan.word_count, scan.verdict, scan.ai_prob,
        scan.confidence, scan.summary,
        JSON.stringify(scan.signals     || {}),
        JSON.stringify(scan.ai_flags    || []),
        JSON.stringify(scan.human_flags || []),
        JSON.stringify(scan.phrases     || []),
        scan.ip_address || null,
      ]
    );
    db.run(
      `UPDATE stats SET
        total_scans = total_scans + 1,
        total_ai    = total_ai    + ?,
        total_human = total_human + ?,
        total_mixed = total_mixed + ?,
        updated_at  = datetime('now')
       WHERE id = 1`,
      [scan.verdict === "AI" ? 1 : 0, scan.verdict === "Human" ? 1 : 0, scan.verdict === "Mixed" ? 1 : 0]
    );
    persist(db);
  },

  async getHistory({ limit = 20, offset = 0 } = {}) {
    const db = await getDb();
    const res = db.exec(
      `SELECT id,created_at,source_type,source_ref,verdict,ai_prob,confidence,word_count,summary
       FROM scans ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rowsToObjects(res);
  },

  async getScanById(id) {
    const db = await getDb();
    const res = db.exec(`SELECT * FROM scans WHERE id = ?`, [id]);
    const rows = rowsToObjects(res);
    if (!rows.length) return null;
    const row = rows[0];
    return {
      ...row,
      signals:     JSON.parse(row.signals     || "{}"),
      ai_flags:    JSON.parse(row.ai_flags    || "[]"),
      human_flags: JSON.parse(row.human_flags || "[]"),
      phrases:     JSON.parse(row.phrases     || "[]"),
    };
  },

  async getStats() {
    const db = await getDb();
    const res = db.exec(`SELECT * FROM stats WHERE id = 1`);
    return rowsToObjects(res)[0] || {};
  },

  async deleteScan(id) {
    const db = await getDb();
    db.run(`DELETE FROM scans WHERE id = ?`, [id]);
    persist(db);
    return { changes: 1 };
  },

  async countScans() {
    const db = await getDb();
    const res = db.exec(`SELECT COUNT(*) as total FROM scans`);
    return rowsToObjects(res)[0]?.total || 0;
  },
};
