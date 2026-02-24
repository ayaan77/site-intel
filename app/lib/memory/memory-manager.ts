
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pinecone } from '@pinecone-database/pinecone';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';
import { Memory, MemoryManager as IMemoryManager, MemoryResult } from './types';
import { embed } from '../ai/embed';
import { condenseOldMemories } from './condenser';

export class MemoryManager implements IMemoryManager {
    private supabase: SupabaseClient;
    private pinecone: Pinecone;
    private indexName = 'site-intel-memory';

    constructor() {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase credentials missing');
        }
        this.supabase = createClient(supabaseUrl, supabaseKey);

        const pineconeKey = process.env.PINECONE_API_KEY!;
        if (!pineconeKey) {
            throw new Error('Pinecone API Key missing');
        }
        this.pinecone = new Pinecone({ apiKey: pineconeKey });
    }

    async add(content: string, source: string, metadata: Record<string, any> = {}): Promise<MemoryResult> {
        const id = randomUUID();
        const payload = {
            id,
            content,
            source,
            metadata,
            created_at: new Date().toISOString()
        };

        const errors: string[] = [];
        let vector: number[] | null = null;

        try {
            vector = await embed(content);
        } catch (e) {
            console.error("Embedding generation failed:", e);
        }

        // 1. Write to Supabase
        const supabasePromise = (async () => {
            try {
                const res = await this.supabase.from('memories').insert(payload);
                if (res.error) throw new Error(`Supabase Error: ${res.error.message}`);
                return 'supabase';
            } catch (err: any) {
                errors.push(err.message);
                return null;
            }
        })();

        // 2. Write to Pinecone
        let pineconePromise: Promise<string | null>;
        if (vector) {
            const records = [
                {
                    id,
                    values: vector,
                    metadata: {
                        content,
                        source,
                        ...metadata
                    }
                }
            ];

            pineconePromise = (async () => {
                try {
                    const index = this.pinecone.index(this.indexName);
                    // SDK v7 upsert expects { records: [...] } as UpsertOptions
                    await index.upsert({ records });
                    return 'pinecone';
                } catch (e: any) {
                    errors.push(`Pinecone Error: ${e.message}`);
                    return null;
                }
            })();
        } else {
            pineconePromise = Promise.resolve(null);
            errors.push("Pinecone Skipped: Embedding failed");
        }

        const results = await Promise.all([supabasePromise, pineconePromise]);

        if (results.every(r => r === null)) {
            return {
                success: false,
                error: new Error(`Dual Write Failed: ${errors.join('; ')}`)
            };
        }

        return { success: true, id };
    }

    async search(query: string, limit: number = 5): Promise<Memory[]> {
        try {
            const vector = await embed(query);
            const index = this.pinecone.index(this.indexName);

            const results = await index.query({
                topK: limit,
                vector: vector,
                includeMetadata: true,
                includeValues: false
            });

            if (!results.matches) return [];

            return results.matches.map(m => ({
                id: m.id,
                content: (m.metadata?.['content'] as string) || '',
                source: (m.metadata?.['source'] as string) || undefined,
                metadata: m.metadata as Record<string, unknown>,
                createdAt: new Date()
            }));

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("Memory Search Error:", msg);
            return [];
        }
    }

    async getAll(): Promise<Memory[]> {
        try {
            const { data, error } = await this.supabase
                .from('memories')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Supabase Error: ${error.message}`);
            }

            return ((data ?? []) as Array<Record<string, unknown>>).map(m => ({
                id: m['id'] as string,
                content: m['content'] as string,
                source: m['source'] as string,
                metadata: m['metadata'] as Record<string, unknown>,
                createdAt: new Date(m['created_at'] as string)
            }));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("Memory GetAll Error:", msg);
            return [];
        }
    }

    /**
     * Fire-and-forget: condenses old memories if the count exceeds the threshold.
     * Call with `void` to not block the main request.
     */
    async condenseIfNeeded(groq: Groq, modelName: string, mode: string): Promise<void> {
        await condenseOldMemories(this.supabase, this.pinecone, groq, modelName, mode);
    }

    async delete(id: string): Promise<MemoryResult> {
        const errors: string[] = [];

        // 1. Delete from Supabase
        const supabasePromise = (async () => {
            try {
                const res = await this.supabase.from('memories').delete().eq('id', id);
                if (res.error) throw new Error(`Supabase Error: ${res.error.message}`);
                return 'supabase';
            } catch (err: any) {
                errors.push(err.message);
                return null;
            }
        })();

        // 2. Delete from Pinecone
        const pineconePromise = (async () => {
            try {
                const index = this.pinecone.index(this.indexName);
                // In SDK v7, deleteOne is often just pass ID or uses `.deleteMany([id])`
                // Actually the standard v7 way to delete by ID is `index.deleteOne(id)` if string works,
                // but if TypeScript is complaining, we can use `index.deleteMany([id])` or `index.deleteOne(id)` strictly
                // if `deleteOneOptions` expects `{ id: string }`? Let's use deleteOne({ id }) based on the error.
                // Or better, delete(id) -> index.deleteOne(id) -> Wait, the error is "Argument of type 'string' is not assignable to deleteOneOptions".
                // In Pinecone TS v7, you just do `.deleteOne(id)` directly if string, but wait, maybe it doesn't exist.
                // Let's use the safer `deleteMany([id])`.
                await index.deleteMany([id]);
                return 'pinecone';
            } catch (e: any) {
                errors.push(`Pinecone Error: ${e.message}`);
                return null;
            }
        })();

        const results = await Promise.all([supabasePromise, pineconePromise]);

        if (results.every(r => r === null)) {
            return {
                success: false,
                error: new Error(`Dual Delete Failed: ${errors.join('; ')}`)
            };
        }

        return { success: true, id };
    }
}
