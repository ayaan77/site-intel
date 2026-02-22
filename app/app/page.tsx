"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowUpIcon,
  BarChart3,
  Zap,
  Globe,
  Shield,
  Sparkles,
  Code2,
  TrendingUp,
  Search,
  ExternalLink,
  Paperclip,
  ArrowRight,
} from "lucide-react";

// ── Auto-resize textarea hook ───────────────────────────────────────────
function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjust = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = `${minHeight}px`;
    const h = Math.max(minHeight, Math.min(el.scrollHeight, maxHeight ?? Infinity));
    el.style.height = `${h}px`;
  }, [minHeight, maxHeight]);

  useEffect(() => {
    if (ref.current) ref.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { ref, adjust };
}

// ── Quick actions ───────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: BarChart3, label: "SEO Audit", url: "https://vercel.com" },
  { icon: Zap, label: "Tech Stack", url: "https://stripe.com" },
  { icon: Globe, label: "Architecture", url: "https://notion.so" },
  { icon: Shield, label: "Ads & Tracking", url: "https://shopify.com" },
  { icon: Code2, label: "Competitive Intel", url: "https://linear.app" },
  { icon: TrendingUp, label: "Growth Signals", url: "https://figma.com" },
  { icon: Search, label: "SERP Check", url: "https://github.com" },
  { icon: ExternalLink, label: "Full Report", url: "https://tailwindcss.com" },
];

const EXAMPLES = ["vercel.com", "stripe.com", "notion.so", "shopify.com"];

// ── Analysis steps shown while server scrapes ───────────────────────────
const ANALYSIS_STEPS = [
  { icon: "🔍", label: "Fetching page content...", detail: "Launching headless browser" },
  { icon: "🧬", label: "Detecting tech stack...", detail: "Identifying frameworks & CDN" },
  { icon: "📊", label: "Running SEO audit...", detail: "Checking metadata, headings & images" },
  { icon: "🎯", label: "Scanning for ads & trackers...", detail: "Identifying pixel integrations" },
  { icon: "🤖", label: "Running AI analysis...", detail: "Groq LLM generating intelligence report" },
  { icon: "✅", label: "Finalizing report...", detail: "Saving results to database" },
];

// ── Main Page ───────────────────────────────────────────────────────────
export default function HomePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzingUrl, setAnalyzingUrl] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const router = useRouter();
  const { ref: textareaRef, adjust } = useAutoResizeTextarea({ minHeight: 56, maxHeight: 160 });

  // Cycle through steps while waiting for the real server response
  useEffect(() => {
    if (!loading) { setStep(0); return; }
    const t = setInterval(() => setStep(s => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 1800);
    return () => clearInterval(t);
  }, [loading]);

  const runAnalysis = useCallback(async (rawUrl: string) => {
    let input = rawUrl.trim();
    if (!input) return;
    if (!input.startsWith("http")) input = "https://" + input;

    try { new URL(input); } catch {
      setError("Enter a valid URL — e.g. https://example.com");
      return;
    }

    setError("");
    setAnalyzingUrl(input);
    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/report/${data.id}`);
      } else {
        setError(data.error || "Analysis failed. Try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Is the server running?");
      setLoading(false);
    }
  }, [router]);

  const handleSubmit = useCallback(() => {
    if (!loading) runAnalysis(url);
  }, [url, loading, runAnalysis]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }, [handleSubmit]);

  const canSubmit = url.trim().length > 0 && !loading;

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center overflow-hidden selection:bg-indigo-500/30">

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[100px] animate-blob animation-delay-4000" />
      </div>

      {/* ── Full-screen Analysis Loading Overlay ─────────────────────── */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 px-4"
          style={{ background: "rgba(5, 5, 12, 0.97)", backdropFilter: "blur(20px)" }}>

          {/* Triple spinning rings */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full"
              style={{ border: "2px solid rgba(99,102,241,0.1)" }} />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
            <div className="absolute inset-3 rounded-full border border-transparent border-t-purple-400 animate-spin"
              style={{ animationDuration: "0.7s", animationDirection: "reverse" }} />
            <div className="absolute inset-6 rounded-full border border-transparent border-t-blue-300 animate-spin"
              style={{ animationDuration: "1.5s" }} />
            <span className="text-2xl z-10">{ANALYSIS_STEPS[step]?.icon}</span>
          </div>

          {/* URL being analyzed */}
          <div className="text-center max-w-xl">
            <p className="text-xs uppercase tracking-widest text-indigo-400/60 mb-2 font-medium">Analyzing</p>
            <p className="text-white font-semibold text-lg truncate" style={{ maxWidth: "460px" }}>
              {analyzingUrl.replace(/^https?:\/\//, "")}
            </p>
          </div>

          {/* Current step label */}
          <div className="text-center">
            <p className="text-white font-semibold text-lg mb-1 transition-all duration-500">
              {ANALYSIS_STEPS[step]?.label}
            </p>
            <p className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
              {ANALYSIS_STEPS[step]?.detail}
            </p>
          </div>

          {/* Step progress pill indicators */}
          <div className="flex items-center gap-3">
            {ANALYSIS_STEPS.map((_, i) => (
              <div key={i} className="relative flex items-center justify-center">
                <div className="rounded-full transition-all duration-500"
                  style={{
                    width: i === step ? "36px" : i < step ? "24px" : "8px",
                    height: "8px",
                    background: i < step ? "rgba(99,102,241,0.6)" : i === step ? "#6366f1" : "rgba(255,255,255,0.1)"
                  }} />
                {i === step && (
                  <div className="absolute inset-0 rounded-full bg-indigo-500 opacity-40 animate-ping" />
                )}
              </div>
            ))}
          </div>

          <p className="text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>
            This usually takes 5–15 seconds
          </p>
        </div>
      )}

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center px-4 pb-8 max-w-5xl mx-auto">

        {/* Logo */}
        <div className="flex flex-col items-center mb-12 text-center animate-fade-in opacity-0" style={{ animationFillMode: "forwards" }}>
          <div className="relative group mb-6">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center bg-slate-900 border border-indigo-500/20 shadow-2xl">
              <Sparkles className="w-10 h-10 text-indigo-400" />
            </div>
          </div>

          <h1 className="font-bold tracking-tight mb-4 text-5xl sm:text-6xl md:text-7xl">
            <span className="text-white drop-shadow-sm">Site</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 text-glow">Intel</span>
          </h1>

          <p className="text-slate-400 max-w-xl text-lg sm:text-xl leading-relaxed font-light">
            Paste any URL. Get a full AI report <span className="text-indigo-400/50">—</span> SEO, tech stack,
            ads, architecture, and competitor signals.
          </p>
        </div>

        {/* ── Input box ─────────────────────────────────────────────── */}
        <div className="w-full max-w-3xl animate-slide-up opacity-0" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
          <div className="glass p-1.5 rounded-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500/50">
            <div className="relative flex flex-col bg-slate-950/50 rounded-xl overflow-hidden">

              {/* Textarea row */}
              <div className="relative flex items-start">
                <div className="absolute left-4 top-5 pointer-events-none">
                  <Globe className="w-5 h-5 text-indigo-400/50" />
                </div>

                <textarea
                  ref={textareaRef}
                  value={url}
                  rows={1}
                  onChange={(e) => { setUrl(e.target.value); setError(""); adjust(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Paste any website URL — https://yoursite.com"
                  disabled={loading}
                  className="w-full bg-transparent text-white placeholder-slate-500 outline-none resize-none py-4 pl-12 pr-4 min-h-[56px] leading-6 font-medium"
                />
              </div>

              {/* Footer row */}
              <div className="flex items-center justify-between px-3 pb-3 pt-2 bg-slate-950/30 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <button
                    disabled
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-not-allowed"
                    title="Attach file (coming soon)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-500 hidden sm:inline-block">
                    <span className="font-medium text-slate-400">Enter</span> to analyze
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {error && (
                    <span className="text-rose-400 text-xs font-medium animate-pulse">
                      {error}
                    </span>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                      canSubmit
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transform hover:-translate-y-0.5"
                        : "bg-white/5 text-slate-500 cursor-not-allowed"
                    )}
                  >
                    <ArrowUpIcon className="w-4 h-4" />
                    <span>Analyze</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-3 w-full max-w-4xl mt-10 animate-fade-in opacity-0" style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}>
          <div className="flex flex-wrap justify-center gap-3">
            {QUICK_ACTIONS.map(({ icon: Icon, label, url: actionUrl }) => (
              <button
                key={label}
                onClick={() => { setUrl(actionUrl); runAnalysis(actionUrl); }}
                className="group flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 hover:border-indigo-500/30 text-slate-400 hover:text-white transition-all duration-200"
              >
                <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Example pills ─────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center items-center gap-2 mt-8 animate-fade-in opacity-0" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
          <span className="text-xs text-slate-500 font-medium">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setUrl(`https://${ex}`)}
              className="px-3 py-1 rounded-full border border-white/5 bg-white/5 text-slate-500 text-[10px] hover:text-indigo-300 hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-all duration-200 cursor-pointer"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* ── AI Architect CTA ──────────────────────────────────────── */}
        <div className="mt-16 animate-fade-in opacity-0" style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}>
          <Link href="/chat" className="group relative inline-flex items-center gap-3 px-8 py-4 bg-slate-900 border border-indigo-500/30 rounded-2xl hover:bg-slate-800 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative p-2 bg-indigo-500/20 rounded-lg group-hover:bg-indigo-500/30 transition-colors">
              <span className="text-2xl">🤖</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-indigo-300 group-hover:text-indigo-200">Unified AI Assistant</div>
              <div className="text-lg font-bold text-white">Meet AngleTalk</div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors ml-2" />
          </Link>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full text-center py-6 border-t border-white/5 text-slate-600 text-xs">
        <p>SiteIntel · AI-powered website intelligence · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
