import {
  CANVAS_PEOPLE,
  CANVAS_FOLDERS,
  CANVAS_DOCS,
  CANVAS_PAGES,
  CANVAS_SHEETS,
  CANVAS_BOARDS,
  CANVAS_TEMPLATES,
} from "../../../../logic/canvasData";
import type { IcoName } from "../Ico";

/* Types and pure helpers for Canvas. Seeds live in logic/canvasData.js. */

export type Kind = "page" | "sheet" | "tracker" | "pipeline" | "pdf" | "image" | "file";
export type Access = "me" | "people" | "company" | "public" | "records";

export type Doc = {
  id: string;
  title: string;
  kind: Kind;
  folder: string;
  owner: string;
  access: Access;
  people?: number;
  at: number;
  starred?: boolean;
  binned?: boolean;
  shared?: boolean;
  live?: string[];
  size?: string;
  pages?: number;
  body?: string[];
  url?: string;
};

export type Folder = { id: string; name: string; parent: string | null };

export type BlockType = "h1" | "h2" | "h3" | "p" | "bullet" | "number" | "todo" | "quote" | "callout" | "divider";
export type Block = { id: string; type: BlockType; text: string; checked?: boolean };

export type Fmt = "eur" | "pct";
export type SheetTab = {
  name: string;
  cells: Record<string, string>;
  widths: Record<string, number>;
  fmt: Record<string, Fmt>;
  bold: number[];
};
export type Sheet = { tabs: SheetTab[]; active: number };

export type Card = { id: string; title: string; col: string; who: string; due?: string; tag?: string; value?: number };
export type Board = { view: "board" | "table"; columns: { id: string; name: string }[]; cards: Card[] };

export type Person = { name: string; short: string; initials: string; tint: string };
export type Template = { id: string; kind: Kind; title: string; sub: string; blank?: boolean; from?: string };

export const PEOPLE = CANVAS_PEOPLE as Record<string, Person>;
export const TEMPLATES = CANVAS_TEMPLATES as Template[];

let seq = 0;
export const uid = (prefix: string) => prefix + "-" + Date.now().toString(36) + (seq++).toString(36);

const T0 = Date.now();

export function seedDocs(): Doc[] {
  return (CANVAS_DOCS as any[]).map((d) => {
    const { ago, ...rest } = d;
    return { ...rest, folder: d.folder || "", at: T0 - (ago || 0) * 60000 } as Doc;
  });
}

export function seedFolders(): Folder[] {
  return (CANVAS_FOLDERS as Folder[]).map((f) => ({ ...f }));
}

export function toBlocks(rows: any[]): Block[] {
  return rows.map((r) => ({ id: uid("b"), type: r[0] as BlockType, text: r[1] || "", checked: r[0] === "todo" ? !!r[2] : undefined }));
}

export function seedPages(): Record<string, Block[]> {
  const out: Record<string, Block[]> = {};
  Object.entries(CANVAS_PAGES as Record<string, any[]>).forEach(([k, rows]) => (out[k] = toBlocks(rows)));
  return out;
}

export const COLS = "ABCDEFGHIJ".split("");
export const ROWS = 24;

export function toSheet(seed: any[]): Sheet {
  return {
    active: 0,
    tabs: seed.map((t) => {
      const cells: Record<string, string> = {};
      (t.rows as string[][]).forEach((row, r) =>
        (row || []).forEach((v, c) => {
          if (v !== "" && v != null) cells[COLS[c] + (r + 1)] = String(v);
        }),
      );
      return { name: t.name, cells, widths: { ...(t.widths || {}) }, fmt: { ...(t.fmt || {}) }, bold: [...(t.bold || [])] };
    }),
  };
}

export function seedSheets(): Record<string, Sheet> {
  const out: Record<string, Sheet> = {};
  Object.entries(CANVAS_SHEETS as Record<string, any[]>).forEach(([k, s]) => (out[k] = toSheet(s)));
  return out;
}

const cloneBoard = (b: Board): Board => ({ view: b.view, columns: b.columns.map((c) => ({ ...c })), cards: b.cards.map((c) => ({ ...c })) });

export function seedBoards(): Record<string, Board> {
  const out: Record<string, Board> = {};
  Object.entries(CANVAS_BOARDS as Record<string, Board>).forEach(([k, b]) => (out[k] = cloneBoard(b)));
  return out;
}

export function blankBoard(kind: Kind): Board {
  return kind === "pipeline"
    ? { view: "board", columns: [{ id: "new", name: "New" }, { id: "quoted", name: "Quoted" }, { id: "talks", name: "Negotiating" }, { id: "won", name: "Won" }], cards: [] }
    : { view: "board", columns: [{ id: "todo", name: "Not started" }, { id: "doing", name: "In progress" }, { id: "done", name: "Done" }], cards: [] };
}

export function blankSheet(): Sheet {
  return { active: 0, tabs: [{ name: "Sheet 1", cells: {}, widths: { A: 180 }, fmt: {}, bold: [] }] };
}

/** Deep copies so a duplicate or a template never shares state with its source. */
export const copyBlocks = (b: Block[]) => b.map((x) => ({ ...x, id: uid("b") }));
export const copySheet = (s: Sheet): Sheet => ({
  active: 0,
  tabs: s.tabs.map((t) => ({ name: t.name, cells: { ...t.cells }, widths: { ...t.widths }, fmt: { ...t.fmt }, bold: [...t.bold] })),
});
export const copyBoard = cloneBoard;

export const isFileKind = (k: Kind) => k === "pdf" || k === "image" || k === "file";

export const KIND: Record<Kind, { label: string; icon: IcoName; tint: string; plural: string }> = {
  page: { label: "Page", plural: "Pages", icon: "page", tint: "#8fb8ff" },
  sheet: { label: "Sheet", plural: "Sheets", icon: "sheet", tint: "#6fd39a" },
  tracker: { label: "Tracker", plural: "Trackers", icon: "tracker", tint: "#e6b85c" },
  pipeline: { label: "Pipeline", plural: "Pipelines", icon: "pipeline", tint: "#b9a2f2" },
  pdf: { label: "PDF", plural: "Files", icon: "file", tint: "#ef7f6f" },
  image: { label: "Image", plural: "Files", icon: "image", tint: "#5fc9c2" },
  file: { label: "File", plural: "Files", icon: "file", tint: "#9aa39f" },
};

export const ACCESS: Record<Access, { label: (d: Doc) => string; icon: IcoName; loud?: boolean }> = {
  me: { label: () => "Only me", icon: "lock" },
  people: { label: (d) => (d.people || 2) + " people", icon: "user" },
  company: { label: () => "Company", icon: "users" },
  public: { label: () => "Public link", icon: "globe", loud: true },
  records: { label: () => "Records", icon: "folder" },
};

/** "Just now", "12m ago", "3h ago", "2d ago", then a date like "18 Nov, 22:22". */
export function ago(at: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - at) / 60000));
  if (m < 1) return "Just now";
  if (m < 60) return m + "m ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.round(h / 24);
  if (d < 7) return d + "d ago";
  const dt = new Date(at);
  const mon = dt.toLocaleString("en-IE", { month: "short" });
  return dt.getDate() + " " + mon + ", " + String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0");
}

export function pathOf(folderId: string, folders: Folder[]): Folder[] {
  const out: Folder[] = [];
  let f = folders.find((x) => x.id === folderId);
  let guard = 0;
  while (f && guard++ < 20) {
    out.unshift(f);
    f = f.parent ? folders.find((x) => x.id === f!.parent) : undefined;
  }
  return out;
}

export const pathLabel = (folderId: string, folders: Folder[]) => pathOf(folderId, folders).map((f) => f.name).join(" / ");

export function descendants(folderId: string, folders: Folder[]): string[] {
  const out = [folderId];
  for (let i = 0; i < out.length; i++) folders.filter((f) => f.parent === out[i]).forEach((f) => out.push(f.id));
  return out;
}

export function fileKindOf(file: File): Kind {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return "file";
}

export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

/** Contents for a template: a blank of its kind, or a copy of the seeded doc it points at. */
export function templateContent(
  t: Template,
  pages: Record<string, Block[]>,
  sheets: Record<string, Sheet>,
  boards: Record<string, Board>,
): { page?: Block[]; sheet?: Sheet; board?: Board } {
  if (t.kind === "page") {
    const src = t.from ? pages[t.from] || toBlocks((CANVAS_PAGES as Record<string, any[]>)[t.from] || []) : null;
    return { page: src ? copyBlocks(src) : [{ id: uid("b"), type: "p", text: "" }] };
  }
  if (t.kind === "sheet") {
    const src = t.from ? sheets[t.from] : null;
    return { sheet: src ? copySheet(src) : blankSheet() };
  }
  const src = t.from ? boards[t.from] : null;
  return { board: src ? copyBoard(src) : blankBoard(t.kind) };
}
