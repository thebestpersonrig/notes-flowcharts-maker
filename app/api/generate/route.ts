import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set in .env.local" }, { status: 500 });
  }
  const client = new GoogleGenAI({ apiKey });

  const { topic, detailLevel = "detailed" } = await req.json();

  if (!topic?.trim()) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const prompt = `You are an expert educator and technical writer. Create comprehensive, well-structured notes on the topic: "${topic}".

Detail level: ${detailLevel} (brief = overview only, detailed = full depth, expert = advanced nuance included)

Return ONLY valid JSON matching this exact schema (no markdown, no extra text):
{
  "title": "Descriptive title for the notes",
  "overview": "2-3 paragraph rich overview of the topic",
  "sections": [
    {
      "title": "Section Title",
      "content": "Detailed paragraph explaining this section",
      "key_points": ["Key point 1", "Key point 2", "Key point 3"],
      "subsections": [
        {
          "title": "Subsection title",
          "content": "Detailed paragraph for this subtopic"
        }
      ]
    }
  ],
  "process_flow": {
    "title": "How [Topic] Works — Step by Step",
    "steps": [
      { "step": 1, "title": "Step name", "description": "What happens in this step and why it matters" }
    ]
  },
  "key_terms": [
    { "term": "Term", "definition": "Clear, concise definition" }
  ],
  "summary": "A thorough summary paragraph tying everything together",
  "further_reading": ["Resource or book 1", "Resource or book 2", "Resource or book 3"]
}

Rules:
- Include 4-7 main sections
- Each section must have at least 3 key_points
- Each section should have 1-3 subsections
- Include 5-8 steps in process_flow
- Include 8-12 key_terms
- Make content genuinely educational and specific, not generic
- Write at a university level`;

  const result = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const raw = result.text ?? "";

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("JSON parse failed. Raw output:", raw.slice(0, 500));
    return NextResponse.json(
      { error: "Failed to parse AI response: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }

  return NextResponse.json(parsed);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Generate route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
