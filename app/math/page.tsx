"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MathSolver() {
  useEffect(() => {
    const s = localStorage.getItem("learnix-theme") || "dark";
    document.documentElement.classList.toggle("dark", s === "dark");
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a1a] text-slate-800 dark:text-slate-200 transition-colors duration-300 relative">
      <div className="mesh-bg"><div className="orb-3" /></div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 relative z-10">
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Home
          </Link>
        </div>
        <div className="text-center animate-fadeInUp">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <span className="text-4xl">🧮</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Math Solver</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-md mx-auto mb-8">
            Step-by-step math problem solving is coming soon.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 btn-gradient px-6 py-3 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Home
          </Link>
        </div>
      </main>

      <footer className="relative z-10 mt-auto border-t border-white/5 py-5">
        <p className="text-center text-xs text-slate-500">Learnix &middot; AI-powered study companion</p>
      </footer>
    </div>
  );
}
