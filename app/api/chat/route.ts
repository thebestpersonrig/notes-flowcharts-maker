import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not set" }, { status: 500 });
    }

    const client = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey });
    const { message, notesContext, grade } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (!notesContext?.title) {
      return NextResponse.json({ error: "Notes context is required" }, { status: 400 });
    }

    const gradeHint = grade ? ` The student is in grade ${grade}, so adjust complexity accordingly.` : "";

    const systemPrompt = `You are a helpful study assistant. The student has generated notes on "${notesContext.title}" and wants to ask follow-up questions.${gradeHint}

Here is a summary of the notes for context:
- Topic: ${notesContext.title}
- Sections: ${notesContext.sections?.map((s: { title: string }) => s.title).join(", ")}
- Key terms: ${notesContext.key_terms?.slice(0, 10).map((t: { term: string }) => t.term).join(", ")}

Rules:
- Be concise but thorough (2-4 paragraphs max)
- Use simple language appropriate to the student's level
- Give specific examples when explaining
- If they ask to explain something simpler, use analogies and everyday comparisons
- If they ask for more detail, go deeper with nuance
- Format your response in plain text (no markdown headers, no bullet symbols)`;

    const completion = await client.chat.completions.create({
      model: "openrouter/auto",
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0].message.content ?? "Sorry, I couldn't generate a response.";
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Chat route error:", msg);
    if (msg.includes("429") || msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("too many")) {
      return NextResponse.json({ error: "Rate limited — please wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
