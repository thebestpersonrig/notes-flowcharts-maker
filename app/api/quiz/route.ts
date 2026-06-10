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

    const { notes, topic, difficulty = "medium", count = 5 } = await req.json();
    if (!notes?.title && !topic?.trim()) {
      return NextResponse.json({ error: "Topic or notes content required" }, { status: 400 });
    }

    const diffPrompt = DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.medium;
    const numQuestions = Math.min(Math.max(Number(count) || 5, 3), 15);

    let prompt: string;

    if (notes?.title) {
      // Generate from notes (existing flow)
      const summary = `Topic: ${notes.title}\n\nKey sections: ${notes.sections
        .map((s: { title: string }) => s.title)
        .join(", ")}\n\nKey terms: ${notes.key_terms
        .map((t: { term: string; definition: string }) => `${t.term}: ${t.definition}`)
        .join("; ")}\n\nSummary: ${notes.summary}`;

      prompt = `Based on these study notes, generate exactly ${numQuestions} multiple-choice quiz questions.

${summary}

${diffPrompt}`;
    } else {
      // Generate from topic (standalone quiz)
      prompt = `Generate exactly ${numQuestions} multiple-choice quiz questions about: "${topic.trim()}"

${diffPrompt}

IMPORTANT: Questions should be factually accurate, educational, and appropriate for studying this topic. Cover different aspects of the topic — don't repeat the same subtopic.`;
    }

    prompt += `

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
- Exactly ${numQuestions} questions, 4 options each
- "correct" is the 0-based index of the right answer
- Vary the position of the correct answer (don't always make it A)
- CRITICAL — Explanations must explain WHY the correct answer is right AND briefly explain why EACH wrong answer is wrong. Format: "Correct: [A] because [reason]. B is wrong because [reason]. C is wrong because [reason]. D is wrong because [reason]."
- Write questions that a student might actually see on an exam — not obscure trivia`;

    const message = await client.chat.completions.create({
      model: "google/gemma-4-31b-it:free",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.choices[0]?.message?.content ?? "";

    if (!raw.trim()) {
      return NextResponse.json({ error: "The AI returned an empty response. Please try again." }, { status: 500 });
    }

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("Quiz JSON parse failed. Raw:", raw.slice(0, 500));
        return NextResponse.json({ error: "The AI didn't return a valid quiz. Please try again." }, { status: 500 });
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return NextResponse.json({ error: "The AI didn't return a valid quiz. Please try again." }, { status: 500 });
      }
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json({ error: "The AI returned an incomplete quiz. Please try again." }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Quiz route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
