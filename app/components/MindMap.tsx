"use client";

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

const PALETTES = [
  { accent: "from-blue-500 to-cyan-400",    ring: "ring-blue-500/30",    text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",   dot: "bg-blue-400",    badge: "bg-blue-500/15" },
  { accent: "from-emerald-500 to-teal-400",  ring: "ring-emerald-500/30", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400", badge: "bg-emerald-500/15" },
  { accent: "from-amber-500 to-orange-400",  ring: "ring-amber-500/30",   text: "text-amber-400",   bg: "bg-amber-500/10",  border: "border-amber-500/20",  dot: "bg-amber-400",   badge: "bg-amber-500/15" },
  { accent: "from-violet-500 to-purple-400", ring: "ring-violet-500/30",  text: "text-violet-400",  bg: "bg-violet-500/10", border: "border-violet-500/20", dot: "bg-violet-400",  badge: "bg-violet-500/15" },
  { accent: "from-rose-500 to-pink-400",     ring: "ring-rose-500/30",    text: "text-rose-400",    bg: "bg-rose-500/10",   border: "border-rose-500/20",   dot: "bg-rose-400",    badge: "bg-rose-500/15" },
  { accent: "from-cyan-500 to-sky-400",      ring: "ring-cyan-500/30",    text: "text-cyan-400",    bg: "bg-cyan-500/10",   border: "border-cyan-500/20",   dot: "bg-cyan-400",    badge: "bg-cyan-500/15" },
  { accent: "from-fuchsia-500 to-pink-400",  ring: "ring-fuchsia-500/30", text: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", dot: "bg-fuchsia-400", badge: "bg-fuchsia-500/15" },
];

const DIFF_EMOJI: Record<string, string> = { beginner: "🟢", intermediate: "🟡", advanced: "🔴" };

export default function MindMap({ notes }: { notes: NotesData; isDark: boolean }) {
  return (
    <div className="space-y-5 stagger-children">

      {/* ─── Central Title ──────────────────────────────── */}
      <div className="relative">
        <div className="text-center py-8 px-6 rounded-2xl glass-strong overflow-hidden" style={{ border: "1px solid rgba(99,102,241,0.25)" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-2">Mind Map</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{notes.title}</h2>
            <p className="text-slate-400 text-sm mt-3 max-w-2xl mx-auto leading-relaxed line-clamp-3">{notes.overview.split("\n\n")[0]}</p>
            <div className="flex items-center justify-center gap-3 mt-4 text-xs text-slate-500">
              <span className="bg-white/5 px-2.5 py-1 rounded-lg">{notes.sections.length} sections</span>
              <span className="bg-white/5 px-2.5 py-1 rounded-lg">{notes.key_terms.length} terms</span>
              {notes.practice_problems?.length > 0 && <span className="bg-white/5 px-2.5 py-1 rounded-lg">{notes.practice_problems.length} problems</span>}
            </div>
          </div>
        </div>
        <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 -bottom-5 w-0.5 h-5 bg-gradient-to-b from-indigo-500/40 to-transparent" />
      </div>

      {/* ─── Section Cards Grid ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {notes.sections.map((sec, i) => {
          const p = PALETTES[i % PALETTES.length];
          return (
            <div key={i} className={`glass rounded-2xl overflow-hidden ${p.border} hover:glow-sm transition-all duration-200`}>
              <div className={`bg-gradient-to-r ${p.accent} px-4 py-2.5 flex items-center gap-2`}>
                <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs font-bold backdrop-blur-sm">{i + 1}</span>
                <h3 className="text-white font-bold text-sm flex-1 truncate">{sec.title}</h3>
                {sec.difficulty && <span className="text-xs" title={sec.difficulty}>{DIFF_EMOJI[sec.difficulty] || "🟡"}</span>}
              </div>
              <div className="p-4 space-y-3">
                {sec.tldr && <p className={`${p.text} text-xs italic font-medium leading-relaxed`}>{sec.tldr}</p>}
                {sec.key_points?.length > 0 && (
                  <ul className="space-y-1.5">
                    {sec.key_points.slice(0, 4).map((pt, j) => (
                      <li key={j} className="flex gap-2 text-xs text-slate-300">
                        <span className={`${p.dot} w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0`} />
                        <span className="leading-relaxed">{pt}</span>
                      </li>
                    ))}
                    {sec.key_points.length > 4 && <li className={`text-xs ${p.text} font-medium ml-3.5`}>+{sec.key_points.length - 4} more</li>}
                  </ul>
                )}
                {sec.examples?.[0] && (
                  <div className={`${p.badge} rounded-lg px-3 py-2`}>
                    <p className="text-xs text-slate-400"><span className="font-semibold text-slate-300">Example: </span>{sec.examples[0].length > 120 ? sec.examples[0].slice(0, 120) + "..." : sec.examples[0]}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Key Terms Strip ───────────────────────────── */}
      {notes.key_terms?.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(148,163,184,0.15)" }}>
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-2.5 flex items-center gap-2">
            <span className="text-lg">📚</span>
            <h3 className="text-white font-bold text-sm">Key Terms & Glossary</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {notes.key_terms.map((kt, i) => (
              <div key={i} className="group relative">
                <button type="button" className="inline-block px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-slate-300 cursor-default hover:bg-indigo-500/15 hover:border-indigo-500/30 hover:text-indigo-300 focus:bg-indigo-500/15 focus:border-indigo-500/30 focus:text-indigo-300 transition">
                  {kt.term}
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 sm:w-56 glass-strong text-white text-xs rounded-xl px-3 py-2.5 shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-opacity z-10">
                  <span className="font-bold text-indigo-400">{kt.term}:</span> <span className="text-slate-300">{kt.definition}</span>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-[rgba(255,255,255,0.06)] rotate-45 border-b border-r border-white/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Misconceptions & Analogies Row ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {notes.common_misconceptions?.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden border-rose-500/20" style={{ border: "1px solid rgba(244,63,94,0.2)" }}>
            <div className="bg-gradient-to-r from-rose-500 to-red-500 px-4 py-2.5 flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <h3 className="text-white font-bold text-sm">Common Misconceptions</h3>
            </div>
            <div className="p-4 space-y-3">
              {notes.common_misconceptions.map((m, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs text-rose-300 font-medium flex gap-1.5"><span className="flex-shrink-0">✗</span><span>{m.misconception}</span></p>
                  <p className="text-xs text-emerald-400 flex gap-1.5 ml-0.5"><span className="flex-shrink-0">✓</span><span>{m.reality}</span></p>
                </div>
              ))}
            </div>
          </div>
        )}
        {notes.analogies?.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(139,92,246,0.2)" }}>
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2.5 flex items-center gap-2">
              <span className="text-lg">💡</span>
              <h3 className="text-white font-bold text-sm">Think of It Like...</h3>
            </div>
            <div className="p-4 space-y-3">
              {notes.analogies.map((a, i) => (
                <div key={i} className="bg-white/3 rounded-xl px-3 py-2 border border-white/5">
                  <p className="text-xs font-bold text-violet-300">{a.concept}</p>
                  <p className="text-xs text-slate-300 mt-0.5">&ldquo;{a.analogy}&rdquo;</p>
                  <p className="text-xs text-slate-500 mt-0.5 italic">{a.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Pros & Cons ───────────────────────────────── */}
      {notes.pros_cons?.applicable && (
        <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(20,184,166,0.2)" }}>
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2.5 flex items-center gap-2">
            <span className="text-lg">⚖️</span>
            <h3 className="text-white font-bold text-sm">Pros & Cons{notes.pros_cons.context ? `: ${notes.pros_cons.context}` : ""}</h3>
          </div>
          <div className="grid grid-cols-2 divide-x divide-white/5">
            <div className="p-4 space-y-2">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Advantages</p>
              {notes.pros_cons.pros?.map((p, i) => (
                <p key={i} className="text-xs text-slate-300 flex gap-1.5"><span className="text-emerald-400 flex-shrink-0">+</span>{p}</p>
              ))}
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Disadvantages</p>
              {notes.pros_cons.cons?.map((c, i) => (
                <p key={i} className="text-xs text-slate-300 flex gap-1.5"><span className="text-rose-400 flex-shrink-0">&minus;</span>{c}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Timeline ──────────────────────────────────── */}
      {notes.timeline?.applicable && notes.timeline.events?.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 flex items-center gap-2">
            <span className="text-lg">🕰️</span>
            <h3 className="text-white font-bold text-sm">Timeline</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-0 overflow-x-auto">
            {notes.timeline.events.map((ev, i) => (
              <div key={i} className="flex items-center">
                <div className="text-center px-3 py-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-1.5 shadow-lg shadow-amber-500/20">
                    <span className="text-white text-xs font-bold">{ev.year.length > 4 ? ev.year.slice(0, 4) : ev.year}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-200 max-w-[120px] leading-tight">{ev.event}</p>
                  <p className="text-xs text-slate-500 max-w-[120px] mt-0.5">{ev.significance}</p>
                </div>
                {i < notes.timeline.events.length - 1 && (
                  <div className="flex-shrink-0 w-6 h-0.5 bg-amber-500/30 -mt-6" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Process Flow ──────────────────────────────── */}
      {notes.process_flow?.applicable && notes.process_flow.steps?.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(99,102,241,0.2)" }}>
          <div className="bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-2.5 flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <h3 className="text-white font-bold text-sm">{notes.process_flow.title}</h3>
          </div>
          <div className="p-4 flex flex-wrap items-center justify-center gap-2">
            {notes.process_flow.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="bg-white/3 border border-indigo-500/20 rounded-xl px-3 py-2.5 text-center max-w-[150px]">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center mx-auto mb-1.5 shadow-lg shadow-indigo-500/20">{step.step}</div>
                  <p className="text-xs font-bold text-slate-200">{step.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-tight">{step.description.length > 60 ? step.description.slice(0, 60) + "..." : step.description}</p>
                </div>
                {i < notes.process_flow.steps.length - 1 && (
                  <svg className="w-5 h-5 text-indigo-500/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Summary ───────────────────────────────────── */}
      <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
        <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3 flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-white font-bold text-sm">What Did We Learn?</h3>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-300 leading-relaxed">{notes.summary}</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {notes.sections.map((sec, i) => {
              const pal = PALETTES[i % PALETTES.length];
              return sec.tldr ? (
                <div key={i} className="flex items-start gap-2 bg-white/3 rounded-xl px-3 py-2 border border-white/5">
                  <span className={`w-5 h-5 rounded-lg bg-gradient-to-br ${pal.accent} text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold`}>{i + 1}</span>
                  <p className="text-xs text-slate-400 leading-relaxed">{sec.tldr}</p>
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* ─── Practice Teaser ───────────────────────────── */}
      {notes.practice_problems?.length > 0 && (
        <div className="glass rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-4" style={{ border: "1px solid rgba(236,72,153,0.2)" }}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-2xl flex-shrink-0 shadow-lg shadow-pink-500/20">🧠</div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-pink-300 mb-1">Test Yourself!</h3>
            <p className="text-xs text-slate-400 mb-2">{notes.practice_problems.length} practice problems available. Here&apos;s one to think about:</p>
            <div className="bg-white/3 rounded-xl px-3.5 py-2.5 border border-white/5">
              <p className="text-xs font-medium text-slate-300">{notes.practice_problems[0].problem}</p>
            </div>
            <p className="text-xs text-slate-500 mt-2 italic">Switch to the Notes or Quiz tab for all problems & answers!</p>
          </div>
        </div>
      )}

      <div className="text-center py-2">
        <p className="text-xs text-slate-600">Generated by Learnix</p>
      </div>
    </div>
  );
}
