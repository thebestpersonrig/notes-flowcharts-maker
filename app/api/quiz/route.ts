import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

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

    const { notes } = await req.json();
    if (!notes?.title) {
      return NextResponse.json(
        { error: "Notes content required" },
        { status: 400 }
      );
    }

    const summary = `Topic: ${notes.title}\n\nKey sections: ${notes.sections
      .map((s: { title: string }) => s.title)
      .join(", ")}\n\nKey terms: ${notes.key_terms
      .map((t: { term: string; definition: string }) => `${t.term}: ${t.definition}`)
      .join("; ")}\n\nSummary: ${notes.summary}`;

    const prompt = `Based on these notes, generate exactly 5 multiple-choice quiz questions to test understanding.

${summary}

Return ONLY valid JSON (no markdown, no code fences):
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Rules:
- Exactly 5 questions
- 4 options each
- "correct" is the 0-based index of the right answer
- Questions should test genuine understanding, not trivial recall
- Mix difficulty levels
- Explanations should be educational`;

    const message = await client.chat.completions.create({
      model: "openrouter/auto",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.choices[0].message.content ?? "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json(
          { error: "Failed to parse quiz response" },
          { status: 500 }
        );
      }
      parsed = JSON.parse(match[0]);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Quiz route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
