#!/usr/bin/env python3
"""
Tool: run_pipeline.py
Purpose: Orchestrates all tools in sequence — the main entry point
Layer: B.L.A.S.T. Navigation Layer
"""

import sys
import json
import os
import uuid

sys.path.insert(0, os.path.dirname(__file__))

import scrape_url
import detect_tech
import seo_audit
import detect_competitive
import ai_analyze

TMP_DIR = os.path.join(os.path.dirname(__file__), '..', '.tmp')
os.makedirs(TMP_DIR, exist_ok=True)

def run_pipeline(url: str) -> dict:
    print(f"\n{'='*50}")
    print(f"🚀 Site Intel Pipeline — {url}")
    print(f"{'='*50}\n")

    analysis_id = str(uuid.uuid4())[:8]

    # ── STEP 1: SCRAPE ────────────────────────────────────
    print("Step 1/5: 🔍 Fetching & scraping URL...")
    raw = scrape_url.run(url)

    if raw.get('blocked'):
        return {
            'id': analysis_id, 'url': url, 'error': 'Site blocked scraping (bot protection)',
            'status': 'blocked'
        }

    # ── STEP 2: TECH DETECTION ────────────────────────────
    print("Step 2/5: 🛠️  Detecting tech stack...")
    tech = detect_tech.detect(raw)
    print(f"  → Framework: {tech['framework']} | CMS: {tech['cms']} | Confidence: {tech['confidence']}%")

    # ── STEP 3: SEO AUDIT ─────────────────────────────────
    print("Step 3/5: 📊 Running SEO audit...")
    seo = seo_audit.audit(raw)
    print(f"  → Score: {seo['score']}/100 (Grade: {seo['grade']}) | Issues: {len(seo['issues'])}")

    # ── STEP 4: COMPETITIVE INTEL ─────────────────────────
    print("Step 4/5: 📢 Checking for ads & tracking...")
    competitive = detect_competitive.detect(raw)
    print(f"  → Ads running: {competitive['adsRunning']} | Networks: {len(competitive['adNetworks'])}")

    # ── STEP 5: AI ANALYSIS ───────────────────────────────
    print("Step 5/5: 🤖 Running AI analysis...")
    ai = ai_analyze.analyze(seo, tech, competitive, url)
    if ai.get('error'):
        print(f"  ⚠️  AI: {ai['error']}")
    else:
        print(f"  → {len(ai.get('aiRecommendations', []))} recommendations generated")

    # ── ASSEMBLE PAYLOAD ──────────────────────────────────
    result = {
        'id': analysis_id,
        'url': url,
        'analyzedAt': raw.get('timestamp'),
        'status': 'done',
        'seo': seo,
        'techStack': tech,
        'competitive': competitive,
        'architecture': {
            'type': _infer_arch_type(tech, raw),
            'diagram': ai.get('architectureDiagram', '')
        },
        'aiSummary': ai.get('aiSummary'),
        'aiRecommendations': ai.get('aiRecommendations', []),
        'competitiveSummary': ai.get('competitiveSummary')
    }

    # Save result
    out_path = os.path.join(TMP_DIR, f"{analysis_id}_result.json")
    with open(out_path, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\n✅ Analysis complete. Saved to {out_path}")
    print(f"{'='*50}\n")

    return result

def _infer_arch_type(tech: dict, raw: dict) -> str:
    fw = tech.get('framework', '')
    html = raw.get('html', '')
    if fw in ('Next.js', 'Nuxt.js'):
        return 'SSR/SSG Hybrid'
    if fw == 'Gatsby':
        return 'SSG'
    if fw in ('React', 'Vue.js', 'Angular'):
        return 'SPA'
    if tech.get('cms') in ('WordPress', 'Drupal'):
        return 'MPA'
    return 'Unknown'

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python run_pipeline.py <url>")
        sys.exit(1)

    result = run_pipeline(sys.argv[1])
    # Print summary without full HTML
    summary = {k: v for k, v in result.items() if k not in ('rawHtml',)}
    print(json.dumps(summary, indent=2))
