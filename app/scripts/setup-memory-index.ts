
import { Pinecone } from '@pinecone-database/pinecone';
import { loadEnvConfig } from '@next/env';
import path from 'path';

loadEnvConfig(path.resolve(__dirname, '../'));

async function main() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const indexName = 'site-intel-memory';

    console.log(`Checking index: ${indexName}...`);
    try {
        const { indexes } = await pc.listIndexes();
        const exists = indexes?.some(idx => idx.name === indexName);

        if (exists) {
            console.log(`Deleting existing index: ${indexName}...`);
            await pc.deleteIndex(indexName);
            console.log("Deleted.");
            // Wait a bit for deletion to propagate
            await new Promise(r => setTimeout(r, 5000));
        }

        console.log(`Creating new index: ${indexName} (768d)...`);
        await pc.createIndex({
            name: indexName,
            dimension: 768, // Matches nomic-embed-text-v1
            metric: 'cosine',
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1'
                }
            }
        });
        console.log("Index created successfully.");

    } catch (e: any) {
        console.error("Setup failed:", e.message);
    }
}

main();
