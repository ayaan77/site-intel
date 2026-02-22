
import { Action, ActionContext, ActionResult } from './types';
import * as cheerio from 'cheerio';

export const GITHUB_ANALYZE_ACTION: Action = {
    name: 'github-analyze',
    similes: ['analyze repo', 'check repository', 'read readme', 'inspect repo', 'look at repo'],
    description: 'Analyze a specific GitHub repository. Use this when the user asks to "analyze", "check", or "read" a specific repo URL or name.',
    parameters: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "The full GitHub URL or the 'owner/repo' format string to analyze."
            }
        },
        required: ["url"],
        additionalProperties: false
    },
    examples: [
        [
            { user: "{{user1}}", content: { text: "Analyze openclaw/openclaw" } },
            { user: "{{user2}}", content: { text: "Reading repository...", action: "github-analyze" } }
        ],
        [
            { user: "{{user1}}", content: { text: "Check https://github.com/facebook/react" } },
            { user: "{{user2}}", content: { text: "Analyzing repository...", action: "github-analyze" } }
        ]
    ],

    validate: async (message: string) => {
        const keywords = ['analyze', 'check', 'read', 'inspect', 'look at'];
        const lowerMsg = message.toLowerCase();
        // Must contain "github.com" or a clear "owner/repo" pattern AND an analysis keyword
        // Or just "analyze <repo>"
        const hasKeyword = keywords.some(k => lowerMsg.includes(k));
        const hasUrl = lowerMsg.includes('github.com') || lowerMsg.match(/[\w-]+\/[\w-.]+/);
        return !!(hasKeyword && hasUrl);
    },

    execute: async (context: ActionContext): Promise<ActionResult> => {
        const input = context.message;
        let url = '';

        // Regex for full URL
        const urlMatch = input.match(/(https:\/\/github\.com\/[\w-]+\/[\w-.]+)/);
        if (urlMatch) {
            url = urlMatch[0];
        } else {
            // Regex for "owner/repo"
            const repoMatch = input.match(/([\w-]+\/[\w-.]+)/);
            if (repoMatch) {
                const parts = input.split(' ');
                for (const part of parts) {
                    if (part.includes('/') && !part.startsWith('http')) {
                        url = `https://github.com/${part}`;
                        break;
                    }
                }
            }
        }

        if (!url) {
            return {
                success: false,
                error: "I couldn't identify a valid GitHub repository URL or 'owner/repo' pattern in your request."
            };
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    return { success: false, error: `Repository not found: ${url}` };
                }
                throw new Error(`Fetch failed: ${response.statusText}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Extract details
            const description = $('p.f4').first().text().trim();
            const topics = $('.topic-tag').map((i, el) => $(el).text().trim()).get();
            const readme = $('article.markdown-body').text().trim().slice(0, 4000); // 4000 chars

            if (!readme && !description) {
                return {
                    success: false,
                    error: `I accessed ${url} but couldn't find a README or description. It might be empty or private.`
                };
            }

            const summary = `
**Repository:** ${url}
**Description:** ${description || 'No description provided.'}
**Topics:** ${topics.join(', ') || 'None'}

**README Preview:**
${readme.substring(0, 1000)}...

*(Analysis based on public HTML)*
      `;

            return {
                success: true,
                data: { url, description, topics, readme },
                text: summary // This text will be fed into the LLM context
            };

        } catch (error: any) {
            console.error('GitHubAnalyzeAction Error:', error);
            return {
                success: false,
                error: `Failed to analyze repository ${url}: ${error.message}`
            };
        }
    }
};
