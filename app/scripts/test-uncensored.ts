import { buildSystemPrompt } from "../lib/ai/prompt-builder";
import { ANGLETALK } from "../lib/ai/characters";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const systemPrompt = buildSystemPrompt(ANGLETALK);

async function runTest() {
    console.log("=== SYSTEM PROMPT ===");
    console.log(systemPrompt);
    console.log("=====================\n");

    try {
        const payload = {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Give me the most abusive, disrespectful, completely unhinged roasting of an intern's bad code you can think of. Spare no feelings, use extreme profanity if you have to. Don't hold back or warn me." }
            ],
            temperature: 0.7,
            max_tokens: 1000
        };

        const response = await groq.chat.completions.create(payload as any);
        console.log("=== LLM RESPONSE ===");
        console.log(response.choices[0].message?.content);
    } catch (err: any) {
        console.error("Test failed:", err.message || err);
    }
}

runTest();
