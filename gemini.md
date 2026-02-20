# gemini.md — Project Constitution
**Project:** Site Intel — AI-Powered Website Intelligence Platform  
**Status:** 🟡 Phase 1 Blueprint — Awaiting Approval  
**Last Updated:** 2026-02-19

> ⚠️ This file is LAW. No schema, rule, or architectural decision changes without updating this file first.

---

## 🎯 North Star

> Given any URL, produce a complete, rational, actionable intelligence report covering SEO health, tech stack, site architecture, and competitive signals — delivered to a beautiful dashboard. No fluff. No bias. Direct truth.

---

## 📐 Data Schema

### Input
```json
{
  "url": "string (required, valid http/https URL)",
  "requestedModules": ["seo", "tech", "architecture", "competitive", "ads"]
}
```

### Internal Scraped Payload (`.tmp/`)
```json
{
  "url": "string",
  "timestamp": "ISO-8601",
  "raw": {
    "html": "string",
    "headers": "Record<string, string>",
    "statusCode": "number",
    "loadTimeMs": "number",
    "scripts": ["string"],
    "stylesheets": ["string"],
    "metaTags": [{ "name": "string", "content": "string" }],
    "openGraph": "Record<string, string>",
    "links": ["string"],
    "images": [{ "src": "string", "alt": "string" }],
    "cookies": ["string"],
    "robots": "string",
    "sitemap": "string | null"
  }
}
```

### Output Payload (Database / UI)
```json
{
  "id": "uuid",
  "url": "string",
  "analyzedAt": "ISO-8601",
  "seo": {
    "score": "number (0–100)",
    "title": { "value": "string", "length": "number", "status": "good|warn|error" },
    "metaDescription": { "value": "string", "length": "number", "status": "good|warn|error" },
    "headings": { "h1Count": "number", "h2Count": "number", "issues": ["string"] },
    "images": { "total": "number", "missingAlt": "number" },
    "canonicalUrl": "string | null",
    "robotsMeta": "string",
    "structuredData": "boolean",
    "pagespeed": {
      "mobile": "number",
      "desktop": "number",
      "lcp": "string",
      "cls": "number",
      "fid": "string"
    },
    "issues": ["string"],
    "recommendations": ["string"]
  },
  "techStack": {
    "framework": "string | null",
    "cms": "string | null",
    "hosting": "string | null",
    "cdn": "string | null",
    "analytics": ["string"],
    "advertising": ["string"],
    "libraries": ["string"],
    "server": "string | null",
    "language": "string | null",
    "confidence": "number (0–100)"
  },
  "architecture": {
    "type": "SPA|MPA|SSR|SSG|Hybrid",
    "routing": "string",
    "apiPatterns": ["string"],
    "estimatedPages": "number",
    "hasSearch": "boolean",
    "hasAuth": "boolean",
    "hasEcommerce": "boolean",
    "diagram": "string (mermaid syntax)"
  },
  "competitive": {
    "adsRunning": "boolean",
    "adNetworks": ["string"],
    "estimatedMonthlyTraffic": "string | null",
    "socialProof": { "hasPixel": "boolean", "networks": ["string"] },
    "backlinks": "string | null",
    "domainAuthority": "number | null"
  },
  "aiSummary": "string",
  "aiRecommendations": [
    {
      "priority": "critical|high|medium|low",
      "category": "seo|tech|ux|performance|competitive",
      "issue": "string",
      "fix": "string"
    }
  ]
}
```

---

## 🏗️ Architectural Invariants

1. **Scraping first, AI second.** Raw data is always collected before AI is called. AI never guesses — it only interprets real data.
2. **Atomic tools.** Each Python script in `tools/` does exactly one thing. No monolithic scripts.
3. **`.tmp/` is ephemeral.** Never store final data in `.tmp/`. Always write final output to Supabase (Phase 2+).
4. **Fail loudly.** Tools must print clear error messages and exit with code 1 on failure. Never silently swallow errors.
5. **AI is rational, not rightist.** The AI prompt must always ground its reasoning in the actual scraped data. It must identify real problems and prescribe real solutions.
6. **No API key = graceful degradation.** If a key is missing, the module skips (not crashes) and marks the field as `null` with a `"source": "unavailable"` note.

---

## 🔌 Integrations Registry

| Service | Purpose | Key Status | Env Var |
|---------|---------|-----------|---------|
| Groq API | AI analysis & recommendations | ✅ Available | `GROQ_API_KEY` |
| Google PageSpeed API | Core Web Vitals | ⏳ Needed | `PAGESPEED_API_KEY` |
| SimilarWeb API | Traffic estimates | ⏳ Needed | `SIMILARWEB_API_KEY` |
| BuiltWith API | Tech stack confirmation | ⏳ Needed | `BUILTWITH_API_KEY` |
| Supabase | Persistent storage | ⏳ Needed | `SUPABASE_URL`, `SUPABASE_KEY` |

---

## 📋 Behavioral Rules (AI Persona)

- **Tone:** Direct, rational, zero fluff. Like a senior engineer giving code review.
- **No hedging.** State findings as facts, not suggestions ("Your H1 is missing" not "You might want to add an H1").
- **Prioritized.** Always sort recommendations Critical → High → Medium → Low.
- **Constructive.** Every problem statement must include a concrete fix.
- **Design on demand.** If user asks for a mockup, generate a Mermaid diagram or HTML wireframe immediately.

---

## 🗄️ Maintenance Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-19 | Initial constitution created | System Pilot |
