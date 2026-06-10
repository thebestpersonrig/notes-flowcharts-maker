import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const QUICK_PROMPT = `You are a world-class mathematician. You solve math problems with perfect accuracy and give ONLY the final answer — no steps, no explanation, no verification.

CRITICAL RULES:
1. Return ONLY the final answer. No working, no steps, no explanation.
2. DOUBLE-CHECK your arithmetic internally. Do not make calculation errors.
3. If there are multiple solutions, list ALL of them.

FORMATTING — VERY IMPORTANT:
- NEVER use LaTeX commands like \\times \\quad \\frac \\sqrt \\cdot \\left \\right \\text etc.
- Use PLAIN TEXT with Unicode symbols instead:
  × for multiply, ÷ for divide, √ for square root, ² ³ for exponents, ± for plus-minus
  → for arrows, ≤ ≥ ≠ for comparisons, · for dot multiply, π for pi, ∞ for infinity
- Write fractions as (a)/(b) or a/b
- Write exponents as x^2 or x²

You MUST respond with valid JSON in this exact format:
{
  "expression_formatted": "The expression in clean notation",
  "operation": "What operation was performed",
  "result": "The final answer, clearly and completely stated"
}

Return ONLY the JSON object, no markdown fences, no extra text.`;

const ANSWER_PROMPT = `You are a world-class mathematician. You solve math problems with perfect accuracy and give a concise answer with only the key steps.

CRITICAL RULES:
1. Show only the ESSENTIAL steps — no fluff, no over-explaining. 2-4 steps max.
2. DOUBLE-CHECK your arithmetic. Do not make calculation errors.
3. If there are multiple solutions, find ALL of them.
4. Verify your answer briefly.

FORMATTING — VERY IMPORTANT:
- NEVER use LaTeX commands like \\times \\quad \\frac \\sqrt \\cdot \\left \\right \\text etc.
- Use PLAIN TEXT with Unicode symbols instead:
  × for multiply, ÷ for divide, √ for square root, ² ³ for exponents, ± for plus-minus
  → for arrows, ≤ ≥ ≠ for comparisons, · for dot multiply, π for pi, ∞ for infinity
- Write fractions as (a)/(b) or a/b
- Write exponents as x^2 or x²
- Example GOOD: "2 × 3 = 6,  2 + 3 = 5"
- Example BAD: "2 \\times 3 = 6, \\quad 2 + 3 = 5"

You MUST respond with valid JSON in this exact format:
{
  "expression_formatted": "The expression in clean notation",
  "operation": "What operation was performed",
  "steps": [
    {
      "step": 1,
      "title": "Short title",
      "content": "Brief explanation",
      "math": "The math at this step (PLAIN TEXT, no LaTeX)"
    }
  ],
  "result": "The final answer",
  "verification": "Quick check that the answer is correct"
}

Return ONLY the JSON object, no markdown fences, no extra text.`;

const EXPLAIN_PROMPT = `You are a world-class math tutor. You solve math problems with perfect accuracy, explaining every single step in detail so a student fully understands the reasoning.

CRITICAL RULES:
1. SHOW EVERY STEP. Never skip steps. A student should follow your work line by line.
2. EXPLAIN WHY at each step — mention the rule, theorem, or property being applied.
3. DOUBLE-CHECK your arithmetic at every step. Do not make calculation errors.
4. If there are multiple solutions, find ALL of them.
5. For equations, state the domain/restrictions if relevant.
6. VERIFY your answer at the end by substituting back or an alternative method.
7. If the problem is ambiguous, state your interpretation before solving.
8. If it cannot be simplified further, explain why.

FORMATTING — VERY IMPORTANT:
- NEVER use LaTeX commands like \\times \\quad \\frac \\sqrt \\cdot \\left \\right \\text etc.
- Use PLAIN TEXT with Unicode symbols instead:
  × for multiply, ÷ for divide, √ for square root, ² ³ for exponents, ± for plus-minus
  → for arrows, ≤ ≥ ≠ for comparisons, · for dot multiply, π for pi, ∞ for infinity
- Write fractions as (a)/(b) or a/b
- Write exponents as x^2 or x²
- Example GOOD: "2 × 3 = 6,  2 + 3 = 5"
- Example BAD: "2 \\times 3 = 6, \\quad 2 + 3 = 5"

You MUST respond with valid JSON in this exact format:
{
  "expression_formatted": "The expression in clean notation",
  "operation": "What operation was performed",
  "steps": [
    {
      "step": 1,
      "title": "Short title for this step",
      "content": "Detailed explanation of what we're doing and WHY",
      "math": "The mathematical work for this step (PLAIN TEXT, no LaTeX)"
    }
  ],
  "result": "The final answer, clearly stated",
  "verification": "Show that the answer is correct by checking it thoroughly"
}

IMPORTANT:
- Each step must have ALL four fields (step, title, content, math)
- Make "content" conversational and educational — explain like a great tutor would
- "verification" must actually verify — substitute back, expand, differentiate the antiderivative, etc.
- Return ONLY the JSON object, no markdown fences, no extra text`;

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
    });

    const { expression, operation, mode = "answer" } = await req.json();

    if (!expression?.trim()) {
      return NextResponse.json(
        { error: "Expression is required" },
        { status: 400 }
      );
    }

    if (!operation?.trim()) {
      return NextResponse.json(
        { error: "Operation is required" },
        { status: 400 }
      );
    }

    const isExplain = mode === "explain";
    const isQuick = mode === "quick";
    const systemPrompt = isQuick ? QUICK_PROMPT : isExplain ? EXPLAIN_PROMPT : ANSWER_PROMPT;

    const modeInstruction = isQuick
      ? ". Give ONLY the final answer — no steps, no explanation"
      : isExplain
        ? ". Explain every step in detail"
        : ". Give a concise solution with key steps only";

    const userPrompt = `${operation} the following expression${modeInstruction}.

Expression: ${expression.trim()}

Operation: ${operation}

Be accurate. Double-check your work. Return ONLY valid JSON.`;

    const completion = await client.chat.completions.create({
      model: "google/gemma-4-31b-it:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: isQuick ? 800 : isExplain ? 4000 : 2000,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content?.trim();

    if (!raw) {
      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    // Parse JSON — try direct, then regex fallback
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
        } catch {
          return NextResponse.json(
            { error: "Failed to parse AI response. Please try again." },
            { status: 502 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Failed to parse AI response. Please try again." },
          { status: 502 }
        );
      }
    }

    // Validate required fields
    if (!isQuick && (!data.steps || !Array.isArray(data.steps) || data.steps.length === 0)) {
      return NextResponse.json(
        { error: "AI returned an incomplete solution. Please try again." },
        { status: 502 }
      );
    }

    if (!data.result) {
      return NextResponse.json(
        { error: "AI did not return a final answer. Please try again." },
        { status: 502 }
      );
    }

    // For quick mode, ensure no steps leak through
    if (isQuick) {
      data.steps = [];
      data.verification = "";
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (
      msg.toLowerCase().includes("rate") ||
      msg.toLowerCase().includes("limit") ||
      msg.toLowerCase().includes("429")
    ) {
      return NextResponse.json(
        { error: "Rate limited — too many requests. Wait a minute and try again." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
