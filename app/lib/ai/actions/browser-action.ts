import { Action, ActionContext, ActionResult } from "./types";

const SIMILES = [
    "open browser",
    "inspect page",
    "screenshot",
    "navigate to",
    "click button on page",
    "read website",
    "extract content",
    "open website",
    "go to website"
];

// This action acts as the bridge to the detached `site-agent` execution engine.
// Instead of running Playwright heavily inside the Next.js API route, it sends commands.

export const BROWSER_ACTION: Action = {
    name: "BROWSER_ACTION",
    similes: SIMILES,
    description: "Controls a headless Chrome browser (via site-agent) to interact with web pages, capture DOM, or extract text content.",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string",
                description: "The action to perform: 'goto', 'extract', 'click', or 'type'",
                enum: ["goto", "extract", "click", "type"]
            },
            url: {
                type: "string",
                description: "The full URL of the website to interact with (must include https:// or http://)"
            },
            selector: {
                type: "string",
                description: "The CSS selector to interact with (required for 'click' or 'type' actions)"
            },
            text: {
                type: "string",
                description: "The text to type (required for 'type' action)"
            }
        },
        required: ["action", "url"],
        additionalProperties: false
    },
    examples: [
        [
            { user: "user", content: { text: "Extract content from https://news.ycombinator.com" } },
            { user: "assistant", content: { text: "Extracting content...", action: "BROWSER_ACTION", parameters: { action: "extract", url: "https://news.ycombinator.com" } } }
        ]
    ],

    validate: async (message: string): Promise<boolean> => {
        const lowerMessage = message.toLowerCase();
        return SIMILES.some(s => lowerMessage.includes(s));
    },

    execute: async (context: ActionContext & { action?: string, url?: string, selector?: string, text?: string }): Promise<ActionResult> => {
        try {
            // Extract parameters from context or LLM invocation. 
            // In a full implementation, `context.parameters` would contain the parsed LLM intentions.
            // For now, if we don't have strict parameters, we try to deduce it or fail gracefully.
            const params = context;

            if (!params.action || !params.url) {
                // Heuristic fallback if the LLM just passed unstructured text, though the schema should enforce it
                return {
                    success: false,
                    error: "Missing required Agent parameters. Please specify 'action' ('extract') and 'url'."
                };
            }

            const agentUrl = process.env.SITE_AGENT_URL || "http://localhost:4000";

            const response = await fetch(`${agentUrl}/execute`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "origin": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
                },
                body: JSON.stringify({
                    action: params.action,
                    url: params.url,
                    selector: params.selector,
                    text: params.text
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Agent execution failed: ${response.statusText} - ${errorData.error || ''}`);
            }

            const result = await response.json();

            // When returning payload to the main ReAct loop, truncate massive DOM extracts 
            // so we don't blow up the Groq context window abruptly.
            let stringifiedData = JSON.stringify(result);
            if (stringifiedData.length > 25000) {
                stringifiedData = stringifiedData.substring(0, 25000) + "... [Content truncated for context window]";
            }

            return {
                success: true,
                data: result,
                text: `[SYSTEM] Browser Action '${params.action}' successful. Data returned: \n\n${stringifiedData}`
            };

        } catch (error: any) {
            console.error("Browser Action Error:", error);
            return {
                success: false,
                error: `Browser execution engine (Site Agent) unreachable or failed: ${error.message}`
            };
        }
    }
};
