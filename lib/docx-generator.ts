import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  PageNumber,
  TableOfContents,
} from "docx";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotesContent {
  title: string;
  overview: string;
  sections: {
    title: string;
    tldr: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    content: string;
    key_points: string[];
    examples: string[];
    connections: string;
    subsections: { title: string; content: string }[];
  }[];
  common_misconceptions: { misconception: string; reality: string }[];
  analogies: { concept: string; analogy: string; explanation: string }[];
  pros_cons: { applicable: boolean; context: string; pros: string[]; cons: string[] };
  timeline: { applicable: boolean; events: { year: string; event: string; significance: string }[] };
  process_flow: { applicable: boolean; title: string; steps: { step: number; title: string; description: string }[] };
  practice_problems: { problem: string; hint: string; answer: string }[];
  key_terms: { term: string; definition: string }[];
  summary: string;
  further_reading: string[];
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const ACCENT = "1E3A5F";
const ACCENT_LIGHT = "2E5FA3";
const ACCENT_BG = "EBF0F8";
const GOLD = "C07A1A";
const GREY_TEXT = "555555";
const GREEN = "16A34A";
const GREEN_BG = "F0FDF4";
const RED = "DC2626";
const RED_BG = "FEF2F2";
const PURPLE = "7C3AED";
const PURPLE_BG = "F5F3FF";
const AMBER = "D97706";
const AMBER_BG = "FFFBEB";
const INDIGO = "4F46E5";
const INDIGO_BG = "EEF2FF";
const TEAL = "0D9488";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, color: ACCENT, bold: true, size: 32, font: "Calibri" })],
  });
}

function heading2(text: string, color = ACCENT_LIGHT): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, color, bold: true, size: 26, font: "Calibri" })],
  });
}

function heading3(text: string, color = GOLD): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text, color, bold: true, size: 22, font: "Calibri" })],
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, font: "Calibri", color: GREY_TEXT })],
  });
}

function richBody(label: string, text: string, labelColor = ACCENT): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: label + " ", bold: true, size: 20, font: "Calibri", color: labelColor }),
      new TextRun({ text, size: 20, font: "Calibri", color: GREY_TEXT }),
    ],
  });
}

function bullet(text: string, level = 0): Paragraph {
  return new Paragraph({
    bullet: { level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 20, font: "Calibri", color: "333333" })],
  });
}

function shadedBlock(text: string, fill: string, textColor: string): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    shading: { fill, type: ShadingType.SOLID, color: fill },
    indent: { left: 200, right: 200 },
    children: [new TextRun({ text, size: 20, font: "Calibri", color: textColor })],
  });
}

function divider(): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { color: "CCCCCC", style: BorderStyle.SINGLE, size: 6 } },
    children: [],
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { before: 60, after: 60 }, children: [] });
}

// Table helpers
function headerCell(text: string, fill = ACCENT): TableCell {
  return new TableCell({
    shading: { fill, type: ShadingType.SOLID, color: fill },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 22, font: "Calibri" })] })],
  });
}

function dataCell(text: string, bold = false, color = GREY_TEXT, fill?: string): TableCell {
  return new TableCell({
    ...(fill ? { shading: { fill, type: ShadingType.SOLID, color: fill } } : {}),
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 20, font: "Calibri", color })] })],
  });
}

function numberCell(n: number | string): TableCell {
  return new TableCell({
    width: { size: 800, type: WidthType.DXA },
    shading: { fill: ACCENT, type: ShadingType.SOLID, color: ACCENT },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(n), bold: true, color: "FFFFFF", size: 24, font: "Calibri" })] })],
  });
}

// ─── Generate DOCX ───────────────────────────────────────────────────────────

export async function generateDocx(notes: NotesContent): Promise<Buffer> {
  const children: (Paragraph | Table | TableOfContents)[] = [];
  const DIFF_LABELS: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

  // ─── Cover Page ────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "NoteForge AI", color: ACCENT_LIGHT, size: 28, font: "Calibri", italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: notes.title, bold: true, color: ACCENT, size: 56, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
      children: [new TextRun({ text: `Comprehensive Notes  ·  ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, color: "888888", size: 22, font: "Calibri", italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60 },
      children: [
        new TextRun({ text: `${notes.sections.length} sections  ·  ${notes.key_terms.length} key terms  ·  ${notes.practice_problems?.length || 0} practice problems`, color: "AAAAAA", size: 18, font: "Calibri" }),
      ],
    }),
    divider(),
    new Paragraph({ spacing: { before: 600 }, children: [] }),
  );

  // ─── Table of Contents ─────────────────────────────────────────────────────
  children.push(
    heading1("Table of Contents"),
    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({ pageBreakBefore: true, children: [] }),
  );

  // ─── Overview ──────────────────────────────────────────────────────────────
  children.push(heading1("Overview"));
  notes.overview.split("\n\n").forEach(para => {
    if (para.trim()) children.push(body(para.trim()));
  });
  children.push(divider());

  // ─── Main Sections ─────────────────────────────────────────────────────────
  notes.sections.forEach(section => {
    children.push(heading1(section.title));

    // Difficulty + TL;DR
    const diffLabel = DIFF_LABELS[section.difficulty] || "Intermediate";
    if (section.tldr) {
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 80 },
          children: [
            new TextRun({ text: `[${diffLabel}]  `, bold: true, size: 18, font: "Calibri", color: section.difficulty === "beginner" ? GREEN : section.difficulty === "advanced" ? RED : AMBER }),
            new TextRun({ text: `TL;DR: ${section.tldr}`, italics: true, size: 20, font: "Calibri", color: "777777" }),
          ],
        })
      );
    }

    if (section.content) children.push(body(section.content));

    // Key Points
    if (section.key_points?.length) {
      children.push(heading3("Key Points"));
      section.key_points.forEach(pt => children.push(bullet(pt)));
    }

    // Real-World Examples
    if (section.examples?.length) {
      children.push(heading3("Real-World Examples", GREEN));
      section.examples.forEach(ex => children.push(shadedBlock(`• ${ex}`, GREEN_BG, "1A5632")));
    }

    // Connections
    if (section.connections) {
      children.push(richBody("Connections:", section.connections, PURPLE));
    }

    // Subsections
    section.subsections?.forEach(sub => {
      children.push(heading2(sub.title));
      if (sub.content) children.push(body(sub.content));
    });

    children.push(divider());
  });

  // ─── Common Misconceptions ─────────────────────────────────────────────────
  if (notes.common_misconceptions?.length) {
    children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    children.push(heading1("Common Misconceptions"));
    notes.common_misconceptions.forEach(m => {
      children.push(
        shadedBlock(`✗  ${m.misconception}`, RED_BG, RED),
        shadedBlock(`✓  ${m.reality}`, GREEN_BG, "15803D"),
        emptyLine(),
      );
    });
    children.push(divider());
  }

  // ─── Analogies ─────────────────────────────────────────────────────────────
  if (notes.analogies?.length) {
    children.push(heading1("Analogies & Comparisons"));
    const analogyRows = notes.analogies.map(a => new TableRow({
      children: [
        dataCell(a.concept, true, PURPLE, PURPLE_BG),
        dataCell(`"${a.analogy}"`, false, GREY_TEXT),
        dataCell(a.explanation, false, "777777"),
      ],
    }));
    children.push(new Table({
      width: { size: 9200, type: WidthType.DXA },
      rows: [
        new TableRow({ tableHeader: true, children: [headerCell("Concept", PURPLE), headerCell("Analogy", PURPLE), headerCell("Why It Works", PURPLE)] }),
        ...analogyRows,
      ],
    }));
    children.push(divider());
  }

  // ─── Pros & Cons ───────────────────────────────────────────────────────────
  if (notes.pros_cons?.applicable) {
    children.push(heading1(`Pros & Cons${notes.pros_cons.context ? `: ${notes.pros_cons.context}` : ""}`));
    const maxRows = Math.max(notes.pros_cons.pros?.length || 0, notes.pros_cons.cons?.length || 0);
    const prosConsRows: TableRow[] = [];
    for (let i = 0; i < maxRows; i++) {
      prosConsRows.push(new TableRow({
        children: [
          dataCell(notes.pros_cons.pros?.[i] ? `+ ${notes.pros_cons.pros[i]}` : "", false, "15803D", GREEN_BG),
          dataCell(notes.pros_cons.cons?.[i] ? `− ${notes.pros_cons.cons[i]}` : "", false, RED, RED_BG),
        ],
      }));
    }
    children.push(new Table({
      width: { size: 9200, type: WidthType.DXA },
      rows: [
        new TableRow({ tableHeader: true, children: [headerCell("Advantages", GREEN), headerCell("Disadvantages", RED)] }),
        ...prosConsRows,
      ],
    }));
    children.push(divider());
  }

  // ─── Timeline ──────────────────────────────────────────────────────────────
  if (notes.timeline?.applicable && notes.timeline.events?.length) {
    children.push(heading1("Timeline & History"));
    const timeRows = notes.timeline.events.map(ev => new TableRow({
      children: [
        dataCell(ev.year, true, AMBER, AMBER_BG),
        dataCell(ev.event, true, ACCENT),
        dataCell(ev.significance, false, GREY_TEXT),
      ],
    }));
    children.push(new Table({
      width: { size: 9200, type: WidthType.DXA },
      rows: [
        new TableRow({ tableHeader: true, children: [headerCell("Period", AMBER), headerCell("Event", AMBER), headerCell("Significance", AMBER)] }),
        ...timeRows,
      ],
    }));
    children.push(divider());
  }

  // ─── Process Flow ──────────────────────────────────────────────────────────
  if (notes.process_flow?.applicable && notes.process_flow.steps?.length) {
    children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    children.push(heading1(notes.process_flow.title));
    const flowRows = notes.process_flow.steps.map(step => new TableRow({
      children: [
        numberCell(step.step),
        dataCell(step.title, true, ACCENT),
        dataCell(step.description, false, GREY_TEXT),
      ],
    }));
    children.push(new Table({
      width: { size: 9200, type: WidthType.DXA },
      rows: [
        new TableRow({ tableHeader: true, children: [
          new TableCell({ width: { size: 800, type: WidthType.DXA }, shading: { fill: ACCENT_LIGHT, type: ShadingType.SOLID, color: ACCENT_LIGHT }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "#", bold: true, color: "FFFFFF", size: 22, font: "Calibri" })] })] }),
          headerCell("Stage", ACCENT_LIGHT),
          headerCell("Description", ACCENT_LIGHT),
        ] }),
        ...flowRows,
      ],
    }));
    children.push(divider());
  }

  // ─── Practice Problems ─────────────────────────────────────────────────────
  if (notes.practice_problems?.length) {
    children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    children.push(heading1("Practice Problems"));
    notes.practice_problems.forEach((pp, i) => {
      children.push(
        heading3(`Problem ${i + 1}`, INDIGO),
        shadedBlock(pp.problem, INDIGO_BG, INDIGO),
        richBody("Hint:", pp.hint, AMBER),
        richBody("Answer:", pp.answer, GREEN),
        emptyLine(),
      );
    });
    children.push(divider());
  }

  // ─── Key Terms Glossary ────────────────────────────────────────────────────
  children.push(heading1("Key Terms & Glossary"));
  const termsRows = notes.key_terms.map(item => new TableRow({
    children: [
      dataCell(item.term, true, ACCENT, ACCENT_BG),
      dataCell(item.definition, false, GREY_TEXT),
    ],
  }));
  children.push(new Table({
    width: { size: 9200, type: WidthType.DXA },
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell("Term"), headerCell("Definition")] }),
      ...termsRows,
    ],
  }));
  children.push(divider());

  // ─── Summary ───────────────────────────────────────────────────────────────
  children.push(heading1("Summary"));
  children.push(body(notes.summary));

  // ─── Further Reading ───────────────────────────────────────────────────────
  if (notes.further_reading?.length) {
    children.push(heading1("Further Reading"));
    notes.further_reading.forEach(r => children.push(bullet(r)));
  }

  // ─── Build Document ────────────────────────────────────────────────────────
  const doc = new Document({
    features: { updateFields: true },
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          basedOn: "Normal",
          run: { font: "Calibri", size: 22 },
          paragraph: { spacing: { line: 276 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
            pageNumbers: { start: 1 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `NoteForge AI  ·  ${notes.title}`, color: "AAAAAA", size: 16, font: "Calibri", italics: true }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Page ", color: "AAAAAA", size: 16, font: "Calibri" }),
                  new TextRun({ children: [PageNumber.CURRENT], color: "AAAAAA", size: 16, font: "Calibri" }),
                  new TextRun({ text: " of ", color: "AAAAAA", size: 16, font: "Calibri" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], color: "AAAAAA", size: 16, font: "Calibri" }),
                  new TextRun({ text: "  ·  Generated by NoteForge AI", color: "CCCCCC", size: 14, font: "Calibri" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
