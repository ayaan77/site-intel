#!/usr/bin/env python3
"""
Tool: ai_analyze.py
Purpose: Groq LLM analysis of the assembled payload — rational, structured recommendations
Layer: B.L.A.S.T. Tool Layer
SOP: architecture/05_ai_analysis.md
"""

import sys
import json
import os
import re

def generate_mermaid_diagram(tech: dict, seo: dict) -> str:
    framework = tech.get('framework', 'Unknown')
    cms = tech.get('cms', 'None')
    hosting = tech.get('hosting', 'Unknown')
    cdn = tech.get('cdn', 'None')
    has_https = seo.get('httpsEnabled', False)

    lines = ['graph TD']
    lines.append('    User([🧑 User])')
    
    if cdn and cdn != 'None':
        lines.append(f'    User --> CDN[CDN: {cdn}]')
        lines.append(f'    CDN --> FE[Frontend: {framework}]')
    else:
        lines.append(f'    User --> FE[Frontend: {framework}]')

    if cms and cms not in ('None', 'Unknown'):
        lines.append(f'    FE --> CMS[CMS: {cms}]')
        lines.append('    CMS --> DB[(Database)]')
    else:
        lines.append('    FE --> API[API Layer]')
        lines.append('    API --> DB[(Database)]')

    if hosting and hosting != 'Unknown':
        lines.append(f'    FE -.->|hosted on| HOST[{hosting}]')

    if has_https:
        lines.append('    User -.->|HTTPS ✅| FE')

    return '\n'.join(lines)

def analyze(seo: dict, tech: dict, competitive: dict, url: str) -> dict:
    api_key = os.environ.get('GROQ_API_KEY')
    if not api_key:
        return {
            'error': 'GROQ_API_KEY not set',
            'aiSummary': None,
            'aiRecommendations': [],
            'architectureDiagram': generate_mermaid_diagram(tech, seo),
            'competitiveSummary': None
        }

    # Build clean payloads (strip raw HTML)
    seo_clean = {k: v for k, v in seo.items() if k not in ('issues',)}
    tech_clean = {k: v for k, v in tech.items() if k != 'signals'}
    comp_clean = {k: v for k, v in competitive.items()}

    output_schema = {
        "aiSummary": "3-4 sentence executive summary",
        "aiRecommendations": [
            {"priority": "critical|high|medium|low", "category": "seo|tech|ux|performance|competitive",
             "issue": "specific problem",  "fix": "concrete solution"}
        ],
        "competitiveSummary": "2-3 sentences on monetization and traffic positioning"
    }

    user_prompt = f"""Analyze this website intelligence report for: {url}

SEO AUDIT:
{json.dumps(seo_clean, indent=2)}

TECH STACK:
{json.dumps(tech_clean, indent=2)}

COMPETITIVE INTELLIGENCE:
{json.dumps(comp_clean, indent=2)}

Return ONLY valid JSON matching this schema:
{json.dumps(output_schema, indent=2)}"""

    system_prompt = """You are a senior full-stack engineer and SEO specialist performing a technical site audit.
You have been given real scraped data about a website. Analyze it and produce a structured report.

RULES:
1. Only reference data that was actually found in the payload. Never invent findings.
2. Be direct and specific. "Your H1 is missing" not "You might want to consider adding an H1".
3. Prioritize ruthlessly: critical (breaks site/SEO) → high → medium → low.
4. Each recommendation must have both an 'issue' AND a 'fix'. No open-ended suggestions.
5. Output ONLY valid JSON. No markdown fences, no prose outside the JSON object."""

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        
        response = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            temperature=0.1,
            max_tokens=3000
        )
        
        raw_text = response.choices[0].message.content.strip()
        
        # Strip markdown fences if present
        raw_text = re.sub(r'^```json\n?', '', raw_text, flags=re.MULTILINE)
        raw_text = re.sub(r'\n?```$', '', raw_text, flags=re.MULTILINE)
        
        result = json.loads(raw_text)
        result['architectureDiagram'] = generate_mermaid_diagram(tech, seo)
        return result

    except json.JSONDecodeError:
        # Retry with explicit instruction
        try:
            retry = client.chat.completions.create(
                model='llama-3.3-70b-versatile',
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt},
                    {'role': 'assistant', 'content': raw_text},
                    {'role': 'user', 'content': 'Your response was not valid JSON. Return ONLY the JSON object, no other text.'}
                ],
                temperature=0.1,
                max_tokens=3000
            )
            result = json.loads(retry.choices[0].message.content.strip())
            result['architectureDiagram'] = generate_mermaid_diagram(tech, seo)
            return result
        except Exception as e:
            pass

    except Exception as e:
        print(f"ERROR: AI analysis failed: {e}")

    return {
        'error': 'AI analysis unavailable',
        'aiSummary': None,
        'aiRecommendations': [],
        'architectureDiagram': generate_mermaid_diagram(tech, seo),
        'competitiveSummary': None
    }

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python ai_analyze.py <seo.json> <tech.json> <competitive.json> [url]")
        sys.exit(1)

    with open(sys.argv[1]) as f: seo = json.load(f)
    with open(sys.argv[2]) as f: tech = json.load(f)
    with open(sys.argv[3]) as f: comp = json.load(f)
    url = sys.argv[4] if len(sys.argv) > 4 else 'unknown'

    result = analyze(seo, tech, comp, url)
    print(json.dumps(result, indent=2))
