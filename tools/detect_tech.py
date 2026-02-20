#!/usr/bin/env python3
"""
Tool: detect_tech.py
Purpose: Fingerprint website tech stack from scraped payload
Layer: B.L.A.S.T. Tool Layer
SOP: architecture/02_tech_detection.md
"""

import sys
import json
import re

def detect(raw: dict) -> dict:
    html = raw.get('html', '')
    headers = {k.lower(): v.lower() for k, v in raw.get('headers', {}).items()}
    scripts = [s.lower() for s in raw.get('scripts', [])]
    stylesheets = [s.lower() for s in raw.get('stylesheets', [])]
    meta_tags = raw.get('metaTags', [])
    cookies = [c.lower() for c in raw.get('cookies', [])]
    html_lower = html.lower()

    signals = []  # (field, value, confidence_weight)

    # --- FRAMEWORK DETECTION ---
    framework = None
    
    if 'window.__next_data__' in html or '/_next/static/' in html_lower:
        framework = 'Next.js'
        signals.append(('framework', 'Next.js', 30))
    elif 'window.__nuxt__' in html:
        framework = 'Nuxt.js'
        signals.append(('framework', 'Nuxt.js', 30))
    elif 'window.__gatsby' in html or '/gatsby-' in html_lower:
        framework = 'Gatsby'
        signals.append(('framework', 'Gatsby', 30))
    elif 'window.angular' in html or 'ng-version' in html_lower:
        framework = 'Angular'
        signals.append(('framework', 'Angular', 25))
    elif any('vue' in s for s in scripts) or 'window.vue' in html_lower:
        framework = 'Vue.js'
        signals.append(('framework', 'Vue.js', 20))
    elif 'window.react' in html_lower or 'react.development.js' in html_lower:
        framework = 'React'
        signals.append(('framework', 'React', 15))

    if any('x-powered-by' in k and 'next' in v for k, v in headers.items() if 'x-powered-by' in k):
        framework = framework or 'Next.js'
        signals.append(('framework', 'Next.js (header)', 20))

    # --- CMS DETECTION ---
    cms = None

    for m in meta_tags:
        content = m.get('content', '').lower()
        name = m.get('name', '').lower()
        if name == 'generator':
            if 'wordpress' in content:
                cms = 'WordPress'
                signals.append(('cms', 'WordPress', 40))
            elif 'shopify' in content:
                cms = 'Shopify'
                signals.append(('cms', 'Shopify', 40))
            elif 'wix' in content:
                cms = 'Wix'
                signals.append(('cms', 'Wix', 40))
            elif 'squarespace' in content:
                cms = 'Squarespace'
                signals.append(('cms', 'Squarespace', 40))
            elif 'webflow' in content:
                cms = 'Webflow'
                signals.append(('cms', 'Webflow', 40))
            elif 'drupal' in content:
                cms = 'Drupal'
                signals.append(('cms', 'Drupal', 40))

    if cms is None:
        if 'window.wp' in html or '/wp-content/' in html_lower or '/wp-includes/' in html_lower:
            cms = 'WordPress'
            signals.append(('cms', 'WordPress (paths)', 35))
        elif 'window.shopify' in html_lower or 'cdn.shopify.com' in html_lower:
            cms = 'Shopify'
            signals.append(('cms', 'Shopify (global)', 35))
        elif any('_shopify' in c for c in cookies):
            cms = 'Shopify'
            signals.append(('cms', 'Shopify (cookie)', 30))
        elif '/sites/default/' in html_lower:
            cms = 'Drupal'
            signals.append(('cms', 'Drupal (path)', 30))

    # --- SERVER / HOSTING / CDN ---
    server = headers.get('server', None)
    if server:
        if 'nginx' in server: server = 'nginx'
        elif 'apache' in server: server = 'Apache'
        elif 'cloudflare' in server: server = 'Cloudflare'
        elif 'iis' in server: server = 'IIS'
        signals.append(('server', server, 10))

    hosting = None
    if 'x-vercel-id' in headers or any('vercel' in v for v in headers.values()):
        hosting = 'Vercel'
        signals.append(('hosting', 'Vercel', 20))
    elif 'x-netlify' in headers or 'netlify-vary' in headers:
        hosting = 'Netlify'
        signals.append(('hosting', 'Netlify', 20))
    elif 'x-amz-cf-id' in headers or 'x-amzn-requestid' in headers:
        hosting = 'AWS'
        signals.append(('hosting', 'AWS', 15))
    elif 'x-github-request-id' in headers:
        hosting = 'GitHub Pages'
        signals.append(('hosting', 'GitHub Pages', 20))

    cdn = None
    if 'cf-cache-status' in headers or 'cf-ray' in headers:
        cdn = 'Cloudflare'
        signals.append(('cdn', 'Cloudflare', 15))
    elif 'x-amz-cf-id' in headers:
        cdn = 'AWS CloudFront'
        signals.append(('cdn', 'AWS CloudFront', 15))
    elif 'x-fastly-request-id' in headers:
        cdn = 'Fastly'
        signals.append(('cdn', 'Fastly', 15))

    # --- LANGUAGE ---
    language = None
    if any('phpsessid' in c for c in cookies) or (server and 'php' in headers.get('x-powered-by', '')):
        language = 'PHP'
        signals.append(('language', 'PHP', 20))
    elif any('jsessionid' in c for c in cookies):
        language = 'Java'
        signals.append(('language', 'Java', 20))
    elif framework in ('Next.js', 'Gatsby', 'Nuxt.js') or (server and 'node' in server):
        language = 'Node.js'
        signals.append(('language', 'Node.js', 15))

    # --- LIBRARIES ---
    libraries = []
    if 'jquery' in html_lower or any('jquery' in s for s in scripts):
        libraries.append('jQuery')
    if 'bootstrap' in html_lower or any('bootstrap' in s for s in scripts + stylesheets):
        libraries.append('Bootstrap')
    if 'tailwind' in html_lower or any('tailwind' in s for s in stylesheets):
        libraries.append('Tailwind CSS')
    if 'lodash' in html_lower or any('lodash' in s for s in scripts):
        libraries.append('Lodash')
    if 'axios' in html_lower:
        libraries.append('Axios')
    if 'gsap' in html_lower or any('gsap' in s for s in scripts):
        libraries.append('GSAP')
    if 'three.js' in html_lower or any('three.min.js' in s for s in scripts):
        libraries.append('Three.js')

    # --- CONFIDENCE ---
    total_weight = sum(w for _, _, w in signals)
    confidence = min(95, total_weight) if signals else 10

    return {
        'framework': framework or 'Unknown',
        'cms': cms or 'None',
        'hosting': hosting or 'Unknown',
        'cdn': cdn or 'None',
        'server': server or 'Unknown',
        'language': language or 'Unknown',
        'libraries': libraries,
        'signals': signals,
        'confidence': confidence
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python detect_tech.py <path_to_raw.json>")
        sys.exit(1)
    
    with open(sys.argv[1]) as f:
        raw = json.load(f)
    
    result = detect(raw)
    print(json.dumps(result, indent=2))
