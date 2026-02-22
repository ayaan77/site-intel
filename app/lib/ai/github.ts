// GitHub repository fetcher — server-side (avoids CORS)

export interface GitHubRepoData {
    name: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    size: number;
    fileTree: string;
    keyFiles: Record<string, string>;
    url: string;
}

const fetchWithTimeout = async (url: string, timeout = 15000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return res;
    } catch (err: any) {
        clearTimeout(id);
        throw err.name === "AbortError" ? new Error("Request timed out") : err;
    }
};

export async function fetchGitHubRepo(repoUrl: string): Promise<GitHubRepoData> {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!match) throw new Error("Invalid GitHub URL. Use format: github.com/owner/repo");

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, "");

    const infoRes = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${cleanRepo}`);
    if (!infoRes.ok) throw new Error(`Repo not found: ${owner}/${cleanRepo}`);
    const info = await infoRes.json();

    const treeRes = await fetchWithTimeout(
        `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${info.default_branch}?recursive=1`
    );
    const treeData = await treeRes.json();

    const files = ((treeData.tree || []) as { type: string; path: string }[])
        .filter((f) => f.type === "blob")
        .map((f) => f.path)
        .slice(0, 200);

    const keyFiles = files.filter((f) =>
        /^(package\.json|Cargo\.toml|go\.mod|requirements\.txt|Gemfile|Dockerfile|README\.md)$/i.test(f.split("/").pop()!) ||
        /^(src\/index|src\/main|src\/app|app\/page|app\/layout|pages\/index|index)\.(js|ts|jsx|tsx|py|go|rs)$/i.test(f)
    ).slice(0, 8);

    const fileContents: Record<string, string> = {};
    for (const filePath of keyFiles) {
        try {
            const contentRes = await fetchWithTimeout(
                `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${filePath}`,
                8000
            );
            const contentData = await contentRes.json();
            if (contentData.content) {
                fileContents[filePath] = Buffer.from(contentData.content, "base64").toString("utf-8").substring(0, 2000);
            }
        } catch { /* skip */ }
    }

    return {
        name: info.name,
        description: info.description || "No description",
        language: info.language,
        stars: info.stargazers_count,
        forks: info.forks_count,
        size: info.size,
        fileTree: files.join("\n"),
        keyFiles: fileContents,
        url: info.html_url,
    };
}

export function buildRepoContext(repoData: GitHubRepoData): string {
    let context = `# GitHub Repository Analysis\n\n`;
    context += `**Repo:** ${repoData.name} (${repoData.url})\n`;
    context += `**Description:** ${repoData.description}\n`;
    context += `**Primary Language:** ${repoData.language}\n`;
    context += `**Stars:** ${repoData.stars} | **Forks:** ${repoData.forks}\n\n`;
    context += `## File Structure (${repoData.fileTree.split("\n").length} files)\n\`\`\`\n${repoData.fileTree}\n\`\`\`\n\n`;

    if (Object.keys(repoData.keyFiles).length > 0) {
        context += `## Key File Contents\n\n`;
        for (const [path, content] of Object.entries(repoData.keyFiles)) {
            context += `### ${path}\n\`\`\`\n${content}\n\`\`\`\n\n`;
        }
    }

    context += `\nAnalyze this repository's architecture thoroughly. Generate a Mermaid.js diagram.`;
    return context;
}
