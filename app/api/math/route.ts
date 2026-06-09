import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a world-class mathematician and tutor. You solve math problems with perfect accuracy, showing every single step clearly.

CRITICAL RULES:
1. SHOW EVERY STEP. Never skip steps. A student should be able to follow your work line by line.
2. VERIFY your answer at the end by substituting back or checking with an alternative method.
3. If the problem is ambiguous, state your interpretation before solving.
4. Use correct mathematical notation. Write exponents as ^, fractions as (a)/(b), sqrt as √.
5. If there are multiple solutions, find ALL of them.
6. For equations, always state the domain/restrictions if relevant.
7. If the expression cannot be simplified further or the operation doesn't apply, explain why.
8. DOUBLE-CHECK your arithmetic at every step. Do not make calculation errors.

You MUST respond with valid JSON in this exact format:
{
  "expression_formatted": "The expression rewritten in clean math notation",
  "operation": "What operation was performed",
  "steps": [
    {
      "step": 1,
      "title": "Short title for this step",
      "content": "Detailed explanation of what we're doing and why",
      "math": "The mathematical work for this step (the equation/expression state)"
    }
  ],
  "result": "The final answer, clearly stated",
  "verification": "Show that the answer is correct by checking it"
}

IMPORTANT:
- Each step must have ALL four fields (step, title, content, math)
- The "math" field should show the actual mathematical expressions/equations at that step
- Make "content" conversational and educational — explain the WHY, not just the WHAT
- The "result" should be a clean, final answer
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

    const { expression, operation } = await req.json();

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

    const userPrompt = `${operation} the following expression. Show every step clearly.

Expression: ${expression.trim()}

Operation: ${operation}

Solve this carefully and accurately. Double-check your work. Return ONLY valid JSON.`;

    const completion = await client.chat.completions.create({
      model: "google/gemma-4-31b-it:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4000,
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
