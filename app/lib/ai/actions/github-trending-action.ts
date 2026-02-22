
import { Action, ActionContext, ActionResult } from './types';
import * as cheerio from 'cheerio';

export const GITHUB_TRENDING_ACTION: Action = {
    name: 'github-trending',
    similes: ['trending repos', 'hot repositories', 'popular on github', 'github trends', 'top repos'],
    description: 'Fetch current trending repositories from GitHub. Use this when the user asks for "trending repos", "popular on github", or "what is hot".',
    parameters: {
        type: "object",
        properties: {
            language: {
                type: ["string", "null"],
                description: "Optional programming language to filter trending repositories (e.g., 'typescript', 'python'). Omit or pass null if no language is specified."
            }
        },
        additionalProperties: false
    },
    examples: [
        [
            { user: "{{user1}}", content: { text: "What's trending on GitHub today?" } },
            { user: "{{user2}}", content: { text: "Here are the top trending repositories...", action: "github-trending" } }
        ],
        [
            { user: "{{user1}}", content: { text: "Show me popular repos" } },
            { user: "{{user2}}", content: { text: "Fetching top repositories...", action: "github-trending" } }
        ]
    ],

    validate: async (message: string) => {
        const keywords = ['trending', 'trends', 'popular', 'hot'];
        const lowerMsg = message.toLowerCase();
        return lowerMsg.includes('github') && keywords.some(k => lowerMsg.includes(k));
    },

    execute: async (context: ActionContext): Promise<ActionResult> => {
        try {
            const response = await fetch('https://github.com/trending');
            if (!response.ok) {
                throw new Error(`GitHub Trending fetch failed: ${response.statusText}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);
            const repos: any[] = [];

            $('article.Box-row').each((i, el) => {
                if (i >= 10) return; // Limit to top 10
                const titleEl = $(el).find('h2 h3 a, h2 a');
                const name = titleEl.text().trim().replace(/\s+/g, '');
                const url = 'https://github.com' + titleEl.attr('href');
                const description = $(el).find('p').text().trim();
                const language = $(el).find('[itemprop="programmingLanguage"]').text().trim();
                const stars = $(el).find('a[href$="/stargazers"]').last().text().trim();

                repos.push({ rank: i + 1, name, url, description, language, stars });
            });

            // Format for the AI
            const formattedList = repos.map(r =>
                `${r.rank}. ${r.name} (${r.language || 'Unknown'}) - ⭐ ${r.stars}\n   ${r.description}\n   ${r.url}`
            ).join('\n\n');

            return {
                success: true,
                data: { repos },
                text: `Here are the top trending repositories on GitHub right now:\n\n${formattedList}`
            };
        } catch (error: any) {
            console.error('GitHubTrendingAction Error:', error);
            return {
                success: false,
                error: `Failed to fetch GitHub trending repos: ${error.message}`
            };
        }
    }
};
