"use client";

import { useEffect, useRef, useState } from "react";

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

// Load MathLive via a runtime script tag — bypasses the bundler
// which resolves to the SSR build that lacks custom element registration
function loadMathLiveScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (customElements.get("math-field")) {
      resolve();
      return;
    }
    if (document.querySelector("script[data-mathlive]")) {
      customElements.whenDefined("math-field").then(() => resolve()).catch(reject);
      return;
    }

    const script = document.createElement("script");
    script.setAttribute("data-mathlive", "true");
    script.type = "module";
    script.textContent = `
      import('https://unpkg.com/mathlive@0.110.0/mathlive.min.mjs')
        .then(ml => {
          if (ml.MathfieldElement) ml.MathfieldElement.soundsDirectory = null;
          window.dispatchEvent(new Event('mathlive-ready'));
        })
        .catch(() => window.dispatchEvent(new Event('mathlive-failed')));
    `;
    document.head.appendChild(script);

    const onReady = () => { cleanup(); resolve(); };
    const onFailed = () => { cleanup(); reject(new Error("MathLive failed to load")); };
    const cleanup = () => {
      window.removeEventListener("mathlive-ready", onReady);
      window.removeEventListener("mathlive-failed", onFailed);
    };
    window.addEventListener("mathlive-ready", onReady);
    window.addEventListener("mathlive-failed", onFailed);
    setTimeout(() => {
      cleanup();
      if (customElements.get("math-field")) resolve();
      else reject(new Error("MathLive load timeout"));
    }, 8000);
  });
}

export default function MathField({ value, onChange, placeholder, onReady }: MathFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mfRef = useRef<MF | null>(null);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  const valueRef = useRef(value);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [showPlaceholder, setShowPlaceholder] = useState(true);

  useEffect(() => {
    onChangeRef.current = onChange;
    onReadyRef.current = onReady;
    valueRef.current = value;
  });

  const fallbackRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        await loadMathLiveScript();
        if (cancelled || !containerRef.current) return;
        await customElements.whenDefined("math-field");
        if (cancelled || !containerRef.current) return;

        const mf = document.createElement("math-field") as MF;

        // Disable built-in UI we don't want
        mf.setAttribute("virtual-keyboard-mode", "off");
        mf.setAttribute("smart-mode", "true");
        // Do NOT set placeholder — MathLive renders it as math (no spaces)

        mf.style.cssText = `
          display: block;
          width: 100%;
          font-size: 1.25rem;
          min-height: 60px;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.03);
          color: #f1f5f9;
          outline: none;
          --caret-color: #6ee7b7;
          --selection-background-color: rgba(16,185,129,0.25);
          --contains-highlight-background-color: transparent;
          --primary-color: #6ee7b7;
          --smart-fence-color: #818cf8;
          --text-font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        `;

        // Hide keyboard toggle and menu via shadow DOM style injection
        const hideUI = () => {
          if (mf.shadowRoot) {
            const s = document.createElement("style");
            s.textContent = `
              .ML__virtual-keyboard-toggle,
              [part="virtual-keyboard-toggle"],
              .ML__menu-toggle,
              [part="menu-toggle"] {
                display: none !important;
              }
            `;
            mf.shadowRoot.appendChild(s);
          }
        };

        mf.addEventListener("input", () => {
          if (mf) {
            onChangeRef.current(mf.value);
            setShowPlaceholder(!mf.value);
          }
        });
        mf.addEventListener("focus", () => {
          setShowPlaceholder(false);
          if (mf) {
            mf.style.borderColor = "rgba(16,185,129,0.4)";
            mf.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)";
          }
        });
        mf.addEventListener("blur", () => {
          setShowPlaceholder(!mf.value);
          if (mf) {
            mf.style.borderColor = "rgba(255,255,255,0.1)";
            mf.style.boxShadow = "none";
          }
        });

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = "";
          containerRef.current.appendChild(mf);
          mfRef.current = mf;

          // Try hiding UI immediately, and again after a tick (shadow DOM may populate late)
          hideUI();
          requestAnimationFrame(hideUI);
          setTimeout(hideUI, 200);

          // Initialize with the current value — the component may remount
          // (e.g. after solving) while the expression state is non-empty
          if (valueRef.current) mf.value = valueRef.current;

          setStatus("ready");
          setShowPlaceholder(!valueRef.current);
          if (onReadyRef.current) onReadyRef.current(mf);
        }
      } catch (err) {
        console.error("MathLive failed:", err);
        if (!cancelled) setStatus("failed");
      }
    })();

    return () => { cancelled = true; mfRef.current = null; };
  }, []);

  useEffect(() => {
    const mf = mfRef.current;
    if (mf && mf.value !== value) {
      mf.value = value;
      setShowPlaceholder(!value);
    }
  }, [value]);

  if (status === "failed") {
    return (
      <textarea
        ref={fallbackRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-lg font-mono text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition resize-none"
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) e.preventDefault(); }}
      />
    );
  }

  return (
    <div className="relative">
      {status === "loading" && (
        <div className="w-full bg-white/5 border border-white/10 rounded-xl px-[18px] py-4 min-h-[60px] flex items-center text-slate-500 text-sm animate-pulse">
          Loading math editor...
        </div>
      )}
      <div ref={containerRef} style={{ display: status === "loading" ? "none" : "block" }} />
      {/* Custom placeholder overlay — MathLive's built-in one renders as math with no spaces */}
      {status === "ready" && showPlaceholder && (
        <div
          className="absolute left-[18px] top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none select-none"
          style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
          {placeholder}
        </div>
      )}
    </div>
  );
}
