import { CAL_CHECKLISTS, CAL_EVENTS, CAL_PEOPLE, CAL_SERIES, CAL_TASKS } from "../../../../logic/calendarData";

/* Types, dates and layout for Work › Calendar. Seeds live in logic/calendarData.js. */

export type Kind = "meeting" | "call" | "routine" | "focus";
export type View = "day" | "week" | "month";
export type Ev = {
  id: string;
  title: string;
  date: string;
  start: number;
  end: number;
  kind: Kind;
  series?: string;
  who?: string[];
  agent?: string;
  place?: string;
  meet?: boolean;
  note?: string;
  task?: string;
};
export type Check = { id: string; title: string; date: string; done?: boolean };
export type Task = {
  id: string;
  title: string;
  due: string;
  leverage: number;
  priority: "High" | "Medium" | "Low";
  mins: number;
  done?: boolean;
  pinned?: number;
  block?: string;
};
export type Person = { name: string; initials: string; tint: string };
type Series = { id: string; title: string; kind: Kind; days: number[]; start: string; end: string; who?: string[]; agent?: string; place?: string; meet?: boolean; note?: string };
type OneOff = { day: number; title: string; kind: Kind; start: string; end: string; who?: string[]; place?: string; meet?: boolean };

export const PEOPLE = CAL_PEOPLE as Record<string, Person>;
export const HOUR = 48;
export const PX = HOUR / 60;
const DAY = 86400000;

export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const KIND_LABEL: Record<Kind, string> = { meeting: "Meeting", call: "Call", routine: "Agent routine", focus: "Focus block" };

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};
/** Monday = 0 ... Sunday = 6 */
export const dow = (d: Date) => (d.getDay() + 6) % 7;
export const weekStart = (d: Date) => addDays(d, -dow(d));
export const todayDate = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};
export const nowMin = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);
export const hm = (m: number) => pad(Math.floor(m / 60) % 24) + ":" + pad(m % 60);
const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};
export const snap = (m: number, step = 15) => Math.round(m / step) * step;
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const shortDay = (d: Date) => DOW[dow(d)] + " " + d.getDate() + " " + MON[d.getMonth()];
export const longDay = (d: Date) => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][dow(d)] + " " + d.getDate() + " " + MON[d.getMonth()];

export function rangeLabel(view: View, anchor: Date): string {
  if (view === "day") return shortDay(anchor) + " " + anchor.getFullYear();
  if (view === "month") return MONTH[anchor.getMonth()] + " " + anchor.getFullYear();
  const s = weekStart(anchor), e = addDays(s, 6);
  if (s.getMonth() === e.getMonth()) return s.getDate() + "-" + e.getDate() + " " + MON[s.getMonth()] + " " + s.getFullYear();
  if (s.getFullYear() === e.getFullYear()) return s.getDate() + " " + MON[s.getMonth()] + " - " + e.getDate() + " " + MON[e.getMonth()] + " " + e.getFullYear();
  return s.getDate() + " " + MON[s.getMonth()] + " " + s.getFullYear() + " - " + e.getDate() + " " + MON[e.getMonth()] + " " + e.getFullYear();
}

export function repeatLabel(days: number[]): string {
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "Every weekday";
  if (days.length === 7) return "Every day";
  return "Every " + days.map((d) => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][d - 1]).join(" and ");
}
export const seriesDays = (id?: string) => (CAL_SERIES as Series[]).find((s) => s.id === id)?.days;

let seq = 0;
export const uid = (p: string) => p + "-" + Date.now().toString(36) + (seq++).toString(36);

/* ---------- seeding ---------- */
const BASE = weekStart(todayDate());

/** Everything that belongs to one week: series instances, one-off events and the all-day checklists. */
export function fillWeek(ws: Date): { events: Ev[]; checks: Check[] } {
  const events: Ev[] = [];
  const checks: Check[] = [];
  const today = todayDate();
  for (let i = 0; i < 7; i++) {
    const date = addDays(ws, i), key = ymd(date), iso = i + 1;
    (CAL_SERIES as Series[]).forEach((s) => {
      if (!s.days.includes(iso)) return;
      events.push({
        id: s.id + "@" + key, series: s.id, title: s.title, kind: s.kind, date: key,
        start: toMin(s.start), end: toMin(s.end), who: s.who, agent: s.agent, place: s.place, meet: s.meet, note: s.note,
      });
    });
    (CAL_CHECKLISTS as { title: string; days: number[] }[]).forEach((c, ci) => {
      if (c.days.includes(iso)) checks.push({ id: "k" + ci + "@" + key, title: c.title, date: key, done: ci === 0 && date < today });
    });
  }
  const offset = daysBetween(BASE, ws);
  (CAL_EVENTS as OneOff[]).forEach((e, ei) => {
    if (e.day < offset || e.day > offset + 6) return;
    events.push({
      id: "e" + ei, title: e.title, kind: e.kind, date: ymd(addDays(BASE, e.day)),
      start: toMin(e.start), end: toMin(e.end), who: e.who, place: e.place, meet: e.meet,
    });
  });
  return { events, checks };
}

export function seedTasks(): Task[] {
  const today = todayDate();
  return (CAL_TASKS as any[]).map((t, i) => ({
    id: "t" + i, title: t.title, due: ymd(addDays(today, t.due)), leverage: t.leverage, priority: t.priority, mins: t.mins,
  }));
}

/* ---------- layout ---------- */

/** Side-by-side columns for events that overlap in time, per day. */
export function layoutDay(evs: Ev[]): Record<string, { col: number; cols: number }> {
  const out: Record<string, { col: number; cols: number }> = {};
  const sorted = [...evs].sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster: string[] = [];
  let ends: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    cluster.forEach((id) => (out[id].cols = ends.length));
    cluster = [];
    ends = [];
  };
  sorted.forEach((e) => {
    const end = Math.max(e.end, e.start + 20);
    if (e.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    let col = ends.findIndex((x) => x <= e.start);
    if (col === -1) {
      col = ends.length;
      ends.push(end);
    } else ends[col] = end;
    out[e.id] = { col, cols: 1 };
    cluster.push(e.id);
    clusterEnd = Math.max(clusterEnd, end);
  });
  flush();
  return out;
}

/** The six-week grid a month view shows, starting on a Monday. */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = weekStart(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export const byLeverage = (a: Task, b: Task) => b.leverage - a.leverage || a.due.localeCompare(b.due);
export const byDue = (a: Task, b: Task) => a.due.localeCompare(b.due) || b.leverage - a.leverage;
