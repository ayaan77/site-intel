# task_plan.md — B.L.A.S.T. Master Plan
**Project:** Site Intel  
**Protocol:** B.L.A.S.T. (Blueprint, Link, Architect, Stylize, Trigger)

---

## ✅ Protocol 0 — Initialization
- [x] Discovery Questions answered
- [x] `gemini.md` created (Data Schema defined)
- [x] `task_plan.md` created
- [x] `findings.md` created
- [x] `progress.md` created
- [x] **Blueprint approved by user** ✅

---

## 🏗️ Phase 1 — B (Blueprint)

### 1.1 Project Scaffold
- [ ] Initialize Next.js project in `/site-intel/`
- [ ] Set up TypeScript, Tailwind CSS
- [ ] Configure `@/*` path aliases
- [ ] Create `.env.example` with all required env vars
- [ ] Create `.gitignore` (exclude `.env`, `.tmp/`, `.next/`)

### 1.2 Architecture SOPs (Markdown first, code second) ← CURRENT
- [ ] `architecture/01_scraper.md` — URL scraping strategy
- [ ] `architecture/02_tech_detection.md` — How to fingerprint frameworks
- [ ] `architecture/03_seo_analysis.md` — What to check, scoring rubric
- [ ] `architecture/04_competitive_intel.md` — Ad & traffic signals
- [ ] `architecture/05_ai_analysis.md` — Prompt design, grounding rules
- [ ] `architecture/06_ui_dashboard.md` — Component map, layout plan

### 1.3 Data Schema Validation
- [x] Input schema defined in `gemini.md`
- [x] Output schema defined in `gemini.md`
- [ ] User approves schema

---

## ⚡ Phase 2 — L (Link)

### 2.1 Environment Setup
- [ ] Create `.env` with available keys (Groq)
- [ ] Build `tools/verify_connections.py` — tests each API
- [ ] Verify Groq connection works

### 2.2 Core Scraper
- [ ] `tools/scrape_url.py` — Playwright-based full-page scraper
  - Raw HTML, headers, status code, load time
  - Scripts, cookies, meta tags, OpenGraph
  - robots.txt, sitemap.xml fetch
- [ ] Test on 3 real URLs (React SPA, WordPress, Next.js site)

---

## ⚙️ Phase 3 — A (Architect / Build)

### Layer 3 Tools (Atomic Python Scripts)
- [ ] `tools/detect_tech.py` — Framework fingerprinting
  - Header analysis (X-Powered-By, Server)
  - JS global variable signatures (`__NEXT_DATA__`, `wp-content`, etc.)
  - Cookie patterns, script URL patterns
- [ ] `tools/seo_audit.py` — SEO checker
  - Title, meta desc, H1, image alts, canonical, robots
  - Structured data (JSON-LD check)
  - Internal/external link ratio
- [ ] `tools/pagespeed.py` — PageSpeed API integration (graceful skip if no key)
- [ ] `tools/detect_ads.py` — Ad network fingerprinting
  - Google Adsense (`adsbygoogle`)
  - Facebook Pixel (`fbq`)
  - Taboola, Outbrain, etc.
- [ ] `tools/traffic_estimate.py` — SimilarWeb integration (skip if no key)
- [ ] `tools/ai_analyze.py` — Groq-powered analysis
  - Takes scraped payload → returns structured recommendations
- [ ] `tools/generate_diagram.py` — Mermaid architecture diagram from site structure

### Layer 1 Architecture (SOPs in `architecture/`)
- [ ] All 6 SOP files written and reviewed

---

## ✨ Phase 4 — S (Stylize)

### Dashboard UI (Next.js)
- [ ] `app/page.tsx` — URL input landing page
- [ ] `app/report/[id]/page.tsx` — Full analysis report
- [ ] `components/ScoreCard.tsx` — SEO score ring
- [ ] `components/TechBadges.tsx` — Tech stack chips
- [ ] `components/ArchitectureDiagram.tsx` — Mermaid renderer
- [ ] `components/RecommendationList.tsx` — Priority-sorted action items
- [ ] `components/CompetitivePanel.tsx` — Traffic + ads panel
- [ ] Design tokens / color system based on user reference image (TBD)

---

## 🛰️ Phase 5 — T (Trigger)

- [ ] Supabase schema migrations
- [ ] Next.js API routes trigger Python tools via subprocess or direct TypeScript ports
- [ ] Deploy to Vercel
- [ ] Cron: re-analyze saved URLs weekly
- [ ] Maintenance log in `gemini.md` updated post-deploy

---

## 🚧 Gates (Nothing proceeds without these)

| Gate | Status |
|------|--------|
| Blueprint approved | ⏳ Pending |
| Schema approved | ⏳ Pending |
| All Architecture SOPs written | ⏳ Pending |
| Scraper tested on 3 URLs | ⏳ Pending |
| AI returns structured output | ⏳ Pending |
| Dashboard matches reference design | ⏳ Pending |
