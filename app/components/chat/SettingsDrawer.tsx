"use client";

import { useState, useEffect } from "react";
import { MODEL_TIERS } from "@/lib/ai/council";

interface SettingsDrawerProps {
    open: boolean;
    onClose: () => void;
    apiKey: string;
    onApiKeyChange: (k: string) => void;
    apiBaseUrl: string;
    onApiBaseUrlChange: (u: string) => void;
    modelTier: string;
    onModelTierChange: (t: string) => void;
    councilEnabled: boolean;
    onCouncilChange: (v: boolean) => void;
    mcpEnabled: boolean;
    onMcpChange: (v: boolean) => void;
    mode: string;
}

export function SettingsDrawer({
    open, onClose, apiKey, onApiKeyChange, apiBaseUrl, onApiBaseUrlChange, modelTier, onModelTierChange, councilEnabled, onCouncilChange, mcpEnabled, onMcpChange, mode,
}: SettingsDrawerProps) {
    const [draftKey, setDraftKey] = useState(apiKey);
    const [draftUrl, setDraftUrl] = useState(apiBaseUrl);

    useEffect(() => { setDraftKey(apiKey); }, [apiKey]);
    useEffect(() => { setDraftUrl(apiBaseUrl); }, [apiBaseUrl]);

    const saveKey = () => { onApiKeyChange(draftKey.trim()); };
    const saveUrl = () => { onApiBaseUrlChange(draftUrl.trim()); };

    return (
        <>
            {open && <div className="settings-overlay" onClick={onClose} />}
            <div className={`settings-drawer ${open ? "open" : ""}`}>
                <div className="settings-header">
                    <h3>Settings</h3>
                    <button onClick={onClose} className="settings-close">✕</button>
                </div>
                <div className="settings-body">
                    <div className="settings-section">
                        <label className="settings-label">Groq API Key</label>
                        <div className="settings-row">
                            <input
                                type="password"
                                className="settings-input"
                                placeholder="gsk_ or nvapi-..."
                                value={draftKey}
                                onChange={(e) => setDraftKey(e.target.value)}
                            />
                            <button className="settings-btn" onClick={saveKey}>Save</button>
                        </div>
                        <p className="settings-hint">
                            Get your key at{" "}
                            <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="settings-link">
                                console.groq.com
                            </a> or <a href="https://build.nvidia.com" target="_blank" rel="noreferrer" className="settings-link">build.nvidia.com</a>
                        </p>
                    </div>

                    <div className="settings-section">
                        <label className="settings-label">API Base URL (Optional)</label>
                        <div className="settings-row">
                            <input
                                type="text"
                                className="settings-input"
                                placeholder="https://api.groq.com/openai/v1"
                                value={draftUrl}
                                onChange={(e) => setDraftUrl(e.target.value)}
                            />
                            <button className="settings-btn" onClick={saveUrl}>Save</button>
                        </div>
                        <p className="settings-hint">
                            Override endpoint (e.g. <code>https://integrate.api.nvidia.com/v1</code>)
                        </p>
                    </div>

                    <div className="settings-section">
                        <label className="settings-label">Model Tier</label>
                        <div className="tier-grid">
                            {Object.values(MODEL_TIERS).map((tier) => (
                                <button
                                    key={tier.id}
                                    className={`tier-card ${modelTier === tier.id ? "active" : ""}`}
                                    onClick={() => onModelTierChange(tier.id)}
                                >
                                    <span>{tier.emoji}</span>
                                    <span className="tier-name">{tier.label}</span>
                                    <span className="tier-desc">{tier.shortName}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="settings-section">
                        <label className="settings-label">Council Mode</label>
                        <div className="settings-toggle-row">
                            <div>
                                <p className="settings-toggle-title">LLM Council</p>
                                <p className="settings-hint">3 models deliberate → chairman synthesizes</p>
                            </div>
                            <button
                                className={`toggle ${councilEnabled ? "active" : ""}`}
                                onClick={() => onCouncilChange(!councilEnabled)}
                            >
                                <span className="toggle-thumb" />
                            </button>
                        </div>
                    </div>

                    <div className="settings-section">
                        <label className="settings-label">External Knowledge (MCP)</label>
                        <div className="settings-toggle-row">
                            <div>
                                <p className="settings-toggle-title">Enable MCP Tools</p>
                                <p className="settings-hint">Connects to external servers (Requires high token limits)</p>
                            </div>
                            <button
                                className={`toggle ${mcpEnabled ? "active" : ""}`}
                                onClick={() => onMcpChange(!mcpEnabled)}
                            >
                                <span className="toggle-thumb" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
