import { getPersist, setPersist } from "../../../../components/usePersist";
import * as RAW from "../../../../logic/signData";
import type { IcoName } from "../Ico";
import { seedDocs, type Doc } from "../canvas/model";

/* State and behaviour for Work › Signatures. Everything lives in the session
   store (usePersist), so envelopes keep their state across tab switches, and
   the timers that play the other signers run here rather than in a component. */

export type FieldType = "signature" | "initials" | "date" | "name" | "text" | "checkbox";
export type Field = { id: string; signer: string; type: FieldType; page: number; x: number; y: number; value?: string };
export type SignerState = "waiting" | "viewed" | "signed";
export type Signer = {
  id: string; name: string; email: string; color: string; state: SignerState; ip: string;
  me?: boolean; party?: number; viewedAt?: number; signedAt?: number;
};
export type Audit = { at: number; text: string; where?: string };
export type DocSrc =
  | { kind: "seed"; key: string }
  | { kind: "pdf"; url: string; pages: number; file: string }
  | { kind: "image"; url: string; file: string };
export type Status = "draft" | "waiting" | "signed" | "voided";
export type Envelope = {
  id: string; code: string; title: string; status: Status; signers: Signer[]; fields: Field[];
  message: string; doc: DocSrc; editedAt: number; sentAt?: number; doneAt?: number; audit: Audit[]; hash: string;
};
export type DocDef = { title: string; ref: string; org?: string; addr?: string; intro: string; sides: string[]; clauses: string[][] };
export type Pick = { name: string; where: string; meta: string; doc: string };
export type MySig = { kind: "type" | "draw"; value: string; initials: string };
export type Toast = { id: number; text: string } | null;
export type Filter = "all" | "waiting" | "signed" | "drafts";
type SeedSigner = { name: string; email: string; party: number; me?: boolean; state: SignerState; viewedAgo?: number; signedAgo?: number };
type SeedEnv = { id: string; title: string; doc: string; status: Status; sentAgo?: number; editedAgo?: number; message?: string; signers: SeedSigner[] };

export const ME = RAW.SIGN_ME as unknown as { name: string; email: string };
export const DOCS = RAW.SIGN_DOCS as unknown as Record<string, DocDef>;
export const PICKS = RAW.SIGN_CANVAS_PICKS as unknown as Pick[];
const COMMON = RAW.SIGN_COMMON_CLAUSES as unknown as string[][];
const COLORS = RAW.SIGN_COLORS as unknown as string[];
const WHERE = RAW.SIGN_WHERE as unknown as string;
const SEEDS = RAW.SIGN_ENVELOPES as unknown as SeedEnv[];

export const K = { envs: "sign:envelopes", open: "sign:open", filter: "sign:filter", toast: "sign:toast", mySig: "sign:signature" } as const;
export const FIRST_ENV = "env-boyne";
const DONE = "Completed. Signed copy filed in Canvas › Signed documents";
const MESSAGE = "Hi, please review and sign where marked. Any questions, ring me on 01 555 0142. Charlie";

/* ── time ─────────────────────────────────────────────── */
export const MIN = 60000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
export const fmtDay = (t: number) => { const d = new Date(t); return `${d.getDate()} ${MON[d.getMonth()]}`; };
export const fmtDate = (t: number) => `${fmtDay(t)} ${new Date(t).getFullYear()}`;
export const fmtTime = (t: number) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtStamp = (t: number) => `${fmtDate(t)}, ${fmtTime(t)}`;
export function ago(t: number) {
  const m = Math.floor((Date.now() - t) / MIN);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

/* ── small helpers ────────────────────────────────────── */
export function hex(seed: string, len: number) {
  let x = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) { x ^= seed.charCodeAt(i); x = Math.imul(x, 16777619); }
  let out = "";
  while (out.length < len) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; out += (x >>> 0).toString(16).padStart(8, "0"); }
  return out.slice(0, len);
}
const codeFor = (id: string) => { const h = hex(id, 8).toUpperCase(); return `DF-${h.slice(0, 4)}-${h.slice(4)}`; };
const ipFor = (s: string) => {
  const h = parseInt(hex(s, 7), 16);
  return `${[86, 89, 37, 78][h % 4]}.${(h >> 3) % 250 + 3}.${(h >> 11) % 250 + 3}.${(h >> 19) % 250 + 3}`;
};
let seq = 0;
export const uid = (p: string) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`;
export const soft = (hexColor: string, a: number) => {
  const n = parseInt(hexColor.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
export const initialsOf = (name: string) => name.trim().split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
export const names = (list: { name: string }[]) =>
  list.length <= 2 ? list.map((s) => s.name).join(" and ") : `${list.slice(0, -1).map((s) => s.name).join(", ")} and ${list[list.length - 1].name}`;
export const whereOf = (s: Signer) => `${WHERE} · ${s.ip}`;
const tidy = (file: string) => {
  const base = file.replace(/\.[^.]+$/, "").replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  return base ? base[0].toUpperCase() + base.slice(1) : "Untitled document";
};

/* ── fields and pages ─────────────────────────────────── */
/* Sizes in % of page width (cqw), so fields scale with the page. */
export const SIZE: Record<FieldType, [number, number]> = {
  signature: [24, 6.5], initials: [9, 6.5], date: [16, 4.2], name: [22, 4.2], text: [22, 4.2], checkbox: [4.2, 4.2],
};
export const LABEL: Record<FieldType, string> = {
  signature: "Signature", initials: "Initials", date: "Date signed", name: "Name", text: "Text", checkbox: "Checkbox",
};
/** Left edge (%) of the two signature columns on the last page. */
export const COL = [8, 54];

export function pagesOf(doc: DocDef): string[][][] {
  const all = [...doc.clauses, ...COMMON];
  const split = Math.max(3, all.length - 3);
  return [all.slice(0, split), all.slice(split)];
}

function blockFields(signer: string, party: number): Field[] {
  const x = COL[party] ?? COL[0];
  return [
    { id: uid("f"), signer, type: "initials", page: 0, x: 60 + party * 12, y: 90.6 },
    { id: uid("f"), signer, type: "signature", page: 1, x, y: 66.6 },
    { id: uid("f"), signer, type: "date", page: 1, x: x + 6, y: 83.4 },
  ];
}

function fillFor(f: Field, s: { name: string }, at: number, sig?: MySig | null): string {
  if (f.type === "signature") return sig ? sig.value : s.name;
  if (f.type === "initials") return sig ? sig.initials : initialsOf(s.name);
  if (f.type === "date") return fmtDate(at);
  if (f.type === "name") return s.name;
  if (f.type === "checkbox") return "x";
  return f.value || "Agreed";
}

/* ── seed ─────────────────────────────────────────────── */
function build(seed: SeedEnv, now: number): Envelope {
  const at = (m?: number) => (m === undefined ? undefined : now - m * MIN);
  const signers: Signer[] = seed.signers.map((s, i) => {
    const signedAt = at(s.signedAgo);
    return {
      id: `${seed.id}-s${i}`, name: s.name, email: s.email, color: COLORS[i % COLORS.length], state: s.state,
      ip: ipFor(s.email), me: s.me, party: s.party, signedAt,
      viewedAt: at(s.viewedAgo) ?? (signedAt ? signedAt - 4 * MIN : undefined),
    };
  });
  const fields = signers.flatMap((s) =>
    blockFields(s.id, s.party ?? 0).map((f) => (s.state === "signed" && s.signedAt ? { ...f, value: fillFor(f, s, s.signedAt) } : f)),
  );
  const sentAt = at(seed.sentAgo);
  const editedAt = at(seed.editedAgo) ?? sentAt ?? now;
  const doneAt = seed.status === "signed" ? Math.max(...signers.map((s) => s.signedAt ?? 0)) : undefined;
  const audit: Audit[] = [{ at: (sentAt ?? editedAt) - 26 * MIN, text: `Created by ${ME.name}` }];
  if (sentAt) audit.push({ at: sentAt, text: `Sent to ${names(signers.filter((s) => !s.me))}` });
  signers.forEach((s) => {
    if (s.viewedAt && !s.me) audit.push({ at: s.viewedAt, text: `Viewed by ${s.name}`, where: whereOf(s) });
    if (s.signedAt) audit.push({ at: s.signedAt, text: `Signed by ${s.name}`, where: whereOf(s) });
  });
  if (doneAt) audit.push({ at: doneAt + 1000, text: DONE });
  audit.sort((a, b) => a.at - b.at);
  return {
    id: seed.id, code: codeFor(seed.id), title: seed.title, status: seed.status, signers, fields,
    message: seed.message ?? MESSAGE, doc: { kind: "seed", key: seed.doc }, editedAt, sentAt, doneAt, audit,
    hash: hex(seed.id + seed.title, 64),
  };
}
export function seedAll(): Envelope[] {
  const now = Date.now();
  return SEEDS.map((s) => build(s, now));
}

/* ── store ────────────────────────────────────────────── */
export const all = () => getPersist<Envelope[]>(K.envs, seedAll);
export const findEnv = (id: string) => all().find((e) => e.id === id);
function write(fn: (l: Envelope[]) => Envelope[]) {
  const before = all();
  setPersist<Envelope[]>(K.envs, fn);
  all()
    .filter((e) => e.status === "signed" && before.find((b) => b.id === e.id)?.status !== "signed")
    .forEach(fileInCanvas);
  notify();
}

/** Jump to Work › Canvas, opened on the Signed documents folder. */
export function openSignedFolder(v: any) {
  setPersist("canvas:nav", { view: "folder", folder: "signed" });
  setPersist<string | null>("canvas:open", null);
  v?.goCanvas?.();
}

/* A completed envelope is filed in Canvas › Signed documents, as the activity line says. */
function fileInCanvas(e: Envelope) {
  const id = "sig-" + e.id;
  const def = e.doc.kind === "seed" ? DOCS[e.doc.key] : undefined;
  const doc: Doc = {
    id,
    title: e.title.replace(/\.pdf$/i, "") + " (signed).pdf",
    kind: e.doc.kind === "image" ? "image" : "pdf",
    folder: "signed",
    owner: "signed",
    access: "records",
    at: Date.now(),
    size: e.doc.kind === "seed" ? "180 KB" : undefined,
    pages: def ? pagesOf(def).length : e.doc.kind === "pdf" ? e.doc.pages : 1,
    url: e.doc.kind === "seed" ? undefined : e.doc.url,
    body: [
      ...(def ? [def.intro] : []),
      "Signed by " + names(e.signers) + ". Envelope " + e.code + ", completed " + fmtStamp(e.doneAt ?? Date.now()) + ".",
      "The certificate of completion, with every view and signature and where it came from, is kept with this copy.",
    ],
  };
  getPersist<Doc[]>("canvas:docs", seedDocs);
  setPersist<Doc[]>("canvas:docs", (ds) => (ds.some((d) => d.id === id) ? ds : [doc, ...ds]));
}
export const patch = (id: string, fn: (e: Envelope) => Envelope) => write((l) => l.map((e) => (e.id === id ? fn(e) : e)));
export const openEnv = (id: string | null) => setPersist<string | null>(K.open, id);
export const isMyTurn = (e: Envelope) => e.status === "waiting" && e.signers.some((s) => s.me && s.state !== "signed");
export const waitingCount = (l: Envelope[]) => l.filter((e) => e.status === "waiting").length;

/* The top-bar count. The component reports it while mounted; timers report it
   through the last setter we were handed, so it stays live from other tabs. */
let setter: ((n: number) => void) | undefined;
let lastN = -1;
export function bindWaiting(fn: unknown) { if (typeof fn === "function") setter = fn as (n: number) => void; }
export function reportWaiting(n: number) { lastN = n; setter?.(n); }
function notify() { const n = waitingCount(all()); if (n !== lastN) reportWaiting(n); }

let toastN = 0;
export function toast(text: string) {
  const id = ++toastN;
  setPersist<Toast>(K.toast, { id, text });
  window.setTimeout(() => setPersist<Toast>(K.toast, (t) => (t && t.id === id ? null : t)), 4200);
}

export function pillOf(e: Envelope): [string, IcoName, string] {
  if (e.status === "draft") return ["", "pen", "Draft"];
  if (e.status === "signed") return ["ok", "check", "Signed"];
  if (e.status === "voided") return ["bad", "x", "Voided"];
  return isMyTurn(e) ? ["sg-turn", "pen", "Your turn to sign"] : ["accent", "hourglass", "Waiting for signatures"];
}
export function rowTime(e: Envelope) {
  if (e.status === "draft") return `Edited ${fmtDay(e.editedAt)}, ${fmtTime(e.editedAt)}`;
  if (e.status === "signed") return `Signed ${fmtDay(e.doneAt ?? e.editedAt)}`;
  if (e.status === "voided") return `Voided ${ago(e.editedAt)}`;
  return `Sent ${ago(e.sentAt ?? e.editedAt)}`;
}

/* ── the other signers, played on timers ──────────────── */
function settle(e: Envelope, now: number): Envelope {
  if (e.status !== "waiting" || !e.signers.length || e.signers.some((s) => s.state !== "signed")) return e;
  return { ...e, status: "signed", doneAt: now, audit: [...e.audit, { at: now + 1, text: DONE }] };
}
function viewedBy(id: string, sid: string) {
  const e = findEnv(id), s = e?.signers.find((x) => x.id === sid);
  if (!e || !s || e.status !== "waiting" || s.state !== "waiting") return;
  const now = Date.now();
  patch(id, (x) => ({
    ...x,
    signers: x.signers.map((y) => (y.id === sid ? { ...y, state: "viewed" as const, viewedAt: now } : y)),
    audit: [...x.audit, { at: now, text: `Viewed by ${s.name}`, where: whereOf(s) }],
  }));
  toast(`${s.name} opened ${e.title}`);
}
function signedBy(id: string, sid: string) {
  const e = findEnv(id), s = e?.signers.find((x) => x.id === sid);
  if (!e || !s || e.status !== "waiting" || s.state === "signed") return;
  const now = Date.now();
  patch(id, (x) => settle({
    ...x,
    signers: x.signers.map((y) => (y.id === sid ? { ...y, state: "signed" as const, viewedAt: y.viewedAt ?? now - 40000, signedAt: now } : y)),
    fields: x.fields.map((f) => (f.signer === sid ? { ...f, value: fillFor(f, s, now) } : f)),
    audit: [...x.audit, { at: now, text: `Signed by ${s.name}`, where: whereOf(s) }],
  }, now));
  toast(findEnv(id)?.status === "signed" ? `${s.name} signed. ${e.title} is complete.` : `${s.name} signed ${e.title}`);
}
const armed = new Set<string>();
export function walkOthers(id: string, firstDelay = 4000) {
  const e = findEnv(id);
  if (!e || e.status !== "waiting") return;
  e.signers.filter((s) => !s.me && s.state !== "signed").forEach((s, i) => {
    const key = `${id}:${s.id}`;
    if (armed.has(key)) return;
    armed.add(key);
    const t0 = firstDelay + i * 5200;
    if (s.state === "waiting") window.setTimeout(() => viewedBy(id, s.id), t0);
    window.setTimeout(() => { armed.delete(key); signedBy(id, s.id); }, t0 + 6000);
  });
}
let firstArmed = false;
/** The seeded Boyne Valley envelope signs itself about 20 seconds after you first open it. */
export function armFirstEnvelope() {
  if (firstArmed) return;
  firstArmed = true;
  walkOthers(FIRST_ENV, 14000);
}

/* ── actions ──────────────────────────────────────────── */
export function sendReason(e: Envelope): string | null {
  if (!e.signers.length) return "Add at least one signer.";
  const missing = e.signers.find((s) => !e.fields.some((f) => f.signer === s.id && f.type === "signature"));
  return missing ? `Add a signature field for ${missing.name}.` : null;
}
export function send(id: string) {
  const e = findEnv(id);
  if (!e || sendReason(e)) return;
  const now = Date.now(), others = e.signers.filter((s) => !s.me);
  patch(id, (x) => ({
    ...x, status: "waiting", sentAt: now, editedAt: now,
    signers: x.signers.map((s) => ({ ...s, state: "waiting" as const, viewedAt: undefined, signedAt: undefined })),
    fields: x.fields.map((f) => ({ ...f, value: undefined })),
    audit: [...x.audit, { at: now, text: others.length ? `Sent to ${names(others)}` : "Ready for your signature" }],
  }));
  toast(others.length ? `Sent to ${others.length} ${others.length === 1 ? "person" : "people"}` : "Ready for your signature");
  walkOthers(id);
}
export function remind(id: string) {
  const e = findEnv(id);
  const left = e?.signers.filter((s) => !s.me && s.state !== "signed") ?? [];
  if (!e || !left.length) return;
  const now = Date.now();
  patch(id, (x) => ({ ...x, audit: [...x.audit, { at: now, text: `Reminder sent to ${names(left)}` }] }));
  toast(`Reminder sent to ${names(left)}`);
}
export function voidEnv(id: string) {
  const now = Date.now();
  patch(id, (x) => ({ ...x, status: "voided", editedAt: now, audit: [...x.audit, { at: now, text: `Voided by ${ME.name}` }] }));
  toast("Envelope voided");
}
export function discard(id: string) {
  write((l) => l.filter((e) => e.id !== id));
  openEnv(null);
  toast("Draft discarded");
}
export const rename = (id: string, title: string) => patch(id, (e) => ({ ...e, title, editedAt: Date.now() }));
export const setMessage = (id: string, message: string) => patch(id, (e) => ({ ...e, message, editedAt: Date.now() }));
export function addSigner(id: string, name: string, email: string): string {
  const sid = uid("s");
  patch(id, (e) => {
    let s: Signer = {
      id: sid, name, email, state: "waiting", ip: ipFor(email),
      color: COLORS.find((c) => !e.signers.some((x) => x.color === c)) ?? COLORS[e.signers.length % COLORS.length],
      me: email.toLowerCase() === ME.email ? true : undefined,
    };
    let fields = e.fields;
    /* On a document with a signature block, drop the signer's fields into their column. */
    if (e.doc.kind === "seed" && DOCS[e.doc.key]) {
      const us = Math.max(0, DOCS[e.doc.key].sides.findIndex((x) => /Donaghy/i.test(x)));
      const party = /@donaghyfm\.ie$/i.test(email) ? us : 1 - us;
      if (!e.signers.some((x) => x.party === party)) {
        s = { ...s, party };
        fields = [...fields, ...blockFields(sid, party)];
      }
    }
    return { ...e, signers: [...e.signers, s], fields, editedAt: Date.now() };
  });
  return sid;
}
export const removeSigner = (id: string, sid: string) =>
  patch(id, (e) => ({ ...e, signers: e.signers.filter((s) => s.id !== sid), fields: e.fields.filter((f) => f.signer !== sid) }));
export const placeField = (id: string, f: Field) => patch(id, (e) => ({ ...e, fields: [...e.fields, f], editedAt: Date.now() }));
export const moveField = (id: string, fid: string, x: number, y: number) =>
  patch(id, (e) => ({ ...e, fields: e.fields.map((f) => (f.id === fid ? { ...f, x, y } : f)) }));
export const removeField = (id: string, fid: string) => patch(id, (e) => ({ ...e, fields: e.fields.filter((f) => f.id !== fid) }));
export const setFieldValue = (id: string, fid: string, value: string | undefined) =>
  patch(id, (e) => ({ ...e, fields: e.fields.map((f) => (f.id === fid ? { ...f, value } : f)) }));

/** Adopting a signature fills every signature, initials, date and name field that is yours. */
export function fillMine(id: string, sig: MySig) {
  const now = Date.now();
  patch(id, (e) => {
    const me = e.signers.find((s) => s.me);
    if (!me) return e;
    return { ...e, fields: e.fields.map((f) => (f.signer === me.id && f.type !== "text" && f.type !== "checkbox" ? { ...f, value: fillFor(f, me, now, sig) } : f)) };
  });
}
export function finishMine(id: string) {
  const e = findEnv(id), me = e?.signers.find((s) => s.me);
  if (!e || !me) return;
  const now = Date.now();
  patch(id, (x) => settle({
    ...x,
    signers: x.signers.map((s) => (s.me ? { ...s, state: "signed" as const, viewedAt: s.viewedAt ?? now - 90000, signedAt: now } : s)),
    audit: [...x.audit, { at: now, text: `Signed by ${me.name}`, where: whereOf(me) }],
  }, now));
  const after = findEnv(id);
  const left = after?.signers.filter((s) => s.state !== "signed") ?? [];
  toast(after?.status === "signed" ? `Signed. ${after.title} is complete.` : `Signed. Waiting on ${names(left)}.`);
  walkOthers(id);
}

/* ── new envelopes ────────────────────────────────────── */
function draft(title: string, doc: DocSrc, note: string): Envelope {
  const now = Date.now(), id = uid("env");
  return {
    id, code: codeFor(id), title, status: "draft", signers: [], fields: [], message: MESSAGE, doc,
    editedAt: now, audit: [{ at: now, text: note }], hash: hex(id + title, 64),
  };
}
function addEnvelope(e: Envelope) {
  write((l) => [e, ...l]);
  openEnv(e.id);
}
export function fromPick(p: Pick) {
  addEnvelope(draft(p.name.replace(/\.pdf$/i, ""), { kind: "seed", key: p.doc }, `Created from Canvas › ${p.where}`));
}
async function pdfPages(file: File) {
  try {
    const text = new TextDecoder("latin1").decode(await file.arrayBuffer());
    const pages = (text.match(/\/Type\s*\/Page(?![A-Za-z])/g) || []).length;
    if (pages) return Math.min(40, pages);
    const counts = Array.from(text.matchAll(/\/Count\s+(\d+)/g), (m) => Number(m[1]));
    return Math.min(40, Math.max(1, ...counts));
  } catch {
    return 1;
  }
}
/** Returns an error to show, or null once the draft is open. */
export async function fromFile(file: File): Promise<string | null> {
  const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!pdf && !file.type.startsWith("image/")) return "Use a PDF or a photo of the page.";
  if (file.size > 40 * 1024 * 1024) return "That file is over 40 MB. Try a smaller copy.";
  const url = URL.createObjectURL(file);
  const doc: DocSrc = pdf ? { kind: "pdf", url, pages: await pdfPages(file), file: file.name } : { kind: "image", url, file: file.name };
  addEnvelope(draft(tidy(file.name), doc, `Uploaded ${file.name}`));
  toast(`Uploaded ${file.name}`);
  return null;
}

/* ── download: certificate of completion with the signed text ─ */
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c] ?? c);
export function download(e: Envelope) {
  const src = e.doc;
  const sigOf = (s: Signer) => {
    const v = e.fields.find((f) => f.signer === s.id && f.type === "signature" && f.value)?.value;
    if (!v) return "";
    return v.startsWith("data:") ? `<img src="${v}" alt="" style="height:44px">` : `<span class="sig">${esc(v)}</span>`;
  };
  const rows = e.signers.map((s) =>
    `<tr><td><b>${esc(s.name)}</b><br>${esc(s.email)}</td><td>${sigOf(s)}</td><td>${s.viewedAt ? fmtStamp(s.viewedAt) : ""}</td><td>${s.signedAt ? fmtStamp(s.signedAt) : ""}<br><small>${esc(whereOf(s))}</small></td></tr>`).join("");
  const doc = src.kind === "seed" ? DOCS[src.key] : undefined;
  const body = doc
    ? `<h2>${esc(doc.title)}</h2><p>${esc(doc.intro)}</p>${pagesOf(doc).flat().map((c, i) => `<p><b>${i + 1}. ${esc(c[0])}</b><br>${esc(c[1])}</p>`).join("")}`
    : `<p>Source file: ${esc(src.kind === "seed" ? src.key : src.file)}</p>`;
  const audit = e.audit.map((a) => `<li>${fmtStamp(a.at)} · ${esc(a.text)}${a.where ? ` · ${esc(a.where)}` : ""}</li>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(e.title)}, certificate of completion</title>`
    + `<link href="https://fonts.googleapis.com/css2?family=Mrs+Saint+Delafield&display=swap" rel="stylesheet">`
    + `<style>body{font:14px/1.55 system-ui,sans-serif;color:#1f2327;max-width:760px;margin:40px auto;padding:0 24px}h1{font-size:22px;margin:0}`
    + `table{width:100%;border-collapse:collapse;margin:18px 0}td{border-top:1px solid #e2e5e8;padding:10px 8px;vertical-align:top;font-size:13px}`
    + `th{text-align:left;font-size:11px;color:#6c737a;font-weight:500;padding:0 8px 6px}.sig{font-family:"Mrs Saint Delafield",cursive;font-size:34px;color:#1d2b64}`
    + `small,.meta{color:#6c737a}code{font-size:12px;word-break:break-all}section{border-top:2px solid #1f2327;margin-top:28px;padding-top:12px}</style></head><body>`
    + `<h1>Certificate of completion</h1><p class="meta">${esc(e.title)} · Envelope ${e.code} · Completed ${e.doneAt ? fmtStamp(e.doneAt) : ""}</p>`
    + `<table><tr><th>Signer</th><th>Signature</th><th>Viewed</th><th>Signed</th></tr>${rows}</table>`
    + `<p class="meta">Document hash (SHA-256)<br><code>${e.hash}</code></p><section>${body}</section>`
    + `<section><b>Activity</b><ul>${audit}</ul></section></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.title} (signed).html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("Downloaded the signed copy and certificate");
}
