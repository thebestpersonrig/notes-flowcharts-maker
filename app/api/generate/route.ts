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

    const { topic, detailLevel = "detailed", grade } = await req.json();

    if (!topic?.trim()) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    // Build grade-aware instructions
    let gradeInstruction = "";
    if (grade) {
      const gradeLabel = grade === "college" ? "college/university" : `grade ${grade}`;
      gradeInstruction = `
CRITICAL — GRADE ADAPTATION:
The student is in ${gradeLabel}. You MUST adapt ALL explanations to their level:
- Use vocabulary and sentence complexity appropriate for a ${gradeLabel} student.
- If this topic is normally taught at a HIGHER grade level, break it down using simpler concepts they already know. Build up from fundamentals. Use step-by-step reasoning. Don't assume prerequisite knowledge they haven't learned yet.
- If this topic is normally taught at a LOWER grade level, you can be more concise and add deeper insights, connections to advanced topics, and nuance.
- Analogies should reference things a ${gradeLabel} student would relate to (school life, everyday experiences, pop culture).
- Practice problems should be solvable at the ${gradeLabel} level.
- For math/science: show worked-out steps appropriate for their level. Don't skip steps they wouldn't understand.
`;
    }

    const detailMap: Record<string, string> = {
      summary: "summary = short, concise overview hitting only the most important points. 2-3 sections max, shorter content, fewer subsections. Think quick study reference card.",
      brief: "brief = moderate overview covering main ideas with some depth",
      detailed: "detailed = full, comprehensive depth with thorough explanations",
      expert: "expert = advanced nuance, edge cases, deeper analysis for someone who wants mastery",
    };

    const prompt = `You are an expert educator and technical writer. Create comprehensive notes on: "${topic}".

Detail level: ${detailMap[detailLevel] || detailMap.detailed}
${gradeInstruction}

Return ONLY valid JSON (no markdown, no code fences):
{
  "title": "Descriptive title",
  "overview": "2-3 rich paragraphs",
  "sections": [
    {
      "title": "Section Title",
      "tldr": "One-line summary of this section",
      "difficulty": "beginner | intermediate | advanced",
      "content": "Detailed paragraph",
      "key_points": ["Point 1", "Point 2", "Point 3"],
      "examples": ["A specific real-world example with context and detail"],
      "connections": "How this section connects to other concepts or sections",
      "subsections": [{"title": "...", "content": "Detailed paragraph"}]
    }
  ],
  "common_misconceptions": [
    {"misconception": "What people wrongly believe", "reality": "The actual truth with explanation"}
  ],
  "analogies": [
    {"concept": "Technical concept", "analogy": "Everyday comparison", "explanation": "Why this analogy works"}
  ],
  "pros_cons": {
    "applicable": false,
    "context": "What is being compared or evaluated",
    "pros": ["Advantage 1"],
    "cons": ["Disadvantage 1"]
  },
  "timeline": {
    "applicable": false,
    "events": [{"year": "Year or period", "event": "What happened", "significance": "Why it matters"}]
  },
  "process_flow": {
    "applicable": false,
    "title": "How [Topic] Works",
    "steps": [{"step": 1, "title": "Step name", "description": "What happens and why"}]
  },
  "practice_problems": [
    {"problem": "A thought-provoking question", "hint": "A helpful hint", "answer": "The full answer with explanation"}
  ],
  "key_terms": [
    {"term": "Term", "definition": "Clear definition"}
  ],
  "summary": "A thorough summary tying everything together",
  "further_reading": ["Specific book or resource 1"]
}

CRITICAL RULES:
- For "summary" detail level: 2-3 sections, 2-3 key_points each, 1 example each, 0-1 subsections. Keep everything short and punchy.
- For other levels: 4-7 sections, each with: 3+ key_points, 1-2 specific examples, 1-3 subsections, a tldr, difficulty level, connections
- 3-5 common_misconceptions with detailed reality corrections
- 3-5 analogies using everyday objects/experiences
- pros_cons: set applicable=true ONLY if the topic genuinely involves choices, tradeoffs, or competing approaches. Leave false for pure knowledge topics.
- timeline: set applicable=true ONLY if the topic has meaningful historical development. Leave false for abstract/technical concepts.
- process_flow: set applicable=true ONLY if the topic involves a clear sequential process or workflow. Leave false for descriptive/conceptual topics.
- 3-5 practice_problems that test understanding, not just recall
- 8-12 key_terms (5-8 for summary)
- Make examples SPECIFIC (real companies, real events, real numbers), not generic
- Content must be genuinely educational and accurate
- If a grade level is specified, EVERY piece of content must be understandable by that grade level. This is the #1 priority.`;

    const message = await client.chat.completions.create({
      model: "openrouter/auto",
      max_tokens: detailLevel === "summary" ? 4000 : 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.choices[0].message.content ?? "";

    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("JSON parse failed. Raw output:", raw.slice(0, 500));
      return NextResponse.json(
        {
          error:
            "Failed to parse AI response: " +
            (err instanceof Error ? err.message : String(err)),
        },
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
