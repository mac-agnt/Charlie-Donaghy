import { COMPANY } from "./config";

/* Date helpers. Everything works on ISO date strings in local time so that
   "today" is always the demo reference date (Friday 27 November 2026). */

export const TODAY = COMPANY.today;

export function parse(d: string): Date {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day, 12, 0, 0);
}
export function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
export function addDays(d: string, n: number): string {
  const x = parse(d);
  x.setDate(x.getDate() + n);
  return iso(x);
}
export function addMonths(d: string, n: number): string {
  const x = parse(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, last));
  return iso(x);
}
export function diffDays(a: string, b: string): number {
  return Math.round((parse(a).getTime() - parse(b).getTime()) / 86400000);
}
export const dow = (d: string) => parse(d).getDay();
export const isWeekend = (d: string) => dow(d) === 0 || dow(d) === 6;
export function isShutdown(d: string) {
  return d >= COMPANY.companyShutdown.from && d <= COMPANY.companyShutdown.to;
}
export const isWorkingDay = (d: string) => !isWeekend(d) && !isShutdown(d);

export function addWorkingDays(d: string, n: number): string {
  let x = d;
  let left = n;
  while (left > 0) {
    x = addDays(x, 1);
    if (isWorkingDay(x)) left--;
  }
  return x;
}
export function nextWorkingDay(d: string): string {
  let x = d;
  while (!isWorkingDay(x)) x = addDays(x, 1);
  return x;
}
/** Inclusive list of working days between two dates. */
export function workingDaysBetween(a: string, b: string): string[] {
  const out: string[] = [];
  let x = a;
  while (x <= b) {
    if (isWorkingDay(x)) out.push(x);
    x = addDays(x, 1);
  }
  return out;
}
export function weekStart(d: string): string {
  const w = dow(d);
  return addDays(d, w === 0 ? -6 : 1 - w);
}
export const period = (d: string) => d.slice(0, 7);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const monthName = (p: string) => MONTHS_LONG[Number(p.slice(5, 7)) - 1] + " " + p.slice(0, 4);
export const monthShort = (p: string) => MONTHS[Number(p.slice(5, 7)) - 1];
export const dayShort = (d: string) => DAYS[dow(d)];
export const dayLong = (d: string) => DAYS_LONG[dow(d)];

/** "Fri 27 Nov" */
export function fmtDate(d?: string | null, withYear = false): string {
  if (!d) return "Not set";
  const x = parse(d);
  return DAYS[x.getDay()] + " " + x.getDate() + " " + MONTHS[x.getMonth()] + (withYear ? " " + x.getFullYear() : "");
}
/** "27 Nov 2026" */
export function fmtDay(d?: string | null): string {
  if (!d) return "Not set";
  const x = parse(d);
  return x.getDate() + " " + MONTHS[x.getMonth()] + " " + x.getFullYear();
}
/** Relative label against TODAY. */
export function rel(d?: string | null): string {
  if (!d) return "Not scheduled";
  const n = diffDays(d, TODAY);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n > 1 && n < 7) return dayLong(d);
  if (n < 0 && n > -7) return "Last " + dayLong(d);
  return fmtDate(d);
}
export const nowStamp = () => TODAY + " " + new Date().toTimeString().slice(0, 5);
