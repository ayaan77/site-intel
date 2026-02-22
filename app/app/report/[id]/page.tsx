"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Globe, Shield, BarChart3, Zap, Brain,
    CheckCircle, AlertTriangle, XCircle, Info,
    Megaphone, RefreshCw, ExternalLink,
    TrendingUp, Share2, Search, Target
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────
interface AnalysisResult {
    id: string; url: string; analyzedAt: string; status: string; note?: string; error?: string;
    seo: any; techStack: any; competitive: any; architecture: any;
    aiSummary: string | null; aiRecommendations: any[]; competitiveSummary: string | null;
}

// ── Score Ring (Bug 8 fixed: animated from 0 on mount) ─────────────────
function ScoreRing({ score, grade }: { score: number; grade: string }) {
    const [displayed, setDisplayed] = useState(0);
    const r = 54; const c = 2 * Math.PI * r;

    useEffect(() => {
        const t = setTimeout(() => setDisplayed(score), 100);
        return () => clearTimeout(t);
    }, [score]);

    const dash = (displayed / 100) * c;
    const color = score >= 90 ? "#22d47a" : score >= 75 ? "#7bc67a" : score >= 60 ? "#ffcc00" : score >= 45 ? "#ff9940" : "#ff4d4d";

    return (
        <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="absolute w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="#2a2a3d" strokeWidth="8" />
                <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
                    strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
            </svg>
            <div className="text-center z-10">
                <div className="text-3xl font-bold leading-none" style={{ color }}>{score}</div>
                <div className="text-sm font-bold mt-1" style={{ color }}>Grade {grade}</div>
            </div>
        </div>
    );
}

// ── Mermaid Diagram (Bug 1 fixed: renders SVG, not raw text) ───────────
function MermaidDiagram({ chart }: { chart: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!chart || !ref.current) return;
        let cancelled = false;

        import("mermaid").then(({ default: mermaid }) => {
            if (cancelled) return;
            mermaid.initialize({
                startOnLoad: false,
                theme: "dark",
                themeVariables: {
                    primaryColor: "#1a1a28",
                    primaryTextColor: "#f0f0ff",
                    primaryBorderColor: "#4f7fff",
                    lineColor: "#4f7fff",
                    secondaryColor: "#12121a",
                    tertiaryColor: "#0a0a0f",
                    background: "#12121a",
                    mainBkg: "#1a1a28",
                    nodeBorder: "#4f7fff",
                    clusterBkg: "#12121a",
                    titleColor: "#f0f0ff",
                    edgeLabelBackground: "#1a1a28",
                    fontSize: "13px",
                },
                flowchart: { curve: "basis", htmlLabels: true },
            });

            const id = `mermaid-${Date.now()}`;
            mermaid.render(id, chart).then(({ svg }) => {
                if (cancelled || !ref.current) return;
                ref.current.innerHTML = svg;
                // Make SVG responsive
                const svgEl = ref.current.querySelector("svg");
                if (svgEl) {
                    svgEl.removeAttribute("height");
                    svgEl.setAttribute("width", "100%");
                }
            }).catch(() => { if (!cancelled) setError(true); });
        }).catch(() => setError(true));

        return () => { cancelled = true; };
    }, [chart]);

    if (error) {
        return (
            <pre className="text-xs p-4 rounded-xl overflow-x-auto"
                style={{ background: "var(--color-elevated)", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                {chart}
            </pre>
        );
    }

    return (
        <div ref={ref} className="w-full rounded-xl overflow-hidden p-2"
            style={{ background: "var(--color-elevated)", minHeight: "120px" }} />
    );
}

// ── Severity Icon ──────────────────────────────────────────────────────
function SeverityIcon({ severity }: { severity: string }) {
    if (severity === "critical") return <XCircle className="w-4 h-4 shrink-0" style={{ color: "var(--color-danger)" }} />;
    if (severity === "warning") return <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "var(--color-warning)" }} />;
    return <Info className="w-4 h-4 shrink-0" style={{ color: "var(--color-accent)" }} />;
}

// ── Priority Badge ─────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
    const colors: Record<string, string> = {
        critical: "#ff4d4d", high: "#ff9940", medium: "#ffcc00", low: "#22d47a"
    };
    const c = colors[priority] || "#8888aa";
    return (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
            style={{ background: c + "22", color: c, border: `1px solid ${c}44` }}>
            {priority}
        </span>
    );
}

// ── Status Pill ────────────────────────────────────────────────────────
function StatusPill({ ok, label, link }: { ok: boolean; label: string; link?: string }) {
    const content = (
        <span className="flex items-center gap-1.5 text-sm">
            {ok
                ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "var(--color-success)" }} />
                : <XCircle className="w-4 h-4 shrink-0" style={{ color: "var(--color-danger)" }} />}
            {label}
            {ok && link && <ExternalLink className="w-3 h-3 opacity-40" />}
        </span>
    );
    if (ok && link) {
        return <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">{content}</a>;
    }
    return <div>{content}</div>;
}

// ── Tech Badge ─────────────────────────────────────────────────────────
function TechBadge({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
    if (!value || value === "Unknown" || value === "None") return null;
    return (
        <div className="flex flex-col gap-1 px-4 py-3 rounded-xl border"
            style={{
                background: accent ? "rgba(79,127,255,0.08)" : "var(--color-elevated)",
                borderColor: accent ? "rgba(79,127,255,0.3)" : "var(--color-border)"
            }}>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
            <span className="font-semibold text-sm" style={{ color: accent ? "var(--color-accent)" : "var(--color-text-primary)" }}>{value}</span>
        </div>
    );
}

// ── Panel ──────────────────────────────────────────────────────────────
function Panel({ title, icon: Icon, children, accent, action }: {
    title: string; icon: any; children: React.ReactNode; accent?: string; action?: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(79,127,255,0.12)" }}>
                        <Icon className="w-4 h-4" style={{ color: accent || "var(--color-accent)" }} />
                    </div>
                    <h2 className="font-semibold text-sm tracking-wide uppercase" style={{ color: "var(--color-text-secondary)" }}>{title}</h2>
                </div>
                {action}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

// ── SEO Field Row ──────────────────────────────────────────────────────
function SEOFieldRow({ label, data }: { label: string; data: any }) {
    if (!data) return null;
    return (
        <div className="p-3 rounded-xl" style={{ background: "var(--color-elevated)" }}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
                <div className="flex items-center gap-1.5">
                    {data.length !== undefined && (
                        <span className="text-xs tabular-nums" style={{ color: "var(--color-text-secondary)" }}>{data.length} chars</span>
                    )}
                    {data.status === "good" ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} /> :
                        data.status === "warn" ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: "var(--color-warning)" }} /> :
                            data.status === "error" ? <XCircle className="w-3.5 h-3.5" style={{ color: "var(--color-danger)" }} /> : null}
                </div>
            </div>
            {data.value
                ? <p className="text-sm truncate" title={data.value}>{data.value}</p>
                : <p className="text-sm" style={{ color: "var(--color-danger)" }}>Missing</p>}
        </div>
    );
}

// ── Keyword Signal Row ─────────────────────────────────────────────────
function KeywordCheckRow({ label, ok }: { label: string; ok: boolean }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
            {ok
                ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} />
                : <XCircle className="w-3.5 h-3.5" style={{ color: "var(--color-danger)" }} />}
        </div>
    );
}

// ── Main Report Page ───────────────────────────────────────────────────
const STEPS = ["Fetching page...", "Detecting tech stack...", "Running SEO audit...", "Checking for ads...", "Finalizing report..."];

export default function ReportPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(0);
    const [reanalyzing, setReanalyzing] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        let stepTimer: NodeJS.Timeout;

        const poll = async () => {
            try {
                const res = await fetch(`/api/report/${id}`);
                const d = await res.json();
                // Settle immediately when done or errored
                if (d.status === "done" || d.status === "error") {
                    setData(d);
                    setLoading(false);
                    clearInterval(interval);
                    clearInterval(stepTimer);
                }
                // If still running, keep polling (fallback for async jobs)
            } catch { /* keep polling */ }
        };

        // Immediately fetch — report is usually already done
        poll();

        // Only start polling if the report takes longer
        stepTimer = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 2000);
        interval = setInterval(poll, 2000);

        return () => { clearInterval(interval); clearInterval(stepTimer); };
    }, [id]);

    // Bug 7 fixed: re-analyze button
    const handleReanalyze = useCallback(async () => {
        if (!data?.url || reanalyzing) return;
        setReanalyzing(true);
        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: data.url }),
            });
            const d = await res.json();
            if (d.id) router.push(`/report/${d.id}`);
        } finally {
            setReanalyzing(false);
        }
    }, [data?.url, reanalyzing, router]);

    // ── Loading ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-8">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: "rgba(79,127,255,0.15)" }} />
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
                    <div className="absolute inset-4 rounded-full border-2 border-t-purple-400 animate-spin"
                        style={{ animationDuration: "0.7s", animationDirection: "reverse" }} />
                </div>
                <div className="text-center">
                    <p className="font-semibold text-lg mb-2">Analyzing website...</p>
                    <p style={{ color: "var(--color-text-secondary)" }}>{STEPS[step]}</p>
                </div>
                <div className="flex gap-2">
                    {STEPS.map((_, i) => (
                        <div key={i} className="h-1.5 rounded-full transition-all duration-700"
                            style={{ width: i <= step ? "32px" : "8px", background: i <= step ? "var(--color-accent)" : "var(--color-elevated)" }} />
                    ))}
                </div>
            </div>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────
    if (!data || data.status === "error") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
                <XCircle className="w-16 h-16" style={{ color: "var(--color-danger)" }} />
                <h1 className="text-2xl font-bold">Analysis Failed</h1>
                <p className="text-center max-w-md" style={{ color: "var(--color-text-secondary)" }}>
                    {data?.error || "Could not analyze this URL. The site may block bots or be unavailable."}
                </p>
                <div className="flex gap-3">
                    <button onClick={() => router.push("/")}
                        className="px-6 py-3 rounded-xl font-semibold border transition-colors"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                        ← Back
                    </button>
                    {data?.url && (
                        <button onClick={handleReanalyze}
                            className="px-6 py-3 rounded-xl font-semibold transition-colors"
                            style={{ background: "var(--color-accent)", color: "white" }}>
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const { seo, techStack: tech, competitive, aiSummary, aiRecommendations, architecture, competitiveSummary } = data;
    const recommendations = seo?.recommendations?.length > 0 ? seo.recommendations : (aiRecommendations || []);

    return (
        <div className="min-h-screen pb-16">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b backdrop-blur-xl"
                style={{ background: "rgba(10,10,15,0.9)", borderColor: "var(--color-border)" }}>
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
                    <button onClick={() => router.push("/")}
                        className="flex items-center gap-2 text-sm shrink-0 transition-colors hover:text-white"
                        style={{ color: "var(--color-text-secondary)" }}>
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <div className="flex items-center gap-2 text-sm min-w-0">
                        <Globe className="w-4 h-4 shrink-0" style={{ color: "var(--color-accent)" }} />
                        <a href={data.url} target="_blank" rel="noopener noreferrer"
                            className="font-medium hover:underline truncate"
                            style={{ color: "var(--color-text-primary)" }}>
                            {data.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs hidden md:block" style={{ color: "var(--color-text-secondary)" }}>
                            {new Date(data.analyzedAt).toLocaleString()}
                        </span>
                        {/* Bug 7: Re-analyze button */}
                        <button onClick={handleReanalyze} disabled={reanalyzing}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
                            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                            <RefreshCw className={`w-3.5 h-3.5 ${reanalyzing ? "animate-spin" : ""}`} />
                            {reanalyzing ? "Running..." : "Re-analyze"}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10 space-y-6 animate-slide-up">
                {data.note && (
                    <div className="text-sm px-4 py-2.5 rounded-xl border flex items-center gap-2"
                        style={{ background: "rgba(255,204,0,0.06)", borderColor: "rgba(255,204,0,0.2)", color: "var(--color-warning)" }}>
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {data.note}
                    </div>
                )}

                {/* ── Overview Strip ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl border"
                    style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>

                    <div className="flex items-center gap-6">
                        <ScoreRing score={seo?.score ?? 0} grade={seo?.grade ?? "?"} />
                        <div>
                            <p className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>SEO Score</p>
                            <p className="text-4xl font-bold leading-none">{seo?.score ?? 0}
                                <span className="text-base font-normal" style={{ color: "var(--color-text-secondary)" }}>/100</span>
                            </p>
                            <p className="text-sm mt-2 font-medium"
                                style={{ color: (seo?.score ?? 0) >= 90 ? "var(--color-success)" : (seo?.score ?? 0) >= 60 ? "var(--color-warning)" : "var(--color-danger)" }}>
                                {(seo?.score ?? 0) >= 90 ? "🟢 Excellent" : (seo?.score ?? 0) >= 75 ? "🟡 Good" : (seo?.score ?? 0) >= 60 ? "🟠 Needs Work" : "🔴 Poor"}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col justify-center gap-2.5">
                        <StatusPill ok={seo?.httpsEnabled} label={`HTTPS ${seo?.httpsEnabled ? "enabled" : "not enabled"}`} />
                        <StatusPill ok={seo?.sitemap?.found} label={`Sitemap ${seo?.sitemap?.found ? "found" : "missing"}`} link={seo?.sitemap?.url} />
                        <StatusPill ok={seo?.robotsTxt?.found} label={`robots.txt ${seo?.robotsTxt?.found ? "found" : "missing"}`} link={seo?.robotsTxt?.url} />
                        <StatusPill ok={seo?.structuredData?.present} label={`Structured data ${seo?.structuredData?.present ? "found" : "missing"}`} />
                    </div>

                    <div className="flex flex-col justify-center gap-2">
                        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Framework</p>
                        <p className="text-xl font-bold" style={{ color: "var(--color-accent)" }}>{tech?.framework || "Unknown"}</p>
                        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                            {tech?.hosting !== "Unknown" ? `Hosted on ${tech?.hosting}` : "Hosting unknown"}
                            {tech?.cdn && tech?.cdn !== "None" ? ` · ${tech?.cdn} CDN` : ""}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                            {architecture?.type && `${architecture.type}`}
                        </p>
                    </div>
                </div>

                {/* ── 2-Column Grid ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* SEO Panel */}
                    <Panel title="SEO Audit" icon={BarChart3}>
                        <div className="space-y-3">
                            <SEOFieldRow label="Page Title" data={seo?.title} />
                            <SEOFieldRow label="Meta Description" data={seo?.metaDescription} />

                            {/* Stats row */}
                            <div className="grid grid-cols-4 gap-2 text-center">
                                {[
                                    { label: "H1", val: seo?.headings?.h1Count ?? 0, warn: seo?.headings?.h1Count !== 1 },
                                    { label: "H2", val: seo?.headings?.h2Count ?? 0 },
                                    { label: "Images", val: seo?.images?.total ?? 0 },
                                    { label: "No Alt", val: seo?.images?.missingAlt ?? 0, warn: (seo?.images?.missingAlt ?? 0) > 0 },
                                ].map(({ label, val, warn }) => (
                                    <div key={label} className="p-2.5 rounded-xl" style={{ background: "var(--color-elevated)" }}>
                                        <div className="text-xl font-bold" style={{ color: warn ? "var(--color-warning)" : "var(--color-text-primary)" }}>{val}</div>
                                        <div className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* H1 text */}
                            {seo?.headings?.h1Text && seo.headings.h1Text !== "Missing" && (
                                <div className="p-3 rounded-xl" style={{ background: "var(--color-elevated)" }}>
                                    <span className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>H1 Text</span>
                                    <p className="text-sm font-medium">{seo.headings.h1Text}</p>
                                </div>
                            )}

                            {/* Keyword Signals */}
                            {seo?.keywordSignals?.primaryKeyword && (
                                <div className="p-3 rounded-xl" style={{ background: "var(--color-elevated)" }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Search className="w-3.5 h-3.5" style={{ color: "var(--color-accent)" }} />
                                        <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Keyword Signals</span>
                                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(79,127,255,0.15)", color: "var(--color-accent)" }}>
                                            {seo.keywordSignals.primaryKeyword}
                                        </span>
                                    </div>
                                    <KeywordCheckRow label="Keyword in Title" ok={!!seo.keywordSignals.keywordInTitle} />
                                    <KeywordCheckRow label="Keyword in Meta Description" ok={!!seo.keywordSignals.keywordInMeta} />
                                    <KeywordCheckRow label="Keyword in H1" ok={!!seo.keywordSignals.keywordInH1} />
                                </div>
                            )}

                            {/* Content Quality */}
                            {seo?.contentQuality && (
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: "Word Count", val: seo.contentQuality.wordCount ?? "—" },
                                        { label: "Readability", val: seo.contentQuality.readabilityScore ?? "—" },
                                        { label: "Has CTA", val: seo.contentQuality.hasCallToAction ? "Yes ✓" : "No ✗" },
                                    ].map(({ label, val }) => (
                                        <div key={label} className="p-2.5 rounded-xl text-center" style={{ background: "var(--color-elevated)" }}>
                                            <div className="text-sm font-bold">{String(val)}</div>
                                            <div className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Technical checks */}
                            <div className="space-y-1.5">
                                <StatusPill ok={!!seo?.canonicalTag?.present} label={`Canonical ${seo?.canonicalTag?.present ? "set" : "missing"}`} link={seo?.canonicalTag?.url} />
                                <StatusPill ok={!!seo?.structuredData?.present} label={`Structured data${seo?.structuredData?.present ? ` (${(seo.structuredData.types || []).join(", ") || "present"})` : " missing"}`} />
                                <StatusPill ok={!!seo?.httpsEnabled} label={`HTTPS ${seo?.httpsEnabled ? "enabled" : "not enabled"}`} />
                                <StatusPill ok={!!seo?.sitemap?.found} label={`Sitemap ${seo?.sitemap?.found ? "found" : "missing"}`} link={seo?.sitemap?.url} />
                                <StatusPill ok={!!seo?.robotsTxt?.found} label={`robots.txt ${seo?.robotsTxt?.found ? "found" : "missing"}`} link={seo?.robotsTxt?.url} />
                            </div>

                            {/* Open Graph */}
                            <div className="p-3 rounded-xl" style={{ background: "var(--color-elevated)" }}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                                        <Share2 className="w-3.5 h-3.5" /> Open Graph / Social
                                    </div>
                                    {seo?.openGraph?.complete
                                        ? <span className="text-xs" style={{ color: "var(--color-success)" }}>Complete ✓</span>
                                        : <span className="text-xs" style={{ color: "var(--color-warning)" }}>Incomplete</span>}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { key: "og:title", ok: !!seo?.openGraph?.title },
                                        { key: "og:description", ok: !!seo?.openGraph?.description },
                                        { key: "og:image", ok: !!seo?.openGraph?.image },
                                        { key: "twitter:card", ok: !!seo?.openGraph?.twitterCard },
                                    ].map(({ key, ok }) => (
                                        <span key={key} className="text-xs px-2 py-1 rounded-md"
                                            style={{ background: ok ? "rgba(34,212,122,0.1)" : "rgba(255,77,77,0.1)", color: ok ? "var(--color-success)" : "var(--color-danger)" }}>
                                            {ok ? "✓" : "✗"} {key}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Issues */}
                            {seo?.issues?.slice(0, 6).map((issue: any, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--color-elevated)" }}>
                                    <SeverityIcon severity={issue.severity} />
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold">{issue.check}</div>
                                        <div className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{issue.detail}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    {/* Tech Stack Panel */}
                    <Panel title="Tech Stack" icon={Zap}>
                        <div className="grid grid-cols-2 gap-3">
                            <TechBadge label="Framework" value={tech?.framework} accent />
                            <TechBadge label="CMS" value={tech?.cms} />
                            <TechBadge label="Hosting" value={tech?.hosting} />
                            <TechBadge label="CDN" value={tech?.cdn} />
                            <TechBadge label="Server" value={tech?.server} />
                            <TechBadge label="Language" value={tech?.language} />
                        </div>

                        {tech?.analytics?.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>Analytics Tools</p>
                                <div className="flex flex-wrap gap-2">
                                    {tech.analytics.map((a: string) => (
                                        <span key={a} className="text-xs px-3 py-1.5 rounded-full border"
                                            style={{ borderColor: "rgba(34,212,122,0.3)", color: "var(--color-success)", background: "rgba(34,212,122,0.06)" }}>
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {tech?.libraries?.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>Libraries detected</p>
                                <div className="flex flex-wrap gap-2">
                                    {tech.libraries.map((lib: string) => (
                                        <span key={lib} className="text-xs px-3 py-1.5 rounded-full border"
                                            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                                            {lib}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 p-3 rounded-xl border" style={{ background: "var(--color-elevated)", borderColor: "var(--color-border)" }}>
                            <div className="flex justify-between text-xs mb-2">
                                <span style={{ color: "var(--color-text-secondary)" }}>Detection confidence</span>
                                <span className="font-bold">{tech?.confidence ?? 0}%</span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                                <div className="h-2 rounded-full transition-all duration-700"
                                    style={{ width: `${tech?.confidence ?? 0}%`, background: "var(--color-accent)" }} />
                            </div>
                        </div>

                        {architecture?.type && (
                            <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(79,127,255,0.08)" }}>
                                <p className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>Architecture</p>
                                <p className="font-semibold text-sm" style={{ color: "var(--color-accent)" }}>{architecture.type}</p>
                                {architecture?.renderingMode && (
                                    <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>Rendering: {architecture.renderingMode}</p>
                                )}
                            </div>
                        )}
                    </Panel>

                    {/* Meta Ads Library Panel */}
                    <Panel title="Meta Ads Library" icon={Target} accent="#e040fb">
                        <div className="space-y-4">
                            {/* Active ads status */}
                            <div className="flex items-center gap-4 p-4 rounded-xl"
                                style={{
                                    background: competitive?.metaAdsActive ? "rgba(224,64,251,0.08)" : "rgba(34,212,122,0.06)",
                                    border: `1px solid ${competitive?.metaAdsActive ? "rgba(224,64,251,0.2)" : "rgba(34,212,122,0.15)"}`
                                }}>
                                <span className="text-3xl">{competitive?.metaAdsActive ? "📣" : "🔇"}</span>
                                <div>
                                    <div className="font-bold text-base">
                                        {competitive?.metaAdsActive ? "Active Meta Ads Found" : "No Active Meta Ads"}
                                    </div>
                                    <div className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                                        {competitive?.metaAdsActive
                                            ? `~${competitive?.metaAdsCount ?? "?"} active creatives on Facebook & Instagram`
                                            : "No active Facebook or Instagram ad campaigns detected"}
                                    </div>
                                </div>
                            </div>

                            {/* Sample ad creatives */}
                            {competitive?.metaAdsSample?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>Sample Ad Creatives</p>
                                    <div className="space-y-2">
                                        {competitive.metaAdsSample.map((ad: string, i: number) => (
                                            <div key={i} className="p-3 rounded-xl text-xs leading-relaxed border"
                                                style={{ background: "var(--color-elevated)", borderColor: "rgba(224,64,251,0.15)" }}>
                                                <span className="font-bold mr-2" style={{ color: "#e040fb" }}>Ad {i + 1}</span>{ad}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tracking pixels */}
                            {competitive?.trackingPixels?.length > 0 && (
                                <div>
                                    <p className="text-xs mb-2 font-medium" style={{ color: "var(--color-text-secondary)" }}>Tracking & Analytics ({competitive.trackingPixels.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                        {competitive.trackingPixels.map((n: string) => (
                                            <span key={n} className="text-xs px-3 py-1.5 rounded-full"
                                                style={{ background: "rgba(167,139,250,0.12)", color: "var(--color-purple)", border: "1px solid rgba(167,139,250,0.2)" }}>
                                                {n}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {competitive?.gtmNote && (
                                <div className="p-3 rounded-xl border"
                                    style={{ background: "rgba(255,204,0,0.06)", borderColor: "rgba(255,204,0,0.2)" }}>
                                    <p className="text-xs" style={{ color: "var(--color-warning)" }}>⚡ {competitive.gtmNote}</p>
                                </div>
                            )}

                            {competitiveSummary && (
                                <div className="p-3 rounded-xl" style={{ background: "var(--color-elevated)" }}>
                                    <p className="text-xs mb-1 font-medium" style={{ color: "var(--color-text-secondary)" }}>Intelligence Summary</p>
                                    <p className="text-sm leading-relaxed">{competitiveSummary}</p>
                                </div>
                            )}

                            {/* Ads running detection */}
                            {competitive?.adsRunning && competitive?.adNetworks?.length > 0 && (
                                <div className="p-3 rounded-xl" style={{ background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.15)" }}>
                                    <p className="text-xs mb-2 font-medium" style={{ color: "var(--color-danger)" }}>Display Ad Networks</p>
                                    <div className="flex flex-wrap gap-2">
                                        {competitive.adNetworks.map((n: string) => (
                                            <span key={n} className="text-xs px-2 py-1 rounded-md" style={{ background: "rgba(255,77,77,0.1)", color: "var(--color-danger)" }}>{n}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Traffic estimate */}
                            <div className="p-3 rounded-xl" style={{ background: "var(--color-elevated)" }}>
                                <p className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>Est. Monthly Traffic</p>
                                <p className="font-bold text-lg">
                                    {competitive?.estimatedMonthlyTraffic ?? <span style={{ color: "var(--color-text-secondary)" }}>—</span>}
                                </p>
                                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{competitive?.trafficSource}</p>
                            </div>
                        </div>
                    </Panel>

                    {/* Bug 2 fixed: AI Panel — shows competitive summary + quick wins when no AI key */}
                    <Panel title="AI Analysis" icon={Brain} accent="var(--color-purple)">
                        {aiSummary ? (
                            <p className="text-sm leading-relaxed">{aiSummary}</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 rounded-xl border"
                                    style={{ background: "rgba(167,139,250,0.06)", borderColor: "rgba(167,139,250,0.2)" }}>
                                    <p className="text-xs font-medium mb-1" style={{ color: "var(--color-purple)" }}>
                                        🤖 AI Summary
                                    </p>
                                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                                        Add your <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--color-elevated)" }}>GROQ_API_KEY</code> to <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--color-elevated)" }}>.env.local</code> to enable AI-generated summaries and recommendations.
                                    </p>
                                </div>

                                {/* Quick Wins — available even without AI */}
                                {seo?.issues?.filter((i: any) => i.severity === "critical").length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                                            ⚡ Quick Wins (no AI needed)
                                        </p>
                                        <div className="space-y-2">
                                            {seo.issues.filter((i: any) => i.severity === "critical").slice(0, 3).map((issue: any, idx: number) => (
                                                <div key={idx} className="p-3 rounded-xl flex items-start gap-2"
                                                    style={{ background: "var(--color-elevated)" }}>
                                                    <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--color-danger)" }} />
                                                    <div>
                                                        <p className="text-xs font-medium">{issue.check}</p>
                                                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>💡 {issue.fix}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Panel>
                </div>

                {/* Bug 5 fixed: Recommendations with specific fix text */}
                {recommendations?.length > 0 && (
                    <Panel title={`Recommendations (${recommendations.length})`} icon={CheckCircle}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {recommendations.map((rec: any, i: number) => (
                                <div key={i} className="p-4 rounded-xl border"
                                    style={{ background: "var(--color-elevated)", borderColor: "var(--color-border)" }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <PriorityBadge priority={rec.priority} />
                                        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{rec.category}</span>
                                    </div>
                                    <p className="text-sm font-medium mb-1">{rec.issue}</p>
                                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                                        💡 {rec.fix}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Panel>
                )}

                {/* Bug 1 fixed: Architecture Diagram with Mermaid rendering */}
                {architecture?.diagram && (
                    <Panel title="Architecture Diagram" icon={Zap}>
                        <MermaidDiagram chart={architecture.diagram} />
                        <p className="text-xs mt-3" style={{ color: "var(--color-text-secondary)" }}>
                            Flow detected: {architecture.type} · Rendered with Mermaid.js
                        </p>
                    </Panel>
                )}
            </main>
        </div>
    );
}
