
export interface Memory {
    id: string; // UUID from Supabase or Pinecone ID
    content: string;
    source?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

export interface MemoryResult {
    success: boolean;
    error?: Error;
    id?: string;
}

export interface MemoryManager {
    /**
     * Stores a memory in both long-term storage (Pinecone) and relational storage (Supabase).
     * Returns success if at least one storage succeeded.
     */
    add(content: string, source: string, metadata?: Record<string, any>): Promise<MemoryResult>;

    /**
     * Searches for memories similar to the query string.
     * Uses Pinecone for semantic search.
     */
    search(query: string, limit?: number): Promise<Memory[]>;

    /**
     * Retrieves all memories from the relational database (Supabase), ordered by creation date.
     */
    getAll(): Promise<Memory[]>;

    /**
     * Deletes a memory by its UUID from both Supabase and Pinecone.
     */
    delete(id: string): Promise<MemoryResult>;
}
