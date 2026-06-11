import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Free-tier OpenRouter vision models, tried in order.
const VISION_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "nex-agi/nex-n2-pro:free",
];

const EXTRACT_PROMPT = `Look at this image of a math problem. Extract the mathematical expression or equation exactly as written.

RULES:
- Return ONLY the LaTeX representation of the math expression
- No explanation, no words, no markdown fences, no $ delimiters — just the raw LaTeX
- Fractions: \\frac{a}{b}, exponents: x^{2}, subscripts: x_{1}, roots: \\sqrt{x}, integrals: \\int
- If there are multiple expressions, return ONLY the main/first one
- If you cannot read any math clearly, return exactly: UNREADABLE
- For simple expressions like "3x + 7 = 22", return: 3x+7=22`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not set" }, { status: 500 });
    }

    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: { "X-Title": "Learnix Math Solver" },
    });
    const { image } = await req.json();

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid image is required" }, { status: 400 });
    }

    const messages = [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: EXTRACT_PROMPT },
          { type: "image_url" as const, image_url: { url: image } },
        ],
      },
    ];

    let raw = "";
    let lastErr = "";
    for (const model of VISION_MODELS) {
      try {
        const completion = await client.chat.completions.create({
          model,
          max_tokens: 500,
          temperature: 0,
          messages,
        }, { timeout: 40_000 }); // a hung vision model falls through to the next one
        const content = completion.choices[0]?.message?.content?.trim();
        if (content) {
          raw = content;
          break;
        }
        lastErr = `${model} returned an empty response`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }

    if (!raw) {
      const lower = lastErr.toLowerCase();
      if (lower.includes("429") || lower.includes("rate")) {
        return NextResponse.json(
          { error: "Rate limited — wait a minute and try again." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: lastErr || "All vision models failed. Please try again." },
        { status: 502 }
      );
    }

    if (raw.toUpperCase().includes("UNREADABLE")) {
      return NextResponse.json(
        { error: "Couldn't read the math from that image. Try a clearer photo." },
        { status: 422 }
      );
    }

    const latex = raw
      .replace(/^```(?:latex|tex)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .replace(/^\$\$?|\$\$?$/g, "")
      .replace(/^\\\[|\\\]$/g, "")
      .split("\n")[0]
      .trim();

    if (!latex) {
      return NextResponse.json(
        { error: "Couldn't read the math from that image. Try a clearer photo." },
        { status: 422 }
      );
    }

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
