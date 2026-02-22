"use client";

import { useEffect, useRef, useState } from "react";
import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

/**
 * Strips hallucinated raw function tags and thinking blocks that Llama 3 models
 * sometimes leak into their streamed text output instead of using the native tool-call API.
 * Applied at render time so it works regardless of how the stream was chunked.
 */
function sanitizeContent(raw: string): string {
    return raw
        // Strip <function=NAME>...</function> or self-closing <function=NAME> tags
        .replace(/<function=[^>]*>[\s\S]*?<\/function>/gi, "")
        .replace(/<function=[^>]*\/?>/gi, "")
        // Strip hallucinated {"filePath": ...} JSON blobs
        .replace(/\{"filePath"[^}]*\}/g, "")
        // Strip <thinking>...</thinking> inner blocks (show them in the thinking panel, not inline)
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
        // Clean up resulting orphaned angle brackets or excess whitespace
        .replace(/^[\s>]+$/, "")
        .trim();
}

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    thinking?: string;
    bookmarked?: boolean;
    isCouncilResult?: boolean;
}

interface MessageListProps {
    messages: Message[];
    loading: boolean;
    copiedId: string | null;
    onCopy: (text: string, id: string) => void;
    onBookmark: (id: string) => void;
}

function ThinkingBlock({ thinking }: { thinking: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="thinking-block">
            <button className="thinking-toggle" onClick={() => setOpen((o) => !o)}>
                {open ? "▾" : "▸"} Thinking...
            </button>
            {open && <div className="thinking-content">{thinking}</div>}
        </div>
    );
}

export function MessageList({ messages, loading, copiedId, onCopy, onBookmark }: MessageListProps) {
    const endRef = useRef<HTMLDivElement>(null);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

    if (messages.length === 0 && !loading) {
        return (
            <div className="message-list h-full flex flex-col items-center justify-center min-h-[50vh]">
                <div className="text-5xl mb-6 opacity-80">🤖</div>
                <h3 className="text-xl font-semibold text-white mb-2">Welcome to AngleTalk</h3>
                <p className="text-slate-400 text-center max-w-sm">
                    I'm ready to review your architecture, roast your stack, or just chat. Type a message below or use your microphone!
                </p>
            </div>
        );
    }

    return (
        <div className="message-list">
            {messages.map((msg) => (
                <div key={msg.id} className={`message message-${msg.role}`}>
                    {msg.role === "assistant" ? (
                        <div className="message-assistant">
                            <div className="message-avatar">🤖</div>
                            <div className="message-body">
                                {msg.thinking && <ThinkingBlock thinking={msg.thinking} />}
                                {msg.content && (
                                    <div
                                        className="message-content prose"
                                        dangerouslySetInnerHTML={{ __html: marked(sanitizeContent(msg.content)) as string }}
                                    />
                                )}
                                {msg.isCouncilResult && (
                                    <div className="council-badge">👑 Council Consensus</div>
                                )}
                                <div className="message-actions">
                                    <button
                                        className="msg-action-btn"
                                        onClick={() => onCopy(msg.content, msg.id)}
                                        title="Copy"
                                    >
                                        {copiedId === msg.id ? "✓" : "⎘"}
                                    </button>
                                    <button
                                        className={`msg-action-btn ${msg.bookmarked ? "bookmarked" : ""}`}
                                        onClick={() => onBookmark(msg.id)}
                                        title="Bookmark"
                                    >
                                        {msg.bookmarked ? "★" : "☆"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="message-user">
                            <div className="message-user-bubble">{msg.content}</div>
                        </div>
                    )}
                </div>
            ))}

            {loading && (
                <div className="message message-assistant">
                    <div className="message-assistant">
                        <div className="message-avatar">🤖</div>
                        <div className="message-body">
                            <div className="typing-indicator">
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div ref={endRef} />
        </div>
    );
}
