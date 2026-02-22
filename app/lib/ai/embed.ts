
import { pipeline } from '@xenova/transformers';

// Singleton instance to avoid reloading model
let extractor: any = null;

export async function embed(text: string): Promise<number[]> {
    if (!extractor) {
        console.log("Loading embedding model (Xenova/all-MiniLM-L6-v2)...");
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }

    const output = await extractor(text, { pooling: 'mean', normalize: true });
    // output.data is Float32Array, convert to number[]
    return Array.from(output.data);
}
