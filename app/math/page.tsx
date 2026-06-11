"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MathBlock, MathInline, MathText } from "../components/MathRender";

// SSR-safe MathLive import — only loads on the client
const DynamicMathField = dynamic(() => import("../components/MathField"), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 min-h-[64px] flex items-center text-slate-500 font-mono animate-pulse">
      Loading math editor...
    </div>
  ),
});

interface MF {
  insert: (latex: string, options?: Record<string, unknown>) => void;
  focus: () => void;
  value: string;
}

interface Step {
  step: number;
  title: string;
  content: string;
  math: string;
}

interface Solution {
  expression_latex: string;
  operation: string;
  steps?: Step[];
  result: string;
  verification?: string;
  model_used?: string;
  solve_seconds?: number;
}

interface HistoryItem {
  expr: string;
  op: string;
  opId?: string;
  mode?: string;
  result: string;
  solution?: Solution;
}

const HISTORY_KEY = "learnix-math-history-v2";

const OPERATIONS = [
  { id: "solve", label: "Solve", icon: "🔍", desc: "Find the value of unknowns" },
  { id: "simplify", label: "Simplify", icon: "✨", desc: "Reduce to simplest form" },
  { id: "factor", label: "Factor", icon: "🧩", desc: "Break into factors" },
  { id: "expand", label: "Expand", icon: "📐", desc: "Multiply out brackets" },
  { id: "differentiate", label: "Differentiate", icon: "📈", desc: "Find the derivative" },
  { id: "integrate", label: "Integrate", icon: "📊", desc: "Find the antiderivative" },
  { id: "evaluate", label: "Evaluate", icon: "🔢", desc: "Calculate the numerical value" },
];

const MODES = [
  { id: "quick", label: "Just Answer", icon: "🎯", desc: "Only the final answer", accent: "rose" },
  { id: "answer", label: "Answer", icon: "⚡", desc: "Answer with key steps", accent: "amber" },
  { id: "explain", label: "Explain", icon: "📝", desc: "Full step-by-step breakdown", accent: "emerald" },
];

const MATH_CONTROLS = [
  // Structures
  { label: "x²", latex: "^{2}", title: "Square", group: "struct" },
  { label: "xⁿ", latex: "^{#0}", title: "Exponent", group: "struct" },
  { label: "a/b", latex: "\\frac{#0}{#?}", title: "Fraction", group: "struct" },
  { label: "√", latex: "\\sqrt{#0}", title: "Square root", group: "struct" },
  { label: "∛", latex: "\\sqrt[3]{#0}", title: "Cube root", group: "struct" },
  { label: "()", latex: "\\left(#0\\right)", title: "Parentheses", group: "struct" },
  { label: "||", latex: "\\left|#0\\right|", title: "Absolute value", group: "struct" },
  // Operators & symbols
  { label: "×", latex: "\\times ", title: "Multiply", group: "op" },
  { label: "÷", latex: "\\div ", title: "Divide", group: "op" },
  { label: "±", latex: "\\pm ", title: "Plus/minus", group: "op" },
  { label: "π", latex: "\\pi ", title: "Pi", group: "op" },
  { label: "∞", latex: "\\infty ", title: "Infinity", group: "op" },
  { label: "θ", latex: "\\theta ", title: "Theta", group: "op" },
  // Functions
  { label: "sin", latex: "\\sin\\left(#0\\right)", title: "Sine", group: "fn" },
  { label: "cos", latex: "\\cos\\left(#0\\right)", title: "Cosine", group: "fn" },
  { label: "tan", latex: "\\tan\\left(#0\\right)", title: "Tangent", group: "fn" },
  { label: "log", latex: "\\log\\left(#0\\right)", title: "Logarithm", group: "fn" },
  { label: "ln", latex: "\\ln\\left(#0\\right)", title: "Natural log", group: "fn" },
  { label: "∫", latex: "\\int #0\\,dx", title: "Integral", group: "fn" },
  { label: "d/dx", latex: "\\frac{d}{dx}\\left(#0\\right)", title: "Derivative", group: "fn" },
  // Comparisons
  { label: "≤", latex: "\\le ", title: "Less than or equal", group: "cmp" },
  { label: "≥", latex: "\\ge ", title: "Greater than or equal", group: "cmp" },
  { label: "≠", latex: "\\ne ", title: "Not equal", group: "cmp" },
];

const EXAMPLES = [
  "x^{2}+5x+6=0",
  "3x+7=22",
  "\\sin\\left(\\frac{\\pi}{4}\\right)",
  "\\frac{d}{dx}\\left(x^{3}+2x\\right)",
  "\\left(2x+3\\right)\\left(x-5\\right)",
  "\\int 2x\\,dx",
  "x^{2}-9",
  "\\lim_{x\\to 0}\\frac{\\sin\\left(x\\right)}{x}",
];

export default function MathSolver() {
  const [expression, setExpression] = useState("");
  const [operation, setOperation] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mathFieldEl, setMathFieldEl] = useState<MF | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const extractingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const s = localStorage.getItem("learnix-theme") || "dark";
    document.documentElement.classList.toggle("dark", s === "dark");
  }, []);

  useEffect(() => {
    // Deferred so the stored history hydrates without mismatching the static HTML
    const t = setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        if (Array.isArray(stored) && stored.length) setHistory(stored);
      } catch { /* corrupt history — start fresh */ }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const i = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(i);
  }, [loading]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") || extractingRef.current) return;
    extractingRef.current = true;
    setExtracting(true);
    setError("");
    setImagePreview(null);

    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });

      // Downscale large photos client-side — faster upload, avoids body size limits
      const base64 = await new Promise<string>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 1600;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          if (scale >= 1 && file.size <= 500_000) { resolve(dataUrl); return; }
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(dataUrl); return; }
          ctx.fillStyle = "#ffffff"; // transparent PNGs would otherwise turn black as JPEG
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });

      setImagePreview(base64);

      const res = await fetch("/api/math/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to extract math");

      setExpression(data.latex);
      setSolution(null);
      setOperation(null);
      setMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract math from image");
    } finally {
      extractingRef.current = false;
      setExtracting(false);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  // Paste a screenshot anywhere on the page
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith("image/"));
      if (item) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleImageUpload(file);
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleImageUpload]);

  function insertMath(latex: string) {
    mathFieldEl?.insert(latex, { focus: true });
  }

  function handleExpressionChange(latex: string) {
    setExpression(latex);
    setSolution(null);
    setOperation(null);
    setMode(null);
  }

  function selectOperation(opId: string) {
    if (!expression.trim()) return;
    setOperation(opId);
    setMode(null);
  }

  function selectMode(m: string) {
    if (!operation) return;
    setMode(m);
    handleSolve(operation, m);
  }

  async function handleSolve(opId: string, solveMode: string) {
    if (!expression.trim()) return;
    setElapsed(0);
    setLoading(true);
    setError("");
    setSolution(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const opLabel = OPERATIONS.find(o => o.id === opId)?.label || opId;
      const res = await fetch("/api/math", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: expression.trim(), operation: opLabel, mode: solveMode }),
        signal: controller.signal,
      });

      let data;
      try { data = await res.json(); } catch {
        throw new Error("The AI returned an invalid response. Please try again.");
      }
      if (!res.ok) throw new Error(data?.error || "Failed to solve");

      setSolution(data);
      const item: HistoryItem = {
        expr: expression.trim(),
        op: opLabel,
        opId,
        mode: solveMode,
        result: data.result || "",
        solution: data,
      };
      setHistory(prev => {
        const u = [item, ...prev.filter(h => h.expr !== item.expr || h.op !== item.op)].slice(0, 30);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(u));
        return u;
      });

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setMode(null); // back to the detail-level choice
        return;
      }
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("limit") || msg.toLowerCase().includes("429")) {
        setError("Rate limited — too many requests. Please wait a minute and try again.");
      } else { setError(msg); }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  function handleNewProblem() {
    setExpression("");
    setOperation(null);
    setMode(null);
    setSolution(null);
    setError("");
    setImagePreview(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => mathFieldEl?.focus(), 100);
  }

  function loadExpression(latex: string) {
    setExpression(latex);
    setOperation(null);
    setMode(null);
    setSolution(null);
    setError("");
    setTimeout(() => mathFieldEl?.focus(), 50);
  }

  function loadHistoryItem(item: HistoryItem) {
    setError("");
    setExpression(item.expr);
    if (item.solution) {
      // Restore the saved solution instantly — no API call needed
      setSolution(item.solution);
      setOperation(item.opId || null);
      setMode(item.mode || "answer");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } else {
      setSolution(null);
      setOperation(null);
      setMode(null);
      setTimeout(() => mathFieldEl?.focus(), 50);
    }
  }

  function deleteHistoryItem(index: number) {
    setHistory(prev => {
      const u = prev.filter((_, i) => i !== index);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(u));
      return u;
    });
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  async function copyResult() {
    if (!solution?.result) return;
    try {
      await navigator.clipboard.writeText(solution.result);
    } catch {
      // Fallback for non-secure contexts / older browsers
      const ta = document.createElement("textarea");
      ta.value = solution.result;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* give up silently */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  }

  const showOperations = expression.trim().length > 0 && !operation && !loading && !solution;
  const showModeChoice = operation && !mode && !loading && !solution;

  const modeButtonClasses: Record<string, string> = {
    rose: "hover:border-rose-500/30 hover:bg-rose-500/5",
    amber: "hover:border-amber-500/30 hover:bg-amber-500/5",
    emerald: "hover:border-emerald-500/30 hover:bg-emerald-500/5",
  };
  const modeLabelClasses: Record<string, string> = {
    rose: "group-hover:text-rose-300",
    amber: "group-hover:text-amber-300",
    emerald: "group-hover:text-emerald-300",
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a1a] text-slate-800 dark:text-slate-200 transition-colors duration-300 relative flex flex-col">
      <div className="mesh-bg"><div className="orb-3" /></div>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 w-full">

        {/* Back to Home */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Home
          </Link>
        </div>

        {/* Hero — only when no solution */}
        {!solution && !loading && (
          <div className="text-center mb-10 animate-fadeInUp">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <span className="text-3xl">🧮</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Math Solver</h2>
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-lg mx-auto">
              Type a math expression, upload a screenshot, or paste an image — then choose what to do with it.
            </p>
          </div>
        )}

        {/* Input Area */}
        {!loading && (
          <div
            className={`glass-strong rounded-2xl p-5 sm:p-6 mb-6 animate-fadeInUp transition-colors ${dragging ? "border-emerald-500/50 bg-emerald-500/5" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >

            {/* Math Controls — grouped */}
            <div className="flex flex-wrap items-center gap-1 mb-4">
              {MATH_CONTROLS.map((ctrl, i) => {
                const prev = i > 0 ? MATH_CONTROLS[i - 1] : null;
                const showSep = prev && prev.group !== ctrl.group;
                return (
                  <span key={ctrl.label} className="contents">
                    {showSep && <span className="w-px h-5 bg-white/10 mx-1 hidden sm:inline-block" />}
                    <button
                      type="button"
                      onClick={() => insertMath(ctrl.latex)}
                      title={ctrl.title}
                      aria-label={`Insert ${ctrl.title}`}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/30 transition-all active:scale-95"
                    >
                      {ctrl.label}
                    </button>
                  </span>
                );
              })}
            </div>

            {/* Expression Input — MathLive WYSIWYG */}
            <div className="relative">
              <DynamicMathField
                value={expression}
                onChange={handleExpressionChange}
                placeholder="Type a math expression, e.g.  x² + 5x + 6 = 0"
                onReady={(mf: MF) => setMathFieldEl(mf)}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={extracting}
                title="Upload a photo or screenshot of a math problem"
                aria-label="Upload a photo or screenshot of a math problem"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-50"
              >
                {extracting ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-500 mt-2">
              📷 Tip: drag &amp; drop or paste (Ctrl+V) a screenshot of a math problem
            </p>

            {/* Image preview while extracting */}
            {imagePreview && extracting && (
              <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 animate-pulse">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Uploaded math problem" className="w-16 h-16 object-cover rounded-lg" />
                <div>
                  <p className="text-sm font-medium text-white">Reading math from image...</p>
                  <p className="text-xs text-slate-500">Extracting the expression</p>
                </div>
              </div>
            )}

            {/* Examples — rendered with KaTeX */}
            {!expression && !solution && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-2">Try an example:</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map(latex => (
                    <button key={latex} onClick={() => loadExpression(latex)}
                      className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/8 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/20 transition">
                      <MathInline latex={latex} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* New Problem button when solution exists */}
            {solution && (
              <div className="mt-3 flex gap-2">
                <button onClick={handleNewProblem}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition active:scale-95">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  New Problem
                </button>
                <button onClick={() => { setSolution(null); setOperation(null); setMode(null); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition active:scale-95">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Try Different Operation
                </button>
              </div>
            )}
          </div>
        )}

        {/* Operation Selection */}
        {showOperations && (
          <div className="mb-6 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
            <p className="text-sm font-semibold text-slate-400 mb-3">What do you want to do with this expression?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {OPERATIONS.map(op => (
                <button
                  key={op.id}
                  onClick={() => selectOperation(op.id)}
                  className="group flex flex-col items-center gap-1.5 p-4 rounded-2xl glass border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <span className="text-2xl">{op.icon}</span>
                  <span className="text-sm font-bold text-slate-200 group-hover:text-emerald-300 transition">{op.label}</span>
                  <span className="text-[11px] text-slate-500 leading-tight text-center">{op.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Answer vs Explain */}
        {showModeChoice && (
          <div className="mb-6 animate-fadeInUp">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setOperation(null)} className="text-slate-500 hover:text-slate-300 transition p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <p className="text-sm font-semibold text-slate-400">
                {OPERATIONS.find(o => o.id === operation)?.icon} {OPERATIONS.find(o => o.id === operation)?.label} — how detailed?
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MODES.map(m => (
                <button key={m.id} onClick={() => selectMode(m.id)}
                  className={`group flex flex-col items-center gap-2 p-5 sm:p-6 rounded-2xl glass border border-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ${modeButtonClasses[m.accent]}`}>
                  <span className="text-3xl">{m.icon}</span>
                  <span className={`text-base font-bold text-slate-200 transition ${modeLabelClasses[m.accent]}`}>{m.label}</span>
                  <span className="text-xs text-slate-500 leading-tight text-center">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass border-rose-500/30 rounded-xl p-4 mb-6 flex items-start gap-3 animate-scaleIn bg-rose-500/10">
            <svg className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.034 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <p className="text-rose-300 flex-1 text-sm">{error}</p>
            {operation && mode && (
              <button onClick={() => handleSolve(operation, mode)}
                className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold text-rose-200 bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500/30 transition active:scale-95">
                Retry
              </button>
            )}
            <button onClick={() => setError("")} aria-label="Dismiss error" className="text-rose-400 hover:text-rose-200 p-0.5 rounded hover:bg-rose-500/20 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="glass rounded-2xl p-10 text-center animate-pulse-glow mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg className="animate-spin w-7 h-7 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </div>
            <p className="font-semibold text-white text-lg">Solving...</p>
            <p className="text-slate-400 text-sm mt-1">
              {OPERATIONS.find(o => o.id === operation)?.icon}{" "}
              {OPERATIONS.find(o => o.id === operation)?.label} — {mode === "explain" ? "building explanation..." : mode === "quick" ? "getting answer..." : "solving with key steps..."}
            </p>
            <p className="text-slate-500 text-xs mt-2 tabular-nums">{elapsed}s</p>
            {elapsed >= 15 && (
              <p className="text-amber-400/70 text-xs mt-2 animate-fadeInUp">
                Free models can be slow at peak times — hang tight, a backup model kicks in if needed.
              </p>
            )}
            <button onClick={() => abortRef.current?.abort()}
              className="mt-4 px-4 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-white/10 hover:bg-white/5 hover:text-slate-200 transition active:scale-95">
              Cancel
            </button>
          </div>
        )}

        {/* Solution */}
        {solution && !loading && (
          <div ref={resultsRef} className="space-y-5 animate-fadeInUp">

            {/* Expression + Operation header */}
            <div className="glass rounded-2xl p-5 sm:p-6 border-emerald-500/20">
              <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                {solution.operation || operation}
              </p>
              <div className="text-xl sm:text-2xl text-white">
                <MathBlock latex={solution.expression_latex || expression} />
              </div>
              {solution.model_used && (
                <p className="text-[11px] text-slate-500 mt-3">
                  Solved by {solution.model_used}{solution.solve_seconds ? ` in ${solution.solve_seconds}s` : ""}
                </p>
              )}
            </div>

            {/* Steps — hidden in quick mode */}
            {solution.steps && solution.steps.length > 0 && (
              <div className="glass rounded-2xl p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm">📝</span>
                  Step-by-Step Solution
                </h3>
                <div className="space-y-0">
                  {solution.steps.map((step, i) => (
                    <div key={i} className="flex gap-4 group">
                      {/* Step number + line */}
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-sm group-hover:bg-emerald-500/25 transition">
                          {step.step || i + 1}
                        </div>
                        {i < (solution.steps?.length ?? 0) - 1 && (
                          <div className="w-0.5 flex-1 bg-emerald-500/15 my-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-6 min-w-0">
                        <h4 className="text-white font-semibold text-sm mb-1.5"><MathText text={step.title} /></h4>
                        <p className="text-slate-400 text-sm leading-relaxed mb-2"><MathText text={step.content} /></p>
                        {step.math && (
                          <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-indigo-200">
                            <MathBlock latex={step.math} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Result */}
            <div className="glass rounded-2xl p-5 sm:p-6 border-emerald-500/20 bg-emerald-500/[0.03]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">✅</span>
                  Result
                </h3>
                <button onClick={copyResult}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-white/10 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/20 transition active:scale-95">
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copy LaTeX
                    </>
                  )}
                </button>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4 text-xl text-emerald-200">
                <MathBlock latex={solution.result} />
              </div>
            </div>

            {/* Verification */}
            {solution.verification && (
              <div className="glass rounded-2xl p-5 sm:p-6">
                <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs">🔎</span>
                  Verification
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed"><MathText text={solution.verification} /></p>
              </div>
            )}

            {/* Bottom actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 pb-8">
              <button onClick={handleNewProblem}
                className="btn-gradient px-8 py-3.5 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 inline-flex items-center gap-2 active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Solve Another Problem
              </button>
              <button onClick={() => { setSolution(null); setOperation(null); setMode(null); }}
                className="glass px-6 py-3.5 text-slate-300 font-medium rounded-xl inline-flex items-center gap-2 hover:bg-white/10 transition active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Different Operation
              </button>
            </div>
          </div>
        )}

        {/* Recent History — only on empty state */}
        {!solution && !loading && !expression && history.length > 0 && (
          <div className="mt-8 animate-fadeInUp" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-500">Recent</h3>
              <button onClick={clearHistory}
                className="text-xs text-slate-600 hover:text-rose-400 transition">
                Clear all
              </button>
            </div>
            <div className="space-y-1.5">
              {history.slice(0, 8).map((item, i) => (
                <div key={i} role="button" tabIndex={0}
                  onClick={() => loadHistoryItem(item)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadHistoryItem(item); } }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl glass hover:bg-white/5 transition group text-left cursor-pointer">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm text-slate-300 truncate"><MathInline latex={item.expr} /></p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {item.op} → <MathInline latex={item.result} className="text-emerald-400/70" />
                    </p>
                  </div>
                  {item.solution && (
                    <span className="hidden sm:inline text-[10px] font-medium text-emerald-500/60 border border-emerald-500/20 rounded-md px-1.5 py-0.5 flex-shrink-0">
                      saved
                    </span>
                  )}
                  <button onClick={e => { e.stopPropagation(); deleteHistoryItem(i); }} aria-label="Delete history item"
                    className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 mt-auto border-t border-white/5 py-5">
        <p className="text-center text-xs text-slate-500">Learnix &middot; AI-powered study companion</p>
      </footer>
    </div>
  );
}
