// routes/detect.js
const express = require("express");
const router  = express.Router();
const Groq    = require("groq-sdk");
const axios   = require("axios");
const cheerio = require("cheerio");
const multer  = require("multer");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");

let PDFParse;
try { PDFParse = require("pdf-parse").PDFParse; } catch(e) {}

let groqClient;
function getGroqClient() {
  const key = (process.env.GROQ_API_KEY || "").trim();
  if (!key || key.includes("_your_")) {
    const err = new Error(
      "GROQ_API_KEY is missing or contains a placeholder. Please update backend/.env with your actual key from https://console.groq.com."
    );
    err.status = 503;
    throw err;
  }
  if (!groqClient) groqClient = new Groq({ apiKey: key });
  return groqClient;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = [
      "text/plain","text/html","text/markdown","application/pdf",
      "application/msword","application/octet-stream","binary/octet-stream",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(file.mimetype) || /\.(txt|md|html|htm|pdf)$/i.test(file.originalname);
    ok ? cb(null, true) : cb(new Error(`Unsupported: ${file.originalname}`));
  },
});

// ════════════════════════════════════════════════════════════════════════════
// GOOGLE DRIVE / DOCS URL PARSER
// ════════════════════════════════════════════════════════════════════════════

function parseGoogleUrl(url) {
  // Google Docs: https://docs.google.com/document/d/DOC_ID/edit
  const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) {
    return {
      type: "gdoc",
      id: docsMatch[1],
      exportUrl: `https://docs.google.com/document/d/${docsMatch[1]}/export?format=txt`,
      exportUrlHtml: `https://docs.google.com/document/d/${docsMatch[1]}/export?format=html`,
    };
  }

  // Google Drive file: https://drive.google.com/file/d/FILE_ID/view
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch) {
    return {
      type: "gdrive_file",
      id: driveFileMatch[1],
      exportUrl: `https://drive.google.com/uc?export=download&id=${driveFileMatch[1]}`,
      viewUrl:   `https://docs.google.com/document/d/${driveFileMatch[1]}/export?format=txt`,
    };
  }

  // Google Drive open: https://drive.google.com/open?id=FILE_ID
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) {
    return {
      type: "gdrive_file",
      id: driveOpenMatch[1],
      exportUrl: `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`,
      viewUrl:   `https://docs.google.com/document/d/${driveOpenMatch[1]}/export?format=txt`,
    };
  }

  // Google Sheets: https://docs.google.com/spreadsheets/d/SHEET_ID
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) {
    return {
      type: "gsheets",
      id: sheetsMatch[1],
      exportUrl: `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/export?format=csv`,
    };
  }

  // Google Slides: https://docs.google.com/presentation/d/SLIDE_ID
  const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slidesMatch) {
    return {
      type: "gslides",
      id: slidesMatch[1],
      exportUrl: `https://docs.google.com/presentation/d/${slidesMatch[1]}/export?format=txt`,
    };
  }

  return null;
}

async function fetchGoogleContent(googleInfo) {
  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,text/plain,application/json,*/*",
  };

  const urlsToTry = [];

  if (googleInfo.type === "gdoc") {
    // Try plain text export first (cleanest)
    urlsToTry.push(googleInfo.exportUrl);
    urlsToTry.push(googleInfo.exportUrlHtml);
  } else if (googleInfo.type === "gdrive_file") {
    urlsToTry.push(googleInfo.viewUrl);
    urlsToTry.push(googleInfo.exportUrl);
  } else {
    urlsToTry.push(googleInfo.exportUrl);
  }

  for (const url of urlsToTry) {
    try {
      console.log(`[GOOGLE] Trying: ${url}`);
      const res = await axios.get(url, {
        timeout: 20000,
        headers: HEADERS,
        maxContentLength: 5 * 1024 * 1024,
        maxRedirects: 10,
        // Follow redirects (Google Drive download redirects)
        validateStatus: s => s < 400,
      });

      const contentType = res.headers["content-type"] || "";
      let text = "";

      if (contentType.includes("text/plain")) {
        // Plain text export — cleanest
        text = (typeof res.data === "string" ? res.data : String(res.data))
          .replace(/\r\n/g, "\n").trim();
      } else if (contentType.includes("text/html") || contentType.includes("text/csv")) {
        // HTML export — strip tags
        const $ = cheerio.load(res.data);

        // Check for Google login page/consent screens
        const pageTitle = $("title").text().toLowerCase();
        if (pageTitle.includes("google") && (pageTitle.includes("sign in") || pageTitle.includes("login") || pageTitle.includes("consent"))) {
          console.warn("[GOOGLE] Hit login/consent page instead of document");
          continue;
        }

        $("script,style,head,nav,footer").remove();
        text = $("body").text().replace(/\s+/g, " ").trim();
      } else if (typeof res.data === "string") {
        text = res.data.replace(/\s+/g, " ").trim();
      }

      const wordCount = text.split(/\s+/).filter(Boolean).length;
      console.log(`[GOOGLE] Got ${wordCount} words from ${url}`);

      // If we got very little text, it might be a redirect or error page
      if (wordCount >= 20) {
        // Double check it's not just a "Sign in" message
        if (text.toLowerCase().includes("sign in") && text.length < 500) {
           console.warn("[GOOGLE] Extracted text looks like a login page:", text.slice(0, 100));
           continue;
        }
        return text;
      }
    } catch (e) {
      console.warn(`[GOOGLE] Failed: ${e.response?.status || e.message}`);
      if (e.response?.status === 403) {
        throw new Error(
          "Google Drive access denied. Make sure the document is set to " +
          "'Anyone with the link can view' before analyzing."
        );
      }
    }
  }

  throw new Error(
    "Could not read this Google Drive file.\n\n" +
    "Make sure:\n" +
    "1. The file is shared as 'Anyone with the link can view'\n" +
    "2. It's a Google Doc, not a binary file (image/zip/etc)\n\n" +
    "Or copy-paste the text directly into the Text tab."
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GENERAL URL EXTRACTION
// ════════════════════════════════════════════════════════════════════════════

function extractTextFromCheerio($) {
  $(
    "script,style,noscript,iframe,nav,header,footer,aside,form,button," +
    ".ad,.ads,.cookie,.popup,.modal,.sidebar,.widget,.comments,.related," +
    ".social-share,.newsletter,[role='navigation'],[role='banner'],[aria-hidden='true']"
  ).remove();

  const wc    = t => t.split(/\s+/).filter(Boolean).length;
  const clean = t => t.replace(/\s+/g, " ").trim();

  for (const sel of [
    "article","main","[role='main']",
    ".post-content",".entry-content",".article-body",".article-content",
    ".article__body",".post-body",".story-body",".content-body",
    ".blog-content",".news-content","#content","#main-content",
    ".page-content",".main-content",
    '[class*="article-body"]','[class*="post-content"]','[class*="entry-content"]',
  ]) {
    try {
      const text = clean($(sel).first().text());
      if (wc(text) >= 30) return text;
    } catch(_) {}
  }

  // Largest paragraph-dense div
  let best = null, bestScore = 0;
  $("div,section").each((_, el) => {
    const pCount = $(el).find("p").length;
    const score  = pCount * 100 + $(el).text().length;
    if (pCount >= 3 && score > bestScore) { bestScore = score; best = el; }
  });
  if (best) {
    const text = clean($(best).text());
    if (wc(text) >= 30) return text;
  }

  // All paragraphs
  const paras = $("p").map((_, el) => $(el).text().trim()).get().filter(t => t.length > 40);
  if (paras.length >= 3) return paras.join(" ").trim();

  return clean($("body").text());
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

async function extractFromUrl(url) {
  // ── Google Drive / Docs special handling ──
  const googleInfo = parseGoogleUrl(url);
  if (googleInfo) {
    console.log(`[GOOGLE] Detected ${googleInfo.type}: ${googleInfo.id}`);
    return fetchGoogleContent(googleInfo);
  }

  // ── Normal URL ──
  let html = null;

  // Direct fetch
  try {
    const res = await axios.get(url, {
      timeout: 15000, headers: HEADERS,
      maxContentLength: 5 * 1024 * 1024, maxRedirects: 5,
    });
    html = res.data;
    console.log(`[URL] direct OK: ${html.length}b`);
  } catch (e) {
    const s = e.response?.status;
    console.warn(`[URL] direct failed (${s || e.code})`);
    if ([401, 403, 429].includes(s))
      throw new Error(`Site blocked access (HTTP ${s}). Copy-paste the text instead.`);
  }

  // Proxy: allorigins
  if (!html || html.length < 300) {
    try {
      const r = await axios.get(
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        { timeout: 12000 }
      );
      html = r.data?.contents || "";
      if (html.length > 300) console.log(`[URL] allorigins OK: ${html.length}b`);
    } catch(e) { console.warn("[URL] allorigins:", e.message); }
  }

  // Proxy: codetabs
  if (!html || html.length < 300) {
    try {
      const r = await axios.get(
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        { timeout: 12000 }
      );
      html = r.data || "";
      if (html.length > 300) console.log(`[URL] codetabs OK: ${html.length}b`);
    } catch(e) { console.warn("[URL] codetabs:", e.message); }
  }

  if (!html || html.length < 300)
    throw new Error(
      "Could not fetch this URL. The site may block automated requests. " +
      "Copy-paste the text into the Text tab instead."
    );

  const $ = cheerio.load(html);
  const text = extractTextFromCheerio($);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  console.log(`[URL] extracted ${wordCount} words`);

  if (wordCount < 20)
    throw new Error("Not enough text found at this URL. Try the Text tab.");

  return text;
}

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are an expert AI text detection system. Analyze the text and determine if it was written by a human or an AI.

Respond ONLY with valid JSON. 
CRITICAL: You MUST be extremely brief. The entire response should be less than 400 tokens.
- "summary": Exactly 1-2 short sentences (max 30 words).
- "signals" labels: Max 5 words each.
- "ai_flags", "human_flags", "suspicious_phrases": Max 3 items each, 1-3 words per item.

JSON Structure:
{
  "verdict": "AI" | "Human" | "Mixed",
  "ai_probability": <integer 0-100>,
  "confidence": "Low" | "Medium" | "High" | "Very High",
  "summary": "...",
  "signals": {
    "perplexity":         { "score": <0-100>, "label": "..." },
    "burstiness":         { "score": <0-100>, "label": "..." },
    "vocabulary":         { "score": <0-100>, "label": "..." },
    "sentence_structure": { "score": <0-100>, "label": "..." }
  },
  "ai_flags":           [],
  "human_flags":        [],
  "suspicious_phrases": [],
  "word_count":         <integer>,
  "sentence_count":     <integer>,
  "avg_sentence_length":<number>
}`;

async function callGroqDetection(text) {
  if (!text || text.trim().length < 50) {
    throw new Error("Text is too short for reliable AI detection.");
  }

  // Limit input to 4000 chars so the model has ample room to emit complete JSON.
  // Sending 8000 chars left too little headroom and caused json_validate_failed
  // ("max completion tokens reached before generating a valid document").
  const truncatedText = text.slice(0, 4000);
  console.log(`[GROQ] Analyzing text snippet (${truncatedText.length} chars)`);

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: `Analyze this text and return ONLY the JSON results:\n\n${truncatedText}` },
  ];

  // Primary attempt: strict JSON mode with generous token budget
  try {
    const completion = await getGroqClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch (e) {
    // Groq throws json_validate_failed when token limit is hit mid-JSON.
    // Retry without response_format and parse manually.
    const isJsonModeError =
      e?.error?.code === "json_validate_failed" ||
      e?.message?.includes("json_validate_failed") ||
      e?.message?.includes("Failed to generate JSON");

    if (!isJsonModeError) throw e;

    console.warn("[GROQ] json_object mode failed — retrying without response_format...");
    const completion2 = await getGroqClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.1,
      max_tokens: 2048,
    });
    const raw2 = completion2.choices[0]?.message?.content || "{}";
    try {
      const jsonMatch = raw2.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw2];
      return JSON.parse(jsonMatch[1].trim());
    } catch (parseErr) {
      console.error("[GROQ] JSON Parse Error on fallback. Raw output:", raw2);
      throw new Error("Failed to parse AI detection result. Please try again.");
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FILE EXTRACTION
// ════════════════════════════════════════════════════════════════════════════

async function extractFromFile(buffer, mimetype, originalname) {
  if (mimetype === "application/pdf" || originalname.toLowerCase().endsWith(".pdf")) {
    if (!PDFParse) throw new Error("PDF parser unavailable.");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = (typeof result.text === "string" ? result.text
      : (result.pages||[]).map(p=>p.text||"").join("\n"))
      .replace(/\s+/g," ").trim();
    if (text.length < 50) throw new Error("No readable text in PDF (may be a scanned image).");
    return text;
  }
  return buffer.toString("utf-8");
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════

async function saveScan(id, source_type, source_ref, text, result, ip) {
  await db.saveScan({
    id, source_type, source_ref,
    input_text: text.slice(0, 500), word_count: result.word_count,
    verdict: result.verdict, ai_prob: result.ai_probability,
    confidence: result.confidence, summary: result.summary,
    signals: result.signals, ai_flags: result.ai_flags,
    human_flags: result.human_flags, phrases: result.suspicious_phrases || [],
    ip_address: ip,
  });
}

router.post("/text", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });
    if (text.trim().split(/\s+/).length < 20)
      return res.status(400).json({ error: "Minimum 20 words required." });
    const result = await callGroqDetection(text.trim());
    const id = uuidv4();
    await saveScan(id, "text", null, text.trim(), result, req.ip);
    res.json({ id, ...result });
  } catch (err) {
    console.error("[text]", err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post("/url", async (req, res) => {
  try {
    const { url, text: preExtracted } = req.body;
    if (!url || !/^https?:\/\/.+/.test(url))
      return res.status(400).json({ error: "Valid URL required" });

    const text = (preExtracted && preExtracted.trim().split(/\s+/).length >= 20)
      ? preExtracted.trim()
      : await extractFromUrl(url);

    const result = await callGroqDetection(text);
    const id = uuidv4();
    await saveScan(id, "url", url, text, result, req.ip);
    res.json({ id, url, ...result });
  } catch (err) {
    console.error("[url]", err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post("/file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const text = await extractFromFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!text || text.split(/\s+/).length < 20)
      return res.status(400).json({ error: "File has too little text." });
    const result = await callGroqDetection(text.trim());
    const id = uuidv4();
    await saveScan(id, "file", req.file.originalname, text.trim(), result, req.ip);
    res.json({ id, filename: req.file.originalname, ...result });
  } catch (err) {
    console.error("[file]", err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;