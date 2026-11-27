/* KPI definitions for the Pulse Dashboard band, computed from the store. */
import { metrics, euro } from "./store";
import type { FMState } from "./types";
import { canSeeMoney, type RoleId } from "./config";
import { diffDays, TODAY } from "./dates";

export type KpiDef = { label: string; value: string; delta: string; dir: "up" | "down"; hint: string; go: [string, string?] };

export function kpiDefs(s: FMState): Record<string, KpiDef> {
  const m = metrics(s);
  const oldest = m.completed.reduce((a, j) => Math.max(a, j.completedAt ? diffDays(TODAY, j.completedAt) : 0), 0);
  const money = canSeeMoney(s.role);
  const defs: Record<string, KpiDef> = {
    unallocated: { label: "Awaiting allocation", value: String(m.unallocated.length), delta: m.newJobs.length + " new jobs", dir: m.unallocated.length ? "down" : "up", hint: "in the job box", go: ["Jobs", "board"] },
    progress: { label: "Jobs in progress", value: String(m.inProgress.length), delta: m.inProgress.filter((j) => j.returnRequired).length + " need a return", dir: "up", hint: "across " + new Set(m.inProgress.flatMap((j) => j.engineerIds)).size + " engineers", go: ["Jobs", "board"] },
    service: { label: "Upcoming service visits", value: String(m.upcoming.length + m.decDue.filter((d) => !d.existing).length), delta: m.unallocatedService.length + " unallocated", dir: m.unallocatedService.length ? "down" : "up", hint: "next 3 weeks", go: ["Servicing", "due"] },
    available: { label: "Engineers available today", value: m.available.length + " of " + s.engineers.length, delta: s.engineers.filter((e) => e.holidays.includes(TODAY)).length + " on leave", dir: "up", hint: "3 h or more free", go: ["Schedule", "availability"] },
  };
  if (money) {
    Object.assign(defs, {
      unbilled: { label: "Completed, not invoiced", value: euro(m.unbilledValue), delta: m.completed.length + " jobs", dir: "down", hint: "oldest " + oldest + " days", go: ["Finance", "ready"] },
      outstanding: { label: "Outstanding invoices", value: euro(m.outstandingValue), delta: m.outstanding.length + " invoices", dir: "up", hint: "issued, not paid", go: ["Finance", "invoices"] },
      overdue: { label: "Overdue payments", value: euro(m.overdueValue), delta: m.overdue.length + " overdue", dir: "down", hint: "past due date", go: ["Finance", "invoices"] },
      quotes: { label: "Open quote value", value: euro(m.openQuoteValue), delta: m.conversion + "% won", dir: "up", hint: m.openQuotes.length + " quotes out", go: ["Quotes", "pipeline"] },
      revenue: { label: "Invoiced this month", value: euro(m.revenueMonth), delta: "November", dir: "up", hint: "net of VAT", go: ["Finance", "overview"] },
    } as Record<string, KpiDef>);
  }
  return defs;
}

export const defaultKpis = (r: RoleId) =>
  r === "owner" ? ["unbilled", "outstanding", "overdue", "quotes"] : r === "accountant" ? ["revenue", "outstanding", "overdue", "unbilled"] : ["unallocated", "progress", "service", "available"];
