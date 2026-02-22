
import { MemoryManager } from '../lib/memory/memory-manager';
import { loadEnvConfig } from '@next/env';
import path from 'path';

loadEnvConfig(path.resolve(__dirname, '../'));

async function main() {
    console.log("Initializing Memory Manager...");
    const memory = new MemoryManager();

    const uniqueId = Date.now();
    const content = `Debug Secret ${uniqueId}: The eagle flies at midnight.`;

    console.log(`Adding memory: "${content}"`);
    const result = await memory.add(content, "debug_script", { type: "debug" });

    if (!result.success) {
        console.error("Add failed:", result.error);
        return;
    }
    console.log("Add success. ID:", result.id);

    // Check stats
    // Need to instantiate Pinecone client here to check stats
    const { Pinecone } = require('@pinecone-database/pinecone');
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const idx = pc.index('site-intel-memory');

    console.log("Waiting 20 seconds for indexing...");
    await new Promise(r => setTimeout(r, 20000));

    try {
        const stats = await idx.describeIndexStats();
        console.log("Index Stats:", JSON.stringify(stats, null, 2));
    } catch (e: any) {
        console.error("Stats failed:", e.message);
    }

    console.log("Searching: 'When does the eagle fly?'");
    const results = await memory.search("When does the eagle fly?");

    console.log("Search Results:", JSON.stringify(results, null, 2));

    if (results.some(r => r.content.includes(uniqueId.toString()))) {
        console.log("✅ SUCCESS: Found the memory!");
    } else {
        console.log("❌ FAILURE: Memory not found.");
    }
}

main();
