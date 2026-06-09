"use client";

import { useEffect, useRef, useCallback } from "react";

interface MathInputProps {
  value: string;
  onChange: (latex: string) => void;
  placeholder?: string;
}

export default function MathInput({ value, onChange, placeholder }: MathInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mfRef = useRef<HTMLElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let mounted = true;

    import("mathlive").then((mathlive) => {
      if (!mounted || !containerRef.current) return;

      // Ensure custom element is registered
      if (typeof mathlive.MathfieldElement !== "undefined") {
        mathlive.MathfieldElement.soundsDirectory = null;
      }

      // Create math-field element
      const mf = document.createElement("math-field") as HTMLElement & {
        value: string;
        executeCommand: (cmd: string | [string, ...unknown[]]) => void;
        insert: (text: string, options?: Record<string, unknown>) => void;
      };

      mf.setAttribute("virtual-keyboard-mode", "off");
      mf.setAttribute("smart-mode", "true");
      if (placeholder) mf.setAttribute("placeholder", placeholder);

      // Styling
      mf.style.cssText = `
        width: 100%;
        font-size: 1.2rem;
        min-height: 56px;
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.03);
        color: #e2e8f0;
        outline: none;
        --caret-color: #6ee7b7;
        --selection-background-color: rgba(99,102,241,0.3);
        --contains-highlight-background-color: transparent;
        --primary-color: #6ee7b7;
        --text-font-family: 'ui-monospace', 'SFMono-Regular', 'Menlo', monospace;
      `;

      // Set initial value
      if (value) mf.value = value;

      // Listen for changes
      mf.addEventListener("input", () => {
        onChangeRef.current(mf.value);
      });

      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(mf);
      mfRef.current = mf;
    });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes
  useEffect(() => {
    const mf = mfRef.current as HTMLElement & { value: string } | null;
    if (mf && mf.value !== value) {
      mf.value = value;
    }
  }, [value]);

  const insertCommand = useCallback((latex: string) => {
    const mf = mfRef.current as HTMLElement & {
      executeCommand: (cmd: string | [string, ...unknown[]]) => void;
      insert: (text: string, options?: Record<string, unknown>) => void;
      focus: () => void;
    } | null;
    if (!mf) return;
    mf.focus();
    mf.insert(latex, { focus: true });
  }, []);

  return { containerRef, insertCommand, mfRef };
}

// Hook version for cleaner usage
export function useMathField({ value, onChange, placeholder }: MathInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mfRef = useRef<HTMLElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    let mounted = true;

    import("mathlive").then((mathlive) => {
      if (!mounted || !containerRef.current) return;

      if (typeof mathlive.MathfieldElement !== "undefined") {
        mathlive.MathfieldElement.soundsDirectory = null;
      }

      const mf = document.createElement("math-field") as HTMLElement & {
        value: string;
        insert: (text: string, options?: Record<string, unknown>) => void;
      };

      mf.setAttribute("virtual-keyboard-mode", "off");
      mf.setAttribute("smart-mode", "true");
      if (placeholder) mf.setAttribute("placeholder", placeholder);

      mf.style.cssText = `
        width: 100%;
        font-size: 1.25rem;
        min-height: 60px;
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
        --text-font-family: 'ui-monospace', 'SFMono-Regular', monospace;
      `;

      if (valueRef.current) mf.value = valueRef.current;

      mf.addEventListener("input", () => {
        onChangeRef.current(mf.value);
      });

      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(mf);
      mfRef.current = mf;
    });

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mf = mfRef.current as HTMLElement & { value: string } | null;
    if (mf && mf.value !== value) {
      mf.value = value;
    }
  }, [value]);

  const insert = useCallback((latex: string) => {
    const mf = mfRef.current as HTMLElement & {
      insert: (text: string, options?: Record<string, unknown>) => void;
      focus: () => void;
    } | null;
    if (!mf) return;
    mf.focus();
    mf.insert(latex, { focus: true });
  }, []);

  const focus = useCallback(() => {
    const mf = mfRef.current as HTMLElement & { focus: () => void } | null;
    mf?.focus();
  }, []);

  return { containerRef, insert, focus };
}
