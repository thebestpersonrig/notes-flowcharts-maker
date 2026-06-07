"use client";

import { useEffect, useRef, useState } from "react";

interface Step {
  step: number;
  title: string;
  description: string;
}

let renderCounter = 0;

export default function Flowchart({
  steps,
  isDark,
}: {
  steps: Step[];
  isDark: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const renderIdRef = useRef(0);

  useEffect(() => {
    const currentRenderId = ++renderCounter;
    renderIdRef.current = currentRenderId;

    import("mermaid").then(async (m) => {
      if (renderIdRef.current !== currentRenderId) return;

      const mermaid = m.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        themeVariables: isDark
          ? {
              primaryColor: "#1e3a5f",
              primaryTextColor: "#ffffff",
              primaryBorderColor: "#3b82f6",
              lineColor: "#3b82f6",
              secondaryColor: "#1e293b",
              tertiaryColor: "#0f172a",
            }
          : {
              primaryColor: "#dbeafe",
              primaryTextColor: "#1e3a5f",
              primaryBorderColor: "#2563eb",
              lineColor: "#2563eb",
              secondaryColor: "#eff6ff",
              tertiaryColor: "#f8fafc",
            },
      });

      const sanitize = (s: string) =>
        s.replace(/"/g, "'").replace(/[[\]{}()<>]/g, "").replace(/&/g, " and ");

      const nodes = steps.map(
        (s, i) => `    s${i}["${sanitize(`${s.step}. ${s.title}`)}"]`
      );
      const edges = steps
        .slice(0, -1)
        .map((_, i) => `    s${i} --> s${i + 1}`);
      const chart = `graph TD\n${nodes.join("\n")}\n${edges.join("\n")}`;

      try {
        const { svg } = await mermaid.render(
          `flowchart-${currentRenderId}`,
          chart
        );
        if (renderIdRef.current === currentRenderId && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        setError(true);
      }
    });

    return () => {
      renderIdRef.current = -1;
    };
  }, [steps, isDark]);

  if (error) {
    return (
      <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
        Could not render flowchart visualization.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container flex justify-center overflow-x-auto py-4"
    />
  );
}
