# 🔬 DetectAI — Full-Stack AI Text Detector

Detect whether text was written by a human or an AI. Supports plain text, URLs, and file uploads.
Built with **React + Vite** (frontend), **Express + SQLite** (backend), powered by **Claude AI**.

---

## 📁 Project Structure

```
ai-detector/
├── backend/
│   ├── server.js          # Express entry point
│   ├── db.js              # SQLite database (better-sqlite3)
│   ├── routes/
│   │   ├── detect.js      # POST /api/detect/text|url|file
│   │   └── history.js     # GET/DELETE /api/history
│   ├── .env.example       # Copy to .env and fill in
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── utils/api.js          # Axios API helpers
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Results.jsx       # Detection results display
│   │   │   └── UI.jsx            # Shared components
│   │   └── pages/
│   │       ├── Detect.jsx        # Main detection page
│   │       ├── History.jsx       # Scan history
│   │       ├── ScanDetail.jsx    # Single scan detail
│   │       └── Stats.jsx         # Statistics dashboard
│   ├── vite.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone and install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure backend environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=4000
ANTHROPIC_API_KEY=sk-ant-your-key-here   # Get from console.anthropic.com
FRONTEND_URL=http://localhost:5173
```

### 3. Start backend

```bash
cd backend
npm run dev      # uses nodemon for auto-reload
# or
npm start
```

Backend runs at: http://localhost:4000

### 4. Start frontend

```bash
cd frontend
npm run dev
```

Frontend runs at: http://localhost:5173

---

## 🐳 Docker (Production)

```bash
# At project root
cp backend/.env.example backend/.env
# Edit backend/.env with your ANTHROPIC_API_KEY

docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

---

## 🔌 API Reference

### Detect Text
```http
POST /api/detect/text
Content-Type: application/json

{ "text": "Your text here..." }
```

### Detect from URL
```http
POST /api/detect/url
Content-Type: application/json

{ "url": "https://example.com/article" }
```

### Detect from File
```http
POST /api/detect/file
Content-Type: multipart/form-data

file: <file upload>   (.txt, .md, .html)
```

### Get History
```http
GET /api/history?page=1&limit=20
```

### Get Single Scan
```http
GET /api/history/:id
```

### Delete Scan
```http
DELETE /api/history/:id
```

### Stats
```http
GET /api/history/stats
```

### Health Check
```http
GET /api/health
```

---

## 🗄️ Database Schema

SQLite database is stored at `backend/data/detector.db`.

**scans** table — stores every detection result:
| Column | Type | Description |
|---|---|---|
| id | TEXT (UUID) | Primary key |
| created_at | DATETIME | Timestamp |
| source_type | TEXT | `text`, `url`, or `file` |
| source_ref | TEXT | URL or filename |
| input_text | TEXT | First 500 chars of input |
| word_count | INTEGER | Total words |
| verdict | TEXT | `AI`, `Human`, or `Mixed` |
| ai_prob | REAL | 0–100 probability |
| confidence | TEXT | Low/Medium/High/Very High |
| summary | TEXT | Analysis summary |
| signals | TEXT | JSON: perplexity/burstiness/etc |
| ai_flags | TEXT | JSON array |
| human_flags | TEXT | JSON array |
| phrases | TEXT | JSON array of flagged phrases |
| ip_address | TEXT | Client IP |

**stats** table — running totals for the dashboard.

---

## ⚙️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | Node.js, Express 4 |
| Database | SQLite via better-sqlite3 |
| AI | Anthropic Claude (claude-sonnet-4) |
| Web scraping | Axios + Cheerio |
| File uploads | Multer |
| Security | Helmet, express-rate-limit, CORS |
| Deployment | Docker + Nginx |

---

## 🔒 Security Notes

- Rate limiting: 30 requests/minute per IP on `/api/detect`
- File uploads capped at 5MB
- Input text truncated to 8000 characters before sending to Claude
- CORS restricted to `FRONTEND_URL`
- Helmet sets secure HTTP headers

---

## 📝 License

MIT
