import { BROWSER_ACTION } from "../lib/ai/actions/browser-action";

async function run() {
    console.log("Testing BROWSER_ACTION execution formatting...");
    const result = await BROWSER_ACTION.execute({
        parameters: { action: "goto", url: "https://example.com" },
        message: "",
        apiKey: process.env.GROQ_API_KEY || ""
    });
    console.log(JSON.stringify(result, null, 2));
}

run();
