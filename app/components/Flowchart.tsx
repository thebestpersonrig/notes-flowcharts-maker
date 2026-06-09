"use client";

import { useEffect, useRef, useState } from "react";

interface Step {
  step: number;
  title: string;
  description: string;
}

let renderCounter = 0;

export default function Flowchart({
  mermaidCode,
  steps,
  isDark,
}: {
  mermaidCode?: string;
  steps?: Step[];
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
        flowchart: {
          curve: "basis",
          padding: 16,
          nodeSpacing: 30,
          rankSpacing: 50,
          useMaxWidth: true,
          htmlLabels: true,
        },
        themeVariables: isDark
          ? {
              primaryColor: "#312e81",
              primaryTextColor: "#e0e7ff",
              primaryBorderColor: "#6366f1",
              lineColor: "#6366f1",
              secondaryColor: "#1e1b4b",
              tertiaryColor: "#0f172a",
              edgeLabelBackground: "#1e1b4b",
              clusterBkg: "#1e1b4b",
              clusterBorder: "#4338ca",
              nodeTextColor: "#e0e7ff",
            }
          : {
              primaryColor: "#eef2ff",
              primaryTextColor: "#312e81",
              primaryBorderColor: "#6366f1",
              lineColor: "#6366f1",
              secondaryColor: "#f5f3ff",
              tertiaryColor: "#faf5ff",
              edgeLabelBackground: "#ffffff",
              clusterBkg: "#f5f3ff",
              clusterBorder: "#8b5cf6",
              nodeTextColor: "#312e81",
            },
      });

      let chart: string;

      if (mermaidCode) {
        // Use AI-generated Mermaid diagram directly
        // Clean up common issues: unescape newlines, remove code fences
        chart = mermaidCode
          .replace(/\\n/g, "\n")
          .replace(/^```(?:mermaid)?\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
      } else if (steps && steps.length > 0) {
        // Fallback: build from process_flow steps
        const sanitize = (s: string) =>
          s.replace(/"/g, "'").replace(/[[\]{}()<>]/g, "").replace(/&/g, " and ");

        const nodes = steps.map(
          (s, i) => `    s${i}["${sanitize(`${s.step}. ${s.title}`)}"]`
        );
        const edges = steps
          .slice(0, -1)
          .map((_, i) => `    s${i} --> s${i + 1}`);
        chart = `graph TD\n${nodes.join("\n")}\n${edges.join("\n")}`;
      } else {
        return;
      }

      try {
        const { svg } = await mermaid.render(
          `flowchart-${currentRenderId}`,
          chart
        );
        if (renderIdRef.current === currentRenderId && containerRef.current) {
          containerRef.current.innerHTML = svg;

          // Style the SVG for better display
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
            svgEl.style.minHeight = "200px";
          }
        }
      } catch (err) {
        console.error("Mermaid render error:", err);
        // If AI-generated code fails, try fallback from steps
        if (mermaidCode && steps && steps.length > 0) {
          try {
            const sanitize = (s: string) =>
              s.replace(/"/g, "'").replace(/[[\]{}()<>]/g, "").replace(/&/g, " and ");
            const nodes = steps.map(
              (s, i) => `    s${i}["${sanitize(`${s.step}. ${s.title}`)}"]`
            );
            const edges = steps
              .slice(0, -1)
              .map((_, i) => `    s${i} --> s${i + 1}`);
            const fallbackChart = `graph TD\n${nodes.join("\n")}\n${edges.join("\n")}`;

            const { svg } = await mermaid.render(
              `flowchart-fallback-${currentRenderId}`,
              fallbackChart
            );
            if (renderIdRef.current === currentRenderId && containerRef.current) {
              containerRef.current.innerHTML = svg;
            }
          } catch {
            setError(true);
          }
        } else {
          setError(true);
        }
      }
    });

    return () => {
      renderIdRef.current = -1;
    };
  }, [mermaidCode, steps, isDark]);

  if (error) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
        <p>Could not render flowchart visualization.</p>
        <p className="text-xs mt-1 text-slate-600">Try regenerating your notes for a new diagram.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container flex justify-center overflow-x-auto py-4 rounded-xl"
    />
  );
}
