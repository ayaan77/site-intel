
import { MemoryManager } from '../lib/memory/memory-manager';
import { loadEnvConfig } from '@next/env';
import path from 'path';

// Load .env.local
loadEnvConfig(path.resolve(__dirname, '../'));

async function main() {
    console.log("Initializing Memory Manager...");
    try {
        const memory = new MemoryManager();

        console.log("Adding test memory...");
        const result = await memory.add(
            "The user prefers dark mode and likes React Server Components.",
            "test_script",
            { topic: "preferences" }
        );

        if (result.success) {
            console.log("Memory added successfully!", result.id);
        } else {
            console.error("Failed to add memory:", result.error);
        }

        console.log("Searching for memory...");
        // Wait a bit for consistency? Pinecone is eventually consistent.
        await new Promise(r => setTimeout(r, 2000));

        const results = await memory.search("What does the user like?");
        console.log("Search Results:", JSON.stringify(results, null, 2));

    } catch (error) {
        console.error("Test Failed:", error);
    }
}

main();
