import { SupabaseClient } from "@supabase/supabase-js";
import { Pinecone } from "@pinecone-database/pinecone";
import Groq from "groq-sdk";
import { randomUUID } from "crypto";
import { embed } from "../ai/embed";

const CONDENSE_THRESHOLD = 30; // messages before condensation triggers
const CONDENSE_BATCH = 20;     // how many old messages to condense at once
const INDEX_NAME = "site-intel-memory";

interface RawMemory {
    id: string;
    content: string;
    source: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

/**
 * Counts how many memory entries exist for a given mode.
 */
async function countMemories(supabase: SupabaseClient, mode: string): Promise<number> {
    const { count, error } = await supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("metadata->mode", mode)
        .neq("source", "condensed_summary");

    if (error) {
        console.error("[Condenser] Count error:", error.message);
        return 0;
    }
    return count ?? 0;
}

/**
 * Fetches the oldest CONDENSE_BATCH memory entries for a given mode.
 */
async function fetchOldestMemories(supabase: SupabaseClient, mode: string): Promise<RawMemory[]> {
    const { data, error } = await supabase
        .from("memories")
        .select("*")
        .eq("metadata->mode", mode)
        .neq("source", "condensed_summary")
        .order("created_at", { ascending: true })
        .limit(CONDENSE_BATCH);

    if (error) {
        console.error("[Condenser] Fetch error:", error.message);
        return [];
    }
    return (data as RawMemory[]) ?? [];
}

/**
 * Uses the LLM to summarize a batch of memories into one dense block.
 */
async function summarize(memories: RawMemory[], groq: Groq, modelName: string): Promise<string> {
    const conversationBlock = memories
        .map(m => `[${m.source}] ${m.content.substring(0, 500)}`)
        .join("\n---\n");

    const completion = await groq.chat.completions.create({
        model: modelName,
        messages: [
            {
                role: "system",
                content: "You are a memory compression specialist. Compress the following conversation history into a single dense paragraph that preserves all critical facts, decisions, and context. Be extremely concise — target 200-350 words. No bullet points, just a rich paragraph."
            },
            {
                role: "user",
                content: `Compress this conversation history:\n\n${conversationBlock}`
            }
        ],
        temperature: 0.2,
        max_tokens: 600
    });

    return completion.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Core condensation function:
 * 1. Fetches oldest CONDENSE_BATCH memories for a mode
 * 2. Summarizes them via LLM
 * 3. Writes a single condensed_summary record to Supabase + Pinecone
 * 4. Deletes the original raw memories
 */
export async function condenseOldMemories(
    supabase: SupabaseClient,
    pinecone: Pinecone,
    groq: Groq,
    modelName: string,
    mode: string
): Promise<void> {
    try {
        const count = await countMemories(supabase, mode);
        if (count < CONDENSE_THRESHOLD) {
            console.log(`[Condenser] ${count} memories — below threshold (${CONDENSE_THRESHOLD}). Skipping.`);
            return;
        }

        console.log(`[Condenser] ${count} memories detected. Condensing oldest ${CONDENSE_BATCH}...`);

        const oldMemories = await fetchOldestMemories(supabase, mode);
        if (oldMemories.length < 5) {
            console.log("[Condenser] Not enough memories to condense meaningfully. Skipping.");
            return;
        }

        // Summarize
        const summary = await summarize(oldMemories, groq, modelName);
        if (!summary) {
            console.error("[Condenser] LLM returned an empty summary. Aborting.");
            return;
        }

        const summaryId = randomUUID();
        const summaryRecord = {
            id: summaryId,
            content: summary,
            source: "condensed_summary",
            metadata: { mode, original_count: oldMemories.length },
            created_at: new Date().toISOString()
        };

        // 1. Insert condensed summary into Supabase
        const { error: insertError } = await supabase.from("memories").insert(summaryRecord);
        if (insertError) {
            console.error("[Condenser] Failed to insert summary:", insertError.message);
            return;
        }

        // 2. Generate embedding and upsert into Pinecone
        let vector: number[] | null = null;
        try {
            vector = await embed(summary);
        } catch (e) {
            console.error("[Condenser] Embedding failed:", e);
        }

        if (vector) {
            try {
                const index = pinecone.index(INDEX_NAME);
                await index.upsert({
                    records: [{
                        id: summaryId,
                        values: vector,
                        metadata: { content: summary, source: "condensed_summary", mode }
                    }]
                });
            } catch (e) {
                console.error("[Condenser] Pinecone upsert failed:", e);
            }
        }

        // 3. Delete original raw memories from Supabase
        const oldIds = oldMemories.map(m => m.id);
        const { error: deleteSupabaseError } = await supabase.from("memories").delete().in("id", oldIds);
        if (deleteSupabaseError) {
            console.error("[Condenser] Supabase delete failed:", deleteSupabaseError.message);
        }

        // 4. Delete original vectors from Pinecone
        try {
            const index = pinecone.index(INDEX_NAME);
            await index.deleteMany(oldIds);
        } catch (e) {
            console.error("[Condenser] Pinecone delete failed:", e);
        }

        console.log(`[Condenser] ✅ Condensed ${oldMemories.length} memories into 1 summary (id: ${summaryId}).`);

    } catch (e) {
        console.error("[Condenser] Unexpected error:", e);
    }
}
