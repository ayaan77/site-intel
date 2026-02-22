
import { Action, ActionContext, ActionResult } from './types';

interface RedditPost {
    data: {
        title: string;
        selftext: string;
        url: string;
        score: number;
        num_comments: number;
        permalink: string;
        subreddit: string;
    }
}

interface RedditListing {
    data: {
        children: RedditPost[];
    }
}

export const REDDIT_ACTION: Action = {
    name: 'reddit-browse',
    similes: ['read reddit', 'browse subreddit', 'check reddit', 'search reddit', 'reddit search'],
    description: 'Browse a specific subreddit or search Reddit. Use this when the user asks to "check r/foo" or "search reddit for bar".',
    parameters: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The search query, subreddit name (e.g. 'r/localllama'), or specific reddit request to look up."
            }
        },
        required: ["query"],
        additionalProperties: false
    },
    examples: [
        [
            { user: "{{user1}}", content: { text: "What's happening on r/localllama?" } },
            { user: "{{user2}}", content: { text: "Browsing r/localllama...", action: "reddit-browse" } }
        ],
        [
            { user: "{{user1}}", content: { text: "Search reddit for 'nextjs tutorial'" } },
            { user: "{{user2}}", content: { text: "Searching Reddit...", action: "reddit-browse" } }
        ]
    ],

    validate: async (message: string) => {
        const keywords = ['reddit', 'subreddit', 'r/'];
        const lowerMsg = message.toLowerCase();
        return keywords.some(k => lowerMsg.includes(k));
    },

    execute: async (context: ActionContext): Promise<ActionResult> => {
        const input = context.message;
        let url = '';
        let mode: 'subreddit' | 'search' = 'search';

        // 1. Check for specific subreddit "r/name" with optional sort/time
        // Regex to capture: r/name, optional "top", optional "week"/"month"/"year"
        const subredditMatch = input.match(/(?:r\/|subreddit\s+)(\w+)|(\w+)\s+(?:subreddit|sub)/i);

        if (subredditMatch) {
            const subreddit = subredditMatch[1] || subredditMatch[2];
            let limit = 10;
            let time = 'all'; // hour, day, week, month, year, all
            let sort = 'hot'; // hot, new, top, rising

            // Heuristic parsing for "top", timeframes, and limits
            if (input.includes('top')) sort = 'top';
            if (input.includes('new')) sort = 'new';
            if (input.includes('rising')) sort = 'rising';

            if (input.includes('today') || input.includes('24 hours')) time = 'day';
            if (input.includes('week') || input.includes('7 days')) time = 'week';
            if (input.includes('month')) time = 'month';
            if (input.includes('year')) time = 'year';
            if (input.includes('all time')) time = 'all';

            // Check for explicit limit number (e.g. "top 3", "5 posts", "three posts")
            const limitMatch = input.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:post|item|result)/i) || input.match(/top\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);

            if (limitMatch) {
                const val = limitMatch[1].toLowerCase();
                const wordMap: Record<string, number> = {
                    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
                };
                limit = wordMap[val] || parseInt(val, 10);
            }

            // Construct URL
            // https://www.reddit.com/r/singularity/top.json?t=week&limit=3
            url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`;
            if (sort === 'top') {
                url += `&t=${time}`;
            }

            mode = 'subreddit';
        }
        // 2. Check for "search reddit for X" or just general query if no subreddit
        else if (input.toLowerCase().includes('reddit')) {
            // ... existing search logic ...
            // Extract query: remove "search", "reddit", "for"
            const query = input.replace(/search|reddit|for|what's|happening|on|check/gi, '').trim();
            if (!query) {
                return { success: false, error: "Please provide a search term or subreddit." };
            }
            url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=10`;
            mode = 'search';
        } else {
            return { success: false, error: "I couldn't understand the Reddit request." };
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) SiteIntel/1.0'
                }
            });

            if (!response.ok) {
                if (response.status === 404) return { success: false, error: "Subreddit or topic not found." };
                if (response.status === 429) return { success: false, error: "Reddit rate limited us. Try again later." };
                throw new Error(`Reddit API error: ${response.statusText}`);
            }

            const json = await response.json() as RedditListing;
            const posts = json.data.children.map(child => ({
                title: child.data.title,
                text: child.data.selftext ? child.data.selftext.slice(0, 200) + '...' : '',
                score: child.data.score,
                comments: child.data.num_comments,
                url: `https://www.reddit.com${child.data.permalink}`,
                subreddit: child.data.subreddit
            }));

            if (posts.length === 0) {
                return { success: true, text: "No results found." };
            }

            const formatted = posts.map((p, i) =>
                `${i + 1}. **${p.title}** (r/${p.subreddit}) - ⬆️ ${p.score} 💬 ${p.comments}\n   ${p.url}\n   ${p.text}`
            ).join('\n\n');

            return {
                success: true,
                data: { posts },
                text: `Here are the top results from Reddit:\n\n${formatted}`
            };

        } catch (error: any) {
            console.error('RedditAction Error:', error);
            return {
                success: false,
                error: `Failed to fetch Reddit data: ${error.message}`
            };
        }
    }
};
