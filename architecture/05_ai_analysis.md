# SOP 05 — AI Analysis Engine
**Layer:** Tool (`tools/ai_analyze.py`)  
**Last Updated:** 2026-02-19

---

## Goal
Take the fully assembled analysis payload (SEO + Tech + Competitive) and use Groq LLM to generate a rational, prioritized, actionable intelligence report. AI only interprets real data — it never invents findings.

## Inputs
```json
{
  "url": "string",
  "seo": { ... },
  "techStack": { ... },
  "competitive": { ... },
  "architecture": { ... }
}
```

## Outputs
```json
{
  "aiSummary": "3-4 sentence executive summary of the site's overall health",
  "aiRecommendations": [
    {
      "priority": "critical | high | medium | low",
      "category": "seo | tech | ux | performance | competitive",
      "issue": "Specific problem in one sentence",
      "fix": "Concrete fix in one sentence or code snippet"
    }
  ],
  "architectureDiagram": "mermaid graph syntax",
  "competitiveSummary": "2-3 sentences on ad strategy and traffic positioning"
}
```

---

## System Prompt (Locked — defined in gemini.md behavioral rules)

```
You are a senior full-stack engineer and SEO specialist performing a technical site audit.
You have been given real scraped data about a website. Your job is to analyze it and produce a structured report.

RULES:
1. Only reference data that was actually found in the payload. Never invent findings.
2. Be direct and specific. "Your H1 is missing" not "You might want to consider adding an H1".
3. Prioritize ruthlessly: Critical (site-breaking) → High (significant impact) → Medium → Low.
4. Each recommendation must have both an 'issue' AND a 'fix'. No issues without solutions.
5. The architecture diagram MUST be valid Mermaid.js syntax.
6. Output ONLY valid JSON matching the output schema. No markdown, no prose outside JSON.
```

## User Prompt Template
```
Analyze this website intelligence report and return a structured JSON response:

URL: {url}

SEO AUDIT:
{seo_json}

TECH STACK:
{tech_json}

COMPETITIVE INTELLIGENCE:
{competitive_json}

Return JSON matching this exact schema:
{output_schema}
```

## Model Config
- **Model:** `llama-3.3-70b-versatile` (via Groq)
- **Temperature:** `0.1` (near-deterministic — factual analysis)
- **Max tokens:** `3000`
- **Response format:** JSON (parse with `json.loads()`, retry once on parse failure)

## Architecture Diagram Rules
Generate a Mermaid diagram describing the inferred site architecture:
```
graph TD
    User --> CDN[CDN: Cloudflare]
    CDN --> FE[Frontend: Next.js / Vercel]
    FE --> CMS[CMS: WordPress]
    FE --> API[API Layer]
    API --> DB[(Database)]
```
- Use actual detected values (not placeholders)
- If unknown, label as `Unknown`

## Error Handling
- If Groq returns non-JSON: retry once with explicit instruction "Return ONLY JSON, no other text"
- If retry fails: return `{ "error": "AI analysis unavailable", "aiSummary": null, "aiRecommendations": [] }`
- Never crash the pipeline due to AI failure

## Cost Note
One analysis call ≈ 1,500-2,000 tokens input + 500 tokens output = ~2,000-2,500 tokens total.
Groq free tier: 100,000 tokens/day. One analysis ≈ 2,500 tokens → ~40 analyses/day on free tier.
