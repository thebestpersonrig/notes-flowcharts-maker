import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── Model fallback chain ────────────────────────────────────────────────────

const MODELS = [
  "deepseek/deepseek-chat:free",
  "qwen/qwen3-32b:free",
  "google/gemma-4-31b-it:free",
];

// ─── Zod schema (bulletproof validation) ─────────────────────────────────────

const NotesSchema = z.object({
  title: z.string(),
  overview: z.string(),
  sections: z.array(
    z.object({
      title: z.string(),
      tldr: z.string(),
      difficulty: z.string(),
      content: z.string(),
      key_points: z.array(z.string()),
      examples: z.array(z.string()),
      connections: z.string(),
      subsections: z.array(
        z.object({
          title: z.string(),
          content: z.string(),
        })
      ),
    })
  ),
});

// ─── JSON safety helpers ─────────────────────────────────────────────────────

function extractAndFixJSON(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let jsonStr = match[0];

  jsonStr = jsonStr
    .replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
    .replace(/[\u0000-\u001F]+/g, " ");

  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// ─── Model execution with fallback ───────────────────────────────────────────

async function callModel(client: any, messages: any, max_tokens: number) {
  let lastError: any;

  for (const model of MODELS) {
    try {
      const res = await client.chat.completions.create({
        model,
        messages,
        max_tokens,
      });

      const text = res.choices[0]?.message?.content;
      if (text) return text;
    } catch (err) {
      lastError = err;
      console.log(`Model failed: ${model}`);
    }
  }

  throw lastError;
}

// ─── Retry + validation loop (CORE BRAIN) ────────────────────────────────────

async function safeGenerate(client: any, messages: any, max_tokens: number, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const raw = await callModel(client, messages, max_tokens);

      const parsed = extractAndFixJSON(raw);
      if (!parsed) throw new Error("Invalid JSON output");

      const validated = NotesSchema.safeParse(parsed);
      if (!validated.success) throw new Error("Schema validation failed");

      return validated.data;
    } catch (err: any) {
      const isRateLimit =
        err?.status === 429 ||
        err?.message?.includes("429") ||
        err?.message?.toLowerCase?.().includes("rate") ||
        err?.message?.toLowerCase?.().includes("too many");

      if (isRateLimit && i < retries) {
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
        continue;
      }

      if (i === retries) throw err;
    }
  }
}

const TEMPLATE_PROMPTS: Record<string, { system: string; maxTokens: number }> =
  {
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

    const {
      topic,
      grade,
      template = "study",
      file,
      compare,
      length = "medium",
    } = await req.json();

    if (!topic?.trim()) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const tmpl = TEMPLATE_PROMPTS[template] || TEMPLATE_PROMPTS.study;

    const LENGTH_SCALE: Record<string, any> = {
      short: { multiplier: 0.5, instruction: "SHORT" },
      medium: { multiplier: 1, instruction: "MEDIUM" },
      detailed: { multiplier: 1.4, instruction: "DETAILED" },
    };

    const lengthConfig = LENGTH_SCALE[length] || LENGTH_SCALE.medium;

    const finalMaxTokens = Math.round(
      tmpl.maxTokens * lengthConfig.multiplier
    );

    const gradeInstruction = grade ? `Grade level: ${grade}` : "";
    const compareInstruction = compare ? "COMPARE MODE enabled." : "";

    let fileContext = "";
    const isImage = file?.mime?.startsWith("image/");

    if (file && !isImage) {
      try {
        fileContext = Buffer.from(file.base64, "base64")
          .toString("utf-8")
          .slice(0, 15000);
      } catch {}
    }

    const prompt = `${tmpl.system}

${lengthConfig.instruction}

TOPIC: "${topic}"
${fileContext}
${gradeInstruction}
${compareInstruction}

Return ONLY valid JSON:
{ ... schema ... }

ABSOLUTE RULE: Return ONLY valid JSON.`;

    const messages = [{ role: "user", content: prompt }];

    const result = await safeGenerate(client, messages, finalMaxTokens);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Generate route error:", err);

    const msg = err?.message || String(err);

    if (
      msg.includes("429") ||
      msg.toLowerCase().includes("rate")
    ) {
      return NextResponse.json(
        { error: "Rate limited — too many requests. Please wait." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}