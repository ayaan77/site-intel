
import { WEB_SEARCH_ACTION } from '../lib/ai/actions/web-search-action';
import { loadEnvConfig } from '@next/env';
import path from 'path';

loadEnvConfig(path.resolve(__dirname, '../'));

async function main() {
    console.log("Testing WEB_SEARCH_ACTION...");

    // 1. Test Validation
    const testMessages = [
        "Search for the latest iPhone rumors",
        "What is the capital of France?",
        "Tell me a joke", // Should fail
        "Find info on deepseek v3"
    ];

    console.log("\n--- Validation Tests ---");
    for (const msg of testMessages) {
        const isValid = await WEB_SEARCH_ACTION.validate(msg);
        console.log(`"${msg}" -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }

    // 2. Test Execution
    console.log("\n--- Execution Test ---");
    const query = "Search for the latest iPhone rumors";
    console.log(`Executing: "${query}"`);

    try {
        const result = await WEB_SEARCH_ACTION.execute({
            message: query,
            apiKey: process.env.TAVILY_API_KEY
        });

        if (result.success) {
            console.log("✅ Success!");
            console.log("Result Text Preview:");
            console.log(result.text?.substring(0, 500) + "...");
        } else {
            console.error("❌ Failed:", result.error);
        }

    } catch (e: any) {
        console.error("Exception:", e.message);
    }
}

main();
