"use client";

import { useEffect, useState } from "react";
import { Trash2, Loader2, Database, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Memory {
    id: string;
    content: string;
    source?: string;
    metadata?: Record<string, any>;
    createdAt: string;
}

export default function MemoryDashboard() {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchMemories = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/memory");
            if (!res.ok) throw new Error("Failed to fetch memories");
            const data = await res.json();
            setMemories(data.memories || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMemories();
    }, []);

    const deleteMemory = async (id: string) => {
        if (!confirm("Are you sure you want to permanently delete this memory? The agent will forget this context.")) return;

        try {
            setDeletingId(id);
            const res = await fetch(`/api/memory?id=${id}`, { method: "DELETE" });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to delete");
            }

            // Remove from local state
            setMemories(memories.filter(m => m.id !== id));
        } catch (err: any) {
            alert(`Error deleting memory: ${err.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <Link href="/chat" className="text-neutral-400 hover:text-white transition-colors">
                                <ArrowLeft size={20} />
                            </Link>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <Database className="text-indigo-400" />
                                Long-Term Memory
                            </h1>
                        </div>
                        <p className="text-neutral-400 pl-8">
                            View and manage the facts and context the AI has learned about you across all sessions.
                        </p>
                    </div>
                    <div className="text-sm px-4 py-2 bg-neutral-900 rounded-lg border border-neutral-800">
                        Total Memories: <span className="font-mono text-indigo-400">{memories.length}</span>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-neutral-500" size={32} />
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-3 p-4 bg-red-950/30 border border-red-900/50 rounded-lg text-red-200">
                        <AlertCircle size={20} />
                        <p>{error}</p>
                    </div>
                ) : memories.length === 0 ? (
                    <div className="text-center py-20 px-4 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
                        <Database size={48} className="mx-auto text-neutral-700 mb-4" />
                        <h3 className="text-xl font-medium text-neutral-300 mb-2">No memories conceptualized yet</h3>
                        <p className="text-neutral-500">
                            The agent will automatically store significant facts, code snippets, and preferences over time.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {memories.map((memory) => (
                            <div key={memory.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col gap-4 hover:border-neutral-700 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-xs font-medium text-neutral-500 bg-neutral-950 px-2 py-1 rounded border border-neutral-800 uppercase tracking-wider">
                                        {memory.source || 'Unknown Source'}
                                    </span>
                                    <button
                                        onClick={() => deleteMemory(memory.id)}
                                        disabled={deletingId === memory.id}
                                        className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                                        title="Forget this memory"
                                    >
                                        {deletingId === memory.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                    </button>
                                </div>

                                <p className="text-sm text-neutral-200 leading-relaxed flex-grow whitespace-pre-wrap flex-1 overflow-y-auto max-h-48 custom-scrollbar">
                                    {memory.content}
                                </p>

                                <div className="pt-4 border-t border-neutral-800 mt-auto">
                                    <span className="text-xs text-neutral-500">
                                        Learned {new Date(memory.createdAt).toLocaleDateString()} at {new Date(memory.createdAt).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
            `}</style>
        </div>
    );
}
