/*
  A PDF with a real text layer, built in 30 lines so the suite can prove the difference between
  "the file has text in it" and "the file is a picture of text".

  This is not a PDF library: it is the smallest document pdf.js will accept — catalog, pages, one page,
  a font, and a content stream of `Tj` operators — with a byte-accurate xref table, because a parser that
  cannot find its offsets reports no text, and the test would then be asserting that our own fixture is
  broken. Escape the parentheses: an unescaped `(` in a line of paperwork ends the string and the page goes
  blank.
*/
const esc = s => String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export function mkPdf(lines, { y = 750, leading = 14 } = {}) {
  const content = ["BT", "/F1 10 Tf", `${leading} TL`, `1 0 0 1 40 ${y} Tm`,
    ...lines.map((l, i) => `(${esc(l)}) Tj${i < lines.length - 1 ? " T*" : ""}`), "ET"].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((body, i) => { offsets.push(Buffer.byteLength(out, "latin1")); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
    + offsets.map(o => `${String(o).padStart(10, "0")} 00000 n \n`).join("")
    + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
