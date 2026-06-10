"use client";

import { useEffect, useRef } from "react";

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

// This component MUST be loaded with dynamic(() => ..., { ssr: false })
export default function MathField({ value, onChange, placeholder, onReady }: MathFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mfRef = useRef<MF | null>(null);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  onChangeRef.current = onChange;
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!containerRef.current) return;

    let mf: MF | null = null;

    (async () => {
      try {
        const mathlive = await import("mathlive");
        if (mathlive.MathfieldElement) {
          mathlive.MathfieldElement.soundsDirectory = null;
        }

        mf = document.createElement("math-field") as MF;
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

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          containerRef.current.appendChild(mf);
          mfRef.current = mf;
          if (onReadyRef.current) onReadyRef.current(mf);
        }
      } catch (err) {
        console.error("MathLive failed to load:", err);
      }
    })();

    return () => {
      mf = null;
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

  return <div ref={containerRef} />;
}
