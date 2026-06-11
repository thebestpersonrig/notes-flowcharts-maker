import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not set" }, { status: 500 });
    }

    const client = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey });
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const visionModels = [
      "google/gemini-2.5-flash-preview-05-20:free",
      "google/gemma-4-31b-it:free",
      "qwen/qwen2.5-vl-72b-instruct:free",
    ];

    const messages = [
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: `Look at this image of a math problem. Extract the mathematical expression or equation exactly as written.

RULES:
- Return ONLY the LaTeX representation of the math expression
- No explanation, no words, no markdown fences — just the raw LaTeX
- If there are multiple expressions, return them separated by newlines
- If you cannot read the math clearly, return: UNREADABLE
- Common patterns: fractions use \\frac{}{}, exponents use ^{}, subscripts use _{}, square root uses \\sqrt{}
- For simple expressions like "3x + 7 = 22", just return: 3x + 7 = 22`,
          },
          {
            type: "image_url" as const,
            image_url: { url: image },
          },
        ],
      },
    ];

    let completion = null;
    let lastErr = "";
    for (const model of visionModels) {
      try {
        completion = await client.chat.completions.create({
          model,
          max_tokens: 500,
          temperature: 0,
          messages,
        });
        if (completion.choices[0]?.message?.content) break;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
        completion = null;
      }
    }

    if (!completion) {
      throw new Error(lastErr || "All vision models failed");
    }

    const raw = completion.choices[0]?.message?.content?.trim();

    if (!raw || raw === "UNREADABLE") {
      return NextResponse.json(
        { error: "Couldn't read the math from that image. Try a clearer photo." },
        { status: 422 }
      );
    }

    const latex = raw
      .replace(/^```(?:latex)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return NextResponse.json({ latex });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Math extract error:", msg);
    if (msg.includes("429") || msg.toLowerCase().includes("rate")) {
      return NextResponse.json({ error: "Rate limited — wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
