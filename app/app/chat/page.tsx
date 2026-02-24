"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ModeSelector } from "@/components/chat/ModeSelector";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { SettingsDrawer } from "@/components/chat/SettingsDrawer";
import { SpecViewer } from "@/components/chat/SpecViewer";
import type { Message } from "@/components/chat/MessageList";
import Link from "next/link";

const DEFAULT_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
const MODES = ["general", "architect", "roast", "cto", "compare", "diagram", "analyze", "intelligence", "cro", "page", "spy"] as const;
type Mode = typeof MODES[number];

function genId() { return Math.random().toString(36).substring(2, 10); }

function getModeLabel(mode: Mode): string {
    const map: Record<Mode, string> = {
        general: "💬 General Chat",
        architect: "🏗️ Design System", roast: "🔥 Roast My Stack", cto: "🤬 Brutal Interview",
        compare: "⚖️ Compare Tech", diagram: "📊 Generate Diagram", analyze: "🔍 Analyze Repo",
        intelligence: "🕵️ Site Intel", cro: "🎯 CRO Audit", page: "📄 Page Analysis", spy: "👁️ Spy Mode",
    };
    return map[mode] || mode;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [mode, setMode] = useState<Mode>("architect");
    const [loading, setLoading] = useState(false);
    const [showHome, setShowHome] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [apiBaseUrl, setApiBaseUrl] = useState("");
    const [modelTier, setModelTier] = useState("high");
    const [councilEnabled, setCouncilEnabled] = useState(false);
    const [mcpEnabled, setMcpEnabled] = useState(false);
    const [deepResearch, setDeepResearch] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [spec, setSpec] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem("gabriel_apiKey") || DEFAULT_KEY;
        const savedUrl = localStorage.getItem("gabriel_apiBaseUrl") || "";
        const savedTier = localStorage.getItem("gabriel_modelTier") || "high";
        const savedCouncil = localStorage.getItem("gabriel_council") === "true";
        const savedMcp = localStorage.getItem("gabriel_mcp") === "true";
        setApiKey(saved);
        setApiBaseUrl(savedUrl);
        setModelTier(savedTier);
        setCouncilEnabled(savedCouncil);
        setMcpEnabled(savedMcp);
    }, []);

    // Auto-scroll to bottom whenever messages update (streaming or new message)
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const saveApiKey = (k: string) => {
        setApiKey(k);
        localStorage.setItem("gabriel_apiKey", k);
    };

    const saveApiBaseUrl = (u: string) => {
        setApiBaseUrl(u);
        localStorage.setItem("gabriel_apiBaseUrl", u);
    };

    const saveModelTier = (t: string) => {
        setModelTier(t);
        localStorage.setItem("gabriel_modelTier", t);
    };

    const saveCouncil = (v: boolean) => {
        setCouncilEnabled(v);
        localStorage.setItem("gabriel_council", String(v));
    };

    const saveMcp = (v: boolean) => {
        setMcpEnabled(v);
        localStorage.setItem("gabriel_mcp", String(v));
    };

    const startMode = useCallback((m: string, initialMsg: string) => {
        setMode(m as Mode);
        setShowHome(false);
        setMessages([]);
        if (initialMsg) {
            setInput(initialMsg);
        }
    }, []);

    const send = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput("");

        const newMsg: Message = { id: genId(), role: "user", content: text };
        const updatedMessages = [...messages, newMsg];
        setMessages(updatedMessages);
        setLoading(true);

        // Standard streaming
        const assistantId = genId();
        setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", isCouncilResult: councilEnabled }]);

        try {
            abortRef.current?.abort();
            const ctrl = new AbortController();
            abortRef.current = ctrl;

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages.map(({ role, content }) => ({ role, content })),
                    mode, modelTier, councilEnabled, mcpEnabled, deepResearch, apiKey, apiBaseUrl
                }),
                signal: ctrl.signal,
            });

            if (!res.ok) {
                const err = await res.json();
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `❌ ${err.error}` } : m));
                setLoading(false);
                return;
            }

            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let full = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split("\n\n");
                buffer = parts.pop() || "";
                for (const part of parts) {
                    if (part.startsWith("data: ")) {
                        const raw = part.slice(6).trim();
                        if (raw === "[DONE]") break;
                        try {
                            const parsed = JSON.parse(raw);
                            if (parsed.text) {
                                full += parsed.text;

                                // Extract ALL <thinking> blocks gracefully
                                let thinkingBlock = "";
                                let displayContent = full;

                                // 1. Extract all closed thinking blocks
                                const thinkingMatches = [...displayContent.matchAll(/<thinking>([\s\S]*?)<\/thinking>/g)];
                                for (const match of thinkingMatches) {
                                    thinkingBlock += (thinkingBlock ? "\n\n" : "") + match[1].trim();
                                }

                                // Remove all closed thinking blocks from the display content
                                displayContent = displayContent.replace(/<thinking>([\s\S]*?)<\/thinking>/gi, "");

                                // 2. Check if there's an unclosed <thinking> block currently streaming
                                const openThinkingIndex = displayContent.lastIndexOf("<thinking>");
                                if (openThinkingIndex !== -1) {
                                    // There is an open thinking tag not closed yet
                                    const unclosedThinking = displayContent.substring(openThinkingIndex + 10).trim();
                                    thinkingBlock += (thinkingBlock ? "\n\n" : "") + unclosedThinking;

                                    // Remove the open thinking tag entirely from the display content so it doesn't show up in the main bubble
                                    displayContent = displayContent.substring(0, openThinkingIndex);
                                }

                                // Strip hallucinated XML tool tags that make the Markdown renderer invisible
                                displayContent = displayContent.replace(/<\/?(?:tool|tool_call|search|action|call)[^>]*>/gi, "");
                                displayContent = displayContent.trim();

                                setMessages((prev) => prev.map((m) => {
                                    if (m.id !== assistantId) return m;
                                    return {
                                        ...m,
                                        // Only overwrite content when we actually have something to show
                                        ...(displayContent !== null ? { content: displayContent } : {}),
                                        ...(thinkingBlock ? { thinking: thinkingBlock } : {}),
                                    };
                                }));
                            } else if (parsed.error) {
                                // Handle mid-stream errors
                                full += `\n\n❌ **API Error:** ${parsed.error}`;
                                setMessages((prev) => prev.map((m) => {
                                    if (m.id !== assistantId) return m;
                                    return { ...m, content: full.trim() };
                                }));
                            }
                        } catch { /* skip */ }
                    }
                }
            }

            // Check for spec readiness signal
            if (full.includes("[READY_TO_GENERATE]")) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: genId(), role: "assistant",
                        content: "✅ I have enough info. Click **Generate Spec** to get the full architecture document.",
                    },
                ]);
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "❌ Request failed. Check your API key." } : m));
            }
        }

        setLoading(false);
    }, [input, loading, messages, mode, modelTier, councilEnabled, mcpEnabled, deepResearch, apiKey, apiBaseUrl]);
    const handleVoiceStreamStart = useCallback(() => {
        // Add a temporary listening message
        setMessages((prev) => [
            ...prev,
            { id: "voice-input-temp", role: "user", content: "🎙️ Listening..." }
        ]);
        setLoading(true);
    }, []);

    const handleVoiceStreamEnd = useCallback(() => {
        // Voice streaming ended, backend is processing
        setMessages((prev) => {
            const newMessages = [...prev];
            const tempIdx = newMessages.findIndex(m => m.id === "voice-input-temp");
            if (tempIdx !== -1) {
                newMessages[tempIdx] = { ...newMessages[tempIdx], content: "🎙️ Processing audio..." };
            }
            return newMessages;
        });

        // Note: We need a mechanism to receive the final response from the backend WS
        // In a full implementation, page.tsx would likely hold the WS connection
        // or ChatInput would pass the received response up to page.tsx.
        // For now, we simulate completion to unlock the UI.
        setTimeout(() => setLoading(false), 2000);
    }, []);

    const handleVoiceStreamInterrupt = useCallback(() => {
        console.log("Voice stream interrupted by VAD.");
        // Stop any ongoing audio playback here if we had one
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, []);

    const handleVoiceTranscription = useCallback((text: string) => {
        setMessages((prev) => {
            const newMessages = [...prev];
            const tempIdx = newMessages.findIndex(m => m.id === "voice-input-temp");
            if (tempIdx !== -1) {
                newMessages[tempIdx] = { ...newMessages[tempIdx], content: text, id: genId() };
            } else {
                newMessages.push({ id: genId(), role: "user", content: text });
            }
            return newMessages;
        });
    }, []);

    const handleVoiceCompletion = useCallback((text: string) => {
        setMessages((prev) => [
            ...prev,
            { id: genId(), role: "assistant", content: text }
        ]);
        setLoading(false);
    }, []);

    const handleVoiceError = useCallback((err: any) => {
        setMessages((prev) => prev.filter(m => m.id !== "voice-input-temp"));
        setLoading(false);
    }, []);

    const generateSpec = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })), mode, modelTier, generateSpec: true, apiKey, apiBaseUrl }),
            });
            const data = await res.json();
            if (data.spec) setSpec(data.spec);
        } catch { /* ignore */ }
        setLoading(false);
    };

    const copyMessage = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const bookmarkMessage = (id: string) => {
        setMessages((prev) => prev.map((m) => m.id === id ? { ...m, bookmarked: !m.bookmarked } : m));
    };

    const clearChat = () => { setMessages([]); setShowHome(true); };

    const filteredMessages = searchQuery
        ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
        : messages;

    const bookmarked = messages.filter((m) => m.bookmarked);
    const canGenerateSpec = mode === "architect" && messages.some((m) => m.role === "assistant");

    return (
        <div className="chat-root">
            {/* Sidebar */}
            <div className="chat-sidebar">
                <div className="chat-sidebar-logo">
                    <Link href="/" className="sidebar-home-link">◀ Site Intel</Link>
                </div>
                <div className="chat-sidebar-title">Gabriel AI</div>

                <div className="sidebar-section-label">AngleTalk</div>
                <div className="sidebar-modes">
                    <button
                        className="sidebar-mode-btn active"
                        onClick={() => startMode("angletalk", "")}
                    >
                        💬 Chat
                    </button>
                </div>

                {bookmarked.length > 0 && (
                    <>
                        <div className="sidebar-section-label">Bookmarks ({bookmarked.length})</div>
                        <div className="sidebar-bookmarks">
                            {bookmarked.map((m) => (
                                <div key={m.id} className="sidebar-bookmark">{m.content.substring(0, 60)}...</div>
                            ))}
                        </div>
                    </>
                )}

                <div className="sidebar-bottom">
                    <button className="sidebar-icon-btn" onClick={() => setShowSearch((v) => !v)} title="Search">🔍</button>
                    <Link href="/memory" className="sidebar-icon-btn flex items-center justify-center text-neutral-400 hover:text-white" title="Memory">
                        🗄️
                    </Link>
                    <button className="sidebar-icon-btn" onClick={() => setSettingsOpen(true)} title="Settings">⚙️</button>
                    <button className="sidebar-icon-btn" onClick={clearChat} title="New Chat">🗑️</button>
                </div>
            </div>

            {/* Main */}
            <div className="chat-main">
                {/* Top bar */}
                <div className="chat-topbar">
                    <div className="chat-topbar-mode">
                        {showHome ? "AI Chat" : "🤖 AngleTalk"}
                        {councilEnabled && <span className="council-indicator">🏛️ Council</span>}
                    </div>
                    <div className="chat-topbar-actions">
                        {canGenerateSpec && (
                            <button className="topbar-btn spec-btn-cta" onClick={generateSpec} disabled={loading}>
                                📋 Generate Spec
                            </button>
                        )}
                        {showSearch && (
                            <input
                                className="topbar-search"
                                placeholder="Search chat..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="chat-content">
                    {showHome ? (
                        <ModeSelector onStart={startMode} />
                    ) : (
                        <MessageList
                            messages={filteredMessages}
                            loading={loading}
                            copiedId={copiedId}
                            onCopy={copyMessage}
                            onBookmark={bookmarkMessage}
                        />
                    )}
                    {/* Auto-scroll anchor */}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                {!showHome && (
                    <div className="chat-input-area">
                        <ChatInput
                            value={input}
                            onChange={setInput}
                            onSend={send}
                            loading={loading}
                            mode={mode}
                            deepResearch={deepResearch}
                            onDeepResearchToggle={() => setDeepResearch(!deepResearch)}
                            onVoiceStreamStart={handleVoiceStreamStart}
                            onVoiceStreamEnd={handleVoiceStreamEnd}
                            onVoiceStreamInterrupt={handleVoiceStreamInterrupt}
                            onVoiceTranscription={handleVoiceTranscription}
                            onVoiceCompletion={handleVoiceCompletion}
                            onVoiceError={handleVoiceError}
                        />
                    </div>
                )}
            </div>

            {/* Overlays */}
            <SettingsDrawer
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                apiKey={apiKey}
                onApiKeyChange={saveApiKey}
                apiBaseUrl={apiBaseUrl}
                onApiBaseUrlChange={saveApiBaseUrl}
                modelTier={modelTier}
                onModelTierChange={saveModelTier}
                councilEnabled={councilEnabled}
                onCouncilChange={saveCouncil}
                mode={mode}
                mcpEnabled={mcpEnabled}
                onMcpChange={saveMcp}
            />

            {spec && <SpecViewer spec={spec} onClose={() => setSpec(null)} />}
        </div>
    );
}
