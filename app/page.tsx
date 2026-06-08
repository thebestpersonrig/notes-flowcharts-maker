"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
interface ChatMessage { role: "user" | "assistant"; content: string }

const DIFF_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  beginner:     { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Beginner" },
  intermediate: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Intermediate" },
  advanced:     { bg: "bg-rose-500/10", text: "text-rose-400", label: "Advanced" },
};

// ─── Templates ───────────────────────────────────────────────────────────────

interface Template { id: string; label: string; icon: string; desc: string }

const TEMPLATES: Template[] = [
  { id: "study",       label: "Study Notes",       icon: "📖", desc: "Comprehensive notes for learning" },
  { id: "cheatsheet",  label: "Cheat Sheet",       icon: "📋", desc: "Quick-reference key facts & formulas" },
  { id: "revision",    label: "Quick Revision",    icon: "⚡", desc: "Fast recap before a test" },
  { id: "deepdive",    label: "Deep Dive",         icon: "🧠", desc: "Expert-level mastery content" },
  { id: "research",    label: "Essay Research",     icon: "🔬", desc: "Analysis, arguments & sources" },
  { id: "eli5",        label: "ELI5",              icon: "🧒", desc: "Explain like I'm five" },
  { id: "cornell",     label: "Cornell Notes",     icon: "📝", desc: "Structured Q&A study format" },
  { id: "lecture",     label: "Lecture Notes",      icon: "🎓", desc: "Organized class-style notes" },
];

const GRADES = [
  { value: "5", label: "Grade 5" }, { value: "6", label: "Grade 6" }, { value: "7", label: "Grade 7" },
  { value: "8", label: "Grade 8" }, { value: "9", label: "Grade 9" }, { value: "10", label: "Grade 10" },
  { value: "11", label: "Grade 11" }, { value: "12", label: "Grade 12" }, { value: "college", label: "College" },
];

// ─── Extracted Components ────────────────────────────────────────────────────

function EditText({ value, onChange, className = "", editMode }: { value: string; onChange: (v: string) => void; className?: string; editMode: boolean }) {
  if (!editMode) return <p className={className}>{value}</p>;
  return <textarea value={value} onChange={e => onChange(e.target.value)} className="edit-textarea w-full bg-indigo-500/5 border border-indigo-500/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-200 resize-y transition" />;
}

function GlassCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <div className={`glass rounded-2xl p-5 sm:p-6 animate-fadeInUp hover:glow-sm transition-shadow duration-300 ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>{children}</div>;
}

function SectionTitle({ children, color = "text-indigo-400" }: { children: React.ReactNode; color?: string }) {
  return <h3 className={`text-lg font-semibold ${color} mb-3 flex items-center gap-2`}>{children}</h3>;
}

function FormattedText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split("\n");
  if (parts.length <= 1) return <p className={className}>{text}</p>;
  return <div className={className}>{parts.map((line, i) => <p key={i} className={i > 0 ? "mt-1.5" : ""}>{line || " "}</p>)}</div>;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [topics, setTopics] = useState<string[]>([""]);
  const [grade, setGrade] = useState("");
  const [template, setTemplate] = useState("study");
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

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [heroImageLoading, setHeroImageLoading] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const hasFlowchart = notes?.process_flow?.applicable && (notes.process_flow.steps?.length ?? 0) > 0;

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { const s = localStorage.getItem("noteforge-theme") || "dark"; setTheme(s as "dark"|"light"); document.documentElement.classList.toggle("dark", s === "dark"); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); localStorage.setItem("noteforge-theme", theme); }, [theme]);
  useEffect(() => { try { setHistory(JSON.parse(localStorage.getItem("noteforge-history") || "[]")); } catch { /* */ } }, []);

  const saveToHistory = useCallback((n: NotesContent) => {
    const item: HistoryItem = { id: Date.now().toString(), title: n.title, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), notes: n };
    setHistory(prev => { const u = [item, ...prev].slice(0, 20); localStorage.setItem("noteforge-history", JSON.stringify(u)); return u; });
  }, []);

  const loadFromHistory = (item: HistoryItem) => { setNotes(item.notes); setActiveSection(0); setActiveTab("notes"); setShowHistory(false); setEditMode(false); setRevealedAnswers(new Set()); setRevealedHints(new Set()); setChatMessages([]); setHeroImage(null); setError(""); };
  const deleteFromHistory = (id: string) => { setHistory(prev => { const u = prev.filter(h => h.id !== id); localStorage.setItem("noteforge-history", JSON.stringify(u)); return u; }); };

  useEffect(() => { const h = window.location.hash; if (h.startsWith("#data=")) { import("lz-string").then(({ decompressFromEncodedURIComponent }) => { const j = decompressFromEncodedURIComponent(h.slice(6)); if (j) try { setNotes(JSON.parse(j)); } catch { /* */ } }); } }, []);
  useEffect(() => { if (!loading) { setElapsed(0); return; } const i = setInterval(() => setElapsed(p => p + 1), 1000); return () => clearInterval(i); }, [loading]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatLoading]);

  const addTopic = () => setTopics(p => [...p, ""]);
  const removeTopic = (i: number) => setTopics(p => p.filter((_, idx) => idx !== i));
  const updateTopic = (i: number, v: string) => setTopics(p => p.map((t, idx) => idx === i ? v : t));

  function selectTemplate(t: Template) { setTemplate(t.id); }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const combined = topics.filter(t => t.trim()).join(", ");
    if (!combined) return;
    setLoading(true); setError(""); setNotes(null); setEditMode(false); setActiveTab("notes"); setRevealedAnswers(new Set()); setRevealedHints(new Set()); setChatMessages([]); setHeroImage(null);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: combined, template: template || "study", grade: grade || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generation failed");
      setNotes(data); setActiveSection(0); saveToHistory(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      generateHeroImage(data.title);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  function handleNewNotes() { setNotes(null); setError(""); setEditMode(false); setChatOpen(false); setChatMessages([]); setHeroImage(null); setRevealedAnswers(new Set()); setRevealedHints(new Set()); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function generateHeroImage(title: string) { setHeroImageLoading(true); try { const r = await fetch("/api/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: title }) }); const d = await r.json(); if (r.ok && d.url) setHeroImage(d.url); } catch { /* */ } finally { setHeroImageLoading(false); } }

  async function handleDownloadWord() {
    if (!notes) return; setDownloading(true);
    try { const r = await fetch("/api/download", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notes) }); if (!r.ok) { const d = await r.json().catch(() => null); throw new Error(d?.error || "Download failed"); } const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = r.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "notes.docx"; a.click(); URL.revokeObjectURL(u); }
    catch (err) { setError(err instanceof Error ? err.message : "Download failed"); } finally { setDownloading(false); }
  }

  async function handleShare() { if (!notes) return; const { compressToEncodedURIComponent } = await import("lz-string"); const url = `${window.location.origin}${window.location.pathname}#data=${compressToEncodedURIComponent(JSON.stringify(notes))}`; await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  async function sendChatMessage(message: string) {
    if (!message.trim() || !notes || chatLoading) return;
    const msg = message.trim(); setChatInput(""); setChatMessages(prev => [...prev, { role: "user", content: msg }]); setChatLoading(true);
    try { const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, notesContext: notes, grade: grade || undefined }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setChatMessages(prev => [...prev, { role: "assistant", content: d.reply }]); }
    catch (err) { setChatMessages(prev => [...prev, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Failed"}` }]); }
    finally { setChatLoading(false); }
  }
  function handleChatSubmit(e: React.FormEvent) { e.preventDefault(); sendChatMessage(chatInput); }

  function updateNotes(fn: (n: NotesContent) => NotesContent) { setNotes(p => p ? fn({ ...p }) : p); }
  function updateSection(i: number, f: keyof Section, v: string | string[]) { updateNotes(n => { const s = [...n.sections]; s[i] = { ...s[i], [f]: v }; return { ...n, sections: s }; }); }
  function updateSubsection(si: number, subi: number, f: string, v: string) { updateNotes(n => { const s = [...n.sections]; const subs = [...s[si].subsections]; subs[subi] = { ...subs[subi], [f]: v }; s[si] = { ...s[si], subsections: subs }; return { ...n, sections: s }; }); }

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a1a] text-slate-800 dark:text-slate-200 transition-colors duration-300 relative">
      {/* Animated mesh background */}
      <div className="mesh-bg"><div className="orb-3" /></div>

      {/* ─── History Sidebar ─────────────────────────────────── */}
      {showHistory && (<>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn" onClick={() => setShowHistory(false)} />
        <div className="fixed inset-y-0 left-0 w-80 glass-strong z-50 flex flex-col shadow-2xl animate-slideInLeft rounded-r-2xl">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h3 className="font-semibold text-slate-900 dark:text-white">History</h3>
            <button onClick={() => setShowHistory(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {history.length === 0 ? <p className="text-slate-400 text-sm text-center py-8 italic">No notes yet</p> : history.map(item => (
              <div key={item.id} className="group flex items-start gap-2 p-3 rounded-xl hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer transition" onClick={() => loadFromHistory(item)}>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold flex-shrink-0 mt-0.5">{item.title.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-slate-800 dark:text-white">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.date}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteFromHistory(item.id); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-1 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {/* ─── Header ──────────────────────────────────────────── */}
      <header className="glass-strong sticky top-0 z-30 no-print border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <button onClick={handleNewNotes} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">N</div>
            <div>
              <h1 className="font-bold text-base leading-none text-slate-900 dark:text-white">NoteForge AI</h1>
              <p className="text-indigo-500 dark:text-indigo-400 text-[11px] mt-0.5 font-medium">AI-powered study companion</p>
            </div>
          </button>
          <div className="flex items-center gap-1.5">
            {notes && (
              <button onClick={handleNewNotes} className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New
              </button>
            )}
            <button onClick={() => setShowHistory(true)} className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white/10 transition" title="History">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white/10 transition">
              {theme === "dark"
                ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10">

        {/* ─── Hero ──────────────────────────────────────────── */}
        {!notes && !loading && (
          <div className="text-center mb-12 animate-fadeInUp">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Powered by AI
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-5 leading-[1.1]">
              Generate Expert Notes<br />on <span className="gradient-text">Any Topic</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
              AI-powered notes with examples, analogies, visual flowcharts, practice problems, and downloadable Word documents.
            </p>
          </div>
        )}

        {/* ─── Templates ─────────────────────────────────────── */}
        {!notes && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
            {TEMPLATES.map(t => (
              <button key={t.id} type="button" onClick={() => selectTemplate(t)} className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border transition-all duration-200 ${template === t.id ? "border-indigo-500/50 bg-indigo-500/10 glow-violet scale-[1.02]" : "glass hover:bg-white/10 hover:scale-[1.01]"}`}>
                <span className="text-2xl">{t.icon}</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t.label}</span>
                <span className="text-[11px] text-slate-400 hidden sm:block leading-tight text-center">{t.desc}</span>
              </button>
            ))}
          </div>
        )}

        {/* ─── Form ──────────────────────────────────────────── */}
        {!loading && (
          <form onSubmit={handleGenerate} className={`glass-strong rounded-2xl p-5 sm:p-6 mb-8 no-print animate-fadeInUp ${notes ? "glow-sm" : ""}`} style={!notes ? { animationDelay: "200ms" } : undefined}>
            <div className="space-y-3">
              {topics.map((topic, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={topic} onChange={e => updateTopic(i, e.target.value)} placeholder={i === 0 ? "Enter a topic — e.g. Quantum Computing, Photosynthesis..." : "Add another topic..."} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition text-[15px]" disabled={loading} />
                  {topics.length > 1 && <button type="button" onClick={() => removeTopic(i)} className="px-3 text-slate-400 hover:text-rose-400 transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
                </div>
              ))}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center pt-1">
                <button type="button" onClick={addTopic} className="text-indigo-500 dark:text-indigo-400 text-sm font-medium hover:text-indigo-400 transition flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add topic
                </button>
                <div className="flex-1" />
                <select value={grade} onChange={e => setGrade(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer transition">
                  <option value="">Grade (optional)</option>
                  {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
                <select value={template} onChange={e => setTemplate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer transition">
                  {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
                <button type="submit" disabled={loading || !topics.some(t => t.trim())} className="btn-gradient px-7 py-3.5 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 whitespace-nowrap disabled:shadow-none">{notes ? "Regenerate" : "Generate Notes"}</button>
              </div>
            </div>
          </form>
        )}

        {/* ─── Error ─────────────────────────────────────────── */}
        {error && (
          <div className="glass border-rose-500/30 rounded-xl p-4 mb-6 flex items-start gap-3 animate-scaleIn bg-rose-500/10">
            <svg className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.034 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <p className="text-rose-300 flex-1 text-sm">{error}</p>
            <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-200 p-0.5 rounded hover:bg-rose-500/20 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}

        {/* ─── Loading ───────────────────────────────────────── */}
        {loading && (
          <div className="space-y-4 animate-fadeIn">
            <div className="glass rounded-2xl p-10 text-center animate-pulse-glow">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg className="animate-spin w-7 h-7 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              </div>
              <p className="font-semibold text-white text-lg">Generating your notes...</p>
              <p className="text-slate-400 text-sm mt-1 tabular-nums">{elapsed}s elapsed</p>
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="glass rounded-2xl p-6 overflow-hidden">
                <div className="h-5 bg-white/5 rounded-lg w-1/3 mb-4 shimmer" />
                <div className="space-y-2.5"><div className="h-3 bg-white/5 rounded-lg w-full shimmer" /><div className="h-3 bg-white/5 rounded-lg w-5/6 shimmer" /><div className="h-3 bg-white/5 rounded-lg w-4/6 shimmer" /></div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Results ───────────────────────────────────────── */}
        {notes && !loading && (
          <div className="space-y-5" ref={resultsRef}>

            {/* Title bar + hero */}
            <div className="rounded-2xl overflow-hidden animate-fadeInUp glass" style={{ border: "1px solid rgba(99,102,241,0.2)" }}>
              {(heroImage || heroImageLoading) && (
                <div className="relative w-full h-48 sm:h-60 bg-slate-800/50 overflow-hidden">
                  {heroImage ? <img src={heroImage} alt={notes.title} className="w-full h-full object-cover animate-fadeIn" /> : (
                    <div className="w-full h-full flex items-center justify-center"><div className="flex items-center gap-2 text-slate-500 text-sm"><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Generating illustration...</div></div>
                  )}
                  {heroImage && <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a]/80 via-transparent to-transparent" />}
                </div>
              )}
              <div className="p-5 sm:p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div>
                    <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">Generated Notes</p>
                    {editMode ? <input value={notes.title} onChange={e => updateNotes(n => ({ ...n, title: e.target.value }))} className="text-2xl font-bold bg-transparent border-b-2 border-indigo-500 text-white focus:outline-none w-full" />
                      : <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">{notes.title}</h2>}
                    <div className="flex flex-wrap gap-3 mt-3">
                      {[{ n: notes.sections.length, l: "sections" }, { n: notes.key_terms?.length || 0, l: "terms" }, { n: notes.practice_problems?.length || 0, l: "problems" }].map(({ n, l }) => (
                        <span key={l} className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">{n} {l}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 no-print">
                    {[
                      { onClick: () => setEditMode(!editMode), label: editMode ? "Editing" : "Edit", cls: editMode ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
                      { onClick: handleDownloadWord, label: downloading ? "..." : "Word", cls: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30", icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", disabled: downloading },
                      { onClick: handleShare, label: copied ? "Copied!" : "Share", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30", icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" },
                      { onClick: () => setChatOpen(!chatOpen), label: "Ask AI", cls: chatOpen ? "bg-violet-500 text-white border-violet-500/50" : "bg-violet-500/20 text-violet-400 border-violet-500/30 hover:bg-violet-500/30", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
                    ].map(({ onClick, label, cls, icon, disabled }) => (
                      <button key={label} onClick={onClick} disabled={disabled} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${cls}`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>{label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Chat Panel ────────────────────────────────────── */}
            {chatOpen && (
              <div className="glass rounded-2xl overflow-hidden animate-scaleIn" style={{ border: "1px solid rgba(139,92,246,0.2)" }}>
                <div className="bg-violet-500/10 px-5 py-3 flex items-center justify-between border-b border-violet-500/20">
                  <div className="flex items-center gap-2"><span className="text-base">💬</span><h3 className="text-violet-300 font-semibold text-sm">Ask AI about your notes</h3></div>
                  <button onClick={() => setChatOpen(false)} className="text-violet-400 hover:text-white p-1 rounded-lg hover:bg-violet-500/20 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="max-h-80 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 && !chatLoading && (
                    <div className="text-center py-4">
                      <p className="text-slate-500 text-sm mb-3">Ask anything about your notes:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {["Explain section 1 simpler", "Give me more examples", "Summarize the key points", "How does this connect to real life?"].map((q, i) => (
                          <button key={i} type="button" onClick={() => sendChatMessage(q)} className="px-3 py-1.5 glass rounded-full text-xs text-violet-400 hover:bg-violet-500/10 transition">{q}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeInUp`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-violet-500 text-white rounded-br-md" : "glass text-slate-300 rounded-bl-md"}`}>
                        {msg.role === "assistant" ? <FormattedText text={msg.content} /> : msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start animate-fadeIn"><div className="glass rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div></div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleChatSubmit} className="flex gap-2 p-3 border-t border-violet-500/10 bg-violet-500/5">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask a follow-up question..." disabled={chatLoading} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition" />
                  <button type="submit" disabled={chatLoading || !chatInput.trim()} className="btn-gradient px-4 py-2.5 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/20 disabled:shadow-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </form>
              </div>
            )}

            {/* ─── Tabs ──────────────────────────────────────────── */}
            <div className="flex gap-1 glass rounded-2xl p-1.5 no-print animate-fadeInUp" style={{ animationDelay: "100ms" }}>
              {([
                { key: "notes" as const, label: "Notes", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", show: true },
                { key: "mindmap" as const, label: "Mind Map", icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z", show: true },
                { key: "flowchart" as const, label: "Flowchart", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z", show: hasFlowchart },
                { key: "quiz" as const, label: "Quiz", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", show: true },
              ]).filter(t => t.show).map(({ key, label, icon }) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === key ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>{label}
                </button>
              ))}
            </div>

            {/* ═══ NOTES TAB ══════════════════════════════════════ */}
            {activeTab === "notes" && (
              <div className="space-y-5 stagger-children tab-content">
                {/* Overview */}
                <GlassCard>
                  <SectionTitle><span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm">📋</span>Overview</SectionTitle>
                  <div className="text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
                    {editMode ? <EditText value={notes.overview} onChange={v => updateNotes(n => ({ ...n, overview: v }))} editMode={editMode} /> : notes.overview.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                </GlassCard>

                {/* Sections */}
                <GlassCard className="!p-0 overflow-hidden">
                  <div className="flex overflow-x-auto border-b border-white/10 scrollbar-none">
                    {notes.sections.map((s, i) => (
                      <button key={i} onClick={() => setActiveSection(i)} className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${activeSection === i ? "bg-indigo-500/15 text-indigo-400 border-b-2 border-indigo-500" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>{s.title}</button>
                    ))}
                  </div>
                  {notes.sections[activeSection] && (() => {
                    const sec = notes.sections[activeSection];
                    const diff = DIFF_COLORS[sec.difficulty] || DIFF_COLORS.intermediate;
                    return (
                      <div className="p-5 sm:p-6 space-y-4 tab-content">
                        <div className="flex flex-wrap items-start gap-2">
                          {sec.difficulty && <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${diff.bg} ${diff.text}`}>{diff.label}</span>}
                          {sec.tldr && <p className="text-slate-400 text-sm italic flex-1">{sec.tldr}</p>}
                        </div>
                        <EditText value={sec.content} onChange={v => updateSection(activeSection, "content", v)} className="text-slate-300 leading-relaxed" editMode={editMode} />
                        {sec.key_points?.length > 0 && (
                          <div><h4 className="text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-2">Key Points</h4>
                            <ul className="space-y-1.5">{sec.key_points.map((pt, i) => (
                              <li key={i} className="flex gap-2 text-slate-300 text-sm"><span className="text-indigo-400 mt-0.5 flex-shrink-0">&#9656;</span>
                                {editMode ? <input value={pt} onChange={e => { const pts = [...sec.key_points]; pts[i] = e.target.value; updateSection(activeSection, "key_points", pts); }} className="flex-1 bg-indigo-500/5 border border-indigo-500/20 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30" /> : <span>{pt}</span>}
                              </li>
                            ))}</ul>
                          </div>
                        )}
                        {sec.examples?.length > 0 && (
                          <div><h4 className="text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-2">Real-World Examples</h4>
                            {sec.examples.map((ex, i) => <div key={i} className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3.5 mb-2"><p className="text-slate-300 text-sm">{ex}</p></div>)}
                          </div>
                        )}
                        {sec.connections && <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-3.5"><h4 className="text-violet-400 font-semibold text-xs uppercase tracking-wider mb-1">Connections</h4><p className="text-slate-400 text-sm">{sec.connections}</p></div>}
                        {sec.subsections?.length > 0 && (
                          <div className="space-y-3 border-t border-white/5 pt-4">
                            {sec.subsections.map((sub, i) => (
                              <div key={i}>{editMode ? <input value={sub.title} onChange={e => updateSubsection(activeSection, i, "title", e.target.value)} className="text-sm font-semibold bg-transparent border-b border-amber-500/40 text-amber-400 focus:outline-none w-full mb-1" /> : <h4 className="text-amber-400 font-semibold text-sm mb-1">{sub.title}</h4>}
                                <EditText value={sub.content} onChange={v => updateSubsection(activeSection, i, "content", v)} className="text-slate-400 text-sm leading-relaxed" editMode={editMode} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </GlassCard>

                {/* Misconceptions */}
                {notes.common_misconceptions?.length > 0 && (
                  <GlassCard>
                    <SectionTitle color="text-rose-400"><span className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center text-sm">⚠️</span>Common Misconceptions</SectionTitle>
                    <div className="space-y-3">{notes.common_misconceptions.map((m, i) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-white/5">
                        <div className="bg-rose-500/8 px-4 py-3"><p className="text-rose-300 font-medium text-sm flex gap-2"><span>✗</span>{m.misconception}</p></div>
                        <div className="bg-emerald-500/8 px-4 py-3"><p className="text-emerald-300 text-sm flex gap-2"><span>✓</span>{m.reality}</p></div>
                      </div>
                    ))}</div>
                  </GlassCard>
                )}

                {/* Analogies */}
                {notes.analogies?.length > 0 && (
                  <GlassCard>
                    <SectionTitle color="text-violet-400"><span className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center text-sm">💡</span>Analogies</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{notes.analogies.map((a, i) => (
                      <div key={i} className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-4 hover:bg-violet-500/10 transition">
                        <p className="text-violet-300 font-semibold text-sm">{a.concept}</p>
                        <p className="text-slate-300 text-sm mt-1.5">&ldquo;{a.analogy}&rdquo;</p>
                        <p className="text-slate-500 text-xs mt-2 italic">{a.explanation}</p>
                      </div>
                    ))}</div>
                  </GlassCard>
                )}

                {/* Pros & Cons */}
                {notes.pros_cons?.applicable && (
                  <GlassCard>
                    <SectionTitle color="text-teal-400"><span className="w-7 h-7 rounded-lg bg-teal-500/20 flex items-center justify-center text-sm">⚖️</span>Pros & Cons{notes.pros_cons.context ? `: ${notes.pros_cons.context}` : ""}</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><h4 className="text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-2">Advantages</h4><ul className="space-y-1.5">{notes.pros_cons.pros?.map((p, i) => <li key={i} className="flex gap-2 text-sm text-slate-300"><span className="text-emerald-400">+</span>{p}</li>)}</ul></div>
                      <div><h4 className="text-rose-400 font-semibold text-xs uppercase tracking-wider mb-2">Disadvantages</h4><ul className="space-y-1.5">{notes.pros_cons.cons?.map((c, i) => <li key={i} className="flex gap-2 text-sm text-slate-300"><span className="text-rose-400">&minus;</span>{c}</li>)}</ul></div>
                    </div>
                  </GlassCard>
                )}

                {/* Timeline */}
                {notes.timeline?.applicable && notes.timeline.events?.length > 0 && (
                  <GlassCard>
                    <SectionTitle color="text-amber-400"><span className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm">🕰️</span>Timeline</SectionTitle>
                    <div className="space-y-0">{notes.timeline.events.map((ev, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-20 text-right pt-1"><span className="text-amber-400 font-bold text-sm">{ev.year}</span></div>
                        <div className="flex-shrink-0 w-4 flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-[#0a0a1a] mt-1.5" />{i < notes.timeline.events.length - 1 && <div className="w-0.5 flex-1 bg-amber-500/20" />}</div>
                        <div className="flex-1 pb-4"><p className="text-white font-medium text-sm">{ev.event}</p><p className="text-slate-500 text-xs mt-0.5">{ev.significance}</p></div>
                      </div>
                    ))}</div>
                  </GlassCard>
                )}

                {/* Process Flow */}
                {hasFlowchart && (
                  <GlassCard>
                    <SectionTitle>{notes.process_flow.title}</SectionTitle>
                    <div className="space-y-3">{notes.process_flow.steps.map((step, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">{step.step}</div>
                        <div className="flex-1 pb-3 border-b border-white/5"><p className="text-white font-medium text-sm">{step.title}</p><p className="text-slate-400 text-sm mt-0.5">{step.description}</p></div>
                      </div>
                    ))}</div>
                  </GlassCard>
                )}

                {/* Practice Problems */}
                {notes.practice_problems?.length > 0 && (
                  <GlassCard>
                    <SectionTitle color="text-fuchsia-400"><span className="w-7 h-7 rounded-lg bg-fuchsia-500/20 flex items-center justify-center text-sm">🧠</span>Practice Problems</SectionTitle>
                    <div className="space-y-4">{notes.practice_problems.map((pp, i) => (
                      <div key={i} className="bg-fuchsia-500/5 border border-fuchsia-500/15 rounded-xl p-4">
                        <p className="text-white font-medium text-sm"><span className="text-fuchsia-400 mr-1.5">Q{i + 1}.</span>{pp.problem}</p>
                        <div className="flex gap-3 mt-2.5">
                          <button onClick={() => setRevealedHints(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; })} className="text-xs text-amber-400 hover:text-amber-300 transition">{revealedHints.has(i) ? "Hide hint" : "💡 Hint"}</button>
                          <button onClick={() => setRevealedAnswers(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; })} className="text-xs text-emerald-400 hover:text-emerald-300 transition">{revealedAnswers.has(i) ? "Hide answer" : "✓ Answer"}</button>
                        </div>
                        {revealedHints.has(i) && <p className="text-amber-300 text-sm mt-2.5 bg-amber-500/10 rounded-lg p-3 animate-fadeIn">Hint: {pp.hint}</p>}
                        {revealedAnswers.has(i) && <p className="text-emerald-300 text-sm mt-2.5 bg-emerald-500/10 rounded-lg p-3 animate-fadeIn">{pp.answer}</p>}
                      </div>
                    ))}</div>
                  </GlassCard>
                )}

                {/* Key Terms */}
                {notes.key_terms?.length > 0 && (
                  <GlassCard>
                    <SectionTitle><span className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm">📚</span>Key Terms</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">{notes.key_terms.map((item, i) => (
                      <div key={i} className="bg-white/3 rounded-xl p-3.5 hover:bg-white/5 transition border border-white/5">
                        <p className="text-indigo-400 font-semibold text-sm">{item.term}</p>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">{item.definition}</p>
                      </div>
                    ))}</div>
                  </GlassCard>
                )}

                {/* Summary */}
                <GlassCard>
                  <SectionTitle><span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">🎯</span>Summary</SectionTitle>
                  <EditText value={notes.summary} onChange={v => updateNotes(n => ({ ...n, summary: v }))} className="text-slate-300 leading-relaxed" editMode={editMode} />
                </GlassCard>

                {/* Further Reading */}
                {notes.further_reading?.length > 0 && (
                  <GlassCard>
                    <SectionTitle><span className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-sm">📖</span>Further Reading</SectionTitle>
                    <ul className="space-y-1.5">{notes.further_reading.map((r, i) => <li key={i} className="flex gap-2 text-slate-300 text-sm"><span className="text-cyan-400">&rarr;</span>{r}</li>)}</ul>
                  </GlassCard>
                )}
              </div>
            )}

            {/* ═══ MIND MAP ══════════════════════════════════════ */}
            {activeTab === "mindmap" && <div className="tab-content"><MindMap notes={notes} isDark={theme === "dark"} /></div>}

            {/* ═══ FLOWCHART ═════════════════════════════════════ */}
            {activeTab === "flowchart" && hasFlowchart && (
              <GlassCard className="tab-content">
                <SectionTitle>{notes.process_flow.title}</SectionTitle>
                <p className="text-slate-400 text-sm mb-4">Visual representation of the process flow</p>
                <Flowchart steps={notes.process_flow.steps} isDark={theme === "dark"} />
                <div className="mt-6 border-t border-white/5 pt-4 space-y-2">{notes.process_flow.steps.map((step, i) => (
                  <div key={i} className="flex gap-3 text-sm"><span className="flex-shrink-0 w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">{step.step}</span><div><span className="text-white font-medium">{step.title}:</span> <span className="text-slate-400">{step.description}</span></div></div>
                ))}</div>
              </GlassCard>
            )}

            {/* ═══ QUIZ ══════════════════════════════════════════ */}
            {activeTab === "quiz" && <GlassCard className="tab-content"><h3 className="text-lg font-semibold text-violet-400 mb-4">Test Your Knowledge</h3><QuizMode notes={notes} /></GlassCard>}

            {/* Bottom CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 pb-10 no-print animate-fadeInUp">
              <button onClick={handleDownloadWord} disabled={downloading} className="btn-gradient px-10 py-4 text-white font-semibold rounded-2xl shadow-xl shadow-indigo-500/20 text-lg inline-flex items-center gap-2.5 disabled:shadow-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {downloading ? "Preparing..." : "Download Word Document"}
              </button>
              <button onClick={handleNewNotes} className="glass px-8 py-4 text-slate-300 font-medium rounded-2xl inline-flex items-center gap-2.5 hover:bg-white/10 transition active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Notes
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 mt-auto border-t border-white/5 py-5 no-print">
        <p className="text-center text-xs text-slate-500">NoteForge AI &middot; AI-powered study companion</p>
      </footer>
    </div>
  );
}
