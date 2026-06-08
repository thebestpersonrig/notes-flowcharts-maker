import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const DIFFICULTY_PROMPTS: Record<string, string> = {
  easy: `DIFFICULTY: EASY
- Questions should test basic recall and definitions
- "What is...?", "Which of these is...?", "True or false style (as MCQ)"
- All options should be clearly distinct — no trick answers
- One option should be obviously wrong to help build confidence
- Focus on key terms and fundamental concepts`,

  medium: `DIFFICULTY: MEDIUM
- Questions should test understanding and application
- "Why does...?", "What would happen if...?", "Which best explains...?"
- Options should require thinking — no gimmes
- Include questions that connect two different concepts from the notes
- Some questions should apply concepts to new scenarios`,

  hard: `DIFFICULTY: HARD
- Questions should test analysis, synthesis, and critical thinking
- "Which of the following is the BEST explanation for...?"
- Include subtle distinctions between options — multiple should SEEM right
- Ask about edge cases, exceptions, and nuances
- Require combining knowledge from multiple sections
- Include "All of the above" or "None of the above" style traps where appropriate`,
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not set" }, { status: 500 });
    }

    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });

    const { notes, difficulty = "medium" } = await req.json();
    if (!notes?.title) {
      return NextResponse.json({ error: "Notes content required" }, { status: 400 });
    }

    const diffPrompt = DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.medium;

    const summary = `Topic: ${notes.title}\n\nKey sections: ${notes.sections
      .map((s: { title: string }) => s.title)
      .join(", ")}\n\nKey terms: ${notes.key_terms
      .map((t: { term: string; definition: string }) => `${t.term}: ${t.definition}`)
      .join("; ")}\n\nSummary: ${notes.summary}`;

    const prompt = `Based on these study notes, generate exactly 5 multiple-choice quiz questions.

${summary}

${diffPrompt}

Return ONLY valid JSON (no markdown, no code fences):
{
  "questions": [
    {
      "question": "Clear, well-written question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Brief explanation of why this answer is correct and why the others aren't"
    }
  ]
}

Rules:
- Exactly 5 questions, 4 options each
- "correct" is the 0-based index of the right answer
- Vary the position of the correct answer (don't always make it A)
- Explanations should teach, not just state the answer
- Questions must be answerable from the notes alone`;

    const message = await client.chat.completions.create({
      model: "google/gemma-4-31b-it:free",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.choices[0].message.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json({ error: "Failed to parse quiz response" }, { status: 500 });
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
