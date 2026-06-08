import { NextRequest, NextResponse } from "next/server";

// ─── Try Unsplash first (free, high quality) ─────────────────────────────

async function searchUnsplash(topic: string, accessKey: string): Promise<string | null> {
  try {
    const query = `${topic} educational diagram infographic`;
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const results = data?.results;
    if (!results?.length) return null;

    // Pick the first result — Unsplash relevance ranking is good
    const photo = results[0];
    // Use the regular size (1080w) for hero banner — not full (saves bandwidth)
    return photo?.urls?.regular || photo?.urls?.small || null;
  } catch {
    return null;
  }
}

// ─── Fallback: AI image generation via FLUX ──────────────────────────────

async function generateAIImage(topic: string, apiKey: string): Promise<string | null> {
  const prompt = `Clean, professional educational infographic diagram about "${topic}". Show key concepts visually with labeled components, arrows showing relationships, colorful flat design illustration style, educational poster quality, organized layout, light background, high detail, no watermark, no text overlays, suitable for a student study guide.`;

  for (const model of ["black-forest-labs/flux-schnell", "black-forest-labs/flux-1-schnell"]) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, prompt, n: 1, size: "1024x768" }),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const url = data?.data?.[0]?.url || data?.data?.[0]?.b64_json;
      if (!url) continue;
      return url.startsWith("http") ? url : `data:image/png;base64,${url}`;
    } catch {
      continue;
    }
  }
  return null;
}

// ─── Route handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    const { topic } = await req.json();

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    // 1. Try Unsplash first (free, fast, high quality, no AI cost)
    if (unsplashKey) {
      const webUrl = await searchUnsplash(topic, unsplashKey);
      if (webUrl) {
        return NextResponse.json({ url: webUrl, source: "web" });
      }
    }

    // 2. Fall back to AI generation
    if (!openrouterKey) {
      return NextResponse.json({ error: "No image found and no API keys configured" }, { status: 500 });
    }

    const aiUrl = await generateAIImage(topic, openrouterKey);
    if (aiUrl) {
      return NextResponse.json({ url: aiUrl, source: "ai" });
    }

    return NextResponse.json({ error: "Could not find or generate an image" }, { status: 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Image route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
