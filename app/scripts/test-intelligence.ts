async function runTest() {
    const payload = {
        messages: [{ role: "user", content: "What is the trending repository on GitHub right now? Explaining your thinking is mandatory." }],
        mode: "angletalk",
        modelTier: "high"
    };

    try {
        const response = await fetch("http://127.0.0.1:3005/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("HTTP error!", response.status, await response.text());
            return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        console.log("Response Stream:\n");
        let done = false;
        while (!done && reader) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
                const chunk = decoder.decode(value, { stream: true });
                process.stdout.write(chunk);
            }
        }
        console.log("\n\nTest finished.");
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

runTest();
