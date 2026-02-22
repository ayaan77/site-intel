import Groq from "groq-sdk";

// ─── Config ────────────────────────────────────────────────────────────────

export const MODEL_TIERS = {
    high: {
        id: "high",
        model: "llama-3.3-70b-versatile",
        label: "Performance",
        emoji: "🚀",
        shortName: "70B",
        description: "Best quality · llama-3.3-70b",
    },
    medium: {
        id: "medium",
        model: "llama-3.1-8b-instant",
        label: "Balanced",
        emoji: "⚡",
        shortName: "8B",
        description: "Fast & efficient · llama-3.1-8b",
    },
    efficient: {
        id: "efficient",
        model: "gemma2-9b-it",
        label: "Saver",
        emoji: "💰",
        shortName: "9B",
        description: "Cost efficient · gemma2-9b",
    },
};

export const COUNCIL_CONFIG = {
    models: [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
    ],
    chairman: "llama-3.3-70b-versatile",
    enabledModes: [
        "architect",
        "cto",
        "roast",
        "compare",
        "diagram",
        "analyze",
        "intelligence",
        "page",
        "cro",
    ],
    stageDelay: 2000,
};

function getClient(apiKey: string) {
    return new Groq({ apiKey });
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Single model call ──────────────────────────────────────────────────────

async function queryModel(
    client: Groq,
    model: string,
    messages: Groq.Chat.ChatCompletionMessageParam[],
    temperature = 0.7,
    maxTokens = 2000
) {
    try {
        const completion = await client.chat.completions.create({
            messages,
            model,
            temperature,
            max_tokens: maxTokens,
        });
        return { model, content: completion.choices[0]?.message?.content || "" };
    } catch (err: any) {
        console.warn(`Council: Model ${model} failed:`, err.message);
        return null;
    }
}

async function queryModelsParallel(
    client: Groq,
    models: string[],
    messages: Groq.Chat.ChatCompletionMessageParam[],
    temperature = 0.7,
    maxTokens = 2000
) {
    const results = await Promise.allSettled(
        models.map((m) => queryModel(client, m, messages, temperature, maxTokens))
    );
    return results
        .filter(
            (r): r is PromiseFulfilledResult<{ model: string; content: string }> =>
                r.status === "fulfilled" && r.value !== null
        )
        .map((r) => r.value);
}

// ─── Ranking parsing ────────────────────────────────────────────────────────

function parseRanking(text: string): string[] {
    if (!text) return [];
    if (text.includes("FINAL RANKING:")) {
        const rankingSection = text.split("FINAL RANKING:")[1];
        const numbered = rankingSection.match(/\d+\.\s*Response [A-Z]/g);
        if (numbered) return numbered.map((m) => m.match(/Response [A-Z]/)![0]);
        const fallback = rankingSection.match(/Response [A-Z]/g);
        if (fallback) return fallback;
    }
    return text.match(/Response [A-Z]/g) || [];
}

function calculateAggregateRankings(
    stage2Results: { parsedRanking?: string[] }[],
    labelToModel: Record<string, string>
) {
    const positions: Record<string, number[]> = {};
    for (const result of stage2Results) {
        (result.parsedRanking || []).forEach((label, idx) => {
            const model = labelToModel[label];
            if (model) {
                positions[model] = positions[model] || [];
                positions[model].push(idx + 1);
            }
        });
    }
    return Object.entries(positions)
        .map(([model, ranks]) => ({
            model,
            avgRank: Math.round((ranks.reduce((a, b) => a + b, 0) / ranks.length) * 100) / 100,
            voteCount: ranks.length,
        }))
        .sort((a, b) => a.avgRank - b.avgRank);
}

// ─── Stages ─────────────────────────────────────────────────────────────────

async function stage1CollectResponses(
    client: Groq,
    query: string,
    systemPrompt: string,
    models: string[],
    onProgress?: (msg: string) => void
) {
    onProgress?.("🏛️ **Stage 1/3: Collecting Opinions**\n\nQuerying council members in parallel...");
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
    ];
    const results = await queryModelsParallel(client, models, messages);
    if (results.length === 0) throw new Error("All council models failed to respond.");
    onProgress?.(`🏛️ **Stage 1/3: Complete**\n\n✅ Received ${results.length}/${models.length} opinions`);
    return results;
}

async function stage2CollectRankings(
    client: Groq,
    query: string,
    stage1Results: { model: string; content: string }[],
    models: string[],
    onProgress?: (msg: string) => void
) {
    onProgress?.("⚖️ **Stage 2/3: Peer Review**\n\nModels are anonymously ranking each other...");
    const labels = stage1Results.map((_, i) => String.fromCharCode(65 + i));
    const labelToModel: Record<string, string> = {};
    labels.forEach((label, i) => { labelToModel[`Response ${label}`] = stage1Results[i].model; });

    const responsesText = stage1Results
        .map((r, i) => `Response ${labels[i]}:\n${r.content}`)
        .join("\n\n---\n\n");

    const rankingPrompt = `You are evaluating different responses to: "${query}"\n\n${responsesText}\n\nEvaluate each response, then provide:\nFINAL RANKING:\n1. Response X\n2. Response Y\n3. Response Z`;

    const rankingResults = await queryModelsParallel(
        client, models, [{ role: "user", content: rankingPrompt }], 0.3, 2000
    );

    const stage2Results = rankingResults.map((r) => ({
        model: r.model,
        evaluation: r.content,
        parsedRanking: parseRanking(r.content),
    }));

    const aggregateRankings = calculateAggregateRankings(stage2Results, labelToModel);
    onProgress?.(`⚖️ **Stage 2/3: Complete**\n\n✅ ${rankingResults.length} peer reviews collected`);
    return { stage2Results, labelToModel, aggregateRankings };
}

async function stage3Synthesize(
    client: Groq,
    query: string,
    stage1Results: { model: string; content: string }[],
    aggregateRankings: { model: string; avgRank: number }[],
    chairmanModel: string,
    onProgress?: (msg: string) => void
) {
    onProgress?.("👑 **Stage 3/3: Chairman Synthesizing**\n\nThe chairman is compiling the final answer...");

    const stage1Text = stage1Results.map((r) => `Model: ${r.model}\n${r.content}`).join("\n\n---\n\n");
    const rankingsSummary = aggregateRankings.map((r, i) => `${i + 1}. ${r.model} (avg rank: ${r.avgRank})`).join("\n");

    const chairmanPrompt = `You are Chairman of an LLM Council. Synthesize the best answer from these opinions:\n\nQuestion: ${query}\n\nINDIVIDUAL RESPONSES:\n${stage1Text}\n\nPEER RANKINGS (best first):\n${rankingsSummary}\n\nSynthesize a comprehensive, accurate final answer:`;

    const result = await queryModel(client, chairmanModel, [{ role: "user", content: chairmanPrompt }], 0.5, 4000);
    onProgress?.("👑 **Stage 3/3: Complete**\n\n✅ Final synthesis ready");
    return result || { model: chairmanModel, content: "❌ Chairman model failed." };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function runCouncil(
    query: string,
    systemPrompt: string,
    apiKey: string,
    onProgress?: (msg: string) => void
) {
    const config = COUNCIL_CONFIG;
    const client = getClient(apiKey);

    const stage1 = await stage1CollectResponses(client, query, systemPrompt, config.models, onProgress);
    await delay(config.stageDelay);

    const { stage2Results, labelToModel, aggregateRankings } = await stage2CollectRankings(
        client, query, stage1, config.models, onProgress
    );
    await delay(config.stageDelay);

    const stage3 = await stage3Synthesize(client, query, stage1, aggregateRankings, config.chairman, onProgress);

    return {
        stage1,
        stage2: stage2Results,
        stage3,
        metadata: { labelToModel, aggregateRankings, councilSize: config.models.length, chairman: config.chairman },
    };
}

export function isCouncilAvailable(mode: string): boolean {
    return COUNCIL_CONFIG.enabledModes.includes(mode);
}
