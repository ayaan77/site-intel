# SOP 06 — UI Dashboard
**Layer:** Frontend (Next.js App Router)  
**Last Updated:** 2026-02-19  
**Design Inspiration:** GTmetrix (score cards) + Sitechecker (report layout) + Linear (dark aesthetic)

---

## Goal
A fast, beautiful, dark-mode dashboard that shows website intelligence results at a glance. Prioritizes scannability — a user should understand a site's health in 5 seconds.

---

## Page Structure

### Page 1: Landing (`/`)
- Hero: Large URL input box, centered
- Subtext: "Analyze any website in seconds"
- Recent analyses (if saved): small cards below

### Page 2: Analysis Report (`/report/[id]`)
Split into 5 panels:
1. **Overview Strip** — URL, score, grade, timestamp, share button
2. **SEO Panel** — Score ring + issues table
3. **Tech Stack Panel** — Badge grid of detected technologies  
4. **Competitive Panel** — Ads detected, traffic estimate, pixel list
5. **AI Recommendations** — Priority-sorted action cards
6. **Architecture Diagram** — Mermaid diagram render

---

## Component Map

| Component | File | Description |
|-----------|------|-------------|
| `URLInput` | `components/url-input.tsx` | Landing page URL field + analyze button |
| `ScoreRing` | `components/score-ring.tsx` | SVG circular progress showing 0-100 score |
| `GradeBadge` | `components/grade-badge.tsx` | A/B/C/D/F badge with color coding |
| `SEOPanel` | `components/seo-panel.tsx` | Issue table with severity icons |
| `TechBadges` | `components/tech-badges.tsx` | Chip grid of detected tech with logos |
| `ArchDiagram` | `components/arch-diagram.tsx` | Mermaid.js renderer |
| `AdDetector` | `components/ad-detector.tsx` | Ad network list with icons |
| `TrafficCard` | `components/traffic-card.tsx` | Monthly traffic estimate card |
| `RecommendationCard` | `components/recommendation-card.tsx` | Priority-colored action item card |
| `LoadingState` | `components/loading-state.tsx` | Animated progress ("Scraping...", "Detecting tech...") |

---

## Design Tokens (Dark Theme)

```css
--bg-base: #0a0a0f          /* Almost black */
--bg-surface: #12121a       /* Card background */
--bg-elevated: #1a1a28      /* Hover / elevated */
--border: #2a2a3d           /* Subtle border */

--text-primary: #f0f0ff     /* Main text */
--text-secondary: #8888aa   /* Muted text */

--accent-blue: #4f7fff      /* Primary CTA */
--accent-green: #22d47a     /* Good / pass */
--accent-yellow: #ffcc00    /* Warning */
--accent-red: #ff4d4d       /* Critical / error */
--accent-purple: #a78bfa    /* AI / special */

--radius: 12px
--font: 'Inter', sans-serif
```

---

## SEO Score Color Thresholds
| Score | Color | Grade |
|-------|-------|-------|
| 90-100 | `--accent-green` | A |
| 75-89 | `#7bc67a` | B |
| 60-74 | `--accent-yellow` | C |
| 45-59 | `#ff9940` | D |
| 0-44 | `--accent-red` | F |

---

## Loading UX (Animated Steps)
Show a live progress strip while analysis runs:
```
✅ Fetching URL...
✅ Scraping page content...
⏳ Detecting tech stack...
   Auditing SEO...
   Checking for ads...
   Running AI analysis...
```
Each step checks off in real time via Server-Sent Events (SSE) or polling.

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/analyze` | POST | Accepts `{ url }`, triggers full analysis pipeline, returns `analysisId` |
| `/api/status/[id]` | GET | Returns analysis status (`pending|running|done|error`) |
| `/api/report/[id]` | GET | Returns full analysis payload |

---

## Responsive Layout
- Mobile: Single column, stacked panels
- Tablet: 2-column grid for panels
- Desktop: Sidebar (navigation) + main content area
