// Shared builder for the Refill team documents: Refill's light palette, A4, one look for both.
const fs = require('fs')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, ImageRun, PageBreak, TableOfContents, Footer, Header, PageNumber, LevelFormat,
  ExternalHyperlink, TabStopType, VerticalAlign,
} = require('docx')

const C = { ink: '121214', ink2: '5A5852', ink3: '8C8981', line: 'DAD7D0', paper: 'F4F2ED', act: '3F6B00', actSoft: 'EAF0DF', beat: '9A5A00', beatSoft: 'FBEFD9', danger: 'D13A2B', dangerSoft: 'FBE7E4' }
const FONT = 'Arial'
const MONO = 'Consolas'
const PAGE_W = 11906 // A4 in DXA
const MARGIN = 1134 // 2 cm
const TEXT_W = PAGE_W - MARGIN * 2

// Inline markup: **bold**, `code`, [text](url)
function runs(text, base = {}) {
  const out = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, ...base }))
    const t = m[0]
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, font: FONT, ...base }))
    else if (t.startsWith('`')) out.push(new TextRun({ text: t.slice(1, -1), font: MONO, size: Math.round((base.size ?? 21) * 0.92), color: base.color ?? C.ink, shading: { type: ShadingType.CLEAR, fill: C.paper, color: 'auto' } }))
    else {
      const [, label, url] = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)
      out.push(new ExternalHyperlink({ link: url, children: [new TextRun({ text: label, font: FONT, color: C.act, underline: {}, ...base })] }))
    }
    last = m.index + t.length
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, ...base }))
  return out
}

const P = (text, opts = {}) => new Paragraph({ children: runs(text, { size: opts.size ?? 21, color: opts.color ?? C.ink, italics: opts.italics }), spacing: { after: opts.after ?? 120, line: 300, before: opts.before ?? 0 }, alignment: opts.align, keepNext: opts.keepNext })
const Small = (text, opts = {}) => P(text, { size: 17, color: C.ink2, after: opts.after ?? 80, ...opts })
const Over = (text, color = C.ink3) => new Paragraph({ children: [new TextRun({ text: text.toUpperCase(), font: MONO, size: 16, color, characterSpacing: 40 })], spacing: { after: 60 }, keepNext: true })

const H1 = (text, over) => [
  new Paragraph({ children: [new PageBreak()] }),
  ...(over ? [Over(over, C.act)] : []),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: FONT, bold: true, size: 40, color: C.ink })], spacing: { after: 200 }, keepNext: true }),
]
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT, bold: true, size: 28, color: C.ink })], spacing: { before: 300, after: 120 }, keepNext: true, border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 10 } } })
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: FONT, bold: true, size: 23, color: C.act })], spacing: { before: 200, after: 80 }, keepNext: true })

const Bullets = (items, level = 0) => items.map((t) => Array.isArray(t)
  ? Bullets(t, level + 1)
  : new Paragraph({ numbering: { reference: 'dots', level }, children: runs(t, { size: 21, color: C.ink }), spacing: { after: 70, line: 290 } })).flat()
const Steps = (items, ref = 'steps') => items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t, { size: 21, color: C.ink }), spacing: { after: 80, line: 290 } }))

const border = (color = C.line) => ({ style: BorderStyle.SINGLE, size: 4, color })
const cellBorders = { top: border(), bottom: border(), left: border(), right: border() }

function Tbl(head, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0)
  const scale = TEXT_W / total
  const w = widths.map((x) => Math.round(x * scale))
  w[w.length - 1] += TEXT_W - w.reduce((a, b) => a + b, 0)
  const cell = (text, i, isHead, fill) => new TableCell({
    width: { size: w[i], type: WidthType.DXA },
    borders: cellBorders,
    shading: { type: ShadingType.CLEAR, fill: isHead ? C.ink : fill ?? 'FFFFFF', color: 'auto' },
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    verticalAlign: VerticalAlign.TOP,
    children: String(text).split('\n').map((line) => new Paragraph({ children: runs(line, { size: opts.size ?? 18, color: isHead ? 'FFFFFF' : C.ink, bold: isHead || undefined }), spacing: { after: 30, line: 260 } })),
  })
  return [new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: w,
    rows: [
      ...(opts.noHead ? [] : [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, i, true)) })]),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false, opts.zebra && ri % 2 ? 'FAF8F4' : (opts.firstCol && i === 0 ? C.paper : undefined))) })),
    ],
  }), new Paragraph({ spacing: { after: 120 }, children: [] })]
}

function Callout(title, lines, tone = 'act') {
  const fill = { act: C.actSoft, beat: C.beatSoft, danger: C.dangerSoft, ink: C.paper }[tone]
  const edge = { act: C.act, beat: C.beat, danger: C.danger, ink: C.ink3 }[tone]
  return [new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: [TEXT_W],
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      width: { size: TEXT_W, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill, color: 'auto' },
      borders: { top: border(fill), bottom: border(fill), right: border(fill), left: { style: BorderStyle.SINGLE, size: 24, color: edge } },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: [
        ...(title ? [new Paragraph({ children: [new TextRun({ text: title, font: FONT, bold: true, size: 21, color: edge })], spacing: { after: 60 } })] : []),
        ...[].concat(lines).map((l) => new Paragraph({ children: runs(l, { size: 20, color: C.ink }), spacing: { after: 50, line: 280 } })),
      ],
    })] })],
  }), new Paragraph({ spacing: { after: 120 }, children: [] })]
}

function Code(lines) {
  return [new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: [TEXT_W],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: TEXT_W, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: C.paper, color: 'auto' },
      borders: cellBorders,
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      children: lines.map((l) => new Paragraph({ children: [new TextRun({ text: l || ' ', font: MONO, size: 16, color: C.ink })], spacing: { after: 0, line: 240 } })),
    })] })],
  }), new Paragraph({ spacing: { after: 120 }, children: [] })]
}

function Fig(file, caption, widthCm = 17) {
  const buf = fs.readFileSync(file)
  // read pixel size from PNG/JPEG header
  let w = 1920; let h = 1080
  if (buf[0] === 0x89) { w = buf.readUInt32BE(16); h = buf.readUInt32BE(20) } else {
    for (let i = 2; i < buf.length;) {
      const len = buf.readUInt16BE(i + 2)
      if (buf[i + 1] >= 0xc0 && buf[i + 1] <= 0xc3) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break }
      i += 2 + len
    }
  }
  const px = widthCm * 37.8
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 80, after: 60 }, children: [new ImageRun({ type: file.endsWith('.png') ? 'png' : 'jpg', data: buf, transformation: { width: px, height: px * (h / w) }, altText: { title: caption, description: caption, name: caption } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: runs(caption, { size: 17, color: C.ink2, italics: true }) }),
  ]
}

const KV = (pairs) => Tbl(['', ''], pairs, [30, 70], { firstCol: true, noHead: true })

function Cover({ kicker, title, subtitle, meta, image }) {
  return [
    new Paragraph({ spacing: { before: 600, after: 120 }, children: [new TextRun({ text: kicker.toUpperCase(), font: MONO, size: 18, color: C.act, characterSpacing: 60 })] }),
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: title, font: FONT, bold: true, size: 64, color: C.ink })] }),
    new Paragraph({ spacing: { after: 360 }, children: runs(subtitle, { size: 26, color: C.ink2 }) }),
    ...(image ? Fig(image, ' ', 17).slice(0, 1) : []),
    new Paragraph({ spacing: { after: 240 }, children: [] }),
    ...Tbl(['', ''], meta, [28, 72], { firstCol: true, size: 18, noHead: true }).slice(0, 1),
  ]
}

function Toc() {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    Over('Contents', C.act),
    new Paragraph({ children: [new TextRun({ text: 'What is in this document', font: FONT, bold: true, size: 40, color: C.ink })], spacing: { after: 200 } }),
    new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
  ]
}

function build({ file, title, footer, body }) {
  const doc = new Document({
    creator: 'Team C29 (Refill)',
    title,
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FONT, size: 21, color: C.ink } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 40, bold: true, color: C.ink }, paragraph: { spacing: { after: 200 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 28, bold: true, color: C.ink }, paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 23, bold: true, color: C.act }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: 'dots', levels: [0, 1, 2].map((level) => ({ level, format: LevelFormat.BULLET, text: level === 0 ? '•' : '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 + level * 360, hanging: 260 } }, run: { color: C.act } } })) },
        ...Array.from({ length: 30 }, (_, i) => ({ reference: `steps${i ? i : ''}`, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 300 } }, run: { color: C.act, bold: true } } }] })),
      ],
    },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: footer.toUpperCase(), font: MONO, size: 14, color: C.ink3, characterSpacing: 30 })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: TEXT_W }], children: [new TextRun({ text: 'Refill · Team C29 · Fynd × NMIMS Hyderabad', font: FONT, size: 15, color: C.ink3 }), new TextRun({ text: '\t', font: FONT }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 15, color: C.ink3 })] })] }) },
      children: body.flat(Infinity),
    }],
  })
  return Packer.toBuffer(doc).then((b) => fs.writeFileSync(file, b))
}

module.exports = { KV, C, P, Small, Over, H1, H2, H3, Bullets, Steps, Tbl, Callout, Code, Fig, Cover, Toc, build, runs }
