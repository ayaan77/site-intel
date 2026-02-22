"use client";

import { useState } from "react";
import { marked } from "marked";

interface SpecViewerProps {
    spec: string;
    onClose: () => void;
}

export function SpecViewer({ spec, onClose }: SpecViewerProps) {
    const [copied, setCopied] = useState(false);

    const copyMd = () => {
        navigator.clipboard.writeText(spec);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadMd = () => {
        const blob = new Blob([spec], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "architecture-spec.md";
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadHtml = () => {
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Architecture Spec</title><style>body{font-family:sans-serif;max-width:900px;margin:0 auto;padding:40px;line-height:1.6}pre{background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:8px;overflow:auto}code{font-family:monospace}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}</style></head><body>${marked(spec)}</body></html>`;
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "architecture-spec.html";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="spec-overlay">
            <div className="spec-modal">
                <div className="spec-header">
                    <h2>📋 Architecture Spec</h2>
                    <div className="spec-actions">
                        <button className="spec-btn" onClick={copyMd}>{copied ? "✓ Copied" : "⎘ Copy MD"}</button>
                        <button className="spec-btn" onClick={downloadMd}>⬇ Download MD</button>
                        <button className="spec-btn spec-btn-primary" onClick={downloadHtml}>⬇ Download HTML</button>
                        <button className="spec-btn spec-close" onClick={onClose}>✕</button>
                    </div>
                </div>
                <div
                    className="spec-body prose"
                    dangerouslySetInnerHTML={{ __html: marked(spec) as string }}
                />
            </div>
        </div>
    );
}
