# findings.md — Research & Discoveries
**Project:** Site Intel  
**Last Updated:** 2026-02-19

---

## 🔍 Tech Stack Detection Methods (No API required)

### HTTP Header Fingerprints
| Header | What it reveals |
|--------|----------------|
| `X-Powered-By: Next.js` | Next.js |
| `X-Powered-By: PHP/8.x` | PHP backend |
| `Server: Apache` | Apache server |
| `Server: nginx` | Nginx server |
| `x-generator: WordPress` | WordPress |
| `cf-cache-status` | Cloudflare CDN |
| `x-vercel-id` | Vercel hosting |
| `x-amz-cf-id` | AWS CloudFront |

### JavaScript Global Variable Signatures
| Variable | Framework |
|----------|-----------|
| `window.__NEXT_DATA__` | Next.js |
| `window.wp` | WordPress |
| `window.Shopify` | Shopify |
| `window.__nuxt__` | Nuxt.js |
| `window.__gatsby` | Gatsby |
| `window.angular` | AngularJS |
| `window.React` | React |
| `window.Vue` | Vue.js |

### Script URL Patterns
| Pattern | Framework |
|---------|-----------|
| `/_next/static/` | Next.js |
| `/wp-content/` | WordPress |
| `/wp-includes/` | WordPress |
| `cdn.shopify.com` | Shopify |
| `/sites/default/` | Drupal |

### Cookie Patterns
| Cookie | Platform |
|--------|---------|
| `PHPSESSID` | PHP |
| `JSESSIONID` | Java |
| `_shopify_*` | Shopify |
| `woocommerce_*` | WooCommerce |

---

## 🎯 Ad Network Fingerprints (DOM/Script-based)

| Signal | Ad Network |
|--------|-----------|
| `googletag` / `adsbygoogle` | Google Ads |
| `fbq` / `facebook pixel` in scripts | Facebook Ads |
| `taboola` in script URLs | Taboola |
| `outbrain` in script URLs | Outbrain |
| `criteo` in scripts | Criteo |
| `doubleclick.net` URLs | Google Display |

---

## 📈 Traffic Estimation (Without API)

Without SimilarWeb/Semrush API, we can:
- Check Cloudflare Radar (public data for some domains)
- Analyze sitemap size as a proxy for site scale
- Count indexed pages via `site:` operator (manual)
When API keys are added: SimilarWeb REST API gives monthly visits, bounce rate, top countries, top sources.

---

## 🛠️ Scraping Strategy

**Approach:** Playwright (headless Chromium) for JavaScript-heavy SPAs + `requests` + `BeautifulSoup` for static pages.

**Why Playwright over Puppeteer:** Better Python support, handles SSR hydration, respects network idle state.

**Constraints:**
- Respect `robots.txt` — check before scraping
- Set User-Agent to identify as a bot: `SiteIntelBot/1.0`
- Timeout: 15 seconds per page
- Rate limit: Never hit the same domain more than once per 5 seconds

---

## 🤖 AI Analysis Approach

**Model:** Groq (llama-3.3-70b-versatile) — already integrated in gabriel-web.

**Prompt Strategy:**
- Feed structured JSON (scraped payload) as context
- Ask for structured JSON output (recommendations)
- Use `temperature: 0.1` for deterministic, factual analysis
- System prompt enforces: no hedging, prioritized output, concrete fixes only

---

## ⚠️ Known Constraints

1. **Dynamic SPAs:** Single-page apps may need Playwright + wait for network idle to fully render.
2. **Anti-bot measures:** Some sites (Cloudflare challenge) will block scrapers. Strategy: respect this, show user "Unable to analyze — site has bot protection."
3. **CORS:** The scraping must happen server-side (Next.js API routes / Python backend), never from the browser.
4. **Rate limits:** SimilarWeb free tier is very limited. Must cache results.
5. **Privacy:** Don't store raw HTML long-term — only store the processed payload.
