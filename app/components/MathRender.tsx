"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

// Strip wrapping math delimiters the AI sometimes adds ($...$, $$...$$, \[...\], \(...\))
function stripDelimiters(latex: string): string {
  let s = latex.trim();
  if (s.startsWith("$$") && s.endsWith("$$")) s = s.slice(2, -2);
  else if (s.startsWith("\\[") && s.endsWith("\\]")) s = s.slice(2, -2);
  else if (s.startsWith("\\(") && s.endsWith("\\)")) s = s.slice(2, -2);
  else if (s.startsWith("$") && s.endsWith("$") && s.length > 1) s = s.slice(1, -1);
  return s.trim();
}

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(stripDelimiters(latex), {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      output: "htmlAndMathml",
    });
  } catch {
    // throwOnError: false handles most cases; this catches hard parse crashes
    const esc = latex.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<span class="font-mono">${esc}</span>`;
  }
}

/** Block-level (display mode) math. Centered, larger glyphs. */
export function MathBlock({ latex, className = "" }: { latex: string; className?: string }) {
  const html = useMemo(() => renderKatex(latex, true), [latex]);
  if (!latex?.trim()) return null;
  return (
    <div
      className={`katex-block overflow-x-auto overflow-y-hidden ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Inline math, flows with surrounding text. */
export function MathInline({ latex, className = "" }: { latex: string; className?: string }) {
  const html = useMemo(() => renderKatex(latex, false), [latex]);
  if (!latex?.trim()) return null;
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Mixed text + math. Splits on $...$ segments and renders the math parts
 * with KaTeX while leaving plain text untouched.
 */
export function MathText({ text, className = "" }: { text: string; className?: string }) {
  const parts = useMemo(() => {
    if (!text) return [];
    // Split on single-$ inline math (non-greedy, no empty matches)
    const segments = text.split(/(\$[^$]+\$)/g);
    return segments.filter(Boolean).map((seg, i) => {
      if (seg.startsWith("$") && seg.endsWith("$") && seg.length > 2) {
        return { key: i, math: true, content: seg.slice(1, -1) };
      }
      return { key: i, math: false, content: seg };
    });
  }, [text]);

  if (!text?.trim()) return null;
  return (
    <span className={className}>
      {parts.map(p =>
        p.math ? (
          <MathInline key={p.key} latex={p.content} />
        ) : (
          <span key={p.key}>{p.content}</span>
        )
      )}
    </span>
  );
}
