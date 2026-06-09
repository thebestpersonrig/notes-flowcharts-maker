import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const ANSWER_PROMPT = `You are a world-class mathematician. You solve math problems with perfect accuracy and give a concise answer with only the key steps.

CRITICAL RULES:
1. Figure out what the student wants (solve, simplify, factor, evaluate, differentiate, integrate, etc.) from the expression itself.
2. Show only the ESSENTIAL steps — no fluff, no over-explaining. 2-4 steps max.
3. DOUBLE-CHECK your arithmetic. Do not make calculation errors.
4. If there are multiple solutions, find ALL of them.
5. Use correct math notation: exponents as ^, fractions as (a)/(b), sqrt as √.
6. Verify your answer briefly.

You MUST respond with valid JSON in this exact format:
{
  "expression_formatted": "The expression rewritten in clean math notation",
  "operation": "What you determined to do (e.g. Solve, Simplify, Factor, etc.)",
  "steps": [
    {
      "step": 1,
      "title": "Short title",
      "content": "Brief explanation",
      "math": "The math at this step"
    }
  ],
  "result": "The final answer",
  "verification": "Quick check that the answer is correct"
}

IMPORTANT: Return ONLY the JSON object, no markdown fences, no extra text.`;

const EXPLAIN_PROMPT = `You are a world-class math tutor. You solve math problems with perfect accuracy, explaining every single step in detail so a student fully understands the reasoning.

CRITICAL RULES:
1. Figure out what the student wants (solve, simplify, factor, evaluate, differentiate, integrate, etc.) from the expression itself.
2. SHOW EVERY STEP. Never skip steps. A student should follow your work line by line.
3. EXPLAIN WHY at each step — don't just show what you did, explain the reasoning and the rule/theorem being used.
4. DOUBLE-CHECK your arithmetic at every step. Do not make calculation errors.
5. If there are multiple solutions, find ALL of them.
6. For equations, state the domain/restrictions if relevant.
7. Use correct math notation: exponents as ^, fractions as (a)/(b), sqrt as √.
8. VERIFY your answer at the end by substituting back or an alternative method.
9. If the problem is ambiguous, state your interpretation before solving.
10. If it cannot be simplified further, explain why.

You MUST respond with valid JSON in this exact format:
{
  "expression_formatted": "The expression rewritten in clean math notation",
  "operation": "What you determined to do (e.g. Solve, Simplify, Factor, etc.)",
  "steps": [
    {
      "step": 1,
      "title": "Short title for this step",
      "content": "Detailed explanation of what we're doing and WHY — mention the rule, theorem, or property being applied",
      "math": "The mathematical work for this step"
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
    const systemPrompt = isExplain ? EXPLAIN_PROMPT : ANSWER_PROMPT;

    const userPrompt = `${operation} the following expression${isExplain ? ". Explain every step in detail" : ". Give a concise solution with key steps only"}.

Expression: ${expression.trim()}

Operation: ${operation}

Be accurate. Double-check your work. Return ONLY valid JSON.`;

    const completion = await client.chat.completions.create({
      model: "google/gemma-4-31b-it:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: isExplain ? 4000 : 2000,
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
    if (!data.steps || !Array.isArray(data.steps) || data.steps.length === 0) {
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
