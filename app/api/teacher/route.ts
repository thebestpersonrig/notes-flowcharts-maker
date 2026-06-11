import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "openai/gpt-oss-120b:free",
  "google/gemma-4-31b-it:free",
];

const MAX_HISTORY = 16;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
    });

    const { messages, subject, grade } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const history: ChatMessage[] = messages
      .filter(
        (m: ChatMessage) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .slice(-MAX_HISTORY);

    if (history.length === 0 || history[history.length - 1].role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from the user" },
        { status: 400 }
      );
    }

    const subjectHint = subject ? ` The student wants help with ${subject}.` : "";
    const gradeHint = grade
      ? ` The student is in grade ${grade}, so pitch explanations at that level.`
      : "";

    const systemPrompt = `You are Learnix Teacher, a warm, patient one-on-one AI tutor.${subjectHint}${gradeHint}

How you teach:
- Explain concepts step by step, building from what the student already knows
- Use everyday analogies and concrete examples before formal definitions
- After explaining something, ask ONE short follow-up question to check understanding
- If the student answers wrong, don't just give the answer — guide them toward it with a hint first
- If the student is stuck or frustrated, simplify and encourage them
- Keep each reply focused: 1-3 short paragraphs, not a lecture
- For math, write expressions in plain notation like x^2, sqrt(x), 3/4
- Format in plain text only: no markdown headers, no asterisks, no bullet symbols
- Stay on educational topics; gently redirect anything else back to learning`;

    let reply = "";
    let lastErr = "";
    for (const model of MODELS) {
      try {
        const completion = await client.chat.completions.create({
          model,
          max_tokens: 1500,
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
        }, { timeout: 30_000 });
        const content = completion.choices[0]?.message?.content?.trim();
        if (content) { reply = content; break; }
        lastErr = `${model} returned empty`;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }

    if (!reply) {
      const lower = lastErr.toLowerCase();
      if (lower.includes("429") || lower.includes("rate")) {
        return NextResponse.json({ error: "Rate limited — wait a minute and try again." }, { status: 429 });
      }
      return NextResponse.json({ error: lastErr || "All models failed." }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Teacher route error:", msg);
    if (msg.includes("429") || msg.toLowerCase().includes("rate")) {
      return NextResponse.json({ error: "Rate limited — wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
