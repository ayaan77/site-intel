# SOP 03 — SEO Audit
**Layer:** Tool (`tools/seo_audit.py`)  
**Last Updated:** 2026-02-19

---

## Goal
Analyze the scraped HTML payload for all common SEO factors. Produce a scored audit with specific issues and actionable fixes. No AI involved — this is pure deterministic rule-based analysis.

## Inputs
```
raw_payload: dict  (loaded from .tmp/{domain}_raw.json)
```

## Outputs
```json
{
  "score": 0-100,
  "grade": "A | B | C | D | F",
  "title": { "value": "...", "length": 0, "status": "good|warn|error", "issue": "..." },
  "metaDescription": { "value": "...", "length": 0, "status": "good|warn|error", "issue": "..." },
  "headings": { "h1Count": 0, "h2Count": 0, "h3Count": 0, "issues": ["..."] },
  "images": { "total": 0, "missingAlt": 0, "oversized": 0 },
  "links": { "internal": 0, "external": 0, "broken": [] },
  "canonicalUrl": "string | null",
  "robotsMeta": "index,follow | noindex | ...",
  "structuredData": { "present": true, "types": ["Article", "Product", ...] },
  "openGraph": { "complete": true, "missing": ["og:image"] },
  "sitemap": { "found": true, "url": "..." },
  "robotsTxt": { "found": true, "blocksAll": false },
  "httpsEnabled": true,
  "issues": [{ "severity": "critical|warning|info", "check": "...", "detail": "..." }],
  "recommendations": [{ "priority": "critical|high|medium|low", "issue": "...", "fix": "..." }]
}
```

## Scoring Rubric

| Check | Max Points | Criteria |
|-------|-----------|---------|
| Title tag | 15 | Present = 10, Length 50-60 chars = +5 |
| Meta description | 15 | Present = 10, Length 150-160 chars = +5 |
| Single H1 | 10 | Exactly 1 H1 = 10, 0 or 2+ = 0 |
| Image alt text | 10 | All images have alt = 10, deduct per missing |
| Canonical URL | 5 | Present = 5 |
| Structured data | 10 | JSON-LD or microdata present = 10 |
| HTTPS | 10 | HTTPS = 10, HTTP = 0 |
| Open Graph complete | 10 | og:title + og:desc + og:image = 10 |
| Sitemap found | 5 | sitemap.xml found = 5 |
| robots.txt found | 5 | found and not blocking all = 5 |
| Internal links | 5 | >3 internal links = 5 |

**Grade:** A = 90-100, B = 75-89, C = 60-74, D = 45-59, F = <45

## Audit Rules

### Title Tag
- CRITICAL: Missing = 0 points, issue flagged
- WARN: < 30 chars "Too short"
- WARN: > 65 chars "Too long — will be truncated in SERPs"
- GOOD: 50-60 chars

### Meta Description
- CRITICAL: Missing
- WARN: < 120 chars
- WARN: > 160 chars

### Headings
- CRITICAL: 0 H1 tags
- WARN: More than 1 H1
- INFO: No H2 tags (flat structure)

### Images
- WARN: Any image missing alt attribute
- INFO: Image without explicit width/height (CLS risk)

### Structured Data
- Detect `<script type="application/ld+json">` blocks
- Parse and extract `@type` values

### Open Graph
- Check for: `og:title`, `og:description`, `og:image`, `og:url`
- Flag each missing one individually

## Edge Cases
- `<meta name="robots" content="noindex">`: FLAG as CRITICAL — "This page is excluded from search engines"
- Canonical pointing to a different domain: FLAG as WARNING
- Sitemap returning 404: Report as not found
