
import { loadEnvConfig } from '@next/env';
import path from 'path';

// Load env
loadEnvConfig(path.resolve(__dirname, '../'));

async function chat(message: string): Promise<string> {
    const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: [{ role: 'user', content: message }],
            mode: 'architect'
        })
    });

    if (!response.ok) {
        throw new Error(`Chat failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // Parse SSE (simplified)
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try {
                    const json = JSON.parse(data);
                    if (json.text) fullText += json.text;
                } catch (e) {
                    // ignore partial json
                }
            }
        }
    }
    return fullText;
}

async function main() {
    const SECRET = `Secret_${Date.now()}`;
    const FACT = `My secret codename is '${SECRET}'`;

    console.log(`1. Teaching AI: "${FACT}"`);
    await chat(FACT);
    console.log("   (Message sent. Waiting 10s for embedding/indexing...)");

    await new Promise(r => setTimeout(r, 10000));

    console.log(`2. Asking AI: "What is my secret codename?"`);
    const answer = await chat("What is my secret codename?");

    console.log(`\nAI Response: "${answer}"`);

    if (answer.includes(SECRET)) {
        console.log("✅ SUCCESS: AI recalled the secret!");
    } else {
        console.log("❌ FAILURE: AI did not recall the secret.");
        console.log("(Note: This might be due to indexing latency or dummy vectors. Check Supabase 'memories' table manually or logs.)");
    }
}

main();
