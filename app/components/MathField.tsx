"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface MF extends HTMLElement {
  value: string;
  insert: (latex: string, options?: Record<string, unknown>) => void;
  focus: () => void;
}

interface MathFieldProps {
  value: string;
  onChange: (latex: string) => void;
  placeholder?: string;
  onReady?: (mf: MF) => void;
}

// Load MathLive via a runtime script tag — this completely bypasses the bundler
// which otherwise resolves to the SSR build that lacks custom element registration
function loadMathLiveScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (customElements.get("math-field")) {
      resolve();
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[data-mathlive]')) {
      // Wait for it
      customElements.whenDefined("math-field").then(() => resolve()).catch(reject);
      return;
    }

    const script = document.createElement("script");
    script.setAttribute("data-mathlive", "true");
    script.type = "module";
    // Use the installed package through Next.js static serving or CDN
    script.textContent = `
      import('https://unpkg.com/mathlive@0.110.0/mathlive.min.mjs')
        .then(ml => {
          if (ml.MathfieldElement) ml.MathfieldElement.soundsDirectory = null;
          window.__mathliveLoaded = true;
          window.dispatchEvent(new Event('mathlive-ready'));
        })
        .catch(err => {
          console.error('MathLive CDN load failed:', err);
          window.dispatchEvent(new Event('mathlive-failed'));
        });
    `;
    document.head.appendChild(script);

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onFailed = () => {
      cleanup();
      reject(new Error("MathLive failed to load"));
    };
    const cleanup = () => {
      window.removeEventListener("mathlive-ready", onReady);
      window.removeEventListener("mathlive-failed", onFailed);
    };

    window.addEventListener("mathlive-ready", onReady);
    window.addEventListener("mathlive-failed", onFailed);

    // Timeout after 8 seconds
    setTimeout(() => {
      cleanup();
      // Check one more time
      if (customElements.get("math-field")) resolve();
      else reject(new Error("MathLive load timeout"));
    }, 8000);
  });
}

// This component MUST be loaded with dynamic(() => ..., { ssr: false })
export default function MathField({ value, onChange, placeholder, onReady }: MathFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mfRef = useRef<MF | null>(null);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  onChangeRef.current = onChange;
  onReadyRef.current = onReady;

  // Fallback textarea handler
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const handleFallbackInsert = useCallback((text: string) => {
    const el = fallbackRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    onChange(before + text + after);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  }, [value, onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        await loadMathLiveScript();

        if (cancelled || !containerRef.current) return;

        // Wait for custom element to be defined
        await customElements.whenDefined("math-field");

        if (cancelled || !containerRef.current) return;

        const mf = document.createElement("math-field") as MF;
        mf.setAttribute("virtual-keyboard-mode", "off");
        mf.setAttribute("smart-mode", "true");
        if (placeholder) mf.setAttribute("placeholder", placeholder);

        mf.style.cssText = `
          display: block;
          width: 100%;
          font-size: 1.3rem;
          min-height: 64px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.03);
          color: #f1f5f9;
          outline: none;
          --caret-color: #6ee7b7;
          --selection-background-color: rgba(99,102,241,0.3);
          --contains-highlight-background-color: transparent;
          --primary-color: #6ee7b7;
          --smart-fence-color: #818cf8;
          --placeholder-color: #64748b;
          --text-font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        `;

        mf.addEventListener("input", () => {
          if (mf) onChangeRef.current(mf.value);
        });
        mf.addEventListener("focus", () => {
          if (mf) {
            mf.style.borderColor = "rgba(16,185,129,0.4)";
            mf.style.boxShadow = "0 0 0 2px rgba(16,185,129,0.15)";
          }
        });
        mf.addEventListener("blur", () => {
          if (mf) {
            mf.style.borderColor = "rgba(255,255,255,0.1)";
            mf.style.boxShadow = "none";
          }
        });

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = "";
          containerRef.current.appendChild(mf);
          mfRef.current = mf;
          setStatus("ready");
          if (onReadyRef.current) onReadyRef.current(mf);
        }
      } catch (err) {
        console.error("MathLive failed:", err);
        if (!cancelled) setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
      mfRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync value from parent
  useEffect(() => {
    const mf = mfRef.current;
    if (mf && mf.value !== value) {
      mf.value = value;
    }
  }, [value]);

  // Fallback textarea when MathLive fails
  if (status === "failed") {
    return (
      <textarea
        ref={fallbackRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-lg font-mono text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition resize-none"
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) e.preventDefault();
        }}
      />
    );
  }

  return (
    <>
      {status === "loading" && (
        <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 min-h-[64px] flex items-center text-slate-500 font-mono animate-pulse">
          Loading math editor...
        </div>
      )}
      <div ref={containerRef} style={{ display: status === "loading" ? "none" : "block" }} />
    </>
  );
}
