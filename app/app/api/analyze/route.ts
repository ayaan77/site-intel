import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Mermaid Syntax Sanitizer ──────────────────────────────────────────────
// Groq sometimes generates invalid Mermaid like: A -->|Label> B
// Valid Mermaid requires:  A -->|Label| B
function sanitizeMermaid(diagram: string): string {
    if (!diagram) return diagram;

    // Fix: -->|Label> B  →  -->|Label| B
    let fixed = diagram.replace(/-->\|([^|>]+)>/g, (_, label) => `-->|${label.trim()}|`);

    // Fix: ->|Label> B  →  →|Label| B
    fixed = fixed.replace(/->\|([^|>]+)>/g, (_, label) => `->|${label.trim()}|`);

    // Fix: ---Label> B  →  ---|Label| B (old-style)
    fixed = fixed.replace(/---([^|>\n]+)>/g, (_, label) => `---|${label.trim()}|`);

    // Strip any trailing > that broken the label syntax
    fixed = fixed.replace(/\|([^|{}\n]+)>\s/g, (_, label) => `|${label.trim()}| `);

    return fixed;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body.url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const id = `report_${Date.now()}`;

        console.log(`[API Analyze] Starting analysis for URL: ${body.url}, ID: ${id}`);

        // 1. Immediately insert a "running" row into the database
        const { error: insertError } = await supabase
            .from('reports')
            .insert([{ id, url: body.url, status: 'running', created_at: new Date().toISOString() }]);

        if (insertError) {
            console.error("[API Analyze] Failed to insert initial report row:", insertError);
            return NextResponse.json({ error: "Database error", details: insertError }, { status: 500 });
        }

        // 2. Await the full analysis (runs site-agent + Groq + Meta Ads Library in parallel)
        await runAnalysis(id, body.url);

        // 3. Return the ID so the frontend can fetch the full report
        return NextResponse.json({ id });
    } catch (error) {
        console.error("[API Analyze] Error:", error);
        return NextResponse.json({ error: "Failed to start analysis" }, { status: 500 });
    }
}

// ── Analysis Job ────────────────────────────────────────────────────────────
async function runAnalysis(id: string, targetUrl: string) {
    console.log(`[Job ${id}] Starting extraction for ${targetUrl}...`);

    try {
        const agentUrl = process.env.SITE_AGENT_URL || "http://localhost:4000";

        // Step A: Extract primary website content + scrape Meta Ads Library in parallel
        const domain = new URL(targetUrl).hostname.replace("www.", "");
        const metaAdsUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(domain)}&search_type=keyword_unordered&media_type=all`;

        console.log(`[Job ${id}] Fetching site content + Meta Ads Library in parallel...`);

        const [extractRes, metaAdsRes] = await Promise.allSettled([
            // Primary site extraction
            fetch(`${agentUrl}/execute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "extract", url: targetUrl })
            }),
            // Meta Ads Library scrape
            fetch(`${agentUrl}/execute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "scrapeMetaAds", url: metaAdsUrl })
            })
        ]);

        // Parse site extract
        if (extractRes.status === "rejected" || !extractRes.value.ok) {
            throw new Error(`Site extraction failed: ${extractRes.status === "rejected" ? extractRes.reason : extractRes.value.statusText}`);
        }
        const extractData = await extractRes.value.json();
        if (!extractData.success || !extractData.content) {
            throw new Error(`Extraction failed: ${extractData.error || "No content returned"}`);
        }

        const siteContent = extractData.content;
        console.log(`[Job ${id}] Site content extracted. Length: ${siteContent.length}`);

        // Parse Meta Ads Library result (gracefully — may fail or be blocked)
        let metaAdsContent = "";
        if (metaAdsRes.status === "fulfilled" && metaAdsRes.value.ok) {
            try {
                const metaData = await metaAdsRes.value.json();
                if (metaData.success && metaData.content) {
                    metaAdsContent = metaData.content;
                    console.log(`[Job ${id}] Meta Ads Library scraped. Length: ${metaAdsContent.length}`);
                }
            } catch {
                console.log(`[Job ${id}] Meta Ads Library parse failed — continuing without it.`);
            }
        } else {
            console.log(`[Job ${id}] Meta Ads Library unavailable — continuing without it.`);
        }

        // Step B: Generate intelligence report using Groq
        console.log(`[Job ${id}] Running Groq LLM analysis...`);
        const reportData = await generateIntelligenceReport(targetUrl, siteContent, metaAdsContent);

        // Fix Mermaid diagram syntax before saving
        if (reportData.architecture?.diagram) {
            reportData.architecture.diagram = sanitizeMermaid(reportData.architecture.diagram);
        }

        // Step C: Save to Supabase
        console.log(`[Job ${id}] Saving report to Supabase...`);
        const { error: updateError } = await supabase
            .from('reports')
            .update({
                status: 'done',
                analyzed_at: new Date().toISOString(),
                seo: reportData.seo,
                tech_stack: reportData.techStack,
                competitive: reportData.competitive,
                architecture: reportData.architecture,
                ai_summary: reportData.aiSummary,
                ai_recommendations: reportData.aiRecommendations || [],
                competitive_summary: reportData.competitiveSummary
            })
            .eq('id', id);

        if (updateError) {
            console.error(`[Job ${id}] Failed to save:`, updateError);
        } else {
            console.log(`[Job ${id}] Analysis COMPLETE!`);
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error occurred during analysis.";
        console.error(`[Job ${id}] Failed:`, message);
        await supabase.from('reports').update({ status: 'error', error: message }).eq('id', id);
    }
}

// ── LLM Intelligence Generation ─────────────────────────────────────────────
async function generateIntelligenceReport(url: string, siteContent: string, metaAdsContent: string) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY is not configured.");

    const MAX_CHARS = 26000;
    const truncatedSite = siteContent.length > MAX_CHARS
        ? siteContent.substring(0, MAX_CHARS) + "\n...[TRUNCATED]"
        : siteContent;

    const MAX_ADS_CHARS = 3000;
    const truncatedAds = metaAdsContent.length > MAX_ADS_CHARS
        ? metaAdsContent.substring(0, MAX_ADS_CHARS) + "\n...[TRUNCATED]"
        : metaAdsContent;

    const metaAdsSection = truncatedAds
        ? "\n\n== META ADS LIBRARY SCRAPE ==\nThe following is scraped from Meta Ads Library for domain \"" + new URL(url).hostname + "\":\n" + truncatedAds
        : "\n\n== META ADS LIBRARY ==\nUnavailable. Use Facebook Pixel presence in SCRIPT SOURCES to infer Meta ad activity.";

    const instructions = [
        "You are an elite Technical SEO Analyst, Web Architecture Expert, and Competitive Intelligence AI.",
        "",
        "The input you receive is a STRUCTURED EXTRACTION from a live headless browser — NOT raw HTML.",
        "It has clearly labelled sections. Read each section EXACTLY and map to JSON fields:",
        "",
        "SECTION MAPPING:",
        "- '=== PAGE TITLE ===' => seo.title.value (copy EXACTLY)",
        "- '=== META TAGS ===' => read 'description:', 'og:title:', 'og:description:', 'og:image:', 'twitter:card:', 'twitter:site:', 'robots:', etc.",
        "- '=== CANONICAL ===' => seo.canonicalTag.present=true, seo.canonicalTag.url=<url>. If missing: present=false, url=null",
        "- '=== SITEMAP LINK ===' => seo.sitemap.found=true, seo.sitemap.url=<url>. If missing: found=false, url=null",
        "- '=== JSON-LD STRUCTURED DATA ===' => seo.structuredData.present=true if any blocks listed; extract @type values as strings",
        "- '=== SCRIPT SOURCES ===' => detect by URL pattern: googletagmanager.com=GTM, google-analytics.com=GA4, connect.facebook.net=Facebook Pixel, hotjar.com=Hotjar, clarity.ms=Microsoft Clarity, tiktok=TikTok Pixel, segment=Segment, hubspot=HubSpot, linkedin=LinkedIn Insight",
        "- '=== HEADINGS ===' => read H1/H2/H3 counts and text DIRECTLY from what is listed",
        "- '=== IMAGES ===' => read 'Total:' and 'Missing alt:' numbers directly",
        "- '=== LINKS ===' => read 'Internal:' and 'External:' numbers directly",
        "- '=== BODY TEXT ===' => analyze for keyword signals, word count, CTA presence, readability",
        "",
        "httpsEnabled: true if URL starts with 'https://', else false.",
        "robotsTxt: cannot be determined from page DOM alone — set found=false, url=null unless body text mentions /robots.txt",
        "",
        "CRITICAL RULES:",
        "1. Output ONLY raw JSON. No markdown. No ```json wrappers. No explanation text.",
        "2. ALL fields required. Never omit any field.",
        "3. architecture.diagram: VALID Mermaid graph TD only. Edge syntax MUST be: A -->|Label| B (closing PIPE |, NEVER >)",
        "4. Use EXACT values from labeled sections. Do NOT hallucinate or invent SEO data.",
        "",
        "OUTPUT THIS EXACT JSON SCHEMA (replace angle-bracket descriptions with real values):",
        "{",
        '  "seo": {',
        '    "score": <number 0-100>,',
        '    "grade": <"A"|"B"|"C"|"D"|"F">,',
        '    "title": { "value": <exact title>, "length": <char count>, "status": <"good"|"warn"|"error"> },',
        '    "metaDescription": { "value": <meta description or "Missing">, "length": <char count>, "status": <"good"|"warn"|"error"> },',
        '    "httpsEnabled": <boolean>,',
        '    "canonicalTag": { "present": <boolean>, "url": <string or null> },',
        '    "sitemap": { "found": <boolean>, "url": <string or null> },',
        '    "robotsTxt": { "found": <boolean>, "url": <string or null> },',
        '    "structuredData": { "present": <boolean>, "types": [<@type strings>] },',
        '    "headings": { "h1Count": <n>, "h1Text": <first H1 text or "Missing">, "h2Count": <n>, "h3Count": <n>, "structure": <"good"|"warn"|"error"> },',
        '    "images": { "total": <n>, "missingAlt": <n>, "lazyLoaded": <boolean> },',
        '    "openGraph": { "complete": <boolean>, "title": <boolean>, "description": <boolean>, "image": <og:image url or null>, "twitterCard": <boolean>, "twitterSite": <string or null> },',
        '    "keywordSignals": { "primaryKeyword": <inferred main keyword>, "keywordInTitle": <boolean>, "keywordInMeta": <boolean>, "keywordInH1": <boolean> },',
        '    "contentQuality": { "wordCount": <number>, "readabilityScore": <"easy"|"moderate"|"difficult">, "hasCallToAction": <boolean> },',
        '    "internalLinks": <number>,',
        '    "externalLinks": <number>,',
        '    "issues": [ { "severity": <"critical"|"warning"|"info">, "check": <name>, "detail": <specific detail>, "fix": <actionable fix> } ],',
        '    "recommendations": [ { "priority": <"critical"|"high"|"medium"|"low">, "category": <e.g. "On-Page SEO">, "issue": <what is wrong>, "fix": <exact fix> } ]',
        "  },",
        '  "techStack": {',
        '    "framework": <string>, "cms": <string or "None">, "hosting": <string>, "cdn": <string or "None">,',
        '    "server": <string>, "language": <string>, "libraries": [<detected libs>],',
        '    "buildTool": <string or "Unknown">, "analytics": [<detected analytics/pixel tools>], "confidence": <0-100>',
        "  },",
        '  "competitive": {',
        '    "adsRunning": <boolean>,',
        '    "metaAdsActive": <boolean — from Meta Ads Library scrape>,',
        '    "metaAdsCount": <number — 0 if none>,',
        '    "metaAdsSample": [<up to 3 ad headline strings from Meta Ads Library>],',
        '    "adNetworks": [<detected ad networks>],',
        '    "trackingPixels": [<detected pixels from SCRIPT SOURCES>],',
        '    "gtmNote": <GTM description string or null>,',
        '    "estimatedMonthlyTraffic": <string e.g. "10k-50k">,',
        '    "trafficSource": <string>',
        "  },",
        '  "architecture": {',
        '    "type": <string e.g. "SSR Next.js">,',
        '    "renderingMode": <"SSR"|"SSG"|"CSR"|"Hybrid"|"Unknown">,',
        '    "diagram": <valid Mermaid graph TD string — edges must use -->|Label| syntax>',
        "  },",
        '  "aiSummary": <2-3 sentence paragraph on site quality>,',
        '  "aiRecommendations": [],',
        '  "competitiveSummary": <2-3 sentence paragraph on monetization, ads, tracking>',
        "}"
    ].join("\n");

    const userMessage = instructions
        + "\n\nTarget URL: " + url
        + "\n\n== WEBSITE STRUCTURED EXTRACTION ==\n" + truncatedSite
        + metaAdsSection;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + groqKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: userMessage }],
            temperature: 0.1,
            response_format: { type: "json_object" },
            max_tokens: 4096
        })
    });

    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error("Groq API Error: " + res.statusText + " - " + JSON.stringify(errJson));
    }

    const data = await res.json();
    const content = data.choices[0].message.content;

    try {
        return JSON.parse(content);
    } catch {
        console.error("Failed to parse Groq JSON. Raw:", content?.substring(0, 500));
        throw new Error("AI returned invalid JSON.");
    }
}


