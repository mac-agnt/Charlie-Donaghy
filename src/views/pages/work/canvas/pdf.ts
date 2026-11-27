/* Builds a small, valid one-page PDF from plain text so "Download" hands over a
   real file. Helvetica with WinAnsi encoding covers € and Irish fadas. */

const WIN: Record<string, number> = { "€": 0x80, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97 };

function enc(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) || 63;
    const b = WIN[ch] ?? (code < 256 ? code : 63);
    const c = String.fromCharCode(b);
    out += c === "\\" || c === "(" || c === ")" ? "\\" + c : c;
  }
  return out;
}

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  text.split(/\s+/).forEach((w) => {
    if ((line + " " + w).trim().length > width) {
      if (line) lines.push(line);
      line = w;
    } else line = (line + " " + w).trim();
  });
  if (line) lines.push(line);
  return lines;
}

export function makePdf(title: string, meta: string, paragraphs: string[], footer?: string): Blob {
  const body: string[] = [];
  paragraphs.forEach((p, i) => {
    if (i) body.push("");
    body.push(...wrap(p, 88));
  });
  const shown = body.slice(0, 52);
  const stream = [
    "BT /F2 18 Tf 56 780 Td (" + enc(title) + ") Tj ET",
    "BT /F1 9 Tf 0.45 g 56 762 Td (" + enc(meta) + ") Tj ET",
    "0.85 G 56 748 m 539 748 l S",
    "BT /F1 11 Tf 0 g 15 TL 56 722 Td " + shown.map((l) => "(" + enc(l) + ") Tj T*").join(" ") + " ET",
    footer ? "BT /F1 8 Tf 0.5 g 56 48 Td (" + enc(footer) + ") Tj ET" : "",
  ].join("\n");

  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += i + 1 + " 0 obj\n" + o + "\nendobj\n";
  });
  const xref = pdf.length;
  pdf += "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n";
  offsets.forEach((o) => (pdf += String(o).padStart(10, "0") + " 00000 n \n"));
  pdf += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
