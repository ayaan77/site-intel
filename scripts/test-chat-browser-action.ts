async function testChatApi() {
    const url = "http://127.0.0.1:3000/api/chat";
    const payload = {
        messages: [{ role: "user", content: "open example.com and take a screenshot" }],
        mode: "angletalk"
    };

    console.log("Sending request to:", url);
    console.log("Payload:", JSON.stringify(payload));

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.body) {
        console.error("No response body");
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let result = "";

    console.log("\\n--- Stream Output ---");
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE
        const lines = chunk.split("\\n");
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const dataStr = line.replace("data: ", "");
                if (dataStr === "[DONE]") {
                    console.log("\\n[DONE]");
                } else if (dataStr) {
                    try {
                        const data = JSON.parse(dataStr);
                        if (data.text) {
                            process.stdout.write(data.text);
                            result += data.text;
                        }
                    } catch (e) {
                        // ignore incomplete json chunk
                    }
                }
            }
        }
    }

    console.log("\\n\\n--- Final Validation ---");
    if (result.includes("Chrome DevTools") || result.includes("puppeteer")) {
        console.log("✅ Success! The API returned the MCP Browser Action response.");
    } else {
        console.log("❌ Failed! The API returned something else.");
    }
}

testChatApi();
