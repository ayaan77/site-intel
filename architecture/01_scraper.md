# SOP 01 — URL Scraper
**Layer:** Tool (`tools/scrape_url.py`)  
**Last Updated:** 2026-02-19

---

## Goal
Fetch all raw page data from a given URL in a single pass and write it to `.tmp/{domain}_raw.json`. This is the foundation every other tool reads from.

## Inputs
```
url: string  (e.g. "https://example.com")
```

## Outputs (written to `.tmp/{domain}_raw.json`)
```json
{
  "url": "string",
  "finalUrl": "string (after redirects)",
  "timestamp": "ISO-8601",
  "statusCode": "number",
  "loadTimeMs": "number",
  "html": "string",
  "headers": "Record<string, string>",
  "scripts": ["string"],
  "stylesheets": ["string"],
  "metaTags": [{ "name": "string", "content": "string" }],
  "openGraph": "Record<string, string>",
  "links": { "internal": ["string"], "external": ["string"] },
  "images": [{ "src": "string", "alt": "string", "width": "number|null", "height": "number|null" }],
  "cookies": ["string"],
  "robots": "string | null",
  "sitemap": "string | null"
}
```

## Tool Logic (Step-by-Step)
1. Validate URL (must start with `http://` or `https://`)
2. Fetch `robots.txt` → store content (used by SEO auditor)
3. Fetch `sitemap.xml` → store content (used to estimate page count)
4. Launch Playwright headless Chromium
5. `page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })`
6. Record final URL after redirects
7. Capture: HTML content, response headers, status code, load time
8. Extract all `<script src>`, `<link rel="stylesheet">`, `<meta>`, `<img>`, `<a>` tags
9. Separate internal vs external links (compare hostnames)
10. Read all cookies via `context.cookies()`
11. Write to `.tmp/{sanitized_domain}_raw.json`
12. Exit 0 on success, exit 1 with error message on failure

## Edge Cases
- **Redirect loops:** Playwright follows up to 5 redirects, then errors. Catch and report.
- **JS-heavy SPA:** `networkidle` wait handles hydration. If still empty after 15s, fallback to `domcontentloaded`.
- **Anti-bot / Cloudflare challenge:** If status 403 or 503 on final URL, write `{ "blocked": true }` and surface "Site has bot protection" in UI.
- **HTTP (not HTTPS):** Allowed. Record final URL after any redirects.
- **Invalid URL:** Exit immediately with clear error string.

## Rate Limiting Rule
Never hit the same domain more than once per 5 seconds. Check `.tmp/{domain}_raw.json` timestamp before re-fetching — if fresher than 1 hour, use cached version.

## Dependencies
- `playwright` Python package
- `requests` (for robots.txt / sitemap)
- `beautifulsoup4` (HTML parsing)
