#!/usr/bin/env python3
"""
Tool: detect_competitive.py
Purpose: Detect ad networks, tracking pixels, and traffic signals
Layer: B.L.A.S.T. Tool Layer
SOP: architecture/04_competitive_intel.md
"""

import sys
import json
import os
import re

def detect(raw: dict) -> dict:
    html = raw.get('html', '')
    scripts = raw.get('scripts', [])
    html_lower = html.lower()
    scripts_str = ' '.join(scripts).lower()

    ad_networks = []
    tracking_pixels = []

    # ── GOOGLE ADS / ADSENSE ──────────────────────────────
    if ('adsbygoogle' in html_lower or
        'googlesyndication.com' in scripts_str or
        'doubleclick.net' in scripts_str or
        'googletag.cmd' in html_lower or
        'googletag.pubads' in html_lower):
        ad_networks.append('Google Ads / AdSense')

    # ── FACEBOOK / META PIXEL ─────────────────────────────
    if ("fbq('init'" in html or
        "fbq(\"init\"" in html or
        'connect.facebook.net' in scripts_str):
        ad_networks.append('Facebook Ads')
        tracking_pixels.append('Meta Pixel')

    # ── TIKTOK ───────────────────────────────────────────
    if 'analytics.tiktok.com' in scripts_str or 'ttq.load' in html_lower:
        ad_networks.append('TikTok Ads')
        tracking_pixels.append('TikTok Pixel')

    # ── TABOOLA ──────────────────────────────────────────
    if 'cdn.taboola.com' in scripts_str or 'window._taboola' in html_lower:
        ad_networks.append('Taboola')

    # ── OUTBRAIN ─────────────────────────────────────────
    if 'widgets.outbrain.com' in scripts_str or 'window.obApi' in html:
        ad_networks.append('Outbrain')

    # ── CRITEO ───────────────────────────────────────────
    if 'static.criteo.net' in scripts_str or 'window.criteo_q' in html_lower:
        ad_networks.append('Criteo')

    # ── TWITTER / X ADS ──────────────────────────────────
    if 'static.ads-twitter.com' in scripts_str or 'twq(' in html_lower:
        ad_networks.append('X (Twitter) Ads')
        tracking_pixels.append('Twitter Pixel')

    # ── LINKEDIN ─────────────────────────────────────────
    if '_linkedin_partner_id' in html or 'snap.licdn.com' in scripts_str:
        ad_networks.append('LinkedIn Ads')
        tracking_pixels.append('LinkedIn Insight Tag')

    # ── GOOGLE ANALYTICS ─────────────────────────────────
    if ('gtag.js' in scripts_str or 'analytics.js' in scripts_str or
        re.search(r"G-[A-Z0-9]{8,}", html) or
        re.search(r"UA-\d+-\d+", html)):
        tracking_pixels.append('Google Analytics')

    # ── GA4 ───────────────────────────────────────────────
    if re.search(r"G-[A-Z0-9]{8,}", html):
        tracking_pixels.append('GA4')

    # ── HOTJAR ───────────────────────────────────────────
    if 'static.hotjar.com' in scripts_str or 'window.hj' in html_lower:
        tracking_pixels.append('Hotjar')

    # ── MIXPANEL ─────────────────────────────────────────
    if 'cdn.mxpnl.com' in scripts_str or 'mixpanel.init' in html_lower:
        tracking_pixels.append('Mixpanel')

    # ── SEGMENT ──────────────────────────────────────────
    if 'cdn.segment.com' in scripts_str or 'analytics.load' in html_lower:
        tracking_pixels.append('Segment')

    # ── HUBSPOT ──────────────────────────────────────────
    if 'js.hs-scripts.com' in scripts_str or 'hubspot' in html_lower:
        tracking_pixels.append('HubSpot')

    # ── INTERCOM ─────────────────────────────────────────
    if 'widget.intercom.io' in scripts_str or 'window.intercomSettings' in html:
        tracking_pixels.append('Intercom')

    # ── GTM (special case) ────────────────────────────────
    gtm = bool(re.search(r"GTM-[A-Z0-9]+", html))
    if gtm:
        tracking_pixels.append('Google Tag Manager')

    # ── TRAFFIC ESTIMATION ────────────────────────────────
    api_key = os.environ.get('SIMILARWEB_API_KEY')
    estimated_traffic = None
    traffic_source = 'Unavailable — SIMILARWEB_API_KEY not set'

    if api_key:
        try:
            import requests
            from urllib.parse import urlparse
            domain = urlparse(raw.get('url', '')).netloc.replace('www.', '')
            r = requests.get(
                f'https://api.similarweb.com/v1/website/{domain}/total-traffic-and-engagement/visits',
                params={'api_key': api_key, 'start_date': '2024-01', 'end_date': '2024-12', 'granularity': 'monthly'},
                timeout=10
            )
            if r.status_code == 200:
                data = r.json()
                visits = data.get('visits', [])
                if visits:
                    avg = sum(v['visits'] for v in visits) / len(visits)
                    estimated_traffic = f"{int(avg/1000)}K/month"
                    traffic_source = 'SimilarWeb API'
        except Exception as e:
            traffic_source = f'SimilarWeb API error: {str(e)}'

    # De-duplicate
    ad_networks = list(dict.fromkeys(ad_networks))
    tracking_pixels = list(dict.fromkeys(tracking_pixels))

    return {
        'adsRunning': len(ad_networks) > 0,
        'adNetworks': ad_networks,
        'trackingPixels': tracking_pixels,
        'googleTagManager': gtm,
        'gtmNote': 'GTM detected — additional trackers may be loaded dynamically' if gtm else None,
        'estimatedMonthlyTraffic': estimated_traffic,
        'trafficSource': traffic_source,
        'socialProof': {
            'hasPixel': 'Meta Pixel' in tracking_pixels or 'Twitter Pixel' in tracking_pixels,
            'networks': [n.split(' Pixel')[0] for n in tracking_pixels if 'Pixel' in n or 'Insight' in n]
        },
        'domainAuthority': None,
        'backlinks': None
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python detect_competitive.py <path_to_raw.json>")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        raw = json.load(f)

    result = detect(raw)
    print(json.dumps(result, indent=2))
