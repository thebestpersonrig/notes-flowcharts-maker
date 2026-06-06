import { NextRequest, NextResponse } from "next/server";
import { generateDocx, NotesContent } from "@/lib/docx-generator";

export async function POST(req: NextRequest) {
  const notes: NotesContent = await req.json();

  if (!notes?.title) {
    return NextResponse.json({ error: "Invalid notes content" }, { status: 400 });
  }

  const buffer = await generateDocx(notes);
  const filename = `${notes.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_notes.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
