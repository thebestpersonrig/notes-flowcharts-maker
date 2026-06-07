"use client";

import { useRef } from "react";

interface Section {
  title: string;
  tldr: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  content: string;
  key_points: string[];
  examples: string[];
  connections: string;
  subsections: { title: string; content: string }[];
}

interface NotesData {
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

// Color palette for sections (rotating)
const SECTION_COLORS = [
  { bg: "bg-blue-50 dark:bg-blue-500/15", border: "border-blue-300 dark:border-blue-500/40", header: "bg-blue-500 dark:bg-blue-600", text: "text-blue-700 dark:text-blue-300", badge: "bg-blue-100 dark:bg-blue-500/30", dot: "bg-blue-400" },
  { bg: "bg-emerald-50 dark:bg-emerald-500/15", border: "border-emerald-300 dark:border-emerald-500/40", header: "bg-emerald-500 dark:bg-emerald-600", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 dark:bg-emerald-500/30", dot: "bg-emerald-400" },
  { bg: "bg-amber-50 dark:bg-amber-500/15", border: "border-amber-300 dark:border-amber-500/40", header: "bg-amber-500 dark:bg-amber-600", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-100 dark:bg-amber-500/30", dot: "bg-amber-400" },
  { bg: "bg-purple-50 dark:bg-purple-500/15", border: "border-purple-300 dark:border-purple-500/40", header: "bg-purple-500 dark:bg-purple-600", text: "text-purple-700 dark:text-purple-300", badge: "bg-purple-100 dark:bg-purple-500/30", dot: "bg-purple-400" },
  { bg: "bg-rose-50 dark:bg-rose-500/15", border: "border-rose-300 dark:border-rose-500/40", header: "bg-rose-500 dark:bg-rose-600", text: "text-rose-700 dark:text-rose-300", badge: "bg-rose-100 dark:bg-rose-500/30", dot: "bg-rose-400" },
  { bg: "bg-cyan-50 dark:bg-cyan-500/15", border: "border-cyan-300 dark:border-cyan-500/40", header: "bg-cyan-500 dark:bg-cyan-600", text: "text-cyan-700 dark:text-cyan-300", badge: "bg-cyan-100 dark:bg-cyan-500/30", dot: "bg-cyan-400" },
  { bg: "bg-orange-50 dark:bg-orange-500/15", border: "border-orange-300 dark:border-orange-500/40", header: "bg-orange-500 dark:bg-orange-600", text: "text-orange-700 dark:text-orange-300", badge: "bg-orange-100 dark:bg-orange-500/30", dot: "bg-orange-400" },
];

const DIFF_EMOJI: Record<string, string> = { beginner: "🟢", intermediate: "🟡", advanced: "🔴" };

export default function MindMap({ notes, isDark }: { notes: NotesData; isDark: boolean }) {
  const mapRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={mapRef} className="space-y-6">

      {/* ─── Central Title ───────────────────────────────────────── */}
      <div className="relative">
        <div className="text-center py-8 px-6 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-700 dark:via-blue-600 dark:to-indigo-700 shadow-xl shadow-blue-500/20 dark:shadow-blue-900/40">
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-2">Mind Map</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{notes.title}</h2>
          <p className="text-blue-100/80 text-sm mt-3 max-w-2xl mx-auto leading-relaxed line-clamp-3">{notes.overview.split("\n\n")[0]}</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-blue-200/70">
            <span>{notes.sections.length} sections</span>
            <span>&middot;</span>
            <span>{notes.key_terms.length} terms</span>
            {notes.practice_problems?.length > 0 && <><span>&middot;</span><span>{notes.practice_problems.length} problems</span></>}
          </div>
        </div>
        {/* Connector line down */}
        <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 -bottom-6 w-0.5 h-6 bg-gradient-to-b from-blue-400 to-transparent" />
      </div>

      {/* ─── Section Cards Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {notes.sections.map((sec, i) => {
          const c = SECTION_COLORS[i % SECTION_COLORS.length];
          return (
            <div key={i} className={`${c.bg} ${c.border} border-2 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
              {/* Section header */}
              <div className={`${c.header} px-4 py-2.5 flex items-center gap-2`}>
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">{i + 1}</span>
                <h3 className="text-white font-bold text-sm flex-1 truncate">{sec.title}</h3>
                {sec.difficulty && <span className="text-xs" title={sec.difficulty}>{DIFF_EMOJI[sec.difficulty] || "🟡"}</span>}
              </div>
              <div className="p-4 space-y-3">
                {/* TL;DR */}
                {sec.tldr && (
                  <p className={`${c.text} text-xs italic font-medium leading-relaxed`}>{sec.tldr}</p>
                )}
                {/* Key Points */}
                {sec.key_points?.length > 0 && (
                  <ul className="space-y-1.5">
                    {sec.key_points.slice(0, 4).map((pt, j) => (
                      <li key={j} className="flex gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <span className={`${c.dot} w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0`} />
                        <span className="leading-relaxed">{pt}</span>
                      </li>
                    ))}
                    {sec.key_points.length > 4 && <li className={`text-xs ${c.text} font-medium ml-3.5`}>+{sec.key_points.length - 4} more</li>}
                  </ul>
                )}
                {/* Example highlight */}
                {sec.examples?.[0] && (
                  <div className={`${c.badge} rounded-lg px-3 py-2`}>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">Example: </span>
                      {sec.examples[0].length > 120 ? sec.examples[0].slice(0, 120) + "..." : sec.examples[0]}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Key Terms Strip ─────────────────────────────────────── */}
      {notes.key_terms?.length > 0 && (
        <div className="bg-slate-50 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-slate-700 dark:bg-slate-600 px-4 py-2.5 flex items-center gap-2">
            <span className="text-lg">📚</span>
            <h3 className="text-white font-bold text-sm">Key Terms & Glossary</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {notes.key_terms.map((kt, i) => (
              <div key={i} className="group relative">
                <span className="inline-block px-3 py-1.5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-default hover:bg-blue-50 dark:hover:bg-blue-500/20 hover:border-blue-300 dark:hover:border-blue-400/40 transition">
                  {kt.term}
                </span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                  <span className="font-bold text-blue-300">{kt.term}:</span> {kt.definition}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Misconceptions & Analogies Row ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Misconceptions */}
        {notes.common_misconceptions?.length > 0 && (
          <div className="bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/30 rounded-2xl overflow-hidden">
            <div className="bg-red-500 dark:bg-red-600 px-4 py-2.5 flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <h3 className="text-white font-bold text-sm">Common Misconceptions</h3>
            </div>
            <div className="p-4 space-y-3">
              {notes.common_misconceptions.map((m, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium flex gap-1.5">
                    <span className="flex-shrink-0">✗</span>
                    <span>{m.misconception}</span>
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 flex gap-1.5 ml-0.5">
                    <span className="flex-shrink-0">✓</span>
                    <span>{m.reality}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Analogies */}
        {notes.analogies?.length > 0 && (
          <div className="bg-purple-50 dark:bg-purple-500/10 border-2 border-purple-200 dark:border-purple-500/30 rounded-2xl overflow-hidden">
            <div className="bg-purple-500 dark:bg-purple-600 px-4 py-2.5 flex items-center gap-2">
              <span className="text-lg">💡</span>
              <h3 className="text-white font-bold text-sm">Think of It Like...</h3>
            </div>
            <div className="p-4 space-y-3">
              {notes.analogies.map((a, i) => (
                <div key={i} className="bg-white/60 dark:bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-xs font-bold text-purple-700 dark:text-purple-300">{a.concept}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">&ldquo;{a.analogy}&rdquo;</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">{a.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Pros & Cons ─────────────────────────────────────────── */}
      {notes.pros_cons?.applicable && (
        <div className="bg-teal-50 dark:bg-teal-500/10 border-2 border-teal-200 dark:border-teal-500/30 rounded-2xl overflow-hidden">
          <div className="bg-teal-500 dark:bg-teal-600 px-4 py-2.5 flex items-center gap-2">
            <span className="text-lg">⚖️</span>
            <h3 className="text-white font-bold text-sm">Pros & Cons{notes.pros_cons.context ? `: ${notes.pros_cons.context}` : ""}</h3>
          </div>
          <div className="grid grid-cols-2 divide-x divide-teal-200 dark:divide-teal-500/30">
            <div className="p-4 space-y-2">
              <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Advantages</p>
              {notes.pros_cons.pros?.map((p, i) => (
                <p key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-1.5"><span className="text-green-500 flex-shrink-0">+</span>{p}</p>
              ))}
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Disadvantages</p>
              {notes.pros_cons.cons?.map((c, i) => (
                <p key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-1.5"><span className="text-red-500 flex-shrink-0">&minus;</span>{c}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Timeline ────────────────────────────────────────────── */}
      {notes.timeline?.applicable && notes.timeline.events?.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 rounded-2xl overflow-hidden">
          <div className="bg-amber-500 dark:bg-amber-600 px-4 py-2.5 flex items-center gap-2">
            <span className="text-lg">🕰️</span>
            <h3 className="text-white font-bold text-sm">Timeline</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-0 overflow-x-auto">
            {notes.timeline.events.map((ev, i) => (
              <div key={i} className="flex items-center">
                <div className="text-center px-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-amber-400 dark:bg-amber-500 flex items-center justify-center mx-auto mb-1">
                    <span className="text-white text-xs font-bold">{ev.year.length > 4 ? ev.year.slice(0, 4) : ev.year}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 max-w-[120px] leading-tight">{ev.event}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[120px] mt-0.5">{ev.significance}</p>
                </div>
                {i < notes.timeline.events.length - 1 && (
                  <div className="flex-shrink-0 w-6 h-0.5 bg-amber-300 dark:bg-amber-600 -mt-6" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Process Flow ────────────────────────────────────────── */}
      {notes.process_flow?.applicable && notes.process_flow.steps?.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-500/10 border-2 border-indigo-200 dark:border-indigo-500/30 rounded-2xl overflow-hidden">
          <div className="bg-indigo-500 dark:bg-indigo-600 px-4 py-2.5 flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <h3 className="text-white font-bold text-sm">{notes.process_flow.title}</h3>
          </div>
          <div className="p-4 flex flex-wrap items-center justify-center gap-2">
            {notes.process_flow.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="bg-white dark:bg-white/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl px-3 py-2 text-center max-w-[150px]">
                  <div className="w-7 h-7 rounded-full bg-indigo-500 dark:bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mx-auto mb-1">{step.step}</div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{step.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">{step.description.length > 60 ? step.description.slice(0, 60) + "..." : step.description}</p>
                </div>
                {i < notes.process_flow.steps.length - 1 && (
                  <svg className="w-5 h-5 text-indigo-400 dark:text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── What Did We Learn? (Summary) ────────────────────────── */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 border-2 border-green-300 dark:border-green-500/30 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 px-4 py-3 flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-white font-bold text-sm">What Did We Learn?</h3>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{notes.summary}</p>
          {/* Quick recap bullets from each section's TL;DR */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {notes.sections.map((sec, i) => {
              const c = SECTION_COLORS[i % SECTION_COLORS.length];
              return sec.tldr ? (
                <div key={i} className="flex items-start gap-2 bg-white/60 dark:bg-white/5 rounded-lg px-3 py-2">
                  <span className={`w-5 h-5 rounded-full ${c.header} text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold`}>{i + 1}</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{sec.tldr}</p>
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* ─── Fun Fact / Practice Teaser ───────────────────────────── */}
      {notes.practice_problems?.length > 0 && (
        <div className="bg-gradient-to-r from-pink-50 to-orange-50 dark:from-pink-500/10 dark:to-orange-500/10 border-2 border-pink-200 dark:border-pink-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-4">
          <div className="text-4xl flex-shrink-0">🧠</div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-pink-700 dark:text-pink-300 mb-1">Test Yourself!</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{notes.practice_problems.length} practice problems available. Here&apos;s one to think about:</p>
            <div className="bg-white/60 dark:bg-white/5 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{notes.practice_problems[0].problem}</p>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">Switch to the Notes or Quiz tab for all problems & answers!</p>
          </div>
        </div>
      )}

      {/* ─── Footer credit ───────────────────────────────────────── */}
      <div className="text-center py-2">
        <p className="text-xs text-slate-400 dark:text-slate-600">Generated by NoteForge AI</p>
      </div>
    </div>
  );
}
