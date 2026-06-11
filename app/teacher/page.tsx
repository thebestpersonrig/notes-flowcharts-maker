"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUBJECTS = ["Math", "Science", "English", "History", "Coding", "Geography"];
const GRADES = ["5", "6", "7", "8", "9", "10", "11", "12"];

const STARTERS = [
  "Explain photosynthesis like I'm new to it",
  "Help me understand fractions",
  "Why did World War I start?",
  "What is a variable in programming?",
];

export default function AITeacher() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const s = localStorage.getItem("learnix-theme") || "dark";
    document.documentElement.classList.toggle("dark", s === "dark");
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("learnix-teacher-chat") || "null");
      if (saved?.messages?.length) {
        setMessages(saved.messages);
        setSubject(saved.subject || "");
        setGrade(saved.grade || "");
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("learnix-teacher-chat", JSON.stringify({ messages, subject, grade }));
    }
  }, [messages, subject, grade]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, subject: subject || undefined, grade: grade || undefined }),
      });

      let data;
      try { data = await res.json(); } catch {
        throw new Error("The AI returned an invalid response. Please try again.");
      }
      if (!res.ok) throw new Error(data?.error || "Failed to get a reply");

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("429")) {
        setError("Rate limited — wait a minute and try again.");
      } else { setError(msg); }
      // Roll back the unanswered user message so retry doesn't duplicate it
      setMessages(messages);
      setInput(content);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function clearChat() {
    setMessages([]);
    setError("");
    localStorage.removeItem("learnix-teacher-chat");
  }

  const chatStarted = messages.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a1a] text-slate-800 dark:text-slate-200 transition-colors duration-300 relative flex flex-col">
      <div className="mesh-bg"><div className="orb-3" /></div>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 w-full flex flex-col">

        {/* Back + Clear */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Home
          </Link>
          {chatStarted && (
            <button onClick={clearChat} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-400 transition px-3 py-1.5 rounded-lg hover:bg-rose-500/10">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              New Lesson
            </button>
          )}
        </div>

        {/* Hero — only before chat starts */}
        {!chatStarted && (
          <div className="text-center mb-8 animate-fadeInUp">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
              <span className="text-3xl">👩‍🏫</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">AI Teacher</h2>
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-lg mx-auto">
              Your personal tutor. Ask anything, get step-by-step explanations, and learn at your own pace.
            </p>
          </div>
        )}

        {/* Subject + Grade pickers — only before chat starts */}
        {!chatStarted && (
          <div className="space-y-4 mb-6 animate-fadeInUp" style={{ animationDelay: "50ms" }}>
            <div className="glass-strong rounded-2xl p-5 sm:p-6">
              <label className="text-sm font-semibold text-slate-400 mb-3 block">Subject <span className="font-normal text-slate-500">(optional)</span></label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSubject(subject === s ? "" : s)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                      subject === s
                        ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                        : "glass border-white/10 text-slate-400 hover:border-sky-500/20 hover:text-sky-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="glass-strong rounded-2xl p-5 sm:p-6">
              <label className="text-sm font-semibold text-slate-400 mb-3 block">Grade level <span className="font-normal text-slate-500">(optional)</span></label>
              <div className="flex flex-wrap gap-2">
                {GRADES.map(g => (
                  <button
                    key={g}
                    onClick={() => setGrade(grade === g ? "" : g)}
                    className={`w-11 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                      grade === g
                        ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                        : "glass border-white/10 text-slate-400 hover:border-sky-500/20 hover:text-sky-300"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Starter prompts — only before chat starts */}
        {!chatStarted && !loading && (
          <div className="mb-6 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
            <h3 className="text-sm font-semibold text-slate-500 mb-3">Try asking</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARTERS.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-xl glass border border-white/10 hover:border-sky-500/30 hover:bg-sky-500/5 transition text-sm text-slate-300 active:scale-[0.98]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {chatStarted && (
          <div className="flex-1 space-y-4 mb-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fadeInUp`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-base flex-shrink-0 mr-2.5 mt-1 shadow-md shadow-sky-500/20">
                    👩‍🏫
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/25 text-slate-100 rounded-br-md"
                    : "glass-strong border border-white/10 text-slate-200 rounded-bl-md"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start animate-fadeInUp">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-base flex-shrink-0 mr-2.5 mt-1 shadow-md shadow-sky-500/20">
                  👩‍🏫
                </div>
                <div className="glass-strong border border-white/10 px-5 py-4 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-sky-400/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-sky-400/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass border-rose-500/30 rounded-xl p-4 mb-4 flex items-start gap-3 animate-scaleIn bg-rose-500/10">
            <svg className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.034 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <p className="text-rose-300 flex-1 text-sm">{error}</p>
            <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-200 p-0.5 rounded hover:bg-rose-500/20 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Input bar */}
        <div className="glass-strong rounded-2xl p-3 sm:p-4 sticky bottom-4">
          {chatStarted && (subject || grade) && (
            <div className="flex items-center gap-2 px-1 pb-2 text-[11px] text-slate-500">
              {subject && <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 font-medium">{subject}</span>}
              {grade && <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 font-medium">Grade {grade}</span>}
            </div>
          )}
          <div className="flex items-end gap-2.5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={chatStarted ? "Ask a follow-up question..." : "Ask your teacher anything..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[15px] text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition resize-none max-h-32"
              style={{ minHeight: "48px" }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="btn-gradient w-12 h-12 flex-shrink-0 text-white rounded-xl shadow-lg shadow-indigo-500/20 inline-flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 mt-auto border-t border-white/5 py-5">
        <p className="text-center text-xs text-slate-500">Learnix &middot; AI-powered study companion</p>
      </footer>
    </div>
  );
}
