import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not set" }, { status: 500 });
    }

    const { topic, section } = await req.json();
    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    // Build a detailed educational image prompt
    const subject = section || topic;
    const prompt = `Clean, professional educational infographic diagram about "${subject}". Show key concepts visually with labeled components, arrows showing relationships, colorful flat design illustration style, educational poster quality, organized layout, light background, high detail, no watermark, no text overlays, suitable for a student study guide. Topic context: ${topic}.`;

    const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "black-forest-labs/flux-schnell",
        prompt,
        n: 1,
        size: "1024x768",
      }),
    });

    if (!res.ok) {
      // Fallback: try flux-1-schnell-free if the first model name doesn't work
      const res2 = await fetch("https://openrouter.ai/api/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "black-forest-labs/flux-1-schnell",
          prompt,
          n: 1,
          size: "1024x768",
        }),
      });

      if (!res2.ok) {
        const err = await res2.text();
        console.error("Image gen error:", err);
        return NextResponse.json({ error: "Image generation failed", details: err }, { status: 500 });
      }

      const data2 = await res2.json();
      const url = data2?.data?.[0]?.url || data2?.data?.[0]?.b64_json;
      if (!url) {
        return NextResponse.json({ error: "No image returned" }, { status: 500 });
      }
      const isBase64 = !url.startsWith("http");
      return NextResponse.json({ url: isBase64 ? `data:image/png;base64,${url}` : url });
    }

    const data = await res.json();
    const url = data?.data?.[0]?.url || data?.data?.[0]?.b64_json;
    if (!url) {
      return NextResponse.json({ error: "No image returned" }, { status: 500 });
    }
    const isBase64 = !url.startsWith("http");
    return NextResponse.json({ url: isBase64 ? `data:image/png;base64,${url}` : url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Image route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
