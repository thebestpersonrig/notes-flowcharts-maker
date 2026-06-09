"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Step {
  step: number;
  title: string;
  content: string;
  math: string;
}

interface Solution {
  expression_formatted: string;
  operation: string;
  steps: Step[];
  result: string;
  verification: string;
}

const OPERATIONS = [
  { id: "solve", label: "Solve", icon: "🔍", desc: "Find the value of unknowns" },
  { id: "simplify", label: "Simplify", icon: "✨", desc: "Reduce to simplest form" },
  { id: "factor", label: "Factor", icon: "🧩", desc: "Break into factors" },
  { id: "expand", label: "Expand", icon: "📐", desc: "Multiply out brackets" },
  { id: "differentiate", label: "Differentiate", icon: "📈", desc: "Find the derivative" },
  { id: "integrate", label: "Integrate", icon: "📊", desc: "Find the antiderivative" },
  { id: "evaluate", label: "Evaluate", icon: "🔢", desc: "Calculate the numerical value" },
];

const MATH_CONTROLS = [
  { label: "x²", insert: "^2", title: "Square" },
  { label: "xⁿ", insert: "^", title: "Exponent" },
  { label: "√", insert: "sqrt(", title: "Square root" },
  { label: "∛", insert: "cbrt(", title: "Cube root" },
  { label: "π", insert: "π", title: "Pi" },
  { label: "∞", insert: "∞", title: "Infinity" },
  { label: "±", insert: "±", title: "Plus/minus" },
  { label: "÷", insert: "÷", title: "Divide" },
  { label: "×", insert: "×", title: "Multiply" },
  { label: "()", insert: "()", title: "Parentheses", cursorOffset: -1 },
  { label: "||", insert: "||", title: "Absolute value", cursorOffset: -1 },
  { label: "log", insert: "log(", title: "Logarithm" },
  { label: "ln", insert: "ln(", title: "Natural log" },
  { label: "sin", insert: "sin(", title: "Sine" },
  { label: "cos", insert: "cos(", title: "Cosine" },
  { label: "tan", insert: "tan(", title: "Tangent" },
  { label: "≤", insert: "≤", title: "Less than or equal" },
  { label: "≥", insert: "≥", title: "Greater than or equal" },
  { label: "≠", insert: "≠", title: "Not equal" },
  { label: "θ", insert: "θ", title: "Theta" },
];

const EXAMPLES = [
  "x^2 + 5x + 6 = 0",
  "3x + 7 = 22",
  "sin(π/4)",
  "d/dx (x^3 + 2x)",
  "(2x + 3)(x - 5)",
  "∫ 2x dx",
  "x^2 - 9",
  "lim x→0 sin(x)/x",
];

export default function MathSolver() {
  const [expression, setExpression] = useState("");
  const [operation, setOperation] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<{ expr: string; op: string; result: string }[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = localStorage.getItem("learnix-theme") || "dark";
    document.documentElement.classList.toggle("dark", s === "dark");
  }, []);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem("learnix-math-history") || "[]"));
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const i = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(i);
  }, [loading]);

  function insertAtCursor(text: string, cursorOffset = 0) {
    const el = inputRef.current;
    if (!el) { setExpression(p => p + text); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = expression.slice(0, start);
    const after = expression.slice(end);
    const newVal = before + text + after;
    setExpression(newVal);
    // Set cursor position after React re-render
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length + cursorOffset;
      el.setSelectionRange(pos, pos);
    });
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
    setLoading(true);
    setError("");
    setSolution(null);

    try {
      const opLabel = OPERATIONS.find(o => o.id === opId)?.label || opId;
      const res = await fetch("/api/math", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: expression.trim(), operation: opLabel, mode: solveMode }),
      });

      let data;
      try { data = await res.json(); } catch {
        throw new Error("The AI returned an invalid response. Please try again.");
      }
      if (!res.ok) throw new Error(data?.error || "Failed to solve");

      setSolution(data);
      // Save to history
      const item = { expr: expression.trim(), op: opLabel, result: data.result || "" };
      setHistory(prev => {
        const u = [item, ...prev].slice(0, 30);
        localStorage.setItem("learnix-math-history", JSON.stringify(u));
        return u;
      });

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("limit") || msg.toLowerCase().includes("429")) {
        setError("Rate limited — too many requests. Please wait a minute and try again.");
      } else { setError(msg); }
    } finally {
      setLoading(false);
    }
  }

  function handleNewProblem() {
    setExpression("");
    setOperation(null);
    setMode(null);
    setSolution(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function loadExample(ex: string) {
    setExpression(ex);
    setOperation(null);
    setMode(null);
    setSolution(null);
    setError("");
    inputRef.current?.focus();
  }

  const showOperations = expression.trim().length > 0 && !operation && !loading && !solution;
  const showModeChoice = operation && !mode && !loading && !solution;

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
              Type any math expression, then choose what to do with it.
            </p>
          </div>
        )}

        {/* Input Area */}
        {!loading && (
          <div className={`glass-strong rounded-2xl p-5 sm:p-6 mb-6 animate-fadeInUp ${solution ? "" : ""}`}>

            {/* Math Controls */}
            <div className="flex flex-wrap gap-1 mb-3">
              {MATH_CONTROLS.map(ctrl => (
                <button
                  key={ctrl.label}
                  type="button"
                  onClick={() => insertAtCursor(ctrl.insert, ctrl.cursorOffset || 0)}
                  title={ctrl.title}
                  className="px-2 py-1.5 rounded-lg text-xs font-mono font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-indigo-500/15 hover:text-indigo-300 hover:border-indigo-500/30 transition-all active:scale-95"
                >
                  {ctrl.label}
                </button>
              ))}
            </div>

            {/* Expression Input */}
            <textarea
              ref={inputRef}
              value={expression}
              onChange={e => { setExpression(e.target.value); setSolution(null); setOperation(null); setMode(null); }}
              placeholder="Type your math expression — e.g. x^2 + 5x + 6 = 0"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-lg font-mono text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition resize-none"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                }
              }}
            />

            {/* Examples */}
            {!expression && !solution && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-2">Try an example:</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map(ex => (
                    <button key={ex} onClick={() => loadExample(ex)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono bg-white/5 border border-white/8 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/20 transition">
                      {ex}
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
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => selectMode("answer")}
                className="group flex flex-col items-center gap-2 p-5 sm:p-6 rounded-2xl glass border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                <span className="text-3xl">⚡</span>
                <span className="text-base font-bold text-slate-200 group-hover:text-amber-300 transition">Answer</span>
                <span className="text-xs text-slate-500 leading-tight text-center">Quick answer with key steps</span>
              </button>
              <button onClick={() => selectMode("explain")}
                className="group flex flex-col items-center gap-2 p-5 sm:p-6 rounded-2xl glass border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                <span className="text-3xl">📝</span>
                <span className="text-base font-bold text-slate-200 group-hover:text-emerald-300 transition">Explain</span>
                <span className="text-xs text-slate-500 leading-tight text-center">Detailed step-by-step explanation</span>
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass border-rose-500/30 rounded-xl p-4 mb-6 flex items-start gap-3 animate-scaleIn bg-rose-500/10">
            <svg className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.034 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <p className="text-rose-300 flex-1 text-sm">{error}</p>
            <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-200 p-0.5 rounded hover:bg-rose-500/20 transition">
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
              {OPERATIONS.find(o => o.id === operation)?.label} — {mode === "explain" ? "building explanation..." : "getting answer..."}
            </p>
            <p className="text-slate-500 text-xs mt-2 tabular-nums">{elapsed}s</p>
          </div>
        )}

        {/* Solution */}
        {solution && !loading && (
          <div ref={resultsRef} className="space-y-5 animate-fadeInUp">

            {/* Expression + Operation header */}
            <div className="glass rounded-2xl p-5 sm:p-6 border-emerald-500/20">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                    {solution.operation || operation}
                  </p>
                  <p className="text-xl sm:text-2xl font-mono font-bold text-white leading-snug">
                    {solution.expression_formatted || expression}
                  </p>
                </div>
              </div>
            </div>

            {/* Steps */}
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
                        {step.step}
                      </div>
                      {i < solution.steps.length - 1 && (
                        <div className="w-0.5 flex-1 bg-emerald-500/15 my-1" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <h4 className="text-white font-semibold text-sm mb-1.5">{step.title}</h4>
                      <p className="text-slate-400 text-sm leading-relaxed mb-2">{step.content}</p>
                      {step.math && (
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-indigo-300 overflow-x-auto">
                          {step.math}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Result */}
            <div className="glass rounded-2xl p-5 sm:p-6 border-emerald-500/20 bg-emerald-500/[0.03]">
              <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">✅</span>
                Result
              </h3>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4">
                <p className="text-xl font-mono font-bold text-emerald-300">{solution.result}</p>
              </div>
            </div>

            {/* Verification */}
            {solution.verification && (
              <div className="glass rounded-2xl p-5 sm:p-6">
                <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs">🔎</span>
                  Verification
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed font-mono">{solution.verification}</p>
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
            <h3 className="text-sm font-semibold text-slate-500 mb-3">Recent</h3>
            <div className="space-y-1.5">
              {history.slice(0, 5).map((item, i) => (
                <button key={i} onClick={() => { setExpression(item.expr); setSolution(null); setOperation(null); setMode(null); }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl glass hover:bg-white/5 transition group text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-slate-300 truncate">{item.expr}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.op} → <span className="text-emerald-400/70 font-mono">{item.result.length > 50 ? item.result.slice(0, 50) + "…" : item.result}</span></p>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
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
