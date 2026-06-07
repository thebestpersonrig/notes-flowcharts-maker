"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const Flowchart = dynamic(() => import("./components/Flowchart"), { ssr: false });
const QuizMode = dynamic(() => import("./components/QuizMode"), { ssr: false });
const MindMap = dynamic(() => import("./components/MindMap"), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface Subsection { title: string; content: string }

interface Section {
  title: string;
  tldr: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  content: string;
  key_points: string[];
  examples: string[];
  connections: string;
  subsections: Subsection[];
}

interface NotesContent {
  title: string;
  overview: string;
  sections: Section[];
  common_misconceptions: { misconception: string; reality: string }[];
  analogies: { concept: string; analogy: string; explanation: string }[];
  pros_cons: { applicable: boolean; context: string; pros: string[]; cons: string[] };
  timeline: { applicable: boolean; events: { year: string; event: string; significance: string }[] };
  process_flow: { applicable: boolean; title: string; steps: { step: number; title: string; description: string }[] };
  practice_problems: { problem: string; hint: string; answer: string }[];
  key_terms: { term: string; definition: string }[];
  summary: string;
  further_reading: string[];
}

interface HistoryItem { id: string; title: string; date: string; notes: NotesContent }

type DetailLevel = "summary" | "brief" | "detailed" | "expert";

const DIFF_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  beginner:     { bg: "bg-green-100 dark:bg-green-500/20", text: "text-green-700 dark:text-green-300", label: "Beginner" },
  intermediate: { bg: "bg-yellow-100 dark:bg-yellow-500/20", text: "text-yellow-700 dark:text-yellow-300", label: "Intermediate" },
  advanced:     { bg: "bg-red-100 dark:bg-red-500/20", text: "text-red-700 dark:text-red-300", label: "Advanced" },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Home() {
  const [topics, setTopics] = useState<string[]>([""]);
  const [grade, setGrade] = useState("");
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("detailed");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<NotesContent | null>(null);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"notes" | "mindmap" | "flowchart" | "quiz">("notes");
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());

  const hasFlowchart = notes?.process_flow?.applicable && (notes.process_flow.steps?.length ?? 0) > 0;

  // ─── Theme ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("noteforge-theme") || "dark";
    setTheme(saved as "dark" | "light");
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("noteforge-theme", theme);
  }, [theme]);

  // ─── History ───────────────────────────────────────────────────────────────
  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem("noteforge-history") || "[]")); } catch { /* */ }
  }, []);

  const saveToHistory = useCallback((n: NotesContent) => {
    const item: HistoryItem = { id: Date.now().toString(), title: n.title, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), notes: n };
    setHistory(prev => { const u = [item, ...prev].slice(0, 20); localStorage.setItem("noteforge-history", JSON.stringify(u)); return u; });
  }, []);

  const loadFromHistory = (item: HistoryItem) => { setNotes(item.notes); setActiveSection(0); setActiveTab("notes"); setShowHistory(false); setEditMode(false); setRevealedAnswers(new Set()); setRevealedHints(new Set()); };
  const deleteFromHistory = (id: string) => { setHistory(prev => { const u = prev.filter(h => h.id !== id); localStorage.setItem("noteforge-history", JSON.stringify(u)); return u; }); };

  // ─── Share URL ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#data=")) {
      import("lz-string").then(({ decompressFromEncodedURIComponent }) => {
        const json = decompressFromEncodedURIComponent(hash.slice(6));
        if (json) try { setNotes(JSON.parse(json)); } catch { /* */ }
      });
    }
  }, []);

  // ─── Elapsed timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const i = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(i);
  }, [loading]);

  // ─── Topic handlers ────────────────────────────────────────────────────────
  const addTopic = () => setTopics(p => [...p, ""]);
  const removeTopic = (i: number) => setTopics(p => p.filter((_, idx) => idx !== i));
  const updateTopic = (i: number, v: string) => setTopics(p => p.map((t, idx) => idx === i ? v : t));

  // ─── Generate ──────────────────────────────────────────────────────────────
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const combined = topics.filter(t => t.trim()).join(", ");
    if (!combined) return;
    setLoading(true); setError(""); setNotes(null); setEditMode(false); setActiveTab("notes"); setRevealedAnswers(new Set()); setRevealedHints(new Set());
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: combined, detailLevel, grade: grade || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generation failed");
      setNotes(data); setActiveSection(0); saveToHistory(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  // ─── Download Word ─────────────────────────────────────────────────────────
  async function handleDownloadWord() {
    if (!notes) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/download", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notes) });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "notes.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : "Download failed"); }
    finally { setDownloading(false); }
  }

  // ─── Share ─────────────────────────────────────────────────────────────────
  async function handleShare() {
    if (!notes) return;
    const { compressToEncodedURIComponent } = await import("lz-string");
    const url = `${window.location.origin}${window.location.pathname}#data=${compressToEncodedURIComponent(JSON.stringify(notes))}`;
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  // ─── Edit helpers ──────────────────────────────────────────────────────────
  function updateNotes(fn: (n: NotesContent) => NotesContent) { setNotes(p => p ? fn({ ...p }) : p); }
  function updateSection(i: number, f: keyof Section, v: string | string[]) { updateNotes(n => { const s = [...n.sections]; s[i] = { ...s[i], [f]: v }; return { ...n, sections: s }; }); }
  function updateSubsection(si: number, subi: number, f: string, v: string) { updateNotes(n => { const s = [...n.sections]; const subs = [...s[si].subsections]; subs[subi] = { ...subs[subi], [f]: v }; s[si] = { ...s[si], subsections: subs }; return { ...n, sections: s }; }); }

  function EditText({ value, onChange, className = "" }: { value: string; onChange: (v: string) => void; className?: string }) {
    if (!editMode) return <p className={className}>{value}</p>;
    return <textarea value={value} onChange={e => onChange(e.target.value)} className="edit-textarea w-full bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 text-slate-800 dark:text-slate-200 resize-y" />;
  }

  // Card wrapper
  function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 ${className}`}>{children}</div>;
  }

  function SectionTitle({ children, color = "text-blue-600 dark:text-blue-300" }: { children: React.ReactNode; color?: string }) {
    return <h3 className={`text-lg font-semibold ${color} mb-3`}>{children}</h3>;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 transition-colors duration-300">

      {/* ─── History Sidebar ──────────────────────────────────────── */}
      {showHistory && (<>
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowHistory(false)} />
        <div className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 z-50 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
            <h3 className="text-slate-800 dark:text-white font-semibold">History</h3>
            <button onClick={() => setShowHistory(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {history.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No notes generated yet</p> : history.map(item => (
              <div key={item.id} className="group flex items-start gap-2 p-3 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition" onClick={() => loadFromHistory(item)}>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 dark:text-white text-sm font-medium truncate">{item.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{item.date}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteFromHistory(item.id); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {/* ─── Header ───────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 dark:border-white/10 backdrop-blur-sm bg-white/50 dark:bg-transparent sticky top-0 z-30 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold text-lg">N</div>
            <div>
              <h1 className="text-slate-900 dark:text-white font-semibold text-lg leading-none">NoteForge AI</h1>
              <p className="text-blue-600 dark:text-blue-300 text-xs mt-0.5">AI-powered notes & flowcharts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHistory(true)} className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition" title="History">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition" title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark"
                ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ─── Hero ─────────────────────────────────────────────── */}
        {!notes && !loading && (
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">Generate Expert Notes on <span className="text-blue-600 dark:text-blue-400">Any Topic</span></h2>
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">Detailed notes with examples, analogies, misconceptions, practice problems, visual flowcharts, and downloadable Word documents.</p>
          </div>
        )}

        {/* ─── Topic Form ───────────────────────────────────────── */}
        <form onSubmit={handleGenerate} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 mb-8 backdrop-blur-sm no-print">
          <div className="space-y-3">
            {topics.map((topic, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={topic} onChange={e => updateTopic(i, e.target.value)} placeholder={i === 0 ? "Enter a topic — e.g. Quantum Computing, Photosynthesis..." : "Add another topic..."} className="flex-1 bg-slate-50 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition" disabled={loading} />
                {topics.length > 1 && <button type="button" onClick={() => removeTopic(i)} className="px-3 text-slate-400 hover:text-red-500 transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
              </div>
            ))}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button type="button" onClick={addTopic} disabled={loading} className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-700 dark:hover:text-blue-300 transition flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add topic
              </button>
              <div className="flex-1" />
              {/* Grade selector */}
              <select value={grade} onChange={e => setGrade(e.target.value)} disabled={loading} className="bg-slate-50 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition appearance-none cursor-pointer" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "30px" }}>
                <option value="">Grade (optional)</option>
                {Array.from({ length: 8 }, (_, i) => i + 5).map(g => <option key={g} value={String(g)}>Grade {g}</option>)}
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
                <option value="college">College</option>
              </select>
              {/* Detail level */}
              <div className="flex gap-1.5">
                {(["summary", "brief", "detailed", "expert"] as DetailLevel[]).map(lvl => (
                  <button key={lvl} type="button" onClick={() => setDetailLevel(lvl)} className={`px-3 py-2.5 rounded-xl text-sm font-medium capitalize transition ${detailLevel === lvl ? "bg-blue-600 dark:bg-blue-500 text-white" : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20"}`}>{lvl}</button>
                ))}
              </div>
              <button type="submit" disabled={loading || !topics.some(t => t.trim())} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition whitespace-nowrap">{loading ? "Generating..." : "Generate Notes"}</button>
            </div>
          </div>
        </form>

        {error && <div className="bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-xl p-4 mb-6 text-red-700 dark:text-red-300">{error}</div>}

        {/* ─── Loading ──────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 text-center">
              <div className="inline-flex items-center gap-3 text-blue-600 dark:text-blue-300">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                <span className="font-medium">Generating your notes...</span>
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-2 tabular-nums">{elapsed}s elapsed</p>
            </div>
            {[1, 2, 3].map(i => <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 animate-pulse"><div className="h-5 bg-slate-200 dark:bg-white/10 rounded w-1/3 mb-4" /><div className="space-y-2"><div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-full" /><div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-5/6" /></div></div>)}
          </div>
        )}

        {/* ─── Results ──────────────────────────────────────────── */}
        {notes && !loading && (
          <div className="space-y-6">

            {/* Title bar + actions */}
            <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/5 dark:from-blue-600/30 dark:to-blue-500/10 border border-blue-300/50 dark:border-blue-400/30 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <p className="text-blue-600 dark:text-blue-300 text-sm font-medium mb-1">Generated Notes</p>
                  {editMode
                    ? <input value={notes.title} onChange={e => updateNotes(n => ({ ...n, title: e.target.value }))} className="text-2xl font-bold bg-transparent border-b-2 border-blue-400 text-slate-900 dark:text-white focus:outline-none w-full" />
                    : <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{notes.title}</h2>}
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {notes.sections.length} sections &middot; {notes.key_terms.length} key terms &middot; {notes.common_misconceptions?.length || 0} misconceptions &middot; {notes.practice_problems?.length || 0} practice problems
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 no-print">
                  <button onClick={() => setEditMode(!editMode)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${editMode ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    {editMode ? "Editing" : "Edit"}
                  </button>
                  <button onClick={handleDownloadWord} disabled={downloading} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {downloading ? "..." : "Download Word"}
                  </button>
                  <button onClick={handleShare} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 dark:bg-green-500 dark:hover:bg-green-400 text-white text-sm font-medium rounded-xl transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    {copied ? "Copied!" : "Share"}
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Tab nav ────────────────────────────────────────── */}
            <div className="flex gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 no-print">
              {([
                { key: "notes" as const, label: "Notes", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", show: true },
                { key: "mindmap" as const, label: "Mind Map", icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z", show: true },
                { key: "flowchart" as const, label: "Flowchart", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z", show: hasFlowchart },
                { key: "quiz" as const, label: "Quiz", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", show: true },
              ]).filter(t => t.show).map(({ key, label, icon }) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === key ? "bg-blue-600 dark:bg-blue-500 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>{label}
                </button>
              ))}
            </div>

            {/* ═══ NOTES TAB ═══════════════════════════════════════ */}
            {activeTab === "notes" && (
              <div className="space-y-6">

                {/* Overview */}
                <Card>
                  <SectionTitle>Overview</SectionTitle>
                  <div className="text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                    {editMode ? <EditText value={notes.overview} onChange={v => updateNotes(n => ({ ...n, overview: v }))} /> : notes.overview.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                </Card>

                {/* Sections with tabs */}
                <Card className="!p-0 overflow-hidden">
                  <div className="flex overflow-x-auto border-b border-slate-200 dark:border-white/10">
                    {notes.sections.map((s, i) => (
                      <button key={i} onClick={() => setActiveSection(i)} className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition ${activeSection === i ? "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border-b-2 border-blue-500" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"}`}>{s.title}</button>
                    ))}
                  </div>
                  {notes.sections[activeSection] && (() => {
                    const sec = notes.sections[activeSection];
                    const diff = DIFF_COLORS[sec.difficulty] || DIFF_COLORS.intermediate;
                    return (
                      <div className="p-5 sm:p-6 space-y-4">
                        {/* TL;DR + Difficulty badge */}
                        <div className="flex flex-wrap items-start gap-2">
                          {sec.difficulty && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${diff.bg} ${diff.text}`}>{diff.label}</span>}
                          {sec.tldr && <p className="text-slate-500 dark:text-slate-400 text-sm italic flex-1">{sec.tldr}</p>}
                        </div>

                        {/* Content */}
                        <EditText value={sec.content} onChange={v => updateSection(activeSection, "content", v)} className="text-slate-600 dark:text-slate-300 leading-relaxed" />

                        {/* Key Points */}
                        {sec.key_points?.length > 0 && (
                          <div>
                            <h4 className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider mb-2">Key Points</h4>
                            <ul className="space-y-1.5">
                              {sec.key_points.map((pt, i) => (
                                <li key={i} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm">
                                  <span className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0">&#9656;</span>
                                  {editMode ? <input value={pt} onChange={e => { const pts = [...sec.key_points]; pts[i] = e.target.value; updateSection(activeSection, "key_points", pts); }} className="flex-1 bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400" /> : <span>{pt}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Examples */}
                        {sec.examples?.length > 0 && (
                          <div>
                            <h4 className="text-green-600 dark:text-green-400 font-semibold text-sm uppercase tracking-wider mb-2">Real-World Examples</h4>
                            {sec.examples.map((ex, i) => (
                              <div key={i} className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-3 mb-2">
                                <p className="text-slate-700 dark:text-slate-300 text-sm">{ex}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Connections */}
                        {sec.connections && (
                          <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg p-3">
                            <h4 className="text-purple-600 dark:text-purple-400 font-semibold text-xs uppercase tracking-wider mb-1">Connections</h4>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">{sec.connections}</p>
                          </div>
                        )}

                        {/* Subsections */}
                        {sec.subsections?.length > 0 && (
                          <div className="space-y-3 border-t border-slate-200 dark:border-white/10 pt-4">
                            {sec.subsections.map((sub, i) => (
                              <div key={i}>
                                {editMode
                                  ? <input value={sub.title} onChange={e => updateSubsection(activeSection, i, "title", e.target.value)} className="text-sm font-semibold bg-transparent border-b border-amber-400 text-amber-600 dark:text-amber-400 focus:outline-none w-full mb-1" />
                                  : <h4 className="text-amber-600 dark:text-amber-400 font-semibold text-sm mb-1">{sub.title}</h4>}
                                <EditText value={sub.content} onChange={v => updateSubsection(activeSection, i, "content", v)} className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Card>

                {/* Common Misconceptions */}
                {notes.common_misconceptions?.length > 0 && (
                  <Card>
                    <SectionTitle color="text-red-600 dark:text-red-400">Common Misconceptions</SectionTitle>
                    <div className="space-y-3">
                      {notes.common_misconceptions.map((m, i) => (
                        <div key={i} className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
                          <p className="text-red-700 dark:text-red-300 font-medium text-sm flex gap-2"><span>&#10007;</span>{m.misconception}</p>
                          <p className="text-green-700 dark:text-green-300 text-sm mt-2 flex gap-2"><span>&#10003;</span>{m.reality}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Analogies */}
                {notes.analogies?.length > 0 && (
                  <Card>
                    <SectionTitle color="text-purple-600 dark:text-purple-400">Analogies & Comparisons</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {notes.analogies.map((a, i) => (
                        <div key={i} className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl p-4">
                          <p className="text-purple-700 dark:text-purple-300 font-semibold text-sm">{a.concept}</p>
                          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">&ldquo;{a.analogy}&rdquo;</p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 italic">{a.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Pros & Cons */}
                {notes.pros_cons?.applicable && (
                  <Card>
                    <SectionTitle color="text-teal-600 dark:text-teal-400">Pros & Cons{notes.pros_cons.context ? `: ${notes.pros_cons.context}` : ""}</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-green-600 dark:text-green-400 font-semibold text-sm mb-2">Advantages</h4>
                        <ul className="space-y-1.5">
                          {notes.pros_cons.pros?.map((p, i) => <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><span className="text-green-500">+</span>{p}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-red-600 dark:text-red-400 font-semibold text-sm mb-2">Disadvantages</h4>
                        <ul className="space-y-1.5">
                          {notes.pros_cons.cons?.map((c, i) => <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><span className="text-red-500">&minus;</span>{c}</li>)}
                        </ul>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Timeline */}
                {notes.timeline?.applicable && notes.timeline.events?.length > 0 && (
                  <Card>
                    <SectionTitle color="text-amber-600 dark:text-amber-400">Timeline & History</SectionTitle>
                    <div className="space-y-3">
                      {notes.timeline.events.map((ev, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="flex-shrink-0 w-20 text-right">
                            <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">{ev.year}</span>
                          </div>
                          <div className="flex-shrink-0 w-3 flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-amber-400 dark:bg-amber-500 border-2 border-white dark:border-slate-900" />
                            {i < notes.timeline.events.length - 1 && <div className="w-0.5 flex-1 bg-amber-200 dark:bg-amber-800" />}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-slate-800 dark:text-white font-medium text-sm">{ev.event}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{ev.significance}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Process Flow (list view in notes tab) */}
                {hasFlowchart && (
                  <Card>
                    <SectionTitle>{notes.process_flow.title}</SectionTitle>
                    <div className="space-y-3">
                      {notes.process_flow.steps.map((step, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-400/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm">{step.step}</div>
                          <div className="flex-1 pb-3 border-b border-slate-100 dark:border-white/5 last:border-0">
                            <p className="text-slate-800 dark:text-white font-medium text-sm">{step.title}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Practice Problems */}
                {notes.practice_problems?.length > 0 && (
                  <Card>
                    <SectionTitle color="text-indigo-600 dark:text-indigo-400">Practice Problems</SectionTitle>
                    <div className="space-y-4">
                      {notes.practice_problems.map((pp, i) => (
                        <div key={i} className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-4">
                          <p className="text-slate-800 dark:text-white font-medium text-sm"><span className="text-indigo-600 dark:text-indigo-400 mr-1">Q{i + 1}.</span>{pp.problem}</p>
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => setRevealedHints(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; })} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">{revealedHints.has(i) ? "Hide hint" : "Show hint"}</button>
                            <button onClick={() => setRevealedAnswers(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; })} className="text-xs text-green-600 dark:text-green-400 hover:underline">{revealedAnswers.has(i) ? "Hide answer" : "Show answer"}</button>
                          </div>
                          {revealedHints.has(i) && <p className="text-amber-700 dark:text-amber-300 text-sm mt-2 bg-amber-50 dark:bg-amber-500/10 rounded p-2">Hint: {pp.hint}</p>}
                          {revealedAnswers.has(i) && <p className="text-green-700 dark:text-green-300 text-sm mt-2 bg-green-50 dark:bg-green-500/10 rounded p-2">{pp.answer}</p>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Key Terms */}
                <Card>
                  <SectionTitle>Key Terms & Glossary</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {notes.key_terms.map((item, i) => (
                      <div key={i} className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                        <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm">{item.term}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">{item.definition}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Summary */}
                <Card>
                  <SectionTitle>Summary</SectionTitle>
                  <EditText value={notes.summary} onChange={v => updateNotes(n => ({ ...n, summary: v }))} className="text-slate-600 dark:text-slate-300 leading-relaxed" />
                </Card>

                {/* Further Reading */}
                {notes.further_reading?.length > 0 && (
                  <Card>
                    <SectionTitle>Further Reading</SectionTitle>
                    <ul className="space-y-1.5">
                      {notes.further_reading.map((r, i) => <li key={i} className="flex gap-2 text-slate-600 dark:text-slate-300 text-sm"><span className="text-blue-500 dark:text-blue-400">&rarr;</span>{r}</li>)}
                    </ul>
                  </Card>
                )}
              </div>
            )}

            {/* ═══ MIND MAP TAB ═════════════════════════════════════ */}
            {activeTab === "mindmap" && (
              <MindMap notes={notes} isDark={theme === "dark"} />
            )}

            {/* ═══ FLOWCHART TAB ═══════════════════════════════════ */}
            {activeTab === "flowchart" && hasFlowchart && (
              <Card>
                <SectionTitle>{notes.process_flow.title}</SectionTitle>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Visual representation of the process flow</p>
                <Flowchart steps={notes.process_flow.steps} isDark={theme === "dark"} />
                <div className="mt-6 border-t border-slate-200 dark:border-white/10 pt-4 space-y-2">
                  {notes.process_flow.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold">{step.step}</span>
                      <div><span className="text-slate-800 dark:text-white font-medium">{step.title}:</span> <span className="text-slate-500 dark:text-slate-400">{step.description}</span></div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ═══ QUIZ TAB ════════════════════════════════════════ */}
            {activeTab === "quiz" && (
              <Card>
                <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4">Test Your Knowledge</h3>
                <QuizMode notes={notes} />
              </Card>
            )}

            {/* Bottom download */}
            <div className="text-center pt-4 pb-8 no-print">
              <button onClick={handleDownloadWord} disabled={downloading} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-50 text-white font-semibold rounded-xl transition text-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {downloading ? "Preparing..." : "Download Full Word Document"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
