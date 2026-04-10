// routes/factcheck.js — AI Fact-Checking Engine v2.0
const express = require("express");
const router  = express.Router();
const Groq    = require("groq-sdk");
const axios   = require("axios");
const cheerio = require("cheerio");

let pdf;
try { pdf = require("pdf-parse"); } catch (e) {}

/* ─── Groq client ──────────────────────────────────────────────────────────── */
let groqClient;
function getGroq() {
  const key = (process.env.GROQ_API_KEY || "").trim();
  if (!key || key.includes("_your_")) {
    const err = new Error("GROQ_API_KEY is missing");
    err.status = 503;
    throw err;
  }
  if (!groqClient) groqClient = new Groq({ apiKey: key });
  return groqClient;
}

const EVIDENCE_CACHE = new Map();
const EVIDENCE_CACHE_LIMIT = 200;

function getCachedEvidence(query) {
  return EVIDENCE_CACHE.get(String(query || "").trim().toLowerCase()) || null;
}

function setCachedEvidence(query, value) {
  const key = String(query || "").trim().toLowerCase();
  if (!key) return;
  if (EVIDENCE_CACHE.has(key)) {
    EVIDENCE_CACHE.delete(key);
  }
  EVIDENCE_CACHE.set(key, value);
  if (EVIDENCE_CACHE.size > EVIDENCE_CACHE_LIMIT) {
    const oldest = EVIDENCE_CACHE.keys().next().value;
    if (oldest) EVIDENCE_CACHE.delete(oldest);
  }
}

// ─── Search Utility (Alternative to DDG to bypass CAPTCHA) ───────────────────

async function searchWeb(query) {
  try {
    // Using a public allorigins proxy to bypass blocks, querying a generic search
    const searchUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`)}`;
    const res = await axios.get(searchUrl, { timeout: 9000 });
    const html = res.data.contents;
    
    if (!html || html.includes('Select all squares containing a duck')) {
        // Fallback to Wikipedia if DDG is completely blocked even via proxy
        return await searchWikipedia(query);
    }

    const $ = cheerio.load(html);
    const results = [];
    
    $(".result").each((i, el) => {
      if (i >= 5) return;
      const title = $(el).find(".result__a").text().trim();
      const snippet = $(el).find(".result__snippet").text().trim();
      const link = $(el).find(".result__a").attr("href");
      
      let finalLink = link;
      if (link && link.includes("uddg=")) {
        try { finalLink = decodeURIComponent(link.split("uddg=")[1].split("&")[0]); } catch(_){}
      }
      if (finalLink && finalLink.startsWith("//")) finalLink = "https:" + finalLink;

      if (title && snippet && finalLink) {
        results.push({ title, snippet, url: finalLink });
      }
    });
    
    return results;
  } catch (err) {
    console.error(`[WEB SEARCH ERROR] ${query}:`, err.message);
    return [];
  }
}

async function searchWikipedia(query) {
  try {
    // Wikipedia requires a descriptive User-Agent
    const headers = { "User-Agent": "DetectAI-FactChecker/1.0 (https://github.com/SAMPRIT-NANDI/DETECT-AI-SUPER-CHAMPION) axios/1.x" };
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&origin=*`;
    
    const res = await axios.get(url, { headers, timeout: 7000 });
    return (res.data.query?.search || []).map(r => ({
      title: r.title,
      snippet: r.snippet.replace(/<[^>]+>/g, ""),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`
    }));
  } catch (err) {
    console.error("[WIKI SEARCH ERROR]:", err.message);
    return [];
  }
}

async function fetchEvidenceForClaim(claim) {
  const cacheKey = String(claim || "").trim().toLowerCase();
  const cached = getCachedEvidence(cacheKey);
  if (cached) return cached;

  console.log(`[SEARCHING] fetching evidence for: "${claim}"`);
  
  // Try Wiki first as it's most reliable, then fallback to general web
  let results = await searchWikipedia(claim);
  
  if (results.length < 2) {
    console.log(`[SEARCHING] Wiki returned ${results.length} results, falling back to general web...`);
    const webResults = await searchWeb(claim);
    results = [...results, ...webResults];
  }
  
  // Deduplicate by URL
  const seen = new Set();
  const all = [];
  for (const r of results) {
    const key = r.url || r.title;
    if (!seen.has(key)) {
      seen.add(key);
      all.push(r);
    }
  }
  
  const finalResults = all.slice(0, 5);
  setCachedEvidence(cacheKey, finalResults);
  return finalResults;
}

/* ─── URL text extraction (reuse pattern from detect.js) ───────────────────── */

function parseGoogleUrl(url) {
  const docsMatch = url.match(/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) return {
    type: "gdoc", id: docsMatch[1],
    urls: [
      "https://docs.google.com/document/d/" + docsMatch[1] + "/export?format=txt",
      "https://docs.google.com/document/d/" + docsMatch[1] + "/export?format=html",
      "https://docs.google.com/document/d/" + docsMatch[1] + "/pub",
    ],
  };

  const driveMatch =
    url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/drive\.google\.com\/(?:drive\/)?u\/\d+\/folders\/([a-zA-Z0-9_-]+)/) ||
    url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (driveMatch) return {
    type: "gdrive", id: driveMatch[1],
    urls: [
      "https://docs.google.com/document/d/" + driveMatch[1] + "/export?format=txt",
      "https://drive.google.com/uc?export=download&id=" + driveMatch[1],
      "https://drive.google.com/file/d/" + driveMatch[1] + "/preview",
    ],
  };

  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) return {
    type: "gsheets", id: sheetsMatch[1],
    urls: [
      "https://docs.google.com/spreadsheets/d/" + sheetsMatch[1] + "/export?format=csv",
      "https://docs.google.com/spreadsheets/d/" + sheetsMatch[1] + "/pub?output=csv",
    ],
  };

  const slidesMatch = url.match(/docs\.google\.com\/presentation\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (slidesMatch) return {
    type: "gslides", id: slidesMatch[1],
    urls: [
      "https://docs.google.com/presentation/d/" + slidesMatch[1] + "/export?format=txt",
      "https://docs.google.com/presentation/d/" + slidesMatch[1] + "/pub?output=txt",
    ],
  };

  return null;
}

function extractReadableTextFromHtml(html) {
  const $ = cheerio.load(html);
  $("script,style,noscript,iframe,nav,header,footer,aside,form,button").remove();

  for (const sel of ["article", "main", "[role='main']", ".post-content", ".entry-content", "#content"]) {
    const t = $(sel).first().text().replace(/\s+/g, " ").trim();
    if (t && t.split(/\s+/).length >= 30) return t;
  }

  const paras = $("p").map((_, el) => $(el).text().trim()).get().filter(t => t.length > 40);
  if (paras.length >= 2) return paras.join(" ");

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  if (bodyText.split(/\s+/).filter(Boolean).length >= 12) return bodyText;

  // Metadata fallback helps for pages that block article/body scraping.
  const title = ($("title").first().text() || "").trim();
  const desc = (
    $("meta[name='description']").attr("content") ||
    $("meta[property='og:description']").attr("content") ||
    $("meta[name='twitter:description']").attr("content") ||
    ""
  ).trim();

  const fallback = [title, desc].filter(Boolean).join(". ").replace(/\s+/g, " ").trim();
  return fallback || "";
}

function hasPdfSignature(buffer) {
  return !!(buffer && buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46);
}

function isLikelyPdfUrl(url) {
  return /\.pdf($|[?#])/i.test(url) || /arxiv\.org\/pdf\//i.test(url) || /\/download\//i.test(url);
}

async function extractPdfTextFromBuffer(buffer) {
  if (!pdf) throw new Error("PDF parser unavailable on server.");
  const parsed = await pdf(buffer);
  const text = String((parsed && parsed.text) || "").replace(/\s+/g, " ").trim();
  if (text.split(/\s+/).filter(Boolean).length < 20) return null;
  return text;
}

async function tryExtractFromPdfUrl(url) {
  const candidates = [url];
  const arxivAbs = url.match(/https?:\/\/(?:www\.)?arxiv\.org\/abs\/([^?#]+)/i);
  if (arxivAbs) candidates.unshift("https://arxiv.org/pdf/" + arxivAbs[1].replace(/\.pdf$/i, "") + ".pdf");

  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/pdf,application/octet-stream,*/*",
  };

  for (const candidate of candidates) {
    try {
      const res = await axios.get(candidate, {
        timeout: 25000,
        headers: HEADERS,
        responseType: "arraybuffer",
        maxContentLength: 10 * 1024 * 1024,
        maxRedirects: 8,
        validateStatus: function(s) { return s < 400; },
      });

      const contentType = String((res.headers && res.headers["content-type"]) || "").toLowerCase();
      const buffer = Buffer.from(res.data || []);
      const isPdf = contentType.includes("application/pdf") || hasPdfSignature(buffer) || /\.pdf($|[?#])/i.test(candidate);
      if (!isPdf) continue;

      const text = await extractPdfTextFromBuffer(buffer);
      if (text) return text;
    } catch (_) {}
  }

  return null;
}

async function fetchGoogleContent(url) {
  const info = parseGoogleUrl(url);
  if (!info) return null;

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,text/plain,*/*",
  };

  for (const tryUrl of info.urls) {
    try {
      const res = await axios.get(tryUrl, {
        timeout: 18000,
        headers,
        maxContentLength: 5 * 1024 * 1024,
        maxRedirects: 8,
        validateStatus: function(s) { return s < 400; },
      });

      const ct = String((res.headers && res.headers["content-type"]) || "").toLowerCase();
      const raw = typeof res.data === "string" ? res.data : String(res.data || "");

      if (!raw || raw.length < 50) continue;
      if (raw.includes("accounts.google.com") || raw.includes("ServiceLogin")) continue;

      const text = ct.includes("text/plain") || ct.includes("text/csv")
        ? raw.replace(/\s+/g, " ").trim()
        : extractReadableTextFromHtml(raw);

      if (text && text.split(/\s+/).filter(Boolean).length >= 20) {
        return { text, imageUrl: null };
      }
    } catch (_) {
      // Try the next export URL
    }
  }

  return null;
}

async function extractTextFromUrl(url) {
  const google = await fetchGoogleContent(url);
  if (google) return google;

  if (isLikelyPdfUrl(url)) {
    const pdfText = await tryExtractFromPdfUrl(url);
    if (pdfText) return { text: pdfText, imageUrl: null };
  }

  const HEADERS = {
    "User-Agent": url.includes("wikipedia.org") 
       ? "DetectAI-FactChecker/1.0 (https://github.com/SAMPRIT-NANDI/DETECT-AI-SUPER-CHAMPION) axios/1.x"
       : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,*/*",
  };
  let html = null;
  try {
    const res = await axios.get(url, {
      timeout: 15000, headers: HEADERS,
      responseType: "arraybuffer",
      maxContentLength: 5 * 1024 * 1024, maxRedirects: 5
    });
    const contentType = String((res.headers && res.headers["content-type"]) || "").toLowerCase();
    const buffer = Buffer.from(res.data || []);
    if (contentType.includes("application/pdf") || hasPdfSignature(buffer)) {
      const pdfText = await extractPdfTextFromBuffer(buffer);
      if (pdfText) return { text: pdfText, imageUrl: null };
    }
    if (contentType.includes("text/plain") || contentType.includes("text/csv")) {
      const plain = buffer.toString("utf-8").replace(/\s+/g, " ").trim();
      if (plain.split(/\s+/).filter(Boolean).length >= 20) {
        return { text: plain, imageUrl: null };
      }
    }
    html = buffer.toString("utf-8");
  } catch (e) {
    // Try proxy fallback
    try {
      const r = await axios.get(
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        { timeout: 12000 }
      );
      html = (r.data && r.data.contents) || "";
    } catch(_) {}
  }
  if (!html || html.length < 40) return null;
  const text = extractReadableTextFromHtml(html);
  if (!text || text.split(/\s+/).filter(Boolean).length < 20) return null;

  return { text, imageUrl: null };
}

/* ─── BONUS: Media Deepfake Detection ──────────────────────────────────────── */

const SYSTEM_PROMPT_IMAGE = `You are an expert AI image forensic analyst. Your task is to examine an uploaded image and determine if it was created by an AI image generator (Midjourney, DALL-E, Stable Diffusion) or if it is a real photograph/human-created digital art.

Look for these AI GENERATION SIGNALS:
- "Uncanny" skin textures (too smooth, plastic-like, or overly detailed in weird ways)
- Lighting inconsistencies (shadows going the wrong way, light sources that don't exist)
- Structural errors in complex objects: hands (too many fingers), eyes (mismatched pupils), hair (merging into skin)
- Background "blur" that looks unnatural or inconsistent
- Nonsensical text or symbols in the background
- Perfect symmetry in organic objects where it shouldn't be
- Repeating patterns or "checkerboard" artifacts in solid colors

JSON structure to return:
{"verdict":"AI","ai_probability":90,"confidence":"High","summary":"Analysis summary highlighting visual artifacts.","signals":{"texture":{"score":85,"label":"unnatural smoothness"},"lighting":{"score":70,"label":"inconsistent shadows"},"details":{"score":95,"label":"malformed limb structures"}},"ai_flags":["plastic skin","mismatched eyes"],"human_flags":[]}

Return ONLY raw JSON.`;

async function analyzeMediaDeepfake(imageUrl) {
  try {
    console.log(`[MEDIA DETECT] Fetching image for analysis: ${imageUrl}`);
    const headers = { 
      "User-Agent": imageUrl.includes("wikimedia.org") || imageUrl.includes("wikipedia.org")
         ? "DetectAI-FactChecker/1.0 (https://github.com/SAMPRIT-NANDI/DETECT-AI-SUPER-CHAMPION) axios/1.x"
         : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };
    const res = await axios.get(imageUrl, { headers, responseType: 'arraybuffer', timeout: 10000 });
    const buffer = Buffer.from(res.data, 'binary');
    const base64 = buffer.toString("base64");
    
    // We use llama-3.2-11b-vision-preview for image analysis
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT_IMAGE },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } }
          ]
        }
      ],
      temperature: 0.0,
      max_tokens: 500,
    });

    const raw = (completion.choices[0]?.message?.content || "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(start, end + 1));
    parsed.source_url = imageUrl;
    return parsed;
  } catch (err) {
    console.error(`[MEDIA DETECT ERROR]`, err.message);
    return null;
  }
}

/* ─── STEP 1: Extract every sentence as a claim ────────────────────────────── */

const EXTRACT_SYSTEM = `You are a claim extraction engine. Your job is to decompose input text into EVERY discrete factual statement that can potentially be verified.

RULES:
1. Extract EVERY sentence that contains a factual assertion — dates, names, numbers, events, places, scientific claims, statistics, relationships between entities.
2. Opinions, subjective statements, and rhetorical questions should still be included but marked as opinion.
3. Split compound sentences into separate claims. "India has 28 states and is the largest democracy" becomes TWO claims.
4. Preserve the original wording as closely as possible.
5. Do NOT skip any sentence. Every sentence in the input must produce at least one claim.
6. Number each claim sequentially.

Return ONLY a valid JSON array of objects. No markdown, no code fences:
[
  {"id":1, "claim":"The Earth orbits the Sun", "type":"factual", "original_sentence":"The Earth orbits the Sun."},
  {"id":2, "claim":"Pizza is the best food", "type":"opinion", "original_sentence":"Pizza is the best food."}
]

type must be one of: "factual", "opinion", "statistical", "historical", "scientific"`;

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant"
];

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function parseRetryAfterMs(err) {
  const headerVal = err && err.response && err.response.headers
    ? (err.response.headers["retry-after"] || err.response.headers["Retry-After"])
    : null;

  if (headerVal) {
    const seconds = Number(headerVal);
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds * 1000);
  }

  const msg = String((err && err.message) || "");
  const waitMatch = msg.match(/try again in\s*([\d.]+)s/i);
  if (waitMatch) {
    const sec = Number(waitMatch[1]);
    if (Number.isFinite(sec) && sec > 0) return Math.ceil(sec * 1000);
  }

  return 0;
}

function getErrorStatus(err) {
  return (err && (err.status || (err.response && err.response.status))) || 0;
}

async function callGroqWithFallback(messages, temp, tokens) {
  const groq = getGroq();
  for (let i = 0; i < GROQ_MODELS.length; i++) {
    const model = GROQ_MODELS[i];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages,
          temperature: temp,
          max_tokens: tokens,
        });
        return completion;
      } catch (err) {
        const status = getErrorStatus(err);
        const isRateLimit = status === 429;
        const isDecommissioned = status === 400 || status === 404;

        if (isRateLimit && attempt < 3) {
          const retryAfterMs = parseRetryAfterMs(err);
          const backoffMs = 1500 * attempt;
          const waitMs = Math.max(retryAfterMs, backoffMs);
          console.warn("[GROQ] Rate limited on " + model + ". Retrying in " + waitMs + "ms (attempt " + (attempt + 1) + "/3)");
          await sleep(waitMs);
          continue;
        }

        if ((isRateLimit || isDecommissioned) && i < GROQ_MODELS.length - 1) {
          console.warn(`[GROQ] Issue with ${model} (${status}). Falling back to ${GROQ_MODELS[i + 1]}...`);
          break;
        }

        if (isRateLimit) {
          const waitMs = parseRetryAfterMs(err) || 5000;
          const waitSec = Math.ceil(waitMs / 1000);
          const prettyError = new Error("Groq API rate limit reached. Please retry in about " + waitSec + " seconds.");
          prettyError.status = 429;
          throw prettyError;
        }

        throw err;
      }
    }
  }
}

async function extractAllClaims(text) {
  const sentenceClaims = splitIntoSentences(text);
  const truncated = text.slice(0, 2500);

  const completion = await callGroqWithFallback(
    [
      { role: "system", content: EXTRACT_SYSTEM },
      { role: "user",   content: `Extract every claim from this text:\n\n${truncated}` },
    ],
    0.05, 900
  );

  const raw = (completion.choices[0]?.message?.content || "").trim();
  console.log("[EXTRACT] Raw length:", raw.length);

  try {
    const start = raw.indexOf("[");
    const end   = raw.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("No array found");
    const extractedClaims = JSON.parse(raw.slice(start, end + 1));
    return mergeClaimTypes(sentenceClaims, extractedClaims);
  } catch (e) {
    console.error("[EXTRACT PARSE ERROR]", raw.slice(0, 300));
    // Fallback: split text into sentences manually
    return sentenceClaims;
  }
}

function splitIntoSentences(text) {
  const normalizedText = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();

  if (!normalizedText) return [];

  const blocks = normalizedText
    .split(/\n+/)
    .map(block => block.replace(/^[\s•*-]+/, "").trim())
    .filter(Boolean);

  const sentenceParts = [];
  for (const block of blocks) {
    const parts = block.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [block];
    for (const part of parts) {
      const sentence = part.replace(/\s+/g, " ").trim();
      if (sentence.length >= 10 && sentence.split(/\s+/).length >= 3) {
        sentenceParts.push(sentence);
      }
    }
  }

  if (sentenceParts.length === 0) {
    sentenceParts.push(normalizedText.replace(/\s+/g, " "));
  }

  return sentenceParts.map((sentence, i) => ({
    id: i + 1,
    claim: sentence.replace(/[.!?]+$/, ""),
    type: "factual",
    original_sentence: sentence,
  }));
}

function mergeClaimTypes(sentenceClaims, extractedClaims) {
  if (!Array.isArray(sentenceClaims) || sentenceClaims.length === 0) return [];

  const normalizedExtracted = Array.isArray(extractedClaims)
    ? extractedClaims.map((claim, index) => normalizeClaim(claim, index + 1)).filter(Boolean)
    : [];

  return sentenceClaims.map((sentenceClaim, index) => {
    const extracted = normalizedExtracted[index];
    return {
      ...sentenceClaim,
      type: extracted?.type || sentenceClaim.type || "factual",
      id: extracted?.id || sentenceClaim.id || index + 1,
    };
  });
}

function normalizeClaim(claim, fallbackId) {
  if (!claim) return null;

  if (typeof claim === "string") {
    const text = claim.trim();
    if (!text) return null;
    return {
      id: fallbackId,
      claim: text.replace(/[.!?]+$/, ""),
      type: "factual",
      original_sentence: text,
    };
  }

  const claimText = String(claim.claim || claim.original_sentence || claim.text || "").trim();
  if (!claimText) return null;

  const normalizedType = String(claim.type || "factual").toLowerCase();
  const allowedTypes = new Set(["factual", "opinion", "statistical", "historical", "scientific"]);

  return {
    id: Number.isFinite(Number(claim.id)) ? Number(claim.id) : fallbackId,
    claim: claimText.replace(/[.!?]+$/, ""),
    type: allowedTypes.has(normalizedType) ? normalizedType : "factual",
    original_sentence: String(claim.original_sentence || claimText).trim(),
  };
}

/* ─── STEP 2: Verify each claim against retrieved evidence ─────────────────── */

const VERIFY_SYSTEM = `You are a world-class fact-checker. You receive a CLAIM and EVIDENCE gathered from the web.

YOUR JOB:
1. Carefully compare the claim against ALL provided evidence.
2. Determine the verdict:
   - "True" — evidence clearly supports the claim
   - "False" — evidence clearly contradicts the claim
   - "Partially True" — some parts are correct but key details are wrong or misleading
   - "Unverifiable" — not enough evidence to confirm or deny

3. Assign a confidence score from 0.0 to 1.0:
   - 0.9-1.0: overwhelming evidence supports the verdict
   - 0.7-0.89: strong evidence
   - 0.5-0.69: moderate evidence
   - 0.3-0.49: weak evidence
   - 0.0-0.29: very little evidence

4. Write a clear 1-2 sentence explanation of WHY this verdict was chosen, referencing specific evidence.
5. List the URLs of sources that were most relevant.

If the claim is an OPINION (not a factual statement), verdict should be "Opinion" and confidence should be 0.0.

Return ONLY valid JSON, no markdown:
{"verdict":"True","confidence":0.85,"reasoning":"Multiple sources confirm that X happened in Y year.","citations":["url1","url2"],"correction":null}

If verdict is "False" or "Partially True", include a "correction" field with what the correct information is.`;

async function verifySingleClaim(claimObj) {
  const { claim, type } = claimObj;

  // Skip opinions — mark directly
  if (type === "opinion") {
    return {
      ...claimObj,
      verdict: "Opinion",
      confidence: 0,
      reasoning: "This is a subjective opinion, not a verifiable factual claim.",
      citations: [],
      evidence_snippets: [],
      correction: null,
      search_queries: [],
    };
  }

  // Generate smart search queries
  const queries = generateSearchQueries(claim);
  console.log(`[VERIFY] Claim: "${claim.slice(0, 60)}..." — Queries: ${queries.length}`);

  // Search with all queries in parallel, collect evidence
  const searchPromises = queries.map(q => fetchEvidenceForClaim(q));
  const allResults = await Promise.all(searchPromises);

  // Merge & deduplicate
  const seen = new Set();
  const evidence = [];
  for (const results of allResults) {
    for (const r of results) {
      const key = r.url || r.title;
      if (!seen.has(key) && r.snippet.length > 20) {
        seen.add(key);
        evidence.push(r);
      }
    }
  }

  if (evidence.length === 0) {
    return {
      ...claimObj,
      verdict: "Unverifiable",
      confidence: 0.1,
      reasoning: "No relevant online evidence was found to verify or refute this claim.",
      citations: [],
      evidence_snippets: [],
      correction: null,
      search_queries: queries,
    };
  }

  // Format evidence for the LLM
  const evidenceText = evidence.slice(0, 6).map((r, i) =>
    `[Source ${i+1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`
  ).join("\n\n");

  const completion = await callGroqWithFallback(
    [
      { role: "system", content: VERIFY_SYSTEM },
      {
        role: "user",
        content: `CLAIM: "${claim}"\n\nEVIDENCE FROM WEB SEARCH:\n${evidenceText}\n\nAnalyze and return your verdict as JSON.`,
      },
    ],
    0.0, 300
  );

  const raw = (completion.choices[0]?.message?.content || "").trim();

  let parsed;
  try {
    const start = raw.indexOf("{");
    const end   = raw.lastIndexOf("}");
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch (e) {
    console.error("[VERIFY PARSE ERROR]", raw.slice(0, 200));
    parsed = {
      verdict: "Unverifiable",
      confidence: 0.2,
      reasoning: "Analysis could not be completed for this claim.",
      citations: [],
      correction: null,
    };
  }

  return {
    ...claimObj,
    verdict: parsed.verdict || "Unverifiable",
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    reasoning: parsed.reasoning || "No detailed reasoning provided.",
    citations: (parsed.citations || []).filter(u => typeof u === "string" && u.startsWith("http")),
    evidence_snippets: evidence.slice(0, 3).map(r => ({
      title: r.title,
      snippet: r.snippet.slice(0, 200),
      url: r.url,
    })),
    correction: parsed.correction || null,
    search_queries: queries,
  };
}

function generateSearchQueries(claim) {
  // Generate 1-2 search queries: the claim itself + a more targeted query when needed
  const queries = [claim];

  // Extract key entities for a focused query
  const noStop = claim
    .replace(/\b(the|a|an|is|are|was|were|has|have|had|been|being|in|on|at|to|for|of|with|by|from|and|or|but|not|this|that|it|its|as|if|so|no|do|did|can|will|may|must|shall|should|would|could)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (noStop.length > 10 && noStop !== claim) {
    queries.push(`${noStop} fact check`);
  }

  return queries.slice(0, claim.length > 80 ? 2 : 1);
}

async function verifyClaimsInBatches(rawClaims, batchSize = 3) {
  const verifiedClaims = [];
  for (let i = 0; i < rawClaims.length; i += batchSize) {
    const batch = rawClaims.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(c => verifySingleClaim(c)));
    verifiedClaims.push(...results);
    console.log(`[FACTCHECK] Verified ${verifiedClaims.length}/${rawClaims.length}`);
  }
  return verifiedClaims;
}

/* ─── STEP 3: Generate the overall report ──────────────────────────────────── */

function generateReport(claims) {
  const factual   = claims.filter(c => c.verdict !== "Opinion");
  const trueC     = factual.filter(c => c.verdict === "True").length;
  const falseC    = factual.filter(c => c.verdict === "False").length;
  const partialC  = factual.filter(c => c.verdict === "Partially True").length;
  const unverC    = factual.filter(c => c.verdict === "Unverifiable").length;
  const opinionC  = claims.filter(c => c.verdict === "Opinion").length;

  // Score based only on verifiable claims
  const verifiable = factual.filter(c => c.verdict !== "Unverifiable");
  let score = 100;
  if (verifiable.length > 0) {
    score = Math.round(
      ((trueC + partialC * 0.5) / verifiable.length) * 100
    );
  }

  // Weighted confidence
  const avgConf = factual.length > 0
    ? Math.round((factual.reduce((s, c) => s + (c.confidence || 0), 0) / factual.length) * 100) / 100
    : 0;

  return {
    claims,
    stats: {
      total_claims: claims.length,
      factual_claims: factual.length,
      true: trueC,
      false: falseC,
      partially_true: partialC,
      unverifiable: unverC,
      opinions: opinionC,
      average_confidence: avgConf,
    },
    overall_score: score,
    grade:
      score >= 90 ? "A" :
      score >= 75 ? "B" :
      score >= 60 ? "C" :
      score >= 40 ? "D" : "F",
  };
}

/* ─── Routes ───────────────────────────────────────────────────────────────── */

// POST /api/factcheck/text — direct text input
router.post("/text", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 10)
      return res.status(400).json({ error: "Text too short. Provide at least one sentence." });

    console.log(`\n[FACTCHECK] Processing ${text.length} chars...`);

    // Step 1: extract claims
    const rawClaims = await extractAllClaims(text.trim());
    console.log(`[FACTCHECK] Extracted ${rawClaims.length} claims`);

    if (rawClaims.length === 0)
      return res.json(generateReport([]));

    // Step 2: verify claims in small parallel batches to keep latency low without losing quality
    const verifiedClaims = await verifyClaimsInBatches(rawClaims, 3);

    // Step 3: generate report
    const report = generateReport(verifiedClaims);
    console.log(`[FACTCHECK] Done. Score: ${report.overall_score}%, Grade: ${report.grade}`);

    res.json(report);
  } catch (err) {
    console.error("[FACTCHECK ERROR]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/factcheck/url — extract text from URL, then fact-check
router.post("/url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !/^https?:\/\/.+/.test(url))
      return res.status(400).json({ error: "Valid URL required" });

    console.log(`[FACTCHECK/URL] Fetching ${url}`);
    const extracted = await extractTextFromUrl(url);
    if (!extracted || !extracted.text || extracted.text.trim().split(/\s+/).filter(Boolean).length < 20) {
      const isGoogle = /drive\.google\.com|docs\.google\.com/i.test(url);
      return res.status(400).json({
        error: isGoogle
          ? "Could not extract enough text from this Google link. Ensure the file is shared as 'Anyone with the link can view', then try again."
          : "Could not extract enough text from this URL. Try a different page URL or paste the article text directly.",
      });
    }

    const text = extracted.text;
    const imageUrl = extracted.imageUrl;

    console.log(`[FACTCHECK/URL] Extracted ${text.split(/\s+/).length} words`);
    
    // Bonus Media Analysis in parallel
    let mediaAnalysisPromise = Promise.resolve(null);
    if (imageUrl) {
      mediaAnalysisPromise = analyzeMediaDeepfake(imageUrl);
    }

    const rawClaims = await extractAllClaims(text);
    console.log(`[FACTCHECK/URL] Extracted ${rawClaims.length} claims`);

    if (rawClaims.length === 0)
      return res.json(generateReport([]));

    const verifiedClaims = await verifyClaimsInBatches(rawClaims, 3);

    const [mediaAnalysis] = await Promise.all([mediaAnalysisPromise]);

    const report = generateReport(verifiedClaims);
    report.source_url = url;
    report.extracted_word_count = text.split(/\s+/).length;
    if (mediaAnalysis) {
      report.media_analysis = mediaAnalysis;
    }
    
    res.json(report);
  } catch (err) {
    console.error("[FACTCHECK/URL ERROR]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Keep backward compat with old /process endpoint
router.post("/process", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 10)
      return res.status(400).json({ error: "Text too short." });

    const rawClaims = await extractAllClaims(text.trim());
    if (rawClaims.length === 0)
      return res.json(generateReport([]));

    const verifiedClaims = await verifyClaimsInBatches(rawClaims, 3);

    res.json(generateReport(verifiedClaims));
  } catch (err) {
    console.error("[FACTCHECK ERROR]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
