
import Groq from "groq-sdk";
import { loadEnvConfig } from '@next/env';
import path from 'path';

loadEnvConfig(path.resolve(__dirname, '../'));

async function main() {
    const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
    });

    try {
        const models = await groq.models.list();
        console.log("Available Models:");
        models.data.forEach(m => console.log(`- ${m.id} (${m.owned_by})`));
    } catch (e: any) {
        console.error("List failed:", e.message);
    }
}

main();
