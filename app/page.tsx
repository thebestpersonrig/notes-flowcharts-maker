"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const s = localStorage.getItem("learnix-theme") || "dark";
    setTheme(s as "dark" | "light");
    document.documentElement.classList.toggle("dark", s === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("learnix-theme", theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a1a] text-slate-800 dark:text-slate-200 transition-colors duration-300 relative flex flex-col">
      <div className="mesh-bg"><div className="orb-3" /></div>

      {/* Header */}
      <header className="glass-strong sticky top-0 z-30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/25">L</div>
            <div>
              <h1 className="font-bold text-base leading-none text-slate-900 dark:text-white">Learnix</h1>
              <p className="text-indigo-500 dark:text-indigo-400 text-[11px] mt-0.5 font-medium">AI-powered study companion</p>
            </div>
          </div>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white/10 transition">
            {theme === "dark"
              ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative z-10 w-full">
        {/* Hero */}
        <div className="text-center mb-14 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Powered by AI
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-5 leading-[1.1]">
            Study Smarter with<br /><span className="gradient-text">Learnix</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            AI-powered study notes, flowcharts, quizzes, and step-by-step math solving. Everything you need to learn faster.
          </p>
        </div>

        {/* Tool Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-4xl animate-fadeInUp" style={{ animationDelay: "150ms" }}>

          {/* Notes Card */}
          <Link href="/notes" className="group glass rounded-2xl p-6 sm:p-8 hover:glow-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-indigo-500/30">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow mb-5">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Notes Generator</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
              Generate comprehensive study notes with examples, analogies, flowcharts, and Word export.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-500 dark:text-indigo-400 group-hover:gap-2.5 transition-all">
              Open Notes
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </span>
          </Link>

          {/* Math Card */}
          <Link href="/math" className="group glass rounded-2xl p-6 sm:p-8 hover:glow-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-emerald-500/30">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow mb-5">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Math Solver</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
              Solve math problems step-by-step with AI. Type any expression for a detailed solution.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-500 dark:text-emerald-400 group-hover:gap-2.5 transition-all">
              Open Math
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </span>
          </Link>

          {/* Quiz Card */}
          <Link href="/quiz" className="group glass rounded-2xl p-6 sm:p-8 hover:glow-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-amber-500/30">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow mb-5">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Quiz Generator</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
              Test your knowledge on any topic with AI-generated multiple choice quizzes.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-500 dark:text-amber-400 group-hover:gap-2.5 transition-all">
              Open Quiz
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </span>
          </Link>
        </div>
      </main>

      <footer className="relative z-10 mt-auto border-t border-white/5 py-5">
        <p className="text-center text-xs text-slate-500">Learnix &middot; AI-powered study companion</p>
      </footer>
    </div>
  );
}
