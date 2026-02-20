#!/usr/bin/env python3
"""
Tool: seo_audit.py
Purpose: Rule-based SEO analysis — deterministic scoring
Layer: B.L.A.S.T. Tool Layer
SOP: architecture/03_seo_analysis.md
"""

import sys
import json
import re
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def grade(score: int) -> str:
    if score >= 90: return 'A'
    if score >= 75: return 'B'
    if score >= 60: return 'C'
    if score >= 45: return 'D'
    return 'F'

def audit(raw: dict) -> dict:
    html = raw.get('html', '')
    url = raw.get('finalUrl', raw.get('url', ''))
    meta_tags = raw.get('metaTags', [])
    og = raw.get('openGraph', {})
    robots_txt = raw.get('robots', '')
    sitemap = raw.get('sitemap', '')
    images_raw = raw.get('images', [])
    links = raw.get('links', {})
    
    soup = BeautifulSoup(html, 'html.parser')
    issues = []
    score = 100

    # ── TITLE TAG ──────────────────────────────────────────
    title_tag = soup.find('title')
    title_val = title_tag.get_text().strip() if title_tag else ''
    title_len = len(title_val)
    if not title_val:
        title_status = 'error'
        title_issue = 'Title tag is missing'
        score -= 15
        issues.append({'severity': 'critical', 'check': 'Title', 'detail': title_issue})
    elif title_len < 30:
        title_status = 'warn'
        title_issue = f'Title too short ({title_len} chars) — aim for 50-60'
        score -= 7
        issues.append({'severity': 'warning', 'check': 'Title', 'detail': title_issue})
    elif title_len > 65:
        title_status = 'warn'
        title_issue = f'Title too long ({title_len} chars) — will be truncated in SERPs'
        score -= 5
        issues.append({'severity': 'warning', 'check': 'Title', 'detail': title_issue})
    else:
        title_status = 'good'
        title_issue = None

    # ── META DESCRIPTION ───────────────────────────────────
    meta_desc = next((m['content'] for m in meta_tags if m['name'].lower() == 'description'), '')
    desc_len = len(meta_desc)
    if not meta_desc:
        desc_status = 'error'
        desc_issue = 'Meta description is missing'
        score -= 15
        issues.append({'severity': 'critical', 'check': 'Meta Description', 'detail': desc_issue})
    elif desc_len < 120:
        desc_status = 'warn'
        desc_issue = f'Meta description too short ({desc_len} chars) — aim for 150-160'
        score -= 5
        issues.append({'severity': 'warning', 'check': 'Meta Description', 'detail': desc_issue})
    elif desc_len > 160:
        desc_status = 'warn'
        desc_issue = f'Meta description too long ({desc_len} chars) — will be cut off'
        score -= 3
        issues.append({'severity': 'warning', 'check': 'Meta Description', 'detail': desc_issue})
    else:
        desc_status = 'good'
        desc_issue = None

    # ── HEADINGS ───────────────────────────────────────────
    h1s = soup.find_all('h1')
    h2s = soup.find_all('h2')
    h3s = soup.find_all('h3')
    heading_issues = []
    if len(h1s) == 0:
        heading_issues.append('No H1 tag found — critical for SEO')
        score -= 10
        issues.append({'severity': 'critical', 'check': 'H1 Tag', 'detail': 'Page has no H1 tag'})
    elif len(h1s) > 1:
        heading_issues.append(f'{len(h1s)} H1 tags found — should have exactly 1')
        score -= 5
        issues.append({'severity': 'warning', 'check': 'H1 Tag', 'detail': f'Multiple H1 tags ({len(h1s)}) found'})
    if len(h2s) == 0:
        heading_issues.append('No H2 tags — consider adding subheadings for structure')
        issues.append({'severity': 'info', 'check': 'H2 Tags', 'detail': 'No H2 subheadings found'})

    # ── IMAGES ─────────────────────────────────────────────
    total_imgs = len(images_raw)
    missing_alt = sum(1 for i in images_raw if i.get('alt') is None or i.get('alt') == '')
    if missing_alt > 0:
        penalty = min(10, missing_alt * 2)
        score -= penalty
        issues.append({'severity': 'warning', 'check': 'Image Alt Text', 'detail': f'{missing_alt} of {total_imgs} images missing alt text'})

    # ── CANONICAL URL ──────────────────────────────────────
    canonical_tag = soup.find('link', rel='canonical')
    canonical_url = canonical_tag.get('href') if canonical_tag else None
    if not canonical_url:
        score -= 5
        issues.append({'severity': 'warning', 'check': 'Canonical URL', 'detail': 'No canonical URL defined'})
    else:
        canonical_domain = urlparse(canonical_url).netloc
        page_domain = urlparse(url).netloc
        if canonical_domain and canonical_domain != page_domain:
            issues.append({'severity': 'warning', 'check': 'Canonical URL', 'detail': f'Canonical points to different domain: {canonical_domain}'})

    # ── ROBOTS META ────────────────────────────────────────
    robots_meta = next((m['content'] for m in meta_tags if m['name'].lower() == 'robots'), 'index,follow')
    if 'noindex' in robots_meta.lower():
        score -= 20
        issues.append({'severity': 'critical', 'check': 'Robots Meta', 'detail': 'Page is set to noindex — search engines will ignore it'})

    # ── STRUCTURED DATA ────────────────────────────────────
    ld_scripts = soup.find_all('script', type='application/ld+json')
    structured_types = []
    for s in ld_scripts:
        try:
            data = json.loads(s.get_text())
            t = data.get('@type', '')
            if t:
                structured_types.append(t)
        except Exception:
            pass
    if not structured_types:
        score -= 10
        issues.append({'severity': 'warning', 'check': 'Structured Data', 'detail': 'No JSON-LD structured data found'})

    # ── OPEN GRAPH ─────────────────────────────────────────
    required_og = ['og:title', 'og:description', 'og:image', 'og:url']
    missing_og = [k for k in required_og if k not in og]
    if missing_og:
        score -= 10
        issues.append({'severity': 'warning', 'check': 'Open Graph', 'detail': f'Missing OG tags: {", ".join(missing_og)}'})

    # ── HTTPS ──────────────────────────────────────────────
    https_enabled = url.startswith('https://')
    if not https_enabled:
        score -= 10
        issues.append({'severity': 'critical', 'check': 'HTTPS', 'detail': 'Site is not using HTTPS'})

    # ── SITEMAP ────────────────────────────────────────────
    sitemap_found = sitemap is not None and len(sitemap) > 50
    if not sitemap_found:
        score -= 5
        issues.append({'severity': 'warning', 'check': 'Sitemap', 'detail': 'No sitemap.xml found'})

    # ── ROBOTS.TXT ─────────────────────────────────────────
    robots_found = robots_txt is not None and len(robots_txt) > 5
    blocks_all = robots_found and 'disallow: /' in robots_txt.lower()
    if not robots_found:
        score -= 5
        issues.append({'severity': 'warning', 'check': 'robots.txt', 'detail': 'No robots.txt found'})
    elif blocks_all:
        score -= 15
        issues.append({'severity': 'critical', 'check': 'robots.txt', 'detail': 'robots.txt blocks all crawlers (Disallow: /)'})

    # ── RECOMMENDATIONS ────────────────────────────────────
    priority_map = {'critical': 1, 'warning': 2, 'info': 3}
    recommendations = []
    fix_map = {
        'Title': 'Add a unique <title> tag (50-60 chars) describing the page content',
        'Meta Description': 'Add a <meta name="description"> tag (150-160 chars) summarizing the page',
        'H1 Tag': 'Add exactly one <h1> tag with your primary keyword',
        'Image Alt Text': 'Add descriptive alt="" attributes to all <img> tags',
        'Canonical URL': 'Add <link rel="canonical" href="..."> pointing to the preferred URL',
        'Robots Meta': 'Remove noindex from meta robots or change to "index,follow"',
        'Structured Data': 'Add JSON-LD structured data (Article, Product, Organization, etc.)',
        'Open Graph': 'Add missing og: meta tags for better social sharing',
        'HTTPS': 'Migrate to HTTPS and redirect all HTTP traffic',
        'Sitemap': 'Create and submit a sitemap.xml to Google Search Console',
        'robots.txt': 'Create a robots.txt file that allows crawler access',
    }
    for issue in issues:
        check = issue['check']
        sev = issue['severity']
        priority = 'critical' if sev == 'critical' else ('high' if sev == 'warning' else 'low')
        recommendations.append({
            'priority': priority,
            'category': 'seo',
            'issue': issue['detail'],
            'fix': fix_map.get(check, 'Investigate and fix the reported issue')
        })
    recommendations.sort(key=lambda x: priority_map.get(x['priority'], 4))

    final_score = max(0, score)
    return {
        'score': final_score,
        'grade': grade(final_score),
        'title': {'value': title_val, 'length': title_len, 'status': title_status, 'issue': title_issue},
        'metaDescription': {'value': meta_desc, 'length': desc_len, 'status': desc_status, 'issue': desc_issue},
        'headings': {'h1Count': len(h1s), 'h2Count': len(h2s), 'h3Count': len(h3s), 'issues': heading_issues},
        'images': {'total': total_imgs, 'missingAlt': missing_alt},
        'links': {'internal': len(links.get('internal', [])), 'external': len(links.get('external', []))},
        'canonicalUrl': canonical_url,
        'robotsMeta': robots_meta,
        'structuredData': {'present': bool(structured_types), 'types': structured_types},
        'openGraph': {'complete': len(missing_og) == 0, 'missing': missing_og, 'found': og},
        'sitemap': {'found': sitemap_found},
        'robotsTxt': {'found': robots_found, 'blocksAll': blocks_all},
        'httpsEnabled': https_enabled,
        'issues': issues,
        'recommendations': recommendations
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python seo_audit.py <path_to_raw.json>")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        raw = json.load(f)

    result = audit(raw)
    print(json.dumps(result, indent=2))
