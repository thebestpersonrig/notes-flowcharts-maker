"use client";

import { useState } from "react";

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

export default function QuizMode({ notes }: { notes: NotesData }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");

  async function generateQuiz() {
    setLoading(true);
    setError("");
    setAnswers({});
    setShowResults(false);

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(qIndex: number, optIndex: number) {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  }

  const score = showResults
    ? questions.filter((q, i) => answers[i] === q.correct).length
    : 0;
  const allAnswered =
    questions.length > 0 &&
    Object.keys(answers).length === questions.length;

  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Test your knowledge with auto-generated quiz questions based on your
            notes.
          </p>
          <button
            onClick={generateQuiz}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating Quiz...
              </span>
            ) : (
              "Generate Quiz Questions"
            )}
          </button>
          {error && (
            <p className="text-red-500 text-sm mt-3">{error}</p>
          )}
        </div>
      ) : (
        <>
          {/* Score banner */}
          {showResults && (
            <div
              className={`rounded-xl p-4 text-center font-semibold text-lg ${
                score === questions.length
                  ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300"
                  : score >= questions.length / 2
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300"
                    : "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"
              }`}
            >
              You scored {score} / {questions.length} (
              {Math.round((score / questions.length) * 100)}%)
            </div>
          )}

          {/* Questions */}
          {questions.map((q, qi) => (
            <div
              key={qi}
              className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5"
            >
              <p className="text-slate-800 dark:text-white font-medium mb-3">
                <span className="text-purple-600 dark:text-purple-400 mr-2">
                  Q{qi + 1}.
                </span>
                {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  let optClass =
                    "border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer";

                  if (answers[qi] === oi && !showResults) {
                    optClass =
                      "border-purple-500 bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 cursor-pointer";
                  }

                  if (showResults) {
                    if (oi === q.correct) {
                      optClass =
                        "border-green-500 bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300";
                    } else if (answers[qi] === oi && oi !== q.correct) {
                      optClass =
                        "border-red-500 bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300";
                    } else {
                      optClass =
                        "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-400 dark:text-slate-500";
                    }
                  }

                  return (
                    <button
                      key={oi}
                      onClick={() => selectAnswer(qi, oi)}
                      disabled={showResults}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition ${optClass}`}
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(65 + oi)}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {showResults && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 italic">
                  {q.explanation}
                </p>
              )}
            </div>
          ))}

          {/* Action buttons */}
          <div className="flex justify-center gap-3 pt-2">
            {!showResults ? (
              <button
                onClick={() => setShowResults(true)}
                disabled={!allAnswered}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400 disabled:opacity-50 text-white font-semibold rounded-xl transition"
              >
                {allAnswered ? "Check Answers" : `Answer all ${questions.length} questions`}
              </button>
            ) : (
              <button
                onClick={generateQuiz}
                disabled={loading}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400 disabled:opacity-50 text-white font-semibold rounded-xl transition"
              >
                {loading ? "Generating..." : "New Quiz"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
