
import { Pinecone } from '@pinecone-database/pinecone';
import { embed } from '../lib/ai/embed';
import { loadEnvConfig } from '@next/env';
import path from 'path';
import { randomUUID } from 'crypto';

loadEnvConfig(path.resolve(__dirname, '../'));

async function main() {
    console.log("Initializing Pinecone...");
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const indexName = 'site-intel-memory';
    const index = pc.index(indexName);

    // Verify dimension
    // const statsStart = await index.describeIndexStats();
    // console.log("Initial Stats:", JSON.stringify(statsStart, null, 2));

    // Embed
    console.log("Embedding...");
    const content = "Direct Debug: The hawk flies at dawn.";
    const vector = await embed(content);
    console.log(`Vector generated. Length: ${vector.length}`);

    // Upsert
    const id = randomUUID();
    console.log(`Upserting ID: ${id}`);

    try {
        // Try object format explicitly
        await index.upsert({
            records: [
                {
                    id,
                    values: vector,
                    metadata: { content }
                }
            ]
        } as any);
        console.log("Upsert call returned.");
    } catch (e: any) {
        console.error("Upsert Failed:", e);
    }

    console.log("Waiting 10s...");
    await new Promise(r => setTimeout(r, 10000));

    // Stats
    // const statsEnd = await index.describeIndexStats();
    // console.log("Final Stats:", JSON.stringify(statsEnd, null, 2));

    // Search
    console.log("Searching...");
    const searchRes = await index.query({
        vector,
        topK: 1,
        includeMetadata: true
    });
    console.log("Search Result:", JSON.stringify(searchRes, null, 2));
}

main();
