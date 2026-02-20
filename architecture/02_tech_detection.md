# SOP 02 — Tech Stack Detection
**Layer:** Tool (`tools/detect_tech.py`)  
**Last Updated:** 2026-02-19

---

## Goal
Read the raw scraped payload and identify the technology stack of the target site with a confidence score. Zero external API calls required.

## Inputs
```
raw_payload: dict  (loaded from .tmp/{domain}_raw.json)
```

## Outputs
```json
{
  "framework": "Next.js | React | Vue | Angular | Gatsby | Nuxt | WordPress | Shopify | Drupal | Laravel | Unknown",
  "cms": "WordPress | Shopify | Webflow | Wix | Squarespace | None | Unknown",
  "hosting": "Vercel | Netlify | AWS | Cloudflare Pages | GoDaddy | Unknown",
  "cdn": "Cloudflare | AWS CloudFront | Fastly | Akamai | None | Unknown",
  "analytics": ["Google Analytics", "Facebook Pixel", "Hotjar", "Mixpanel", ...],
  "advertising": ["Google Ads", "Facebook Ads", "Taboola", "Outbrain", ...],
  "libraries": ["jQuery", "Bootstrap", "Tailwind", "Lodash", ...],
  "server": "nginx | Apache | Cloudflare | IIS | Unknown",
  "language": "PHP | Node.js | Python | Ruby | Java | Unknown",
  "confidence": 0-100
}
```

## Detection Rules (Priority Order)

### 1. HTTP Response Headers
| Header | Signal |
|--------|--------|
| `x-powered-by: Next.js` | framework = Next.js |
| `x-powered-by: PHP/x.x` | language = PHP |
| `server: nginx` | server = nginx |
| `server: Apache` | server = Apache |
| `x-generator: WordPress x.x` | cms = WordPress |
| `x-vercel-id` present | hosting = Vercel |
| `cf-cache-status` present | cdn = Cloudflare |
| `x-amz-cf-id` present | cdn = AWS CloudFront |
| `x-netlify` present | hosting = Netlify |

### 2. HTML Meta Tags
| Pattern | Signal |
|---------|--------|
| `<meta name="generator" content="WordPress">` | cms = WordPress |
| `<meta name="generator" content="Shopify">` | cms = Shopify |
| `<meta name="generator" content="Wix.com">` | cms = Wix |

### 3. Script URL Patterns (in `scripts[]`)
| URL pattern | Signal |
|------------|--------|
| `/_next/static/` | framework = Next.js |
| `/wp-content/` or `/wp-includes/` | cms = WordPress |
| `cdn.shopify.com` | cms = Shopify |
| `/sites/default/files/` | cms = Drupal |
| `/themes/` + `bootstrap` | library = Bootstrap |
| `jquery` anywhere | library = jQuery |
| `tailwind` in CSS link | library = Tailwind |

### 4. JavaScript Global Variables (in HTML)
| Variable found | Signal |
|---------------|--------|
| `window.__NEXT_DATA__` | framework = Next.js, language = Node.js |
| `window.wp` | cms = WordPress |
| `window.Shopify` | cms = Shopify |
| `window.__nuxt__` | framework = Nuxt.js |
| `window.__gatsby` | framework = Gatsby |
| `window.angular` | framework = AngularJS |
| `window.Vue` | framework = Vue.js |
| `window.React` | library = React |

### 5. Cookie Patterns (in `cookies[]`)
| Cookie name | Signal |
|------------|--------|
| `PHPSESSID` | language = PHP |
| `JSESSIONID` | language = Java |
| `_shopify_*` | cms = Shopify |
| `woocommerce_*` | cms = WordPress + WooCommerce |

## Confidence Scoring
- Each signal found adds to confidence
- 1 strong signal (JS global or meta generator) = 80+ confidence
- 3+ corroborating signals = 95+ confidence
- No signals found = confidence = 10, all fields = "Unknown"

## Edge Cases
- Multiple frameworks detected (React inside Next.js): prioritize the most specific one
- Obfuscated scripts (webpack bundles): pattern match on `__webpack_require__`
