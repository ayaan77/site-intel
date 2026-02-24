import Groq from "groq-sdk";

interface SearchResult {
    title: string;
    url: string;
    content: string;
}

interface SubQuery {
    question: string;
    results: string;
}

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const SITE_AGENT_URL = process.env.SITE_AGENT_URL || "http://localhost:4000";

/**
 * Runs a single Tavily web search and returns formatted text.
 */
async function runSearch(query: string, tavilyKey: string): Promise<string> {
    try {
        const response = await fetch(TAVILY_SEARCH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: tavilyKey,
                query,
                search_depth: "advanced",
                include_answer: true,
                include_images: false,
                max_results: 5
            })
        });

        if (!response.ok) return `Search failed for: "${query}"`;

        const data = await response.json();

        const snippets = (data.results as SearchResult[])
            .slice(0, 5)
            .map(r => `**[${r.title}](${r.url})**\n${(r.content || "").substring(0, 600)}`)
            .join("\n\n");

        const directAnswer = data.answer ? `**Direct Answer:** ${data.answer.substring(0, 400)}\n\n` : "";
        return `${directAnswer}${snippets}`;

    } catch {
        return `Search failed for: "${query}"`;
    }
}

/**
 * Scrapes a URL via the site-agent browser backend.
 */
async function scrapeUrl(url: string): Promise<string> {
    try {
        const response = await fetch(`${SITE_AGENT_URL}/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "extract", url }),
            signal: AbortSignal.timeout(35000)
        });
        if (!response.ok) return "";
        const data = await response.json();
        const content: string = (data.content as string) || "";
        return content.substring(0, 3000);
    } catch {
        return "";
    }
}

/**
 * Asks the LLM to split the main query into focused sub-questions.
 * Returns an array of strings (sub-questions).
 */
async function planSubQuestions(
    query: string,
    groq: Groq,
    modelName: string
): Promise<string[]> {
    const planningPrompt = `You are a world-class research planner. A user wants a comprehensive deep-research report on the following topic:

TOPIC: "${query}"

Your job is to break this into exactly 6 focused, specific sub-questions that together would give a complete answer. 
Each sub-question should target a different angle: facts, history, top players, comparisons, recent developments, future outlook.

Respond with ONLY a JSON array of strings. No extra text. Example:
["What is X?", "Who are the top players in X?", ...]`;

    try {
        const completion = await groq.chat.completions.create({
            model: modelName,
            messages: [
                { role: "system", content: "You are a precise research planner. Respond only with valid JSON." },
                { role: "user", content: planningPrompt }
            ],
            temperature: 0.3,
            max_tokens: 800
        });

        const raw = completion.choices[0]?.message?.content?.trim() || "[]";
        // Strip markdown code fences if the model wraps in ```json
        const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed: unknown = JSON.parse(clean);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === "string")) {
            return parsed.slice(0, 8);
        }
        return [query]; // Fallback to original query
    } catch {
        return [query];
    }
}

/**
 * Main Deep Research orchestrator.
 * Yields SSE-style progress text chunks (for streaming to the UI),
 * then yields the final synthesis report.
 */
export async function* runDeepResearch(
    query: string,
    groq: Groq,
    modelName: string
): AsyncGenerator<string> {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) {
        yield "❌ Deep Research requires a Tavily API key. Please configure `TAVILY_API_KEY`.";
        return;
    }

    // ── Step 1: Plan sub-questions ───────────────────────────────────────────
    yield `> 🧠 **Planning research sub-topics...**\n\n`;
    const subQuestions = await planSubQuestions(query, groq, modelName);
    yield `> 📋 **Research Plan:** ${subQuestions.length} sub-topics identified.\n\n`;

    // ── Step 2: Fan-out parallel searches ───────────────────────────────────
    yield `> 🔎 **Running ${subQuestions.length} parallel web searches...**\n\n`;

    const searchPromises = subQuestions.map(q => runSearch(q, tavilyKey));
    const rawResults = await Promise.all(searchPromises);

    const subQueryData: SubQuery[] = subQuestions.map((question, i) => ({
        question,
        results: rawResults[i] || "No results found."
    }));

    // ── Step 3: Extract top unique URLs for scraping ─────────────────────────
    const urlPattern = /https?:\/\/[^\s)"\]]+/g;
    const allUrls: string[] = [];
    for (const r of rawResults) {
        const matches = r.match(urlPattern) || [];
        for (const u of matches) {
            if (!allUrls.includes(u)) allUrls.push(u);
        }
    }
    const topUrls = allUrls.slice(0, 2);

    let scrapedContext = "";
    if (topUrls.length > 0) {
        yield `> 🌐 **Deep-reading ${topUrls.length} key source(s)...**\n\n`;
        const scrapePromises = topUrls.map(url => scrapeUrl(url));
        const scrapeResults = await Promise.all(scrapePromises);
        scrapedContext = scrapeResults
            .filter(s => s.length > 100)
            .map((s, i) => `### Source: ${topUrls[i]}\n${s}`)
            .join("\n\n---\n\n");
    }

    // ── Step 4: Final synthesis LLM call ────────────────────────────────────
    yield `> ✍️ **Synthesizing final report...**\n\n`;

    const researchDump = subQueryData
        .map(sq => `## Sub-topic: ${sq.question}\n${sq.results}`)
        .join("\n\n---\n\n");

    const synthesisSystemPrompt = `You are an elite research analyst. Your job is to synthesize raw research data into a crystal-clear, well-structured markdown report. 
- Use headers, bullet points, and bold key terms.
- Cite sources with hyperlinks where available.
- Be comprehensive but not repetitive.
- End with a "Key Takeaways" section with 3-5 bullet points.`;

    const synthesisUserPrompt = `Synthesize the following research data into a comprehensive report on: "${query}"

## Raw Research Data
${researchDump}

${scrapedContext ? `## Deep-Read Source Content\n${scrapedContext.substring(0, 4000)}` : ""}

Produce a final markdown report that a professional would be proud of.`;

    const synthesisStream = await groq.chat.completions.create({
        model: modelName,
        messages: [
            { role: "system", content: synthesisSystemPrompt },
            { role: "user", content: synthesisUserPrompt }
        ],
        temperature: 0.4,
        max_tokens: 6000,
        stream: true
    });

    yield `\n---\n\n`;

    // Stream the synthesis token by token
    for await (const chunk of synthesisStream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
    }
}
