import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Free-tier OpenRouter models, tried in order. gpt-oss-120b is the strongest
// free math model; the rest are fallbacks for rate limits / outages.
const SOLVER_MODELS = [
  "openai/gpt-oss-120b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

const LATEX_RULES = `FORMATTING — CRITICAL:
- All "math" and "result" and "expression_latex" fields must contain PURE LaTeX (no $ delimiters, no \\[ \\]).
  Examples: "x^{2}+5x+6=0", "\\frac{3}{4}", "x=\\pm\\sqrt{2}", "\\int 2x\\,dx = x^{2}+C"
- In "title", "content" and "verification" fields, write plain English, and wrap ALL math
  (variables, numbers in formulas, expressions) in single dollar signs: "Substitute $x=2$ into $f(x)=x^{2}$".
- Never output unicode math symbols like ² ³ √ ÷ — always proper LaTeX (^{2}, \\sqrt{}, \\div).
- Never use \\text{} for whole sentences; keep prose outside math.`;

const QUICK_PROMPT = `You are a world-class mathematician. You solve math problems with perfect accuracy and give ONLY the final answer — no steps, no explanation.

CRITICAL RULES:
1. Return ONLY the final answer. No working, no steps.
2. DOUBLE-CHECK your arithmetic internally. Do not make calculation errors.
3. If there are multiple solutions, list ALL of them (e.g. "x=-2,\\ x=-3").

${LATEX_RULES}

You MUST respond with valid JSON in this exact format:
{
  "expression_latex": "the input expression as clean LaTeX",
  "operation": "what operation was performed",
  "result": "the final answer as pure LaTeX"
}

Return ONLY the JSON object, no markdown fences, no extra text.`;

const ANSWER_PROMPT = `You are a world-class mathematician. You solve math problems with perfect accuracy and give a concise answer with only the key steps.

CRITICAL RULES:
1. Show only the ESSENTIAL steps — 2-4 steps max.
2. DOUBLE-CHECK your arithmetic. Do not make calculation errors.
3. If there are multiple solutions, find ALL of them.
4. Verify your answer briefly.

${LATEX_RULES}

You MUST respond with valid JSON in this exact format:
{
  "expression_latex": "the input expression as clean LaTeX",
  "operation": "what operation was performed",
  "steps": [
    {
      "step": 1,
      "title": "Short title (plain text, $...$ for any math)",
      "content": "Brief explanation (plain text, $...$ for any math)",
      "math": "the math at this step as pure LaTeX"
    }
  ],
  "result": "the final answer as pure LaTeX",
  "verification": "quick check that the answer is correct (plain text, $...$ for any math)"
}

Return ONLY the JSON object, no markdown fences, no extra text.`;

const EXPLAIN_PROMPT = `You are a world-class math tutor. You solve math problems with perfect accuracy, explaining every step so a student fully understands the reasoning.

CRITICAL RULES:
1. SHOW EVERY STEP. Never skip steps.
2. EXPLAIN WHY at each step — name the rule, theorem, or property applied.
3. DOUBLE-CHECK your arithmetic at every step.
4. If there are multiple solutions, find ALL of them.
5. State domain/restrictions if relevant.
6. VERIFY the answer at the end by substituting back or using an alternative method.
7. If the problem is ambiguous, state your interpretation before solving.

${LATEX_RULES}

You MUST respond with valid JSON in this exact format:
{
  "expression_latex": "the input expression as clean LaTeX",
  "operation": "what operation was performed",
  "steps": [
    {
      "step": 1,
      "title": "Short title for this step (plain text, $...$ for any math)",
      "content": "Detailed explanation of what we're doing and WHY (plain text, $...$ for any math)",
      "math": "the mathematical work for this step as pure LaTeX"
    }
  ],
  "result": "the final answer as pure LaTeX",
  "verification": "show the answer is correct by checking it (plain text, $...$ for any math)"
}

IMPORTANT:
- Each step must have ALL four fields (step, title, content, math)
- Make "content" conversational and educational — explain like a great tutor would
- Return ONLY the JSON object, no markdown fences, no extra text`;

interface Step {
  step: number;
  title: string;
  content: string;
  math: string;
}

interface Solution {
  expression_latex: string;
  operation: string;
  steps?: Step[];
  result: string;
  verification?: string;
}

function extractJson(raw: string): Solution | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not set" },
        { status: 500 }
      );
    }

    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: { "X-Title": "Learnix Math Solver" },
    });

    const { expression, operation, mode = "answer" } = await req.json();

    if (!expression?.trim()) {
      return NextResponse.json({ error: "Expression is required" }, { status: 400 });
    }
    if (!operation?.trim()) {
      return NextResponse.json({ error: "Operation is required" }, { status: 400 });
    }

    const isExplain = mode === "explain";
    const isQuick = mode === "quick";
    const systemPrompt = isQuick ? QUICK_PROMPT : isExplain ? EXPLAIN_PROMPT : ANSWER_PROMPT;

    const modeInstruction = isQuick
      ? "Give ONLY the final answer — no steps."
      : isExplain
        ? "Explain every step in detail."
        : "Give a concise solution with key steps only.";

    const userPrompt = `${operation} the following expression. ${modeInstruction}

Expression (LaTeX): ${expression.trim()}

Be accurate. Double-check your work. Return ONLY valid JSON.`;

    let data: Solution | null = null;
    let modelUsed = "";
    let lastErr = "";
    const startedAt = Date.now();

    for (const model of SOLVER_MODELS) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: isQuick ? 1500 : isExplain ? 6000 : 3000,
          temperature: 0.1,
        }, { timeout: 60_000 }); // a hung free model falls through to the next one

        const raw = completion.choices[0]?.message?.content?.trim();
        if (!raw) {
          lastErr = `${model} returned an empty response`;
          continue;
        }

        const parsed = extractJson(raw);
        if (!parsed || !parsed.result) {
          lastErr = `${model} returned an unparseable response`;
          continue;
        }
        if (!isQuick && (!Array.isArray(parsed.steps) || parsed.steps.length === 0)) {
          lastErr = `${model} returned no steps`;
          continue;
        }

        data = parsed;
        modelUsed = model;
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }

    if (!data) {
      const lower = lastErr.toLowerCase();
      if (lower.includes("rate") || lower.includes("limit") || lower.includes("429")) {
        return NextResponse.json(
          { error: "Rate limited — too many requests. Wait a minute and try again." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: lastErr || "All models failed. Please try again." },
        { status: 502 }
      );
    }

    if (isQuick) {
      data.steps = [];
      data.verification = "";
    }

    const modelName = modelUsed.replace(/^[^/]+\//, "").replace(/:free$/, "");
    const solveSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    return NextResponse.json({ ...data, model_used: modelName, solve_seconds: solveSeconds });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const lower = msg.toLowerCase();
    if (lower.includes("rate") || lower.includes("limit") || lower.includes("429")) {
      return NextResponse.json(
        { error: "Rate limited — too many requests. Wait a minute and try again." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
