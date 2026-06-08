import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// ─── Per-template system prompts ─────────────────────────────────────────────

const TEMPLATE_PROMPTS: Record<string, { system: string; maxTokens: number }> = {
  study: {
    system: `You are a world-class educator writing comprehensive study notes. Your goal is to make the student deeply UNDERSTAND the topic, not just memorize it.

WRITING STYLE:
- Open each section with a hook — a surprising fact, a "why this matters" statement, or a thought-provoking question
- Explain concepts by building from what students already know to what's new
- Use the "explain, illustrate, apply" pattern: explain the concept, give a vivid example, then show how to use it
- Write in an engaging, conversational-but-authoritative tone — like a brilliant tutor, not a textbook
- Every paragraph should teach ONE clear idea
- Use specific numbers, names, and real-world details — never be vague
- Connect ideas across sections so the student sees the big picture`,
    maxTokens: 8000,
  },

  cheatsheet: {
    system: `You are creating a dense, exam-ready cheat sheet. This is what a student tapes to their wall the night before a test.

WRITING STYLE:
- Ruthlessly concise — every word must earn its place
- Use bullet fragments, not full sentences: "Mitosis = cell division → 2 identical daughter cells"
- Lead with formulas, definitions, and rules — the stuff that's easy to forget
- Group related facts together under clear headers
- Include mnemonic devices and memory tricks wherever possible (e.g., "ROY G. BIV", "King Philip Came Over For Good Spaghetti")
- Add quick "watch out!" warnings for common exam traps
- If there are formulas, show them with variable labels
- 2-3 sections max — keep it SHORT and scannable
- Fewer subsections, more key_points per section
- Practice problems should be rapid-fire, exam-style questions`,
    maxTokens: 4000,
  },

  revision: {
    system: `You are writing a quick revision guide for a student reviewing the night before an exam. Speed and clarity are everything.

WRITING STYLE:
- Structure like a "greatest hits" — only the most important, most testable content
- Start each section with a one-sentence "the single most important thing to know here is..."
- Use simple, punchy language — short sentences, active voice
- Include "If you remember ONE thing..." callouts
- Add "Exam tip:" notes for likely test questions and how to approach them
- Memory tricks and acronyms for anything that requires memorization
- Quick self-test questions at the end of each section
- 3-4 sections covering the core material
- Practice problems should mimic actual exam questions`,
    maxTokens: 5000,
  },

  deepdive: {
    system: `You are a subject-matter expert writing an advanced deep dive for someone who wants genuine mastery — not just a passing grade.

WRITING STYLE:
- Go beyond surface-level: explore WHY things work, not just WHAT they are
- Include historical context — who discovered this, what problem were they solving, what came before
- Discuss edge cases, exceptions, and "yes, but..." nuances that separate experts from beginners
- Present competing theories or interpretations where they exist
- Connect to adjacent fields and interdisciplinary insights
- Use precise technical language but define it clearly
- Include "Advanced insight:" callouts for particularly subtle points
- 5-7 substantial sections with multiple subsections each
- Practice problems should require synthesis and critical thinking, not just recall
- Examples should be complex, real-world scenarios`,
    maxTokens: 10000,
  },

  research: {
    system: `You are an academic researcher helping a student build a well-argued essay or research paper on this topic.

WRITING STYLE:
- Structure around ARGUMENTS and ANALYSIS, not just description
- Each section should present a thesis or line of reasoning, not just facts
- Include multiple perspectives and counterarguments — show intellectual depth
- Reference specific studies, papers, events, and thinkers (use real ones)
- Use academic language: "This suggests...", "Evidence indicates...", "Scholars debate whether..."
- Highlight areas of controversy or ongoing debate in the field
- Include "Argument:" and "Counter-argument:" pairs
- Provide quotable insights and statistics a student could use in an essay
- Further reading should be specific: real books, real papers, real authors
- Practice problems should be essay-style prompts and critical thinking questions`,
    maxTokens: 8000,
  },

  eli5: {
    system: `You are explaining this topic to someone with ZERO background knowledge. Make it absurdly simple and fun.

WRITING STYLE:
- Explain like you're talking to a curious 5-year-old (but a smart one)
- Use everyday analogies for EVERYTHING: "DNA is like a recipe book for your body"
- Avoid ALL jargon — if you must use a technical term, immediately explain it in simple words
- Use "Imagine..." and "Think of it like..." constantly
- Short paragraphs, simple sentences, lots of comparisons to everyday life
- Make it fun and engaging — use humor, surprising facts, and "wow" moments
- "Did you know?" callouts for mind-blowing facts
- 3-4 sections, each explaining one big idea very simply
- Key terms should have the simplest possible definitions
- Examples should use things everyone knows: food, sports, games, animals, school
- Practice problems should be fun thought experiments, not intimidating questions`,
    maxTokens: 5000,
  },

  cornell: {
    system: `You are creating study material structured in the Cornell Notes format — the most effective note-taking method for active learning and review.

WRITING STYLE:
- Each section represents a "page" of Cornell Notes
- Key points should be written as QUESTIONS (the "cue column") — e.g., "What causes tides?" not "Tides are caused by..."
- Content in each section is the detailed answer to those questions
- The section's tldr serves as the "summary" at the bottom of each Cornell page
- Subsections break down complex answers into digestible parts
- Include review questions that test recall: "Cover the right side and try to answer using only the cue questions"
- Connections field should link to other sections: "This relates to Section 2 because..."
- Practice problems should be self-test questions written in the cue-question style
- 4-6 sections, each organized as a clear question-and-answer unit
- Key terms should be formatted as "Term → Definition" pairs for quick review`,
    maxTokens: 7000,
  },

  lecture: {
    system: `You are a university lecturer preparing organized, engaging class notes that follow a logical teaching progression.

WRITING STYLE:
- Structure like an actual lecture: introduction → core concepts → worked examples → deeper implications → recap
- Open with "Today we're going to learn..." framing — set expectations up front
- Build concepts sequentially — each section should build on the previous one
- Include "Let's pause here" moments to check understanding
- Use transitional phrases: "Now that we understand X, let's see how it connects to Y..."
- Include worked examples that walk through problems step-by-step (show your work)
- Add "Common student question:" callouts for things students typically ask
- End each section with a brief recap before moving on
- 4-6 sections following a clear narrative arc
- Practice problems should escalate in difficulty: one easy, one medium, one hard
- Write as if you're speaking to students — warm, encouraging, but rigorous`,
    maxTokens: 8000,
  },
};

// ─── Route handler ───────────────────────────────────────────────────────────

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

    const { topic, grade, template = "study", file, compare, length = "medium" } = await req.json();

    if (!topic?.trim()) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    // Validate file if present (2MB base64 ≈ 2.66MB string)
    if (file && typeof file.base64 === "string" && file.base64.length > 3_000_000) {
      return NextResponse.json(
        { error: "File too large. Max 2MB." },
        { status: 400 }
      );
    }

    const tmpl = TEMPLATE_PROMPTS[template] || TEMPLATE_PROMPTS.study;

    // Scale maxTokens by length
    const LENGTH_SCALE: Record<string, { multiplier: number; instruction: string }> = {
      short: {
        multiplier: 0.5,
        instruction: `LENGTH: SHORT — Be concise. 2-3 sections max. Keep explanations brief (1-2 paragraphs each). Fewer examples, fewer key terms (5-8). Get to the point fast. No filler.`,
      },
      medium: {
        multiplier: 1,
        instruction: `LENGTH: MEDIUM — Standard depth. 3-5 sections. Balanced explanations with enough detail to understand fully.`,
      },
      detailed: {
        multiplier: 1.4,
        instruction: `LENGTH: DETAILED — Go deep. 5-7+ sections with subsections. Thorough explanations, multiple examples per section, extensive key terms (12-20). Cover edge cases, nuances, and connections. Leave nothing out.`,
      },
    };
    const lengthConfig = LENGTH_SCALE[length] || LENGTH_SCALE.medium;
    const finalMaxTokens = Math.round(tmpl.maxTokens * lengthConfig.multiplier);

    // Build grade-aware instructions
    let gradeInstruction = "";
    if (grade) {
      const gradeLabel = grade === "college" ? "college/university" : `grade ${grade}`;
      gradeInstruction = `
CRITICAL — GRADE ADAPTATION:
The student is in ${gradeLabel}. You MUST adapt ALL content to their level:
- Vocabulary, sentence complexity, and conceptual depth must match a ${gradeLabel} student
- If this topic is above their level, build up from fundamentals they already know — don't assume prerequisites
- If below their level, be concise and add deeper connections
- Analogies should reference things a ${gradeLabel} student relates to
- Practice problems must be solvable at their level
- For math/science: show worked-out steps appropriate for their level
`;
    }

    // Compare mode instruction
    const compareInstruction = compare ? `
COMPARE MODE: The topic contains "vs" — the user wants a COMPARISON.
- Structure sections around DIFFERENCES and SIMILARITIES between the two subjects
- Use a dedicated section for "Key Differences" and "Key Similarities"
- pros_cons MUST be applicable — pros/cons of each subject relative to the other
- Use the same criteria to evaluate both subjects so the comparison is fair
- Analogies should highlight how the two subjects differ
- Practice problems should ask students to distinguish between the two
` : "";

    // Handle text file content — decode base64 and include inline
    let fileContext = "";
    const isImage = file?.mime?.startsWith("image/");
    if (file && !isImage) {
      try {
        const text = Buffer.from(file.base64, "base64").toString("utf-8").slice(0, 15_000);
        fileContext = `\n\nATTACHED FILE ("${file.name}"):\n---\n${text}\n---\nUse this file's content as source material. Extract key information and incorporate it into the notes.\n`;
      } catch { /* ignore decode errors */ }
    }
    const imageInstruction = isImage
      ? "\n\nThe user has attached an image (shown below). Carefully analyze everything visible in the image — text, diagrams, equations, handwriting, charts — and use it as primary source material for generating the notes. The notes should cover what's in the image.\n"
      : "";

    const prompt = `${tmpl.system}

${lengthConfig.instruction}

TOPIC: "${topic}"${imageInstruction}${fileContext}${compareInstruction}
${gradeInstruction}

Return ONLY valid JSON (no markdown, no code fences, no text before or after the JSON):
{
  "title": "A compelling, descriptive title for these notes",
  "overview": "2-3 paragraphs introducing the topic. Hook the reader immediately — why does this topic matter? What will they learn? Make it engaging, not dry.",
  "sections": [
    {
      "title": "Section Title",
      "tldr": "One crisp sentence summarizing this section's key takeaway",
      "difficulty": "beginner | intermediate | advanced",
      "content": "A thorough, well-written paragraph (or two) explaining the core idea. Be specific. Use concrete details, not vague generalities.",
      "key_points": ["Each point should be a complete, useful thought — not a fragment", "Include enough detail to be useful on its own", "3-5 points per section"],
      "examples": ["A SPECIFIC real-world example with names, numbers, or concrete details — not 'for example, some companies use this'"],
      "connections": "How this connects to other sections, related concepts, or the bigger picture",
      "subsections": [{"title": "Subtopic", "content": "Detailed explanation"}]
    }
  ],
  "common_misconceptions": [
    {"misconception": "State what people commonly get wrong", "reality": "Explain the truth clearly and why the misconception exists"}
  ],
  "analogies": [
    {"concept": "The technical concept", "analogy": "A vivid everyday comparison", "explanation": "Why this analogy captures the essence of the concept"}
  ],
  "pros_cons": {
    "applicable": false,
    "context": "What's being evaluated (only if the topic involves genuine tradeoffs)",
    "pros": ["Specific advantage with explanation"],
    "cons": ["Specific disadvantage with explanation"]
  },
  "timeline": {
    "applicable": false,
    "events": [{"year": "Year", "event": "What happened", "significance": "Why it matters to this topic"}]
  },
  "process_flow": {
    "applicable": false,
    "title": "How [Process] Works",
    "steps": [{"step": 1, "title": "Step name", "description": "What happens and why it matters"}]
  },
  "practice_problems": [
    {"problem": "A thoughtful question that tests genuine understanding", "hint": "A useful nudge toward the answer", "answer": "A complete, well-explained answer"}
  ],
  "key_terms": [
    {"term": "Term", "definition": "A clear, complete definition — not just 2 words"}
  ],
  "summary": "A satisfying wrap-up that ties everything together and reinforces the most important ideas",
  "further_reading": ["Specific book/resource/topic title for further learning"]
}

OUTPUT RULES:
- pros_cons.applicable = true ONLY if the topic genuinely involves choices or tradeoffs. False for pure knowledge topics.
- timeline.applicable = true ONLY if the topic has real historical development. False for abstract concepts.
- process_flow.applicable = true ONLY if there's a clear sequential process. False for descriptive topics.
- 3-5 common_misconceptions — things people ACTUALLY get wrong, not made-up ones
- 3-5 analogies using everyday objects and experiences people can instantly picture
- 3-5 practice_problems that test UNDERSTANDING, not just recall
- 8-15 key_terms with real, useful definitions
- Make examples SPECIFIC: use real companies, real events, real numbers, real people — not "for example, a company might..."
- Every piece of content must be factually accurate
- If a grade level is specified, EVERY piece of content must be appropriate for that level — this overrides everything else`;

    // Build messages — use multimodal format for images
    type TextPart = { type: "text"; text: string };
    type ImagePart = { type: "image_url"; image_url: { url: string } };
    type ContentPart = TextPart | ImagePart;

    let messages: { role: "user"; content: string | ContentPart[] }[];
    if (isImage && file) {
      messages = [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${file.mime};base64,${file.base64}` } },
        ],
      }];
    } else {
      messages = [{ role: "user", content: prompt }];
    }

    const message = await client.chat.completions.create({
      model: "openrouter/auto",
      max_tokens: finalMaxTokens,
      messages,
    });

    const raw = message.choices[0].message.content ?? "";

    // Strip markdown code fences if present, and extract JSON robustly
    let cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON object from the response
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("JSON parse failed. Raw output:", raw.slice(0, 500));
        return NextResponse.json(
          { error: "Failed to parse AI response. Please try again." },
          { status: 500 }
        );
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch (err) {
        console.error("JSON fallback parse failed:", err);
        return NextResponse.json(
          { error: "Failed to parse AI response. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Generate route error:", msg);

    // Friendly rate limit message
    if (msg.includes("429") || msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("too many")) {
      return NextResponse.json({ error: "Rate limited — too many requests. Please wait a minute and try again." }, { status: 429 });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
