#!/usr/bin/env python3
"""
Tool: scrape_url.py
Purpose: Full-page scraper using Playwright + requests
Layer: B.L.A.S.T. Tool Layer (atomic, testable)
SOP: architecture/01_scraper.md
"""

import sys
import json
import time
import hashlib
import os
from datetime import datetime, timezone
from urllib.parse import urlparse, urljoin

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("ERROR: Missing dependencies. Run: pip install requests beautifulsoup4 playwright")
    sys.exit(1)

TMP_DIR = os.path.join(os.path.dirname(__file__), '..', '.tmp')
os.makedirs(TMP_DIR, exist_ok=True)

CACHE_TTL_SECONDS = 3600  # 1 hour

def sanitize_domain(url: str) -> str:
    parsed = urlparse(url)
    return parsed.netloc.replace('.', '_').replace(':', '_')

def get_cache_path(url: str) -> str:
    domain = sanitize_domain(url)
    return os.path.join(TMP_DIR, f"{domain}_raw.json")

def is_cache_valid(cache_path: str) -> bool:
    if not os.path.exists(cache_path):
        return False
    mtime = os.path.getmtime(cache_path)
    age = time.time() - mtime
    return age < CACHE_TTL_SECONDS

def fetch_text(url: str, timeout: int = 10) -> str | None:
    try:
        r = requests.get(url, timeout=timeout, headers={'User-Agent': 'SiteIntelBot/1.0'})
        if r.status_code == 200:
            return r.text
    except Exception:
        pass
    return None

def scrape_with_requests(url: str) -> dict:
    """Fallback scraper using requests + BeautifulSoup for static sites."""
    start = time.time()
    headers = {'User-Agent': 'SiteIntelBot/1.0', 'Accept-Language': 'en-US,en;q=0.9'}
    
    r = requests.get(url, timeout=15, headers=headers, allow_redirects=True)
    load_time = int((time.time() - start) * 1000)
    
    final_url = r.url
    status_code = r.status_code
    response_headers = dict(r.headers)
    html = r.text

    soup = BeautifulSoup(html, 'html.parser')
    base_domain = urlparse(final_url).netloc

    # Meta tags
    meta_tags = []
    for tag in soup.find_all('meta'):
        name = tag.get('name') or tag.get('property') or ''
        content = tag.get('content') or ''
        if name:
            meta_tags.append({'name': name, 'content': content})

    # OpenGraph
    og = {}
    for m in meta_tags:
        if m['name'].startswith('og:'):
            og[m['name']] = m['content']

    # Scripts
    scripts = [s.get('src', '') for s in soup.find_all('script') if s.get('src')]
    
    # Stylesheets
    stylesheets = [l.get('href', '') for l in soup.find_all('link', rel='stylesheet') if l.get('href')]
    
    # Images
    images = []
    for img in soup.find_all('img'):
        images.append({
            'src': img.get('src', ''),
            'alt': img.get('alt'),
            'width': img.get('width'),
            'height': img.get('height')
        })

    # Links
    internal_links, external_links = [], []
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.startswith('http'):
            if base_domain in href:
                internal_links.append(href)
            else:
                external_links.append(href)
        elif href.startswith('/'):
            internal_links.append(urljoin(final_url, href))

    return {
        'url': url,
        'finalUrl': final_url,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'statusCode': status_code,
        'loadTimeMs': load_time,
        'html': html,
        'headers': response_headers,
        'scripts': scripts,
        'stylesheets': stylesheets,
        'metaTags': meta_tags,
        'openGraph': og,
        'links': {'internal': list(set(internal_links))[:50], 'external': list(set(external_links))[:50]},
        'images': images,
        'cookies': [],  # requests doesn't expose cookies easily
        'robots': None,
        'sitemap': None,
        'scrapeMethod': 'requests'
    }

def scrape_with_playwright(url: str) -> dict:
    """Full scraper using Playwright for JS-heavy SPAs."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("WARN: Playwright not installed. Falling back to requests. Run: pip install playwright && playwright install chromium")
        return None

    start = time.time()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent='SiteIntelBot/1.0')
        page = context.new_page()
        
        response = None
        try:
            response = page.goto(url, wait_until='networkidle', timeout=15000)
        except Exception:
            try:
                response = page.goto(url, wait_until='domcontentloaded', timeout=10000)
            except Exception as e:
                browser.close()
                raise RuntimeError(f"Failed to load page: {e}")

        load_time = int((time.time() - start) * 1000)
        final_url = page.url
        status_code = response.status if response else 0
        raw_headers = response.headers if response else {}
        html = page.content()
        cookies = [c['name'] for c in context.cookies()]
        browser.close()

    # Parse HTML
    soup = BeautifulSoup(html, 'html.parser')
    base_domain = urlparse(final_url).netloc

    meta_tags = []
    for tag in soup.find_all('meta'):
        name = tag.get('name') or tag.get('property') or ''
        content = tag.get('content') or ''
        if name:
            meta_tags.append({'name': name, 'content': content})

    og = {m['name']: m['content'] for m in meta_tags if m['name'].startswith('og:')}
    scripts = [s.get('src', '') for s in soup.find_all('script') if s.get('src')]
    stylesheets = [l.get('href', '') for l in soup.find_all('link', rel='stylesheet') if l.get('href')]
    images = [{'src': i.get('src',''), 'alt': i.get('alt'), 'width': i.get('width'), 'height': i.get('height')} for i in soup.find_all('img')]
    
    internal_links, external_links = [], []
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.startswith('http'):
            (internal_links if base_domain in href else external_links).append(href)
        elif href.startswith('/'):
            internal_links.append(urljoin(final_url, href))

    return {
        'url': url,
        'finalUrl': final_url,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'statusCode': status_code,
        'loadTimeMs': load_time,
        'html': html,
        'headers': dict(raw_headers),
        'scripts': scripts,
        'stylesheets': stylesheets,
        'metaTags': meta_tags,
        'openGraph': og,
        'links': {'internal': list(set(internal_links))[:50], 'external': list(set(external_links))[:50]},
        'images': images,
        'cookies': cookies,
        'robots': None,
        'sitemap': None,
        'scrapeMethod': 'playwright'
    }

def run(url: str) -> dict:
    if not url.startswith(('http://', 'https://')):
        print(f"ERROR: Invalid URL '{url}'. Must start with http:// or https://")
        sys.exit(1)

    cache_path = get_cache_path(url)
    if is_cache_valid(cache_path):
        print(f"INFO: Using cached data for {url} (fresher than 1 hour)")
        with open(cache_path) as f:
            return json.load(f)

    print(f"INFO: Scraping {url}...")
    
    # Fetch robots.txt and sitemap
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    robots_content = fetch_text(f"{base}/robots.txt")
    sitemap_content = fetch_text(f"{base}/sitemap.xml")

    # Try Playwright first, fallback to requests
    data = scrape_with_playwright(url)
    if data is None:
        data = scrape_with_requests(url)

    # Check for bot protection
    if data['statusCode'] in [403, 503]:
        data['blocked'] = True
        print(f"WARN: Site returned {data['statusCode']} — may have bot protection")

    data['robots'] = robots_content
    data['sitemap'] = sitemap_content

    # Write to cache
    with open(cache_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"INFO: Saved to {cache_path}")

    return data

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scrape_url.py <url>")
        sys.exit(1)
    
    result = run(sys.argv[1])
    # Print summary, not full HTML
    summary = {k: v for k, v in result.items() if k != 'html'}
    summary['htmlLength'] = len(result.get('html', ''))
    print(json.dumps(summary, indent=2))
