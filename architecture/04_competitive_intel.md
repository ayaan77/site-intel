# SOP 04 — Competitive Intelligence
**Layer:** Tool (`tools/detect_competitive.py`)  
**Last Updated:** 2026-02-19

---

## Goal
Detect advertising networks, tracking pixels, and traffic signals from scraped data. Split into two sub-modules: Ad Detection (no API needed) and Traffic Estimation (API needed, graceful skip if missing).

## Inputs
```
raw_payload: dict  (from .tmp/{domain}_raw.json)
```

## Outputs
```json
{
  "adsRunning": true,
  "adNetworks": ["Google Ads", "Facebook Ads"],
  "trackingPixels": ["Facebook Pixel", "Google Analytics 4"],
  "socialProof": { "hasPixel": true, "networks": ["Facebook", "TikTok"] },
  "estimatedMonthlyTraffic": "250K-500K | null",
  "trafficSource": "SimilarWeb API | Unavailable",
  "domainAuthority": null,
  "backlinks": null
}
```

---

## Sub-Module A: Ad & Pixel Detection (No API)

### Method: Scan `scripts[]` and `html` for known fingerprints

#### Google Ads / AdSense
- HTML contains `adsbygoogle`
- Scripts contain `googlesyndication.com`
- Scripts contain `doubleclick.net`
- HTML contains `googletag.cmd`

#### Facebook Ads / Meta Pixel
- HTML contains `fbq('init'`
- Scripts contain `connect.facebook.net/en_US/fbevents.js`

#### TikTok Pixel
- Scripts contain `analytics.tiktok.com`

#### Taboola
- Scripts contain `cdn.taboola.com`
- HTML contains `window._taboola`

#### Outbrain
- Scripts contain `widgets.outbrain.com`

#### Criteo
- Scripts contain `static.criteo.net`

#### Twitter/X Ads
- Scripts contain `static.ads-twitter.com`

#### Google Analytics
- Scripts contain `gtag.js` or `analytics.js` or `G-XXXXXXX` pattern

#### Hotjar
- Scripts contain `static.hotjar.com`

#### Mixpanel
- Scripts contain `cdn.mxpnl.com`

### Output Logic
- `adsRunning = true` if ANY ad network detected (not just analytics)
- `trackingPixels` = all trackers found (analytics + social)
- `adNetworks` = only monetization networks (AdSense, Taboola, Outbrain, etc.)

---

## Sub-Module B: Traffic Estimation (API Required)

### If `SIMILARWEB_API_KEY` present:
```
GET https://api.similarweb.com/v1/website/{domain}/total-traffic-and-engagement/visits
```
Return: `estimatedMonthlyTraffic`, bounce rate, avg visit duration, pages per visit

### If API key missing:
```json
{ "estimatedMonthlyTraffic": null, "trafficSource": "Unavailable — SIMILARWEB_API_KEY not set" }
```
**Never crash. Always degrade gracefully.**

---

## Edge Cases
- Minified scripts: regex pattern match still works on minified code
- GTM (Google Tag Manager): If GTM detected, note that additional tracking tools may be loaded dynamically — cannot be fully enumerated without executing GTM
- Multiple ad networks = high monetization signal — highlight this in AI summary
