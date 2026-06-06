"use client";

import { useState } from "react";

interface Section {
  title: string;
  content: string;
  key_points: string[];
  subsections: { title: string; content: string }[];
}

interface NotesContent {
  title: string;
  overview: string;
  sections: Section[];
  process_flow: {
    title: string;
    steps: { step: number; title: string; description: string }[];
  };
  key_terms: { term: string; definition: string }[];
  summary: string;
  further_reading: string[];
}

type DetailLevel = "brief" | "detailed" | "expert";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("detailed");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notes, setNotes] = useState<NotesContent | null>(null);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState(0);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setNotes(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), detailLevel }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Generation failed");
      const data = await res.json();
      setNotes(data);
      setActiveSection(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!notes) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notes),
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        "notes.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
            N
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-none">NoteForge AI</h1>
            <p className="text-blue-300 text-xs mt-0.5">AI-powered notes & flowcharts</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        {!notes && !loading && (
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Generate Expert Notes on{" "}
              <span className="text-blue-400">Any Topic</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Enter any subject and get beautifully structured notes with a process
              flowchart, key terms glossary, and a downloadable Word document — in
              seconds.
            </p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleGenerate}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-sm"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic — e.g. Quantum Computing, Photosynthesis, WWI..."
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
              disabled={loading}
            />
            <div className="flex gap-2">
              {(["brief", "detailed", "expert"] as DetailLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDetailLevel(lvl)}
                  className={`px-3 py-3 rounded-xl text-sm font-medium capitalize transition ${
                    detailLevel === lvl
                      ? "bg-blue-500 text-white"
                      : "bg-white/10 text-slate-300 hover:bg-white/20"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition whitespace-nowrap"
            >
              {loading ? "Generating..." : "Generate Notes"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="inline-flex items-center gap-3 text-blue-300">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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
                <span className="font-medium">
                  Generating your notes...
                </span>
              </div>
              <p className="text-slate-500 text-sm mt-2">
                This takes 15–30 seconds for detailed notes
              </p>
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse"
              >
                <div className="h-5 bg-white/10 rounded w-1/3 mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-3 bg-white/10 rounded w-5/6" />
                  <div className="h-3 bg-white/10 rounded w-4/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {notes && !loading && (
          <div className="space-y-6">
            {/* Title + Download */}
            <div className="bg-gradient-to-r from-blue-600/30 to-blue-500/10 border border-blue-400/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-blue-300 text-sm font-medium mb-1">Generated Notes</p>
                <h2 className="text-2xl font-bold text-white">{notes.title}</h2>
                <p className="text-slate-400 text-sm mt-1">
                  {notes.sections.length} sections · {notes.process_flow.steps.length} flowchart steps · {notes.key_terms.length} key terms
                </p>
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-5 py-3 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold rounded-xl transition whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {downloading ? "Preparing..." : "Download Word Doc"}
              </button>
            </div>

            {/* Overview */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-blue-300 mb-3">Overview</h3>
              <div className="text-slate-300 leading-relaxed space-y-3">
                {notes.overview.split("\n\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>

            {/* Sections nav + content */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex overflow-x-auto border-b border-white/10">
                {notes.sections.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSection(i)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                      activeSection === i
                        ? "bg-blue-500/20 text-blue-300 border-b-2 border-blue-400"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {notes.sections[activeSection] && (
                  <div className="space-y-4">
                    <p className="text-slate-300 leading-relaxed">
                      {notes.sections[activeSection].content}
                    </p>
                    {notes.sections[activeSection].key_points?.length > 0 && (
                      <div>
                        <h4 className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-2">
                          Key Points
                        </h4>
                        <ul className="space-y-1.5">
                          {notes.sections[activeSection].key_points.map((pt, i) => (
                            <li key={i} className="flex gap-2 text-slate-300 text-sm">
                              <span className="text-blue-400 mt-0.5">▸</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {notes.sections[activeSection].subsections?.length > 0 && (
                      <div className="space-y-3 border-t border-white/10 pt-4">
                        {notes.sections[activeSection].subsections.map((sub, i) => (
                          <div key={i}>
                            <h4 className="text-amber-400 font-semibold text-sm mb-1">
                              {sub.title}
                            </h4>
                            <p className="text-slate-400 text-sm leading-relaxed">
                              {sub.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Process Flow */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-blue-300 mb-4">
                {notes.process_flow.title}
              </h3>
              <div className="space-y-3">
                {notes.process_flow.steps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 font-bold text-sm">
                      {step.step}
                    </div>
                    <div className="flex-1 pb-3 border-b border-white/5 last:border-0">
                      <p className="text-white font-medium text-sm">{step.title}</p>
                      <p className="text-slate-400 text-sm mt-0.5">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Terms */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-blue-300 mb-4">
                Key Terms & Glossary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {notes.key_terms.map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3">
                    <p className="text-blue-400 font-semibold text-sm">{item.term}</p>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      {item.definition}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-blue-300 mb-3">Summary</h3>
              <p className="text-slate-300 leading-relaxed">{notes.summary}</p>
            </div>

            {/* Further Reading */}
            {notes.further_reading?.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">
                  Further Reading
                </h3>
                <ul className="space-y-1.5">
                  {notes.further_reading.map((r, i) => (
                    <li key={i} className="flex gap-2 text-slate-300 text-sm">
                      <span className="text-blue-400">→</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Download again at bottom */}
            <div className="text-center pt-4 pb-8">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold rounded-xl transition text-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {downloading ? "Preparing download..." : "Download Full Word Document"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
