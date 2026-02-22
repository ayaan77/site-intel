import { BROWSER_ACTION } from "../lib/ai/actions/browser-action";

async function main() {
    console.log("Testing BROWSER_ACTION (Chrome DevTools MCP Wrapper)...");

    const testMessages = [
        "Open example.com and take a screenshot",
        "Inspect the DOM for h1 tags",
        "Run lighthouse on linear.app",
        "Search the web for news", // Should fail (handled by Web Search)
        "What time is it?" // Should fail
    ];

    console.log("\\n--- Validation Tests ---");
    for (const msg of testMessages) {
        const isValid = await BROWSER_ACTION.validate(msg);
        console.log(`"${msg}" -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }

    console.log("\\n--- Execution Test ---");
    const query = "Open github.com and take a screenshot";
    console.log(`Executing: "${query}"`);

    try {
        const result = await BROWSER_ACTION.execute({
            message: query
        });

        if (result.success) {
            console.log("✅ Success!");
            console.log("Result Text Preview:");
            console.log(result.text);
        } else {
            console.error("❌ Failed:", result.error);
        }

    } catch (e: any) {
        console.error("Exception:", e.message);
    }
}

main();
