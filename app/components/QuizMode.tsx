"use client";

import { useState, useEffect, useCallback } from "react";

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface NotesData {
  title: string;
  sections: { title: string; content: string; key_points: string[] }[];
  key_terms: { term: string; definition: string }[];
  summary: string;
}

type Difficulty = "easy" | "medium" | "hard";

const DIFF_CONFIG: Record<Difficulty, { label: string; icon: string; color: string; desc: string; time: number }> = {
  easy:   { label: "Easy",   icon: "🟢", color: "bg-emerald-500", desc: "Recall & definitions",       time: 120 },
  medium: { label: "Medium", icon: "🟡", color: "bg-amber-500",   desc: "Apply & connect concepts",   time: 90 },
  hard:   { label: "Hard",   icon: "🔴", color: "bg-rose-500",    desc: "Analyze & think critically", time: 60 },
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function QuizMode({ notes }: { notes: NotesData }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [timed, setTimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setTimerActive(false);
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive, timeLeft]);

  const startTimer = useCallback((diff: Difficulty) => {
    if (timed) {
      const totalTime = DIFF_CONFIG[diff].time;
      setTimeLeft(totalTime);
      setTimerActive(true);
    }
  }, [timed]);

  async function generateQuiz() {
    setLoading(true);
    setError("");
    setAnswers({});
    setShowResults(false);
    setTimerActive(false);

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
      startTimer(difficulty);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(qIndex: number, optIndex: number) {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
  }

  function handleSubmit() {
    setShowResults(true);
    setTimerActive(false);
  }

  function handleReset() {
    setQuestions([]);
    setAnswers({});
    setShowResults(false);
    setTimerActive(false);
    setTimeLeft(0);
  }

  const score = showResults ? questions.filter((q, i) => answers[i] === q.correct).length : 0;
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;
  const timerPct = timed && questions.length > 0 ? (timeLeft / DIFF_CONFIG[difficulty].time) * 100 : 100;

  // ─── Pre-quiz setup ──────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-slate-400 mb-6">Test your knowledge with AI-generated questions based on your notes.</p>
        </div>

        {/* Difficulty selector */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Difficulty</p>
          <div className="grid grid-cols-3 gap-2.5">
            {(["easy", "medium", "hard"] as Difficulty[]).map(d => {
              const cfg = DIFF_CONFIG[d];
              return (
                <button key={d} type="button" onClick={() => setDifficulty(d)}
                  className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all ${difficulty === d ? "border-indigo-500/50 bg-indigo-500/10 scale-[1.02]" : "border-white/10 bg-white/3 hover:bg-white/5 hover:border-white/20"}`}>
                  <span className="text-lg">{cfg.icon}</span>
                  <span className="text-sm font-bold text-slate-200">{cfg.label}</span>
                  <span className="text-[11px] text-slate-500 leading-tight text-center">{cfg.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Timed toggle */}
        <div className="flex items-center justify-between glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-lg">⏱️</span>
            <div>
              <p className="text-sm font-medium text-slate-200">Timed Mode</p>
              <p className="text-xs text-slate-500">{DIFF_CONFIG[difficulty].time}s to answer all 5 questions</p>
            </div>
          </div>
          <button type="button" onClick={() => setTimed(!timed)}
            className={`relative w-12 h-7 rounded-full transition-colors ${timed ? "bg-indigo-500" : "bg-white/10"}`}>
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${timed ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        {/* Generate button */}
        <div className="text-center">
          <button onClick={generateQuiz} disabled={loading}
            className="btn-gradient px-8 py-3.5 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 disabled:shadow-none inline-flex items-center gap-2">
            {loading ? (<>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Generating...
            </>) : (<>Start Quiz &rarr;</>)}
          </button>
          {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  // ─── Active quiz ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Timer bar */}
      {timed && !showResults && (
        <div className="glass rounded-xl p-3 flex items-center gap-3 animate-fadeIn">
          <span className="text-lg">⏱️</span>
          <div className="flex-1">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerPct > 30 ? "bg-indigo-500" : timerPct > 10 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${timerPct}%` }} />
            </div>
          </div>
          <span className={`font-mono font-bold text-sm tabular-nums ${timerPct <= 10 ? "text-rose-400 animate-pulse" : "text-slate-300"}`}>{formatTime(timeLeft)}</span>
        </div>
      )}

      {/* Score banner */}
      {showResults && (
        <div className={`rounded-xl p-4 text-center font-semibold text-lg animate-scaleIn ${
          score === questions.length ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
          : score >= questions.length / 2 ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
          : "bg-rose-500/15 text-rose-300 border border-rose-500/20"
        }`}>
          {score === questions.length ? "🎉 " : ""}{score} / {questions.length} ({Math.round((score / questions.length) * 100)}%)
          {timed && timeLeft === 0 && !allAnswered && <p className="text-sm font-normal mt-1 opacity-70">Time&apos;s up!</p>}
        </div>
      )}

      {/* Questions */}
      {questions.map((q, qi) => (
        <div key={qi} className="glass rounded-xl p-5 border border-white/5">
          <p className="text-white font-medium mb-3">
            <span className="text-violet-400 mr-2">Q{qi + 1}.</span>{q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              let cls = "border border-white/10 bg-white/3 text-slate-300 hover:bg-white/8 cursor-pointer";
              if (answers[qi] === oi && !showResults) cls = "border-violet-500/50 bg-violet-500/15 text-violet-200 cursor-pointer";
              if (showResults) {
                if (oi === q.correct) cls = "border-emerald-500/50 bg-emerald-500/15 text-emerald-300";
                else if (answers[qi] === oi) cls = "border-rose-500/50 bg-rose-500/15 text-rose-300";
                else cls = "border-white/5 bg-white/2 text-slate-500";
              }
              return (
                <button key={oi} onClick={() => selectAnswer(qi, oi)} disabled={showResults}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition ${cls}`}>
                  <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                </button>
              );
            })}
          </div>
          {showResults && <p className="text-sm text-slate-400 mt-3 italic">{q.explanation}</p>}
        </div>
      ))}

      {/* Actions */}
      <div className="flex justify-center gap-3 pt-2">
        {!showResults ? (
          <button onClick={handleSubmit} disabled={!allAnswered}
            className="btn-gradient px-6 py-3 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 disabled:shadow-none transition">
            {allAnswered ? "Check Answers" : `Answer all ${questions.length} questions`}
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={generateQuiz} disabled={loading}
              className="btn-gradient px-6 py-3 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 disabled:shadow-none">
              {loading ? "Generating..." : "New Quiz"}
            </button>
            <button onClick={handleReset}
              className="glass px-6 py-3 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition">
              Change Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
