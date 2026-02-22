import { Action, ActionContext, ActionResult } from "./types";
import { fetchGitHubRepo, buildRepoContext } from "@/lib/ai/github";

export const GITHUB_ACTION: Action = {
    name: "analyze_github_repo",
    similes: ["read_repo", "check_github", "analyze_code", "review_repository"],
    description: "Fetches and analyzes a GitHub repository to understand its structure, tech stack, and code.",
    examples: [
        [
            { user: "user", content: { text: "Can you analyze github.com/owner/repo?" } },
            { user: "assistant", content: { text: "I'll analyze that repository for you.", action: "analyze_github_repo" } }
        ]
    ],

    validate: async (message: string) => {
        // Check if message contains a GitHub URL
        return /github\.com\/[^/]+\/[^\s/]+/.test(message);
    },

    execute: async (context: ActionContext): Promise<ActionResult> => {
        try {
            const match = context.message.match(/github\.com\/[^/]+\/[^\s/]+/);
            if (!match) return { success: false, error: "No GitHub URL found" };

            const repoUrl = match[0];
            const repoData = await fetchGitHubRepo(repoUrl);
            const repoContext = buildRepoContext(repoData);

            return {
                success: true,
                data: repoData,
                text: `I have analyzed the repository. Here is the context:\n\n${repoContext}`
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
};
