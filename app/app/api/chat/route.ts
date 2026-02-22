import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GENERATOR_PROMPT } from "@/lib/ai/prompts";
import { CHARACTERS } from "@/lib/ai/characters";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";
import { getToolSchemas, ACTIONS, getAction } from "@/lib/ai/actions/registry";
import { mcpManager } from "@/lib/mcp/client";
import { runCouncil, isCouncilAvailable, MODEL_TIERS } from "@/lib/ai/council";
import { fetchGitHubRepo, buildRepoContext } from "@/lib/ai/github";
import { MemoryManager } from "@/lib/memory/memory-manager";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const { messages, mode = "architect", modelTier = "high", councilEnabled = false, mcpEnabled = false, generateSpec = false, apiKey, apiBaseUrl } = await req.json();

    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) return NextResponse.json({ error: "No API key provided." }, { status: 401 });
    if (!messages || !Array.isArray(messages)) return NextResponse.json({ error: "Invalid messages." }, { status: 400 });

    const lastMessage = messages[messages.length - 1];

    // Resolve Character and System Prompt. We now strictly use AngleTalk.
    const character = CHARACTERS["angletalk"];
    let systemPrompt = buildSystemPrompt(character);

    // ── Memory System (RAG & Learning) ────────────────────────────────────────
    try {
        const memoryManager = new MemoryManager();

        // 1. Learning: Save user message asynchronously
        // We await this to ensure persistence, but ideally this would be a background job
        await memoryManager.add(lastMessage.content, "user_chat", { role: "user", mode });

        // 2. Retrieval: Search for relevant context
        const memories = await memoryManager.search(lastMessage.content);
        if (memories.length > 0) {
            const memoryContext = memories.map(m => `- ${m.content} `).join("\n");
            systemPrompt += `\n\nIMPORTANT CONTEXT FROM LONG - TERM MEMORY: \n${memoryContext} \n\nUse this information to personalize your response if relevant.`;
        }
    } catch (err) {
        console.error("Memory System Error:", err);
        // Continue without memory on failure
    }


    // ── Action System (ElizaOS Pattern) is now part of the Standard Streaming logic ──
    // We removed the heuristic `findAction` block. Tools are passed directly to the LLM.

    // ── Council Mode ────────────────────────────────────────────────────────────
    if (councilEnabled && isCouncilAvailable(mode)) {
        // systemPrompt is already resolved
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                const send = (text: string) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })} \n\n`));
                try {
                    const result = await runCouncil(lastMessage.content, systemPrompt, key, send);
                    send("\\n\\n---\\n\\n" + result.stage3.content);
                    controller.enqueue(encoder.encode("data: [DONE]\\n\\n"));
                } catch (err: any) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })} \n\n`));
                }
                controller.close();
            },
        });
        return new Response(readable, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }

    // ── Spec Generation ─────────────────────────────────────────────────────────
    if (generateSpec) {
        const groq = new Groq({ apiKey: key, baseURL: apiBaseUrl || undefined });
        let modelName = MODEL_TIERS[modelTier as keyof typeof MODEL_TIERS]?.model || MODEL_TIERS.high.model;

        // Nvidia NIM overrides
        if (apiBaseUrl?.includes("nvidia.com")) {
            if (modelName.includes("70b")) modelName = "meta/llama-3.3-70b-instruct";
            else if (modelName.includes("8b")) modelName = "meta/llama3-8b-instruct";
            else if (modelName.includes("gemma")) modelName = "google/gemma-2-9b-it";
            else modelName = "meta/llama-3.3-70b-instruct";
        }

        const summary = messages.map((m: { role: string; content: string }) => `${m.role === "user" ? "Developer" : "Architect"}: ${m.content} `).join("\n");
        try {
            const completion = await groq.chat.completions.create({
                model: modelName,
                messages: [{ role: "system", content: GENERATOR_PROMPT }, { role: "user", content: `Generate the architecture spec from: \n\n${summary} ` }],
                temperature: 0.5,
                max_tokens: 8000,
            });
            return NextResponse.json({ spec: completion.choices[0]?.message?.content || "" });
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
    }

    // ── Autonomous Tool Loop & Streaming (ReAct) ────────────────────────────────
    const groq = new Groq({ apiKey: key, baseURL: apiBaseUrl || undefined });
    let modelName = MODEL_TIERS[modelTier as keyof typeof MODEL_TIERS]?.model || MODEL_TIERS.high.model;

    // Nvidia NIM overrides
    if (apiBaseUrl?.includes("nvidia.com")) {
        if (modelName.includes("70b")) modelName = "meta/llama-3.3-70b-instruct";
        else if (modelName.includes("8b")) modelName = "meta/llama3-8b-instruct";
        else if (modelName.includes("gemma")) modelName = "google/gemma-2-9b-it";
        else modelName = "meta/llama-3.3-70b-instruct";
    }

    const cleanMessages = messages.map(({ role, content }: { role: string; content: string }) => ({ role, content }));
    const messagesToSend: any[] = [{ role: "system", content: systemPrompt }, ...cleanMessages];

    // Casual-message guard: skip tool evaluation for basic greetings or single words to speed up response
    const lastUserText = lastMessage?.content?.trim().toLowerCase() || "";
    const isCasualMessage = lastUserText.length < 15 && /^(hi|hello|hey|yo|sup|thanks|ok|okay|cool|bye|good|morning|night)$/.test(lastUserText.replace(/[^a-z]/g, ''));

    // URL/scraping detection: force tool_choice = "required" so LLM cannot skip tools and answer from memory
    const containsUrl = /https?:\/\/[^\s]+/.test(lastMessage?.content || "");
    const hasScrapeKeyword = /(scrape|extract|read website|open website|browse|navigate to|visit|go to|web search|search for|find info|latest news|current|what is|who is|when did)/i.test(lastMessage?.content || "");
    const forceToolCall = (containsUrl || hasScrapeKeyword) && !isCasualMessage;

    const staticTools = getToolSchemas();
    let mcpActions: any[] = [];
    if (mcpEnabled) {
        try {
            mcpActions = await mcpManager.getAvailableActions();
            console.log(`[MCP] Discovered ${mcpActions.length} external tools.`);
        } catch (e) {
            console.error("[MCP] Failed to load MCP actions:", e);
        }
    }

    const mcpToolSchemas = mcpActions.filter(a => a.parameters).map(action => ({
        type: "function",
        function: {
            name: action.name,
            description: action.description,
            parameters: action.parameters
        }
    }));

    const tools = [...staticTools, ...mcpToolSchemas];

    try {
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    let iterations = 0;
                    let hasCalledTool = false;

                    while (iterations < 5) {
                        iterations++;

                        const currentTools = (!hasCalledTool && !isCasualMessage && tools.length > 0) ? tools : undefined;
                        console.log(`[ReAct Iteration ${iterations}] Using Model: ${modelName}, Tools Enabled: ${!!currentTools}, ForceToolCall: ${forceToolCall} `);
                        console.log(`[ReAct Iteration ${iterations}] Messages Context Length: ${messagesToSend.length} `);
                        if (currentTools) console.log(`[ReAct] Tools: `, JSON.stringify(currentTools, null, 2));

                        // "required" forces tool when URL/scraping detected on iteration 1
                        // undefined lets LLM answer naturally after a tool has run
                        const toolChoiceValue = hasCalledTool || isCasualMessage ? undefined
                            : (forceToolCall && iterations === 1) ? "required" : "auto";

                        const stream = await groq.chat.completions.create({
                            model: modelName,
                            messages: messagesToSend,
                            tools: currentTools,
                            tool_choice: toolChoiceValue,
                            temperature: (mode === "roast" || mode === "brainstorm") ? 0.7 : 0.3,
                            max_tokens: 4000,
                            stream: true
                        });

                        let functionCallBuffer = "";
                        let functionName = "";
                        let functionCallId = "";
                        let isFunctionCall = false;
                        let assistantContent = "";
                        // Accumulate content so we can strip hallucinated tags at the end of each chunk sweep
                        let rawContentAccumulator = "";

                        for await (const chunk of stream) {
                            const delta = chunk.choices[0]?.delta;
                            if (!delta) continue;

                            if (delta.content) {
                                assistantContent += delta.content;
                            }

                            if (delta.tool_calls && delta.tool_calls.length > 0) {
                                isFunctionCall = true;
                                const tc = delta.tool_calls[0];
                                if (tc.id) functionCallId = tc.id;
                                if (tc.function?.name) functionName = functionName || tc.function.name;
                                if (tc.function?.arguments) functionCallBuffer += tc.function.arguments;
                            } else if (!isFunctionCall && delta.content) {
                                rawContentAccumulator += delta.content;

                                // Stream clean text - strip raw function tags and JSON blobs that Llama leaks
                                // We use a simple heuristic: if the buffer contains a hallucinated tag, skip this chunk
                                const hasHallucinatedTag = rawContentAccumulator.includes("<function=") || rawContentAccumulator.includes('{"filePath"');
                                if (hasHallucinatedTag) {
                                    // Hide it from UI, wait for the full tag to finish accumulating
                                    continue;
                                }

                                // Strip inline <function=...> fragments that appear in a single chunk
                                const cleanContent = delta.content.replace(/<function=[^>]+>/g, "").replace(/\{"filePath"[^}]*\}/g, "");
                                if (cleanContent) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: cleanContent })} \n\n`));
                                }
                            }
                        }

                        // FALLBACK: Groq Llama 3 often ignores the native tool_calls array and returns raw <function=NAME>{"arg":"val"} text.
                        // If we didn't get a native tool call, but we captured one in the text accumulator, parse it manually.
                        if (!isFunctionCall && rawContentAccumulator.includes("<function=")) {
                            const match = rawContentAccumulator.match(/<function=([^>]+)>([^<]*)(?:<\/function>)?/);
                            if (match) {
                                isFunctionCall = true;
                                functionName = match[1].trim();
                                functionCallBuffer = match[2].trim();
                                functionCallId = "call_" + Math.random().toString(36).substr(2, 9);
                                console.log(`[TRACER] Manual Extracted Tool Call -> Name: ${functionName}, Args: ${functionCallBuffer}`);
                            }
                        }

                        if (isFunctionCall) {
                            hasCalledTool = true;
                            messagesToSend.push({
                                role: "assistant",
                                content: assistantContent || null,
                                tool_calls: [
                                    { id: functionCallId, type: "function", function: { name: functionName, arguments: functionCallBuffer } }
                                ]
                            });

                            let parsedArgs: Record<string, any> = {};
                            try { parsedArgs = JSON.parse(functionCallBuffer); } catch { }

                            // Notify UI that a tool is running seamlessly
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: `\n\n> ⚙️ Running Tool: \`${functionName}\`...\n\n` })} \n\n`));

                            const staticAction = getAction(functionName);
                            // Combine with dynamic MCP actions just for looking up
                            const mcpActionLookup = mcpActions.find(a => a.name === functionName);
                            const action = staticAction || mcpActionLookup;
                            let actionResultDesc = "No action found.";
                            console.log(`[TRACER] Executing tool: ${functionName} `);
                            if (action) {
                                try {
                                    const result = await action.execute({ message: JSON.stringify(parsedArgs), apiKey: key, ...parsedArgs });
                                    actionResultDesc = result.text || JSON.stringify(result.data) || result.error || "Executed silently.";

                                    // Hard-cap tool output to 2000 chars to prevent Groq 6000 TPM overflow on the second LLM call
                                    if (actionResultDesc.length > 2000) {
                                        actionResultDesc = actionResultDesc.substring(0, 2000) + "... [truncated to fit context window]";
                                    }

                                    console.log(`[TRACER] Tool executed successfully. Size: ${actionResultDesc.length} `);

                                    // Store significant data to long-term memory
                                    if (result.success && actionResultDesc.length > 100) {
                                        const memoryManager = new MemoryManager();
                                        // Fire and forget
                                        memoryManager.add(actionResultDesc, `tool_${functionName} `, { url: parsedArgs.url, mode }).catch(err => {
                                            console.error(`[TRACER] Memory logging failed for tool ${functionName}: `, err);
                                        });
                                    }
                                } catch (e) {
                                    console.log(`[TRACER] Tool execution threw an exception: `, e);
                                }
                            }

                            messagesToSend.push({
                                role: "tool",
                                tool_call_id: functionCallId,
                                name: functionName,
                                content: actionResultDesc
                            });

                            console.log(`[TRACER] Looping back to LLM for iteration ${iterations + 1}`);
                            // Loop continues and feeds the tool output back into Groq
                        } else {
                            // Finished answering naturally without any tools
                            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                            controller.close();
                            return;
                        }
                    }

                    // Break infinite loops safely
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (err: any) {
                    console.error("[Streaming Loop Error]:", err);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message || "Streaming Error" })} \n\n`));
                    controller.close();
                }
            }
        });

        return new Response(readable, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
