"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const DIFFICULTIES = [
  { id: "easy", label: "Easy", icon: "🟢", desc: "Basic recall & definitions" },
  { id: "medium", label: "Medium", icon: "🟡", desc: "Understanding & application" },
  { id: "hard", label: "Hard", icon: "🔴", desc: "Analysis & critical thinking" },
];

const COUNTS = [5, 10, 15];

export default function QuizGenerator() {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<{ topic: string; score: number; total: number; diff: string }[]>([]);
  const quizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = localStorage.getItem("learnix-theme") || "dark";
    document.documentElement.classList.toggle("dark", s === "dark");
  }, []);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem("learnix-quiz-history") || "[]"));
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const i = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(i);
  }, [loading]);

  async function generateQuiz() {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers({});
    setCurrentQ(0);
    setSubmitted(false);

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), difficulty, count }),
      });

      let data;
      try { data = await res.json(); } catch {
        throw new Error("The AI returned an invalid response. Please try again.");
      }
      if (!res.ok) throw new Error(data?.error || "Failed to generate quiz");

      if (!data.questions?.length) throw new Error("No questions generated. Try again.");

      setQuestions(data.questions);
      setTimeout(() => quizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("limit") || msg.toLowerCase().includes("429")) {
        setError("Rate limited — wait a minute and try again.");
      } else { setError(msg); }
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(qIdx: number, optIdx: number) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  }

  function submitQuiz() {
    setSubmitted(true);
    const score = questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0);
    const item = { topic: topic.trim(), score, total: questions.length, diff: difficulty };
    setHistory(prev => {
      const u = [item, ...prev].slice(0, 20);
      localStorage.setItem("learnix-quiz-history", JSON.stringify(u));
      return u;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetQuiz() {
    setQuestions([]);
    setAnswers({});
    setCurrentQ(0);
    setSubmitted(false);
    setError("");
  }

  function newQuiz() {
    setTopic("");
    resetQuiz();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const score = submitted ? questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0) : 0;
  const pct = submitted && questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a1a] text-slate-800 dark:text-slate-200 transition-colors duration-300 relative flex flex-col">
      <div className="mesh-bg"><div className="orb-3" /></div>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 w-full">

        {/* Back to Home */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Home
          </Link>
        </div>

        {/* Hero — only when no quiz active */}
        {questions.length === 0 && !loading && (
          <div className="text-center mb-10 animate-fadeInUp">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <span className="text-3xl">🧠</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Quiz Generator</h2>
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-lg mx-auto">
              Enter any topic and test your knowledge with AI-generated quizzes.
            </p>
          </div>
        )}

        {/* Score banner when submitted */}
        {submitted && (
          <div className={`rounded-2xl p-6 sm:p-8 mb-6 text-center animate-fadeInUp ${pct >= 80 ? "bg-emerald-500/10 border border-emerald-500/20" : pct >= 50 ? "bg-amber-500/10 border border-amber-500/20" : "bg-rose-500/10 border border-rose-500/20"}`}>
            <div className={`text-5xl sm:text-6xl font-extrabold mb-2 ${pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400"}`}>
              {pct}%
            </div>
            <p className="text-lg font-semibold text-white mb-1">
              {score} / {questions.length} correct
            </p>
            <p className="text-slate-400 text-sm mb-5">
              {pct === 100 ? "Perfect score! You nailed it." : pct >= 80 ? "Great job! Almost perfect." : pct >= 50 ? "Good effort! Review the ones you missed." : "Keep studying — you'll get there!"}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => { resetQuiz(); generateQuiz(); }}
                className="btn-gradient w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-xl inline-flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Retry Same Topic
              </button>
              <button onClick={newQuiz}
                className="glass w-full sm:w-auto px-6 py-3 text-slate-300 font-medium rounded-xl inline-flex items-center justify-center gap-2 hover:bg-white/10 transition active:scale-95">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Topic
              </button>
            </div>
          </div>
        )}

        {/* Setup — only when no quiz */}
        {questions.length === 0 && !loading && (
          <div className="space-y-5 animate-fadeInUp">

            {/* Topic input */}
            <div className="glass-strong rounded-2xl p-5 sm:p-6">
              <label className="text-sm font-semibold text-slate-400 mb-2.5 block">What do you want to be quizzed on?</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis, World War II, Python lists..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-lg text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition"
                onKeyDown={e => { if (e.key === "Enter" && topic.trim()) generateQuiz(); }}
              />
            </div>

            {/* Difficulty */}
            {topic.trim() && (
              <div className="glass-strong rounded-2xl p-5 sm:p-6 animate-fadeInUp">
                <label className="text-sm font-semibold text-slate-400 mb-3 block">Difficulty</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className={`group flex flex-col items-center gap-1.5 p-3.5 rounded-xl border transition-all duration-200 active:scale-[0.97] ${
                        difficulty === d.id
                          ? "bg-amber-500/10 border-amber-500/30 shadow-sm shadow-amber-500/10"
                          : "glass border-white/10 hover:border-amber-500/20 hover:bg-amber-500/5"
                      }`}
                    >
                      <span className="text-lg">{d.icon}</span>
                      <span className={`text-sm font-bold transition ${difficulty === d.id ? "text-amber-300" : "text-slate-300 group-hover:text-amber-300"}`}>{d.label}</span>
                      <span className="text-[10px] text-slate-500 leading-tight text-center">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Count + Generate */}
            {topic.trim() && (
              <div className="glass-strong rounded-2xl p-5 sm:p-6 animate-fadeInUp" style={{ animationDelay: "50ms" }}>
                <label className="text-sm font-semibold text-slate-400 mb-3 block">Number of questions</label>
                <div className="flex items-center gap-3 mb-5">
                  {COUNTS.map(c => (
                    <button
                      key={c}
                      onClick={() => setCount(c)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                        count === c
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          : "glass border-white/10 text-slate-400 hover:border-amber-500/20 hover:text-amber-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <button
                  onClick={generateQuiz}
                  disabled={!topic.trim()}
                  className="w-full btn-gradient px-6 py-4 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 inline-flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  <span className="text-lg">🧠</span>
                  Generate Quiz
                </button>
              </div>
            )}

            {/* Recent History */}
            {!topic && history.length > 0 && (
              <div className="mt-4 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                <h3 className="text-sm font-semibold text-slate-500 mb-3">Recent quizzes</h3>
                <div className="space-y-1.5">
                  {history.slice(0, 5).map((item, i) => (
                    <button key={i} onClick={() => setTopic(item.topic)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl glass hover:bg-white/5 transition group text-left">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate font-medium">{item.topic}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className={item.score / item.total >= 0.8 ? "text-emerald-400/70" : item.score / item.total >= 0.5 ? "text-amber-400/70" : "text-rose-400/70"}>
                            {item.score}/{item.total}
                          </span>
                          {" · "}{item.diff}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg className="animate-spin w-7 h-7 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </div>
            <p className="font-semibold text-white text-lg">Generating quiz...</p>
            <p className="text-slate-400 text-sm mt-1">{count} {difficulty} questions about &ldquo;{topic}&rdquo;</p>
            <p className="text-slate-500 text-xs mt-2 tabular-nums">{elapsed}s</p>
          </div>
        )}

        {/* Quiz questions */}
        {questions.length > 0 && !loading && (
          <div ref={quizRef} className="space-y-4 animate-fadeInUp">

            {/* Progress bar */}
            {!submitted && (
              <div className="glass-strong rounded-xl p-4 mb-2 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{Object.keys(answers).length} of {questions.length} answered</span>
                    <span className="font-mono">{topic}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Question cards */}
            {questions.map((q, qi) => {
              const userAnswer = answers[qi];
              const isCorrect = userAnswer === q.correct;
              const isAnswered = userAnswer !== undefined;

              return (
                <div
                  key={qi}
                  className={`glass rounded-2xl p-5 sm:p-6 transition-all duration-300 ${
                    submitted
                      ? isCorrect
                        ? "border border-emerald-500/25 bg-emerald-500/[0.03]"
                        : isAnswered
                        ? "border border-rose-500/25 bg-rose-500/[0.03]"
                        : "border border-slate-500/20"
                      : "border border-white/10"
                  }`}
                >
                  {/* Question header */}
                  <div className="flex items-start gap-3 mb-4">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      submitted
                        ? isCorrect ? "bg-emerald-500/20 text-emerald-400" : isAnswered ? "bg-rose-500/20 text-rose-400" : "bg-slate-500/20 text-slate-400"
                        : isAnswered ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-slate-400"
                    }`}>
                      {submitted ? (isCorrect ? "✓" : isAnswered ? "✗" : "–") : qi + 1}
                    </span>
                    <p className="text-white font-medium text-[15px] leading-relaxed pt-0.5">{q.question}</p>
                  </div>

                  {/* Options */}
                  <div className="space-y-2 ml-0 sm:ml-11">
                    {q.options.map((opt, oi) => {
                      const isSelected = userAnswer === oi;
                      const isRight = q.correct === oi;
                      let optClass = "glass border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 cursor-pointer";

                      if (submitted) {
                        if (isRight) optClass = "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300";
                        else if (isSelected && !isRight) optClass = "bg-rose-500/10 border border-rose-500/30 text-rose-300";
                        else optClass = "glass border border-white/5 opacity-50";
                      } else if (isSelected) {
                        optClass = "bg-amber-500/10 border border-amber-500/30 text-amber-300 ring-1 ring-amber-500/20";
                      }

                      return (
                        <button
                          key={oi}
                          onClick={() => selectAnswer(qi, oi)}
                          disabled={submitted}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 flex items-center gap-3 active:scale-[0.99] ${optClass}`}
                        >
                          <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            submitted && isRight ? "bg-emerald-500/25 text-emerald-300" :
                            submitted && isSelected && !isRight ? "bg-rose-500/25 text-rose-300" :
                            isSelected ? "bg-amber-500/25 text-amber-300" :
                            "bg-white/5 text-slate-500"
                          }`}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span className={submitted && !isRight && !isSelected ? "text-slate-500" : submitted ? "" : "text-slate-300"}>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation — shown after submit */}
                  {submitted && isAnswered && (
                    <div className={`ml-0 sm:ml-11 mt-3 px-4 py-3 rounded-xl text-xs leading-relaxed ${
                      isCorrect ? "bg-emerald-500/5 text-emerald-300/80" : "bg-rose-500/5 text-rose-300/80"
                    }`}>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Submit / actions */}
            {!submitted && (
              <div className="flex justify-center pt-4 pb-8">
                <button
                  onClick={submitQuiz}
                  disabled={!allAnswered}
                  className="btn-gradient w-full sm:w-auto px-10 py-4 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 inline-flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-base"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Submit Quiz{!allAnswered ? ` (${Object.keys(answers).length}/${questions.length})` : ""}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="relative z-10 mt-auto border-t border-white/5 py-5">
        <p className="text-center text-xs text-slate-500">Learnix &middot; AI-powered study companion</p>
      </footer>
    </div>
  );
}
