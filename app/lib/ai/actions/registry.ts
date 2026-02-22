
import { Action } from "./types";
import { GITHUB_ACTION } from "./github";
import { GITHUB_TRENDING_ACTION } from "./github-trending-action";
import { GITHUB_ANALYZE_ACTION } from "./github-analyze-action";
import { REDDIT_ACTION } from "./reddit-action";

import { WEB_SEARCH_ACTION } from "./web-search-action";
import { BROWSER_ACTION } from "./browser-action";
import { LOCAL_FILE_ACTION } from "./local-file-action";

export const ACTIONS: Action[] = [
    GITHUB_ACTION,
    GITHUB_TRENDING_ACTION,
    GITHUB_ANALYZE_ACTION,
    REDDIT_ACTION,
    WEB_SEARCH_ACTION,
    BROWSER_ACTION,
    LOCAL_FILE_ACTION,
    // Future actions: CRO_ACTION, etc.
];

export function getAction(name: string): Action | undefined {
    return ACTIONS.find(a => a.name === name);
}

export async function findAction(message: string): Promise<Action | undefined> {
    for (const action of ACTIONS) {
        if (await action.validate(message)) {
            return action;
        }
    }
    return undefined;
}

/**
 * Export actions as JSON Schema tools for OpenAI/Groq native tool calling.
 */
export function getToolSchemas() {
    return ACTIONS.filter(a => a.parameters).map(action => ({
        type: "function",
        function: {
            name: action.name,
            description: action.description,
            parameters: action.parameters
        }
    }));
}
