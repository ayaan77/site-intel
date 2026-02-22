"use client";

export function ModeSelector({ onStart }: { onStart: (mode: string, msg: string) => void }) {
    return (
        <div className="chat-home">
            <div className="chat-hero-icon">🤖</div>
            <h1 className="chat-hero-title">AngleTalk</h1>
            <p className="chat-hero-desc">
                Your highly capable, unified AI companion. Expert in system design, brutal code reviews, and competitive intelligence.
            </p>
            <div className="chat-mode-grid">
                <button
                    className="chat-mode-card"
                    onClick={() => onStart("angletalk", "Let's review my current architecture.")}
                >
                    <span className="chat-mode-emoji">🏗️</span>
                    <span className="chat-mode-label">Review Architecture</span>
                </button>
                <button
                    className="chat-mode-card"
                    onClick={() => onStart("angletalk", "Roast my tech stack.")}
                >
                    <span className="chat-mode-emoji">🔥</span>
                    <span className="chat-mode-label">Roast My Stack</span>
                </button>
                <button
                    className="chat-mode-card"
                    onClick={() => onStart("angletalk", "Search the web for the latest Next.js features.")}
                >
                    <span className="chat-mode-emoji">🌐</span>
                    <span className="chat-mode-label">Web Search</span>
                </button>
                <button
                    className="chat-mode-card"
                    onClick={() => onStart("angletalk", "")}
                >
                    <span className="chat-mode-emoji">💬</span>
                    <span className="chat-mode-label">General Chat</span>
                </button>
            </div>
        </div>
    );
}
