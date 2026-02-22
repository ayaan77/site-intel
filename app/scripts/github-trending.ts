
import * as cheerio from 'cheerio';
import fs from 'fs';

async function fetchTrending() {
    const response = await fetch('https://github.com/trending');
    const html = await response.text();
    const $ = cheerio.load(html);
    const repos: { rank: number; name: string; url: string; description: string; language: string; stars: string }[] = [];

    $('article.Box-row').each((i, el) => {
        if (i >= 10) return;
        const titleEl = $(el).find('h2 h3 a, h2 a'); // GitHub structure varies sometimes
        const name = titleEl.text().trim().replace(/\s+/g, '');
        const url = 'https://github.com' + titleEl.attr('href');
        const description = $(el).find('p').text().trim();
        const language = $(el).find('[itemprop="programmingLanguage"]').text().trim();
        const stars = $(el).find('a[href$="/stargazers"]').last().text().trim();

        repos.push({
            rank: i + 1,
            name,
            url,
            description,
            language,
            stars
        });
    });

    return repos;
}

async function analyzeRepo(url: string) {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const readme = $('article.markdown-body').text().trim().slice(0, 2000); // First 2000 chars
    const topics = $('.topic-tag').map((i, el) => $(el).text().trim()).get();

    return {
        url,
        topics,
        readme_preview: readme
    };
}

async function main() {
    const command = process.argv[2];

    if (command === 'list') {
        const repos = await fetchTrending();
        console.log(JSON.stringify(repos, null, 2));
    } else if (command === 'analyze') {
        const url = process.argv[3];
        if (!url) {
            console.error('URL required');
            process.exit(1);
        }
        const analysis = await analyzeRepo(url);
        console.log(JSON.stringify(analysis, null, 2));
    } else {
        console.log('Usage: npx tsx scripts/github-trending.ts [list|analyze <url>]');
    }
}

main();
