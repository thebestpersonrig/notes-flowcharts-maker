import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

export interface NotesContent {
  title: string;
  overview: string;
  sections: {
    title: string;
    content: string;
    key_points: string[];
    subsections: { title: string; content: string }[];
  }[];
  process_flow: {
    title: string;
    steps: { step: number; title: string; description: string }[];
  };
  key_terms: { term: string; definition: string }[];
  summary: string;
  further_reading: string[];
}

const ACCENT = "1E3A5F";
const ACCENT_LIGHT = "2E5FA3";
const ACCENT_BG = "EBF0F8";
const GOLD = "C07A1A";
const GREY_TEXT = "555555";

function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [
      new TextRun({
        text,
        color: ACCENT,
        bold: true,
        size: 32,
        font: "Calibri",
      }),
    ],
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [
      new TextRun({
        text,
        color: ACCENT_LIGHT,
        bold: true,
        size: 26,
        font: "Calibri",
      }),
    ],
  });
}

function heading3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
    children: [
      new TextRun({
        text,
        color: GOLD,
        bold: true,
        size: 22,
        font: "Calibri",
      }),
    ],
  });
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({
        text,
        size: 22,
        font: "Calibri",
        color: GREY_TEXT,
      }),
    ],
  });
}

function bulletPoint(text: string, level = 0): Paragraph {
  return new Paragraph({
    bullet: { level },
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text,
        size: 20,
        font: "Calibri",
        color: "333333",
      }),
    ],
  });
}

function divider(): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: {
      bottom: {
        color: "CCCCCC",
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [],
  });
}

function stepRow(step: {
  step: number;
  title: string;
  description: string;
}): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 800, type: WidthType.DXA },
        shading: { fill: ACCENT, type: ShadingType.SOLID, color: ACCENT },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: String(step.step),
                bold: true,
                color: "FFFFFF",
                size: 24,
                font: "Calibri",
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 2400, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: step.title,
                bold: true,
                color: ACCENT,
                size: 22,
                font: "Calibri",
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 6000, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: step.description,
                size: 20,
                font: "Calibri",
                color: GREY_TEXT,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function termRow(item: { term: string; definition: string }): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 2500, type: WidthType.DXA },
        shading: { fill: ACCENT_BG, type: ShadingType.SOLID, color: ACCENT_BG },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: item.term,
                bold: true,
                color: ACCENT,
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 6700, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: item.definition,
                size: 20,
                font: "Calibri",
                color: GREY_TEXT,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function generateDocx(notes: NotesContent): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // ── Cover Page ──────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      spacing: { before: 800, after: 400 },
      alignment: AlignmentType.CENTER,
      shading: { fill: ACCENT, type: ShadingType.SOLID, color: ACCENT },
      children: [
        new TextRun({
          text: notes.title,
          bold: true,
          color: "FFFFFF",
          size: 56,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 160 },
      children: [
        new TextRun({
          text: `Comprehensive Notes  ·  ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
          color: "888888",
          size: 20,
          font: "Calibri",
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: "", break: 1 })],
    }),
    divider()
  );

  // ── Overview ────────────────────────────────────────────────────────────────
  children.push(heading1("Overview"));
  notes.overview.split("\n\n").forEach((para) => {
    if (para.trim()) children.push(bodyParagraph(para.trim()));
  });

  children.push(divider());

  // ── Main Sections ───────────────────────────────────────────────────────────
  notes.sections.forEach((section) => {
    children.push(heading1(section.title));

    if (section.content) children.push(bodyParagraph(section.content));

    if (section.key_points?.length) {
      children.push(heading3("Key Points"));
      section.key_points.forEach((pt) => children.push(bulletPoint(pt)));
    }

    section.subsections?.forEach((sub) => {
      children.push(heading2(sub.title));
      if (sub.content) children.push(bodyParagraph(sub.content));
    });

    children.push(divider());
  });

  // ── Process Flow ─────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      children: [],
    })
  );
  children.push(heading1(notes.process_flow.title));

  const flowTable = new Table({
    width: { size: 9200, type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            shading: {
              fill: ACCENT_LIGHT,
              type: ShadingType.SOLID,
              color: ACCENT_LIGHT,
            },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "#",
                    bold: true,
                    color: "FFFFFF",
                    size: 22,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            shading: {
              fill: ACCENT_LIGHT,
              type: ShadingType.SOLID,
              color: ACCENT_LIGHT,
            },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Stage",
                    bold: true,
                    color: "FFFFFF",
                    size: 22,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            shading: {
              fill: ACCENT_LIGHT,
              type: ShadingType.SOLID,
              color: ACCENT_LIGHT,
            },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Description",
                    bold: true,
                    color: "FFFFFF",
                    size: 22,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      ...notes.process_flow.steps.map(stepRow),
    ],
  });
  children.push(flowTable);

  children.push(divider());

  // ── Key Terms Glossary ───────────────────────────────────────────────────────
  children.push(heading1("Key Terms & Glossary"));

  const termsTable = new Table({
    width: { size: 9200, type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            shading: {
              fill: ACCENT,
              type: ShadingType.SOLID,
              color: ACCENT,
            },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Term",
                    bold: true,
                    color: "FFFFFF",
                    size: 22,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            shading: {
              fill: ACCENT,
              type: ShadingType.SOLID,
              color: ACCENT,
            },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Definition",
                    bold: true,
                    color: "FFFFFF",
                    size: 22,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      ...notes.key_terms.map(termRow),
    ],
  });
  children.push(termsTable);

  children.push(divider());

  // ── Summary ──────────────────────────────────────────────────────────────────
  children.push(heading1("Summary"));
  children.push(bodyParagraph(notes.summary));

  // ── Further Reading ───────────────────────────────────────────────────────────
  if (notes.further_reading?.length) {
    children.push(heading1("Further Reading"));
    notes.further_reading.forEach((r) => children.push(bulletPoint(r)));
  }

  const doc = new Document({
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
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
