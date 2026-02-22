
import { Action, ActionContext, ActionResult } from "./types";

const SIMILES = [
    "search for",
    "web search",
    "google",
    "find info on",
    "what is",
    "who is",
    "when did",
    "latest news on"
];

export const WEB_SEARCH_ACTION: Action = {
    name: "WEB_SEARCH_ACTION",
    similes: SIMILES,
    description: "Searches the web for real-time information using Tavily API.",
    parameters: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The targeted search query to send to the web search engine."
            }
        },
        required: ["query"],
        additionalProperties: false
    },
    examples: [
        [{ user: "user", content: { text: "Search for the latest iPhone rumors" } }, { user: "assistant", content: { text: "Searching web for 'latest iPhone rumors'...", action: "WEB_SEARCH_ACTION" } }],
        [{ user: "user", content: { text: "Who won the Super Bowl 2024?" } }, { user: "assistant", content: { text: "Searching web for 'Super Bowl 2024 winner'...", action: "WEB_SEARCH_ACTION" } }]
    ],

    validate: async (message: string): Promise<boolean> => {
        const lowerMessage = message.toLowerCase();
        // Check if message explicitly asks for search or asks a factual question that likely needs search
        // Simple heuristic: starts with "search", "find", "what/who/when/where" followed by "is/are/did"
        // Or contains "latest", "news", "current"

        const explicitTrigger = SIMILES.some(s => lowerMessage.includes(s));
        const questionTrigger = /^(what|who|when|where|why|how)\s+(is|are|did|do|does|was|were|has|have)/.test(lowerMessage);
        const newsTrigger = /(latest|news|current|recent)/.test(lowerMessage);

        return explicitTrigger || (questionTrigger && newsTrigger);
    },

    execute: async (context: ActionContext & { query?: string }): Promise<ActionResult> => {
        try {
            const apiKey = process.env.TAVILY_API_KEY;
            if (!apiKey) {
                return { success: false, error: "Tavily API Key not configured." };
            }

            // Extract query from strictly parsed JSON arguments, fallback to message
            let query = context.query;
            if (!query) {
                query = context.message;
                SIMILES.forEach(s => {
                    query = query!.replace(new RegExp(s, 'gi'), '');
                });
                query = query!.trim();
            }

            if (!query) {
                return { success: false, error: "Empty search query." };
            }

            const response = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: query,
                    search_depth: "basic",
                    include_answer: true,
                    include_images: false,
                    max_results: 3  // Reduced to 3 to prevent context overflow on Groq
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return { success: false, error: `Tavily API Error: ${errorData.message || response.statusText}` };
            }

            const data = await response.json();

            // Truncate each result content to 300 chars to stay within Groq's 6000 TPM limit
            const MAX_CONTENT_PER_RESULT = 300;
            const contextText = data.results
                .slice(0, 3)
                .map((r: { title: string; url: string; content: string }) =>
                    `[${r.title}](${r.url}): ${(r.content || "").substring(0, MAX_CONTENT_PER_RESULT)}`
                )
                .join("\n\n")
                .substring(0, 2000); // Hard-cap the full output at 2000 chars

            const answer = data.answer ? data.answer.substring(0, 500) : "No direct answer found.";

            return {
                success: true,
                data: data,
                text: `Web Search Results:\n\n${contextText}\n\nSummary: ${answer}`
            };

        } catch (error: any) {
            console.error("Web Search Action Error:", error);
            return { success: false, error: error.message };
        }
    }
};
