/* The shared operating data for the platform. Every module reads from and
   writes to this one store, so a change to a job shows up on the customer,
   the schedule, the dashboard and the invoice register at the same time.
   Frontend only: state lasts for the session and resets on reload. */

import { useSyncExternalStore } from "react";
import { COMPANY, DIVISIONS, divisionById, type DivisionId, type RoleId } from "./config";
import { TODAY, addDays, diffDays, fmtDate, isWorkingDay, period as periodOf, workingDaysBetween, addWorkingDays, nextWorkingDay, monthName } from "./dates";
import { seedState, jobInvoiceLines, invoiceNet, invoiceGross } from "./seed";
import type {
  AgentId, AgentRun, AssetType, Communication, Drawer, Enquiry, FMState, Invoice, Job, JobStatus, LogEvent, Proposal,
  Quote, QuoteLine, ServiceVisit, Skill, TimeEntry, Visit, PipelineStage, ChecklistItem, ProposalSection,
} from "./types";

export { invoiceNet, invoiceGross };

let state: FMState = seedState();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const fm = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

function set(patch: Partial<FMState> | ((s: FMState) => Partial<FMState>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
}

export function useFM(): FMState {
  return useSyncExternalStore(fm.subscribe, fm.get, fm.get);
}

/* ── Navigation bridge (registered by PulseLogic) ───────────────────────── */
let navigator: ((page: string) => void) | null = null;
export function bindNavigator(fn: (page: string) => void) {
  navigator = fn;
}
export function go(page: string, tab?: string, filters?: Record<string, string>) {
  set((s) => ({ ui: { ...s.ui, tabs: tab ? { ...s.ui.tabs, [page]: tab } : s.ui.tabs, filters: filters ? { ...s.ui.filters, ...filters } : s.ui.filters, drawer: null, drawerStack: [] } }));
  navigator?.(page);
}

/* ── Small helpers ──────────────────────────────────────────────────────── */
const uid = (p: string) => {
  state.counters.id++;
  return p + state.counters.id;
};
const stamp = () => TODAY + " " + new Date().toTimeString().slice(0, 5);
export const euro = (n: number, dp = 0) =>
  "€" + (Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp)).toLocaleString("en-IE", { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const euro2 = (n: number) => euro(n, 2);
export const hrs = (n: number) => (Math.round(n * 100) / 100) + " h";

const actorName = () => {
  const r = state.role;
  if (r === "engineer") return state.engineers.find((e) => e.id === state.meEngineerId)!.name;
  return r === "owner" ? "Charlie Donaghy" : r === "ops" ? "Sinéad Kelly" : "Fiona Brennan";
};
function log(text: string, kind: LogEvent["kind"], ref?: string, who?: string) {
  const ev: LogEvent = { id: uid("l"), at: stamp(), who: who || actorName(), text, kind, ref };
  state = { ...state, log: [ev, ...state.log] };
}
export function toast(text: string, tone: "ok" | "warn" | "info" = "ok") {
  const id = uid("toast");
  set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
  setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
}
function patchJob(id: string, patch: Partial<Job> | ((j: Job) => Partial<Job>), historyText?: string, who?: string) {
  state = {
    ...state,
    jobs: state.jobs.map((j) => {
      if (j.id !== id) return j;
      const p = typeof patch === "function" ? patch(j) : patch;
      const next = { ...j, ...p };
      if (historyText) next.history = [...next.history, { at: stamp(), who: who || actorName(), text: historyText }];
      return next;
    }),
  };
}
function patchInvoice(id: string, patch: Partial<Invoice>, historyText?: string) {
  state = {
    ...state,
    invoices: state.invoices.map((i) => {
      if (i.id !== id) return i;
      const next = { ...i, ...patch };
      if (historyText) next.history = [...next.history, { at: stamp(), who: actorName(), text: historyText }];
      return next;
    }),
  };
}
function automationRan(no: string, outcome: string, status: "ok" | "skipped" | "awaiting approval" = "ok") {
  state = {
    ...state,
    automations: state.automations.map((a) => (a.no === no ? { ...a, runs: [{ at: stamp(), outcome, status }, ...a.runs] } : a)),
  };
}
const automationOn = (no: string) => !!state.automations.find((a) => a.no === no)?.enabled;
function addProposal(p: Omit<Proposal, "id" | "status" | "createdAt">): Proposal {
  const full: Proposal = { ...p, id: uid("pp"), status: "pending", createdAt: stamp() };
  state = { ...state, proposals: [full, ...state.proposals] };
  return full;
}
const commit = () => emit();

/* ── Lookups ────────────────────────────────────────────────────────────── */
export const sel = {
  customer: (s: FMState, id?: string) => s.customers.find((c) => c.id === id),
  site: (s: FMState, id?: string) => s.sites.find((x) => x.id === id),
  job: (s: FMState, id?: string) => s.jobs.find((j) => j.id === id),
  engineer: (s: FMState, id?: string | null) => s.engineers.find((e) => e.id === id),
  invoice: (s: FMState, id?: string) => s.invoices.find((i) => i.id === id),
  quote: (s: FMState, id?: string) => s.quotes.find((q) => q.id === id),
  contract: (s: FMState, id?: string) => s.contracts.find((c) => c.id === id),
  product: (s: FMState, id?: string) => s.products.find((p) => p.id === id),
  primaryContact: (s: FMState, customerId: string) => s.contacts.find((c) => c.customerId === customerId && c.primary) || s.contacts.find((c) => c.customerId === customerId),
};

export const inDivision = (s: FMState, d: DivisionId) => s.division === "ALL" || s.division === d;

/* Labour and materials for a job, consolidated across every visit. */
export function jobTotals(s: FMState, j: Job) {
  const visits = s.visits.filter((v) => v.jobId === j.id).sort((a, b) => (a.date + a.start < b.date + b.start ? -1 : 1));
  const time = s.time.filter((t) => t.jobId === j.id);
  const billableHours = time.filter((t) => t.kind === "billable").reduce((a, t) => a + t.hours, 0);
  const totalHours = time.reduce((a, t) => a + t.hours, 0);
  const materials = s.materials.filter((m) => m.jobId === j.id);
  const materialsValue = materials.reduce((a, m) => a + m.qty * m.unitPrice, 0);
  const rate = COMPANY.labourRates[j.division];
  const labourValue = billableHours * rate;
  const value = j.agreedPrice ?? labourValue + materialsValue;
  return { visits, time, billableHours, totalHours, materials, materialsValue, labourValue, rate, value };
}

export const invoiceBalance = (inv: Invoice) => Math.max(0, Math.round((invoiceGross(inv) - inv.paid) * 100) / 100);
export const isOutstanding = (inv: Invoice) => ["issued", "part-paid", "overdue"].includes(inv.status);
export const quoteNet = (q: Quote) => {
  const sub = q.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  return Math.round(sub * (1 - q.discountPct / 100) * 100) / 100;
};
export const quoteGross = (q: Quote, vat = state.vatRate) => Math.round(quoteNet(q) * (1 + vat) * 100) / 100;

/** Engineer commitments on a day: bookings, visits, service visits, holidays. */
export function engineerDay(s: FMState, engineerId: string, date: string) {
  const items: { kind: "install" | "job" | "service" | "holiday"; label: string; hours: number; ref?: string; jobId?: string; svId?: string }[] = [];
  const eng = sel.engineer(s, engineerId)!;
  if (eng.holidays.includes(date)) items.push({ kind: "holiday", label: "Annual leave", hours: 8 });
  s.installBookings
    .filter((b) => b.engineerIds.includes(engineerId) && b.from <= date && b.to >= date && isWorkingDay(date))
    .forEach((b) => items.push({ kind: "install", label: b.label, hours: 8, jobId: b.jobId, ref: sel.job(s, b.jobId)?.number }));
  s.jobs
    .filter((j) => j.engineerIds.includes(engineerId) && j.scheduled === date && !j.scheduledEnd && (j.status === "new" || j.status === "progress"))
    // A PPM job is shown through its service visit, never twice.
    .filter((j) => !(j.serviceVisitId && s.serviceVisits.some((v) => v.id === j.serviceVisitId && v.status !== "completed")))
    .forEach((j) => {
      if (!items.some((i) => i.jobId === j.id)) items.push({ kind: "job", label: (sel.site(s, j.siteId)?.name || "") + ": " + j.description.split(".")[0], hours: j.estHours, jobId: j.id, ref: j.number });
    });
  s.serviceVisits
    .filter((v) => v.engineerId === engineerId && v.date === date && v.status !== "completed")
    .forEach((v) => items.push({ kind: "service", label: "PPM: " + (sel.site(s, v.siteId)?.name || ""), hours: v.estHours, svId: v.id, jobId: v.jobId }));
  const hours = items.reduce((a, i) => a + i.hours, 0);
  return { items, hours, free: Math.max(0, 8 - hours), onLeave: items.some((i) => i.kind === "holiday") };
}

/* ── Metrics (everything on the dashboard comes from here) ──────────────── */
export function metrics(s: FMState) {
  const jobs = s.jobs.filter((j) => inDivision(s, j.division));
  const invoices = s.invoices.filter((i) => inDivision(s, i.division));
  const quotes = s.quotes.filter((q) => inDivision(s, q.division));
  const contracts = s.contracts.filter((c) => inDivision(s, c.division));
  const newJobs = jobs.filter((j) => j.status === "new");
  const unallocated = newJobs.filter((j) => j.engineerIds.length === 0);
  const inProgress = jobs.filter((j) => j.status === "progress");
  const completed = jobs.filter((j) => j.status === "completed");
  const invoiced = jobs.filter((j) => j.status === "invoiced");
  const unbilledValue = completed.reduce((a, j) => a + jobTotals(s, j).value, 0);
  const outstanding = invoices.filter(isOutstanding);
  const outstandingValue = outstanding.reduce((a, i) => a + invoiceBalance(i), 0);
  const overdue = invoices.filter((i) => i.status === "overdue" || (isOutstanding(i) && i.dueDate! < TODAY));
  const overdueValue = overdue.reduce((a, i) => a + invoiceBalance(i), 0);
  const month = periodOf(TODAY);
  const issuedThisMonth = invoices.filter((i) => i.issueDate && periodOf(i.issueDate) === month && i.status !== "cancelled" && i.status !== "draft");
  const revenueMonth = issuedThisMonth.reduce((a, i) => a + invoiceNet(i), 0);
  const revenueByDivision = DIVISIONS.filter((d) => inDivision(s, d.id)).map((d) => ({
    id: d.id,
    name: d.short,
    color: d.color,
    value: issuedThisMonth.filter((i) => i.division === d.id).reduce((a, i) => a + invoiceNet(i), 0),
  }));
  const months: { period: string; value: number }[] = [];
  for (let k = 5; k >= 0; k--) {
    const p = periodOf(addDays(month + "-15", -30 * k));
    months.push({ period: p, value: invoices.filter((i) => i.issueDate && periodOf(i.issueDate) === p && i.status !== "cancelled").reduce((a, i) => a + invoiceNet(i), 0) });
  }
  const openQuotes = quotes.filter((q) => q.stage === "Quote Sent" || q.stage === "Awaiting Decision");
  const openQuoteValue = openQuotes.reduce((a, q) => a + quoteNet(q), 0);
  const won = quotes.filter((q) => q.stage === "Accepted").length;
  const lost = quotes.filter((q) => q.stage === "Lost").length;
  const conversion = won + lost ? Math.round((won / (won + lost)) * 100) : 0;
  const upcoming = s.serviceVisits.filter((v) => v.status !== "completed" && v.date >= TODAY && v.date <= addDays(TODAY, 21) && inDivision(s, sel.contract(s, v.contractId)!.division));
  const unallocatedService = s.serviceVisits.filter((v) => !v.engineerId && v.status !== "completed" && inDivision(s, sel.contract(s, v.contractId)!.division));
  const decDue = dueVisits(s, "2026-12").filter((d) => inDivision(s, d.contract.division));
  const engToday = s.engineers.map((e) => ({ e, day: engineerDay(s, e.id, TODAY) }));
  const available = engToday.filter((x) => !x.day.onLeave && x.day.free >= 3);
  const contractValue = contracts.reduce((a, c) => a + c.annualValue, 0);
  const svDone = s.serviceVisits.filter((v) => v.status === "completed" && inDivision(s, sel.contract(s, v.contractId)!.division));
  const svOnTime = svDone.filter((v) => {
    const c = sel.contract(s, v.contractId)!;
    return v.period === periodOf(v.date) || c.billing === "monthly";
  });
  return {
    newJobs, unallocated, inProgress, completed, invoiced, unbilledValue,
    outstanding, outstandingValue, overdue, overdueValue,
    revenueMonth, revenueByDivision, months, openQuotes, openQuoteValue, conversion, won, lost,
    upcoming, unallocatedService, decDue, engToday, available,
    contracts, contractValue, svDone, svOnTimePct: svDone.length ? Math.round((svOnTime.length / svDone.length) * 100) : 100,
  };
}

/* "Requires attention": every alert links to the record behind it. */
export type Alert = { id: string; tone: "bad" | "warn" | "info"; title: string; detail: string; drawer?: Drawer; page?: string; tab?: string; value?: number };
export function alerts(s: FMState): Alert[] {
  const out: Alert[] = [];
  s.jobs.filter((j) => inDivision(s, j.division)).forEach((j) => {
    const site = sel.site(s, j.siteId)!;
    if (j.status === "completed" && j.completedAt) {
      const d = diffDays(TODAY, j.completedAt);
      if (d >= COMPANY.unbilledDays) {
        out.push({ id: "unb-" + j.id, tone: d >= 7 ? "bad" : "warn", title: j.number + " completed " + d + " days ago, invoice not generated", detail: site.name + ", " + euro(jobTotals(s, j).value) + " unbilled", drawer: { kind: "job", id: j.id }, value: jobTotals(s, j).value });
      }
    }
    if (j.status === "progress" && j.startedAt) {
      const d = diffDays(TODAY, j.startedAt);
      const returnBooked = j.scheduled && j.scheduled >= TODAY;
      if (d > COMPANY.stallDays && !returnBooked && !j.scheduledEnd) {
        out.push({ id: "stall-" + j.id, tone: "warn", title: (j.type === "Repair" ? "Repair" : j.type) + " " + j.number + " in progress for " + d + " days", detail: site.name + ", no return visit booked", drawer: { kind: "job", id: j.id } });
      }
    }
  });
  const unalloc = s.serviceVisits.filter((v) => !v.engineerId && v.status !== "completed" && inDivision(s, sel.contract(s, v.contractId)!.division));
  if (unalloc.length) out.push({ id: "svalloc", tone: "warn", title: unalloc.length + " service visit" + (unalloc.length > 1 ? "s require" : " requires") + " allocation", detail: unalloc.map((v) => sel.site(s, v.siteId)!.name).join(", "), page: "Servicing", tab: "due" });
  // Booking overlaps
  s.engineers.forEach((e) => {
    for (let k = 0; k < 10; k++) {
      const d = addWorkingDays(TODAY, k);
      const day = engineerDay(s, e.id, d);
      const installs = day.items.filter((i) => i.kind === "install");
      const others = day.items.filter((i) => i.kind === "job" || i.kind === "service");
      if (day.onLeave && day.items.length > 1) {
        const o = day.items.find((i) => i.kind !== "holiday")!;
        out.push({ id: "clash-" + e.id + d, tone: "warn", title: e.name.split(" ")[0] + " is booked while on annual leave, " + fmtDate(d), detail: (o.ref ? o.ref + " " : "") + o.label, drawer: o.jobId ? { kind: "job", id: o.jobId } : undefined, page: o.jobId ? undefined : "Schedule" });
        break;
      }
      if (installs.length && others.length) {
        const o = others[0];
        out.push({ id: "clash-" + e.id + d, tone: "warn", title: "Installation overlaps an existing booking: " + e.name.split(" ")[0] + ", " + fmtDate(d), detail: installs[0].label + " vs " + (o.ref ? o.ref + " " : "") + o.label.split(":")[0], drawer: o.jobId ? { kind: "job", id: o.jobId } : undefined, page: o.jobId ? undefined : "Schedule" });
        break;
      }
    }
  });
  s.invoices.filter((i) => inDivision(s, i.division) && (i.status === "overdue" || (isOutstanding(i) && i.dueDate! < TODAY))).forEach((i) => {
    out.push({ id: "od-" + i.id, tone: "bad", title: i.number + " overdue by " + diffDays(TODAY, i.dueDate!) + " days", detail: sel.customer(s, i.customerId)!.name + ", " + euro2(invoiceBalance(i)) + " outstanding", drawer: { kind: "invoice", id: i.id }, value: invoiceBalance(i) });
  });
  const draftInv = s.invoices.filter((i) => i.status === "draft" && inDivision(s, i.division));
  if (draftInv.length) out.push({ id: "drafts", tone: "info", title: draftInv.length + " draft invoice" + (draftInv.length > 1 ? "s" : "") + " waiting for approval", detail: euro(draftInv.reduce((a, i) => a + invoiceNet(i), 0)) + " net", page: "Finance", tab: "ready" });
  const enq = s.enquiries.filter((e) => e.status === "new" && inDivision(s, e.division));
  if (enq.length) out.push({ id: "enq", tone: "info", title: enq.length + " new website enquir" + (enq.length > 1 ? "ies" : "y"), detail: enq.map((e) => e.company).join(", "), page: "Quotes", tab: "pipeline" });
  const order = { bad: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

/* ── Role, division, UI ─────────────────────────────────────────────────── */
export function setRole(role: RoleId) {
  set({ role });
  toast("Viewing as " + (role === "owner" ? "Charlie (owner)" : role === "ops" ? "Sinéad (operations admin)" : role === "engineer" ? "Declan (engineer)" : "Fiona (accountant)"), "info");
}
export const setDivision = (division: FMState["division"]) => set({ division });
export const setTab = (page: string, tab: string) => set((s) => ({ ui: { ...s.ui, tabs: { ...s.ui.tabs, [page]: tab } } }));
export const tabOf = (s: FMState, page: string, fallback: string) => s.ui.tabs[page] || fallback;
export const setFilter = (key: string, value: string) => set((s) => ({ ui: { ...s.ui, filters: { ...s.ui.filters, [key]: value } } }));
export function openDrawer(d: Drawer) {
  set((s) => ({ ui: { ...s.ui, drawerStack: s.ui.drawer ? [...s.ui.drawerStack, s.ui.drawer] : s.ui.drawerStack, drawer: d } }));
}
export function backDrawer() {
  set((s) => {
    const stack = s.ui.drawerStack.slice();
    const prev = stack.pop() || null;
    return { ui: { ...s.ui, drawer: prev, drawerStack: stack } };
  });
}
export const closeDrawer = () => set((s) => ({ ui: { ...s.ui, drawer: null, drawerStack: [] } }));
export const openModal = (modal: FMState["ui"]["modal"]) => set((s) => ({ ui: { ...s.ui, modal } }));
export const closeModal = () => set((s) => ({ ui: { ...s.ui, modal: null } }));
export const openSite = (page = "home") => set((s) => ({ ui: { ...s.ui, siteOpen: true, sitePage: page } }));
export const closeSite = () => set((s) => ({ ui: { ...s.ui, siteOpen: false } }));
export const setSitePage = (page: string) => set((s) => ({ ui: { ...s.ui, sitePage: page } }));

/* ── Jobs ───────────────────────────────────────────────────────────────── */
export function findDuplicateJobs(s: FMState, siteId: string, description: string) {
  const words = description.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
  return s.jobs.filter((j) => j.siteId === siteId && j.status !== "invoiced" && words.some((w) => j.description.toLowerCase().includes(w)));
}

export function createJob(input: { siteId: string; division: DivisionId; type: Job["type"]; priority: Job["priority"]; description: string; woRef?: string; engineerIds?: string[]; scheduled?: string | null; scheduledEnd?: string | null; source?: Job["source"]; estHours?: number; quoteId?: string; agreedPrice?: number; serviceVisitId?: string; contractId?: string; billedVia?: Job["billedVia"]; status?: JobStatus }): Job {
  const n = state.counters.job;
  state.counters.job++;
  const site = sel.site(state, input.siteId)!;
  const j: Job = {
    id: "j" + n, number: "J-" + n, woRef: input.woRef || "", customerId: site.customerId, siteId: site.id, division: input.division, type: input.type,
    priority: input.priority, status: input.status || "new", engineerIds: input.engineerIds || [], scheduled: input.scheduled || null, scheduledEnd: input.scheduledEnd || null,
    description: input.description, assetIds: state.assets.filter((a) => a.siteId === site.id).slice(0, 1).map((a) => a.id), internalNotes: [], completionNotes: "", photos: [],
    createdAt: TODAY, billedVia: input.billedVia || "job", contractId: input.contractId, serviceVisitId: input.serviceVisitId, quoteId: input.quoteId, agreedPrice: input.agreedPrice,
    estHours: input.estHours || 2, source: input.source || "Phone", history: [{ at: stamp(), who: actorName(), text: "Job created (" + (input.source || "Phone").toLowerCase() + ")" }],
  };
  state = { ...state, jobs: [j, ...state.jobs] };
  log(j.number + " created for " + site.name, "job", j.id);
  if (automationOn("01") && !j.engineerIds.length && j.source !== "Service plan") {
    const skill = skillFor(j.division, j.description);
    const names = state.engineers.filter((e) => e.skills.includes(skill)).map((e) => e.name.split(" ")[0]);
    automationRan("01", j.number + ": notified " + names.join(" and "));
  }
  return j;
}

export function skillFor(div: DivisionId, text = ""): Skill {
  const t = text.toLowerCase();
  if (div === "SS") return /access|fob|reader|door/.test(t) ? "Access control" : /intercom/.test(t) ? "Intercom" : "CCTV";
  if (div === "LPM") return /garden|grounds|leaf|grass/.test(t) ? "Gardening" : "Maintenance";
  return /extinguisher/.test(t) ? "Extinguishers" : /emergency light/.test(t) ? "Emergency lighting" : "Fire";
}

export function allocateJob(jobId: string, engineerIds: string[], date: string | null) {
  const j = sel.job(state, jobId)!;
  patchJob(jobId, { engineerIds, scheduled: date }, "Allocated to " + engineerIds.map((e) => sel.engineer(state, e)!.name).join(", ") + (date ? " for " + fmtDate(date) : ""));
  log(j.number + " allocated to " + engineerIds.map((e) => sel.engineer(state, e)!.name.split(" ")[0]).join(", "), "schedule", jobId);
  automationRan("02", j.number + " allocated, schedule updated");
  commit();
  toast(j.number + " allocated");
}

export function acceptJob(jobId: string, engineerId: string) {
  const j = sel.job(state, jobId)!;
  const date = j.scheduled || TODAY;
  patchJob(jobId, { engineerIds: [engineerId], scheduled: date }, "Accepted from the job box", sel.engineer(state, engineerId)!.name);
  log(sel.engineer(state, engineerId)!.name + " accepted " + j.number + " from the job box", "job", jobId, sel.engineer(state, engineerId)!.name);
  automationRan("02", j.number + " accepted by " + sel.engineer(state, engineerId)!.name.split(" ")[0] + ", booked " + fmtDate(date));
  commit();
  toast(j.number + " accepted and added to the schedule");
}

export function startJob(jobId: string, engineerId?: string) {
  const j = sel.job(state, jobId)!;
  const eng = engineerId || j.engineerIds[0];
  patchJob(jobId, { status: "progress", startedAt: j.startedAt || TODAY, engineerIds: j.engineerIds.length ? j.engineerIds : eng ? [eng] : [] }, "Work started" + (eng ? " (arrival location verified)" : ""), eng ? sel.engineer(state, eng)?.name : undefined);
  log(j.number + " started", "job", jobId);
  commit();
  toast(j.number + " moved to In progress");
}

export function logVisit(jobId: string, v: { engineerId: string; date: string; start: string; end: string; hours: number; summary: string; returnRequired: boolean; verified: boolean; kind?: TimeEntry["kind"] }) {
  const j = sel.job(state, jobId)!;
  const visit: Visit = { id: uid("v"), jobId, engineerId: v.engineerId, date: v.date, start: v.start, end: v.end, hours: v.hours, summary: v.summary, returnRequired: v.returnRequired, locationVerified: v.verified ? "arrival+departure" : undefined };
  const te: TimeEntry = { id: uid("t"), engineerId: v.engineerId, date: v.date, hours: v.hours, kind: v.kind || "billable", jobId, visitId: visit.id, note: v.summary.split(".")[0], approved: false, corrections: [] };
  state = { ...state, visits: [...state.visits, visit], time: [...state.time, te] };
  const name = sel.engineer(state, v.engineerId)!.name;
  patchJob(jobId, (x) => ({
    status: x.status === "new" ? "progress" : x.status,
    startedAt: x.startedAt || v.date,
    engineerIds: x.engineerIds.includes(v.engineerId) ? x.engineerIds : [...x.engineerIds, v.engineerId],
    returnRequired: v.returnRequired,
    returnNote: v.returnRequired ? x.returnNote || "Return visit required" : undefined,
  }), "Visit logged: " + v.hours + " h on " + fmtDate(v.date) + (v.verified ? " (arrival and departure location verified)" : "") + (v.returnRequired ? ", return required" : ""), name);
  log(name + " logged " + v.hours + " h on " + j.number, "job", jobId, name);
  commit();
  const totals = jobTotals(state, sel.job(state, jobId)!);
  toast("Visit logged. " + j.number + " now has " + totals.billableHours + " h across " + totals.visits.length + " visit" + (totals.visits.length > 1 ? "s" : ""));
}

export function addMaterial(jobId: string, m: { productId?: string; description: string; qty: number; unitPrice: number; addedBy?: string }) {
  const j = sel.job(state, jobId)!;
  state = { ...state, materials: [...state.materials, { id: uid("m"), jobId, productId: m.productId, description: m.description, qty: m.qty, unitPrice: m.unitPrice, addedBy: m.addedBy || actorName(), date: TODAY }] };
  patchJob(jobId, {}, "Material added: " + m.qty + " × " + m.description, m.addedBy);
  commit();
  toast(m.description + " added to " + j.number);
}

export function addPhoto(jobId: string, caption: string) {
  patchJob(jobId, (j) => ({ photos: [...j.photos, { id: uid("ph"), caption, by: actorName(), at: stamp(), hue: Math.floor(Math.random() * 360) }] }), "Photo uploaded: " + caption);
  commit();
  toast("Photo attached");
}
export function addNote(jobId: string, note: string) {
  patchJob(jobId, (j) => ({ internalNotes: [...j.internalNotes, note] }), "Internal note added");
  commit();
}
export function leaveSiteReturn(jobId: string, note: string, returnDate: string | null) {
  const j = sel.job(state, jobId)!;
  patchJob(jobId, { returnRequired: true, returnNote: note, scheduled: returnDate || j.scheduled }, "Left site, return required: " + note + (returnDate ? ". Return booked " + fmtDate(returnDate) : ""));
  log(j.number + ": return required" + (returnDate ? ", booked " + fmtDate(returnDate) : ""), "job", jobId);
  commit();
  toast("Return visit recorded. Job stays In progress");
}
export function pauseJob(jobId: string) {
  patchJob(jobId, {}, "Work paused");
  commit();
  toast("Paused. Time so far is kept on the job", "info");
}

/** Only runs after the engineer explicitly confirms the work is complete. */
export function completeJob(jobId: string, confirmedBy: string, notes: string) {
  const j = sel.job(state, jobId)!;
  patchJob(jobId, { status: j.billedVia === "contract" ? "invoiced" : "completed", completedAt: TODAY, completionConfirmedBy: confirmedBy, completionNotes: notes, returnRequired: false, returnNote: undefined }, "Completion confirmed by " + confirmedBy, confirmedBy);
  log(confirmedBy + " confirmed " + j.number + " complete", "job", jobId, confirmedBy);
  // Automation 04: completion notice.
  if (automationOn("04")) {
    const c = prepareCompletionNotice(jobId, true);
    automationRan("04", j.number + ": completion notice drafted for " + sel.customer(state, j.customerId)!.name, "awaiting approval");
    addProposal({ agentId: "comms", kind: "send-comm", title: "Send completion notice for " + j.number, detail: "To " + c.to + ". Confirms the work at " + sel.site(state, j.siteId)!.name + " is complete. No access details included.", ref: j.number, payload: { commId: c.id }, category: "External communication" });
  }
  // Automation 05: invoice draft (never for contract-billed work).
  if (j.billedVia === "job" && automationOn("05")) {
    const inv = draftInvoiceForJob(jobId, true);
    automationRan("05", j.number + ": draft invoice prepared (" + euro(invoiceNet(inv)) + " net)", "awaiting approval");
    addProposal({ agentId: "invoice", kind: "issue-invoice", title: "Issue invoice for " + j.number + ", " + sel.site(state, j.siteId)!.name, detail: "Draft consolidates every visit, all billable time and all materials. Number assigned only when approved.", value: invoiceGross(inv), ref: j.number, payload: { jobId, invoiceId: inv.id }, category: "Financial" });
  } else if (j.billedVia === "contract") {
    log(j.number + " covered by contract " + (sel.contract(state, j.contractId)?.ref || "") + ", no job invoice", "finance", jobId);
  }
  if (j.serviceVisitId) {
    state = { ...state, serviceVisits: state.serviceVisits.map((v) => (v.id === j.serviceVisitId ? { ...v, status: "completed" } : v)) };
  }
  commit();
  toast(j.number + " complete. Completion notice and invoice draft prepared for approval");
}

/** Drag on the board. Completed and Invoiced can't be reached by dragging. */
export function moveJob(jobId: string, to: JobStatus): "ok" | "needs-confirm" | "blocked" {
  const j = sel.job(state, jobId)!;
  if (to === j.status) return "ok";
  if (to === "completed") return "needs-confirm";
  if (to === "invoiced") {
    toast("Invoices are issued from the job, not by dragging. Open the job to review the invoice.", "warn");
    return "blocked";
  }
  if (j.status === "completed" || j.status === "invoiced") {
    toast("Completed work can't be dragged back. Reopen it from the job record.", "warn");
    return "blocked";
  }
  if (to === "progress") startJob(jobId);
  if (to === "new") {
    patchJob(jobId, { status: "new" }, "Moved back to New");
    commit();
  }
  return "ok";
}

export function reopenJob(jobId: string) {
  const j = sel.job(state, jobId)!;
  if (j.status === "invoiced") return toast("Already invoiced. Cancel the invoice first.", "warn");
  patchJob(jobId, { status: "progress", completedAt: undefined }, "Reopened");
  // Remove any draft invoice so nothing is double-billed.
  state = { ...state, invoices: state.invoices.filter((i) => !(i.jobId === jobId && i.status === "draft")), proposals: state.proposals.map((p) => (p.payload.jobId === jobId && p.status === "pending" ? { ...p, status: "rejected" } : p)) };
  commit();
  toast(j.number + " reopened");
}

/* ── Communications ─────────────────────────────────────────────────────── */
export function prepareCompletionNotice(jobId: string, silent = false): Communication {
  const j = sel.job(state, jobId)!;
  const existing = state.comms.find((c) => c.jobId === jobId && c.kind === "Completion notice");
  if (existing) return existing;
  const site = sel.site(state, j.siteId)!;
  const contact = sel.primaryContact(state, j.customerId)!;
  const t = jobTotals(state, j);
  const c: Communication = {
    id: uid("cm"), kind: "Completion notice", customerId: j.customerId, jobId, to: contact.email,
    subject: "Work complete: " + j.number + ", " + site.name,
    body: "Hi " + contact.name.split(" ")[0] + ",\n\nThe work at " + site.name + " is complete.\n\n" + (j.completionNotes || j.description) +
      "\n\nVisits: " + t.visits.length + " (" + t.visits.map((v) => fmtDate(v.date)).join(", ") + ")" + (j.woRef ? "\nYour work order: " + j.woRef : "") +
      "\n\nYour invoice will follow separately. Reply to this email if anything isn't right.\n\n" + COMPANY.owner + "\n" + divisionById(j.division).name,
    at: stamp(), status: "awaiting approval",
  };
  state = { ...state, comms: [c, ...state.comms] };
  patchJob(jobId, { completionNoticeId: c.id }, "Completion notice prepared");
  if (!silent) commit();
  return c;
}
export function sendComm(commId: string) {
  const c = state.comms.find((x) => x.id === commId)!;
  state = { ...state, comms: state.comms.map((x) => (x.id === commId ? { ...x, status: "sent (simulated)", at: stamp() } : x)) };
  if (c.jobId) {
    patchJob(c.jobId, {}, c.kind + " sent to " + c.to + " (simulated email)");
    if (c.kind === "Completion notice") state = { ...state, documents: [{ id: uid("d"), name: "Completion report " + sel.job(state, c.jobId)!.number + ".pdf", kind: "Completion report", customerId: c.customerId, siteId: sel.job(state, c.jobId)!.siteId, jobId: c.jobId, date: TODAY }, ...state.documents] };
  }
  resolveProposalsWhere((p) => p.payload.commId === commId);
  log(c.kind + " sent to " + c.to + " (simulated)", "system", c.jobId);
  commit();
  toast(c.kind + " sent to " + c.to + " (simulated)");
}

/* ── Invoicing ──────────────────────────────────────────────────────────── */
export function draftInvoiceForJob(jobId: string, silent = false): Invoice {
  const j = sel.job(state, jobId)!;
  const existing = state.invoices.find((i) => i.jobId === jobId && i.status !== "cancelled");
  if (existing) return existing;
  const inv: Invoice = {
    id: uid("inv"), number: null, division: j.division, customerId: j.customerId, siteId: j.siteId, jobId, woRef: j.woRef,
    lines: jobInvoiceLines(j, state.visits, state.time, state.materials), vatRate: state.vatRate, status: "draft",
    issueDate: null, dueDate: null, paid: 0, createdAt: TODAY, history: [{ at: stamp(), who: "Invoice Agent", text: "Draft prepared from " + jobTotals(state, j).visits.length + " visit(s), time and materials" }],
  };
  state = { ...state, invoices: [inv, ...state.invoices] };
  patchJob(jobId, { invoiceId: inv.id }, "Draft invoice prepared");
  log("Draft invoice for " + j.number + " (" + euro(invoiceNet(inv)) + " net)", "finance", jobId, "Invoice Agent");
  if (!silent) {
    commit();
    toast("Draft invoice ready for " + j.number);
  }
  return inv;
}

export function updateInvoice(invoiceId: string, patch: Partial<Invoice>) {
  patchInvoice(invoiceId, patch);
  commit();
}

/** Approval assigns the next number in the right series and issues it. */
export function approveInvoice(invoiceId: string) {
  const inv = sel.invoice(state, invoiceId)!;
  if (inv.status !== "draft") return;
  const n = state.counters.invoice[inv.division];
  const number = state.prefixes[inv.division] + "-" + String(n).padStart(4, "0");
  state = { ...state, counters: { ...state.counters, invoice: { ...state.counters.invoice, [inv.division]: n + 1 } } };
  const cust = sel.customer(state, inv.customerId)!;
  patchInvoice(invoiceId, { number, status: "issued", issueDate: TODAY, dueDate: addDays(TODAY, cust.paymentTerms), sentTo: cust.accountsEmail }, "Approved, numbered " + number + " and emailed to " + cust.accountsEmail + " (simulated)");
  state = {
    ...state,
    documents: [{ id: uid("d"), name: number + ".pdf", kind: "Invoice PDF", customerId: inv.customerId, siteId: inv.siteId, jobId: inv.jobId, date: TODAY }, ...state.documents],
    comms: [{ id: uid("cm"), kind: "Invoice", customerId: inv.customerId, jobId: inv.jobId, invoiceId, to: cust.accountsEmail, subject: "Invoice " + number + " from " + divisionById(inv.division).name, body: "Please find invoice " + number + " attached.", at: stamp(), status: "sent (simulated)" }, ...state.comms],
  };
  if (inv.jobId) patchJob(inv.jobId, { status: "invoiced" }, "Invoiced: " + number);
  if (inv.contractId && inv.period) {
    state = { ...state, contracts: state.contracts.map((c) => (c.id === inv.contractId ? { ...c, lastBilledPeriod: inv.period! > c.lastBilledPeriod ? inv.period! : c.lastBilledPeriod } : c)) };
  }
  resolveProposalsWhere((p) => p.payload.invoiceId === invoiceId || (!!inv.jobId && p.kind === "issue-invoice" && p.payload.jobId === inv.jobId));
  log(number + " issued to " + cust.name + " (" + euro2(invoiceGross(sel.invoice(state, invoiceId)!)) + ")", "finance", inv.jobId);
  commit();
  toast(number + " issued and emailed (simulated)");
}

export function recordPayment(invoiceId: string, amount: number, method: "EFT" | "Cheque" | "Card" = "EFT") {
  const inv = sel.invoice(state, invoiceId)!;
  const paid = Math.round((inv.paid + amount) * 100) / 100;
  const full = paid >= invoiceGross(inv) - 0.005;
  state = { ...state, payments: [{ id: uid("pay"), invoiceId, date: TODAY, amount, method }, ...state.payments] };
  patchInvoice(invoiceId, { paid, status: full ? "paid" : "part-paid" }, "Payment recorded: " + euro2(amount) + " (" + method + ")");
  log("Payment of " + euro2(amount) + " recorded against " + inv.number, "finance");
  commit();
  toast(full ? inv.number + " paid in full" : "Part payment recorded");
}
export function cancelInvoice(invoiceId: string) {
  const inv = sel.invoice(state, invoiceId)!;
  if (inv.status === "draft") {
    state = { ...state, invoices: state.invoices.filter((i) => i.id !== invoiceId) };
    if (inv.jobId) patchJob(inv.jobId, { invoiceId: undefined }, "Draft invoice discarded");
    resolveProposalsWhere((p) => p.payload.invoiceId === invoiceId, "rejected");
  } else {
    patchInvoice(invoiceId, { status: "cancelled" }, "Cancelled (credit note required)");
    if (inv.jobId) patchJob(inv.jobId, { status: "completed", invoiceId: undefined }, "Invoice " + inv.number + " cancelled, job back to Completed");
  }
  commit();
  toast(inv.number ? inv.number + " cancelled" : "Draft discarded", "info");
}

/* ── Servicing and PPM ──────────────────────────────────────────────────── */
export type DueVisit = { contract: FMState["contracts"][number]; date: string; services: AssetType[]; hours: number; existing?: ServiceVisit };
export function dueVisits(s: FMState, period: string): DueVisit[] {
  return s.contracts
    .filter((c) => c.status !== "paused")
    .map((c) => {
      const lines = c.schedule.filter((l) => periodOf(l.nextDue) === period);
      if (!lines.length) return null;
      const date = lines.map((l) => l.nextDue).sort()[0];
      const existing = s.serviceVisits.find((v) => v.contractId === c.id && v.period === period);
      return { contract: c, date, services: lines.map((l) => l.type), hours: lines.reduce((a, l) => a + l.hours, 0), existing };
    })
    .filter(Boolean) as DueVisit[];
}

const ZONES: Record<string, string> = {
  Clonsilla: "D15", Castleknock: "D15", "Dublin 7": "D15", Lucan: "NK", Leixlip: "NK", Celbridge: "NK", Maynooth: "NK", Kilcock: "NK",
  Navan: "MEATH", Ratoath: "MEATH", Dunboyne: "MEATH", Ashbourne: "MEATH", Greystones: "WICK", Blessington: "WICK", Kilcullen: "SK", Newbridge: "SK", Malahide: "FINGAL", Drogheda: "LOUTH",
};
export const zoneOf = (s: FMState, siteId: string) => ZONES[sel.site(s, siteId)?.town || ""] || "OTHER";

function skillForAsset(t: AssetType): Skill {
  return t === "CCTV" ? "CCTV" : t === "Access control" ? "Access control" : t === "Intercom" ? "Intercom" : t === "Grounds" || t === "Building fabric" ? "Gardening" : t === "Emergency lighting" ? "Emergency lighting" : t === "Fire extinguishers" ? "Extinguishers" : "Fire";
}

export type PlanStep = { label: string; detail: string };
/** Generates proposed visits. Skips anything already planned for the period. */
export function generateServicePlan(period: string): { created: ServiceVisit[]; skipped: number; steps: PlanStep[] } {
  const due = dueVisits(state, period);
  const created: ServiceVisit[] = [];
  let skipped = 0;
  const load: Record<string, number> = {};
  const monthLoad: Record<string, number> = {};
  due.forEach((d) => {
    if (d.existing) {
      skipped++;
      return;
    }
    const skills = d.services.map(skillForAsset);
    const candidates = state.engineers.filter((e) => skills.every((sk) => e.skills.includes(sk) || (sk === "Emergency lighting" && e.skills.includes("Fire"))) || skills.every((sk) => e.skills.includes(sk)));
    let date = nextWorkingDay(d.date);
    // Group with a visit in the same area within 3 working days if the engineer can do both.
    const zone = zoneOf(state, d.contract.siteId);
    const near = created.find((c) => zoneOf(state, c.siteId) === zone && Math.abs(diffDays(c.date, date)) <= 3);
    const rank = (e: (typeof candidates)[number]) => (e.divisions[0] === d.contract.division ? 0 : 100) + (monthLoad[e.id] || 0);
    const pickFrom = (list: typeof candidates, day: string) =>
      list
        .filter((e) => !e.holidays.includes(day) && engineerDay(state, e.id, day).free - (load[e.id + day] || 0) + 0.01 >= d.hours && !engineerDay(state, e.id, day).items.some((i) => i.kind === "install"))
        .sort((a, b) => rank(a) - rank(b))[0];
    let eng = near && candidates.some((c) => c.id === near.engineerId) ? candidates.find((c) => c.id === near.engineerId) : undefined;
    if (eng && near) date = near.date;
    if (!eng) eng = pickFrom(candidates, date);
    let tries = 0;
    while (!eng && tries < 6) {
      date = addWorkingDays(date, 1);
      eng = pickFrom(candidates, date);
      tries++;
    }
    load[(eng?.id || "") + date] = (load[(eng?.id || "") + date] || 0) + d.hours;
    if (eng) monthLoad[eng.id] = (monthLoad[eng.id] || 0) + d.hours;
    created.push({
      id: uid("sv"), contractId: d.contract.id, siteId: d.contract.siteId, period, date, engineerId: eng?.id || null, estHours: d.hours, services: d.services,
      status: "proposed", checklist: [], defects: [], remedial: [], notes: d.contract.accessRequirements, groupedWith: eng && near && near.engineerId === eng.id && near.date === date ? near.id : undefined,
    });
  });
  const grouped = created.filter((c) => c.groupedWith).length;
  const steps: PlanStep[] = [
    { label: "Reviewed active service contracts", detail: state.contracts.filter((c) => c.status !== "paused").length + " contracts across " + DIVISIONS.length + " divisions" },
    { label: "Identified visits due in " + monthName(period), detail: due.length + " visits due" + (skipped ? ", " + skipped + " already planned (skipped, no duplicates)" : "") },
    { label: "Generated service jobs", detail: created.length + " proposed visits created" },
    { label: "Matched engineer skills and availability", detail: created.filter((c) => c.engineerId).length + " allocated, " + created.filter((c) => !c.engineerId).length + " need a decision" },
    { label: "Grouped nearby sites", detail: grouped ? grouped + " visit" + (grouped > 1 ? "s" : "") + " grouped with a nearby site on the same day" : "No useful groupings this month" },
    { label: "Ready for approval", detail: "Nothing is booked until you approve" },
  ];
  state = { ...state, serviceVisits: [...state.serviceVisits, ...created] };
  if (created.length) {
    automationRan("07", monthName(period) + ": " + created.length + " visits proposed" + (skipped ? ", " + skipped + " skipped as duplicates" : ""));
    addProposal({ agentId: "service", kind: "approve-service-plan", title: "Approve the " + monthName(period) + " service plan", detail: created.length + " visits across " + new Set(created.map((c) => c.contractId)).size + " contracts", ref: period, payload: { period }, category: "Schedule" });
    log(monthName(period) + " service plan generated: " + created.length + " proposed visits", "service", undefined, "Service Planning Agent");
  } else {
    automationRan("07", monthName(period) + ": nothing new to plan (" + skipped + " already planned)", "skipped");
  }
  commit();
  return { created, skipped, steps };
}

export function updateServiceVisit(id: string, patch: Partial<ServiceVisit>) {
  state = { ...state, serviceVisits: state.serviceVisits.map((v) => (v.id === id ? { ...v, ...patch } : v)) };
  commit();
}

/** Approving books the visits and creates their service jobs (no duplicates). */
export function approveServicePlan(period: string) {
  const list = state.serviceVisits.filter((v) => v.period === period && v.status === "proposed");
  let jobsMade = 0;
  list.forEach((v) => {
    const c = sel.contract(state, v.contractId)!;
    if (state.jobs.some((j) => j.serviceVisitId === v.id)) return;
    const j = createJob({
      siteId: v.siteId, division: c.division, type: "PPM service", priority: "Normal",
      description: "Planned service (" + c.ref + "): " + v.services.join(", ") + ". " + c.title + ".", engineerIds: v.engineerId ? [v.engineerId] : [],
      scheduled: v.date, source: "Service plan", estHours: v.estHours, serviceVisitId: v.id, contractId: c.id, billedVia: c.billing === "per-visit" ? "job" : "contract",
      agreedPrice: c.billing === "per-visit" ? c.billingAmount : undefined,
    });
    jobsMade++;
    state = { ...state, serviceVisits: state.serviceVisits.map((x) => (x.id === v.id ? { ...x, status: v.engineerId ? "scheduled" : "proposed", jobId: j.id, checklist: checklistTemplate(v.services) } : x)) };
  });
  resolveProposalsWhere((p) => p.kind === "approve-service-plan" && p.payload.period === period);
  log(monthName(period) + " service plan approved: " + jobsMade + " service jobs scheduled", "service");
  commit();
  toast(monthName(period) + " plan approved. " + jobsMade + " visits are on the calendar and in engineers' apps");
}

export function checklistTemplate(services: AssetType[]): ChecklistItem[] {
  const base: Record<string, string[]> = {
    "Fire alarm": ["Panel indications and event log reviewed", "Detectors tested (rotation)", "Call points tested", "Sounders and beacons tested", "Standby batteries load tested"],
    "Emergency lighting": ["Flick test all fittings", "Duration test sample", "Exit signage legible"],
    "CCTV": ["All cameras recording", "Image quality and focus", "NVR health and retention", "Time sync"],
    "Access control": ["Readers and locks operational", "Exit buttons and break glass", "Event log reviewed"],
    "Fire extinguishers": ["Extinguishers weighed and inspected", "Signage and brackets"],
    "Hose reels": ["Flow test", "Hose and nozzle inspected"],
    "Dry riser": ["Inlets and landing valves inspected", "Cabinet security"],
    "Intercom": ["Door station call test", "Handsets tested"],
    "Grounds": ["Grass and beds", "Litter and leaves cleared", "Paths and gullies"],
    "Building fabric": ["Visual inspection"],
  };
  return services.flatMap((t) => (base[t] || []).map((item) => ({ item: t + ": " + item, result: "pending" as const })));
}

export function completeServiceVisit(id: string, data: { checklist: ChecklistItem[]; defects: string[]; remedial: string[]; notes: string; hours: number; engineerId: string; materials: { description: string; qty: number; unitPrice: number }[] }) {
  const v = state.serviceVisits.find((x) => x.id === id)!;
  const c = sel.contract(state, v.contractId)!;
  state = { ...state, serviceVisits: state.serviceVisits.map((x) => (x.id === id ? { ...x, ...data, status: "completed", engineerId: data.engineerId } : x)) };
  // Move the contract's next-due dates on.
  state = {
    ...state,
    contracts: state.contracts.map((ct) => (ct.id === c.id ? { ...ct, schedule: ct.schedule.map((l) => (v.services.includes(l.type) ? { ...l, nextDue: addDays(l.nextDue, 30 * l.everyMonths) } : l)) } : ct)),
    documents: [{ id: uid("d"), name: "Service report " + c.ref + " " + TODAY + ".pdf", kind: "Service report", customerId: c.customerId, siteId: v.siteId, date: TODAY }, ...state.documents],
  };
  if (v.jobId) {
    logVisit(v.jobId, { engineerId: data.engineerId, date: TODAY, start: "09:00", end: String(9 + Math.ceil(data.hours)).padStart(2, "0") + ":00", hours: data.hours, summary: "Service visit: " + v.services.join(", ") + ". " + data.notes, returnRequired: false, verified: true });
    data.materials.forEach((m) => addMaterial(v.jobId!, { ...m, addedBy: sel.engineer(state, data.engineerId)!.name }));
    completeJob(v.jobId, sel.engineer(state, data.engineerId)!.name, "Service visit complete. " + (data.defects.length ? "Defects found: " + data.defects.join("; ") + "." : "No defects found.") + " " + data.notes);
  } else {
    commit();
  }
  if (data.defects.length) log("Defects recorded at " + sel.site(state, v.siteId)!.name + ": " + data.defects.join("; "), "service");
  toast("Service report generated for " + sel.site(state, v.siteId)!.name);
}

/* ── Recurring billing ──────────────────────────────────────────────────── */
export function contractsDueForBilling(s: FMState, period: string) {
  return s.contracts.filter((c) => {
    if (c.billing === "per-visit" || c.status === "paused") return false;
    if (c.lastBilledPeriod >= period) return false;
    if (periodOf(c.nextBillingDate) > period) return false;
    return true;
  });
}
export function generateRecurringInvoices(period: string) {
  const due = contractsDueForBilling(state, period);
  let made = 0, skipped = 0;
  due.forEach((c) => {
    if (state.invoices.some((i) => i.contractId === c.id && i.period === period && i.status !== "cancelled")) {
      skipped++;
      return;
    }
    const inv: Invoice = {
      id: uid("inv"), number: null, division: c.division, customerId: c.customerId, siteId: c.siteId, contractId: c.id, period, woRef: "",
      lines: [{ description: c.title + ", " + (c.billing === "monthly" ? monthName(period) : c.billing === "quarterly" ? "quarter from " + monthName(period) : monthName(period)) + " (" + c.ref + ")", qty: 1, unitPrice: c.billingAmount, kind: "Contract" }],
      vatRate: state.vatRate, status: "draft", issueDate: null, dueDate: null, paid: 0, createdAt: TODAY, history: [{ at: stamp(), who: "Invoice Agent", text: "Recurring contract invoice drafted from the billing schedule" }],
    };
    state = { ...state, invoices: [inv, ...state.invoices] };
    made++;
  });
  automationRan("08", monthName(period) + ": " + made + " contract invoice drafts" + (skipped ? ", " + skipped + " skipped (already billed)" : ""), made ? "awaiting approval" : "skipped");
  if (made) addProposal({ agentId: "invoice", kind: "recurring-invoices", title: "Issue " + made + " contract invoices for " + monthName(period), detail: "Generated from active contract billing schedules. Contract-billed service visits are never charged again per job.", ref: period, payload: { period }, category: "Financial" });
  log(made + " recurring contract invoices drafted for " + monthName(period), "finance", undefined, "Invoice Agent");
  commit();
  toast(made ? made + " contract invoice drafts ready" : "Nothing to bill: every contract is already billed for " + monthName(period), made ? "ok" : "info");
  return { made, skipped };
}
export function approveRecurring(period: string) {
  state.invoices.filter((i) => i.period === period && i.contractId && i.status === "draft").forEach((i) => approveInvoice(i.id));
  resolveProposalsWhere((p) => p.kind === "recurring-invoices" && p.payload.period === period);
  commit();
}

/* ── Quotes and pipeline ────────────────────────────────────────────────── */
export function createQuote(input: { customerId: string; siteId: string; division: DivisionId; title: string; requirements: string; enquiryId?: string; format?: Quote["format"] }): Quote {
  const n = state.counters.quote;
  state.counters.quote++;
  const q: Quote = {
    id: "q" + n, number: "Q-" + n, customerId: input.customerId, siteId: input.siteId, division: input.division, title: input.title, stage: "Quote Preparation", lines: [],
    discountPct: 0, paymentTerms: "30 days from invoice", format: input.format || "short", requirements: input.requirements, createdAt: TODAY, validUntil: addDays(TODAY, 60),
    enquiryId: input.enquiryId, estDays: 1, history: [{ at: stamp(), who: actorName(), text: "Quote created" }],
  };
  state = { ...state, quotes: [q, ...state.quotes] };
  if (input.enquiryId) state = { ...state, enquiries: state.enquiries.map((e) => (e.id === input.enquiryId ? { ...e, status: "quoted", quoteId: q.id, customerId: input.customerId } : e)) };
  log(q.number + " created: " + q.title, "quote");
  commit();
  return q;
}
export function updateQuote(id: string, patch: Partial<Quote>, note?: string) {
  state = { ...state, quotes: state.quotes.map((q) => (q.id === id ? { ...q, ...patch, history: note ? [...q.history, { at: stamp(), who: actorName(), text: note }] : q.history } : q)) };
  commit();
}
export function addQuoteLine(id: string, line: Omit<QuoteLine, "id">) {
  const q = sel.quote(state, id)!;
  updateQuote(id, { lines: [...q.lines, { ...line, id: uid("ql") }] });
}
export function setQuoteStage(id: string, stage: PipelineStage) {
  const q = sel.quote(state, id)!;
  updateQuote(id, { stage, sentAt: stage === "Quote Sent" && !q.sentAt ? TODAY : q.sentAt }, "Moved to " + stage);
  log(q.number + " moved to " + stage, "quote");
  if (stage === "Accepted" && automationOn("11")) {
    automationRan("11", q.number + " accepted, installation job ready to create");
    addProposal({ agentId: "quoting", kind: "convert-quote", title: "Create the installation job for " + q.number, detail: q.title + ". Every quote line carries across, no re-entry.", value: quoteNet(q), ref: q.number, payload: { quoteId: id }, category: "Operations" });
  }
  commit();
}

/** Proposal text is built only from the selected products, scope and the approved templates. */
export function generateProposal(id: string): ProposalSection[] {
  const q = sel.quote(state, id)!;
  const c = sel.customer(state, q.customerId)!;
  const site = sel.site(state, q.siteId)!;
  const d = divisionById(q.division);
  const eq = q.lines.filter((l) => l.kind === "Equipment");
  const labour = q.lines.filter((l) => l.kind === "Labour" || l.kind === "Installation");
  const total = quoteGross(q);
  const days = q.estDays || Math.max(1, Math.round(labour.reduce((a, l) => a + (l.kind === "Installation" ? l.qty : l.qty / 8), 0)));
  const sections: ProposalSection[] = [
    { id: "exec", title: "Executive summary", body: d.name + " proposes to deliver " + q.title.toLowerCase() + " at " + site.name + ", " + site.town + ". The total investment is " + euro2(total) + " including VAT at " + Math.round(state.vatRate * 1000) / 10 + "%. Work is estimated at " + days + " working day" + (days > 1 ? "s" : "") + " on site." },
    { id: "req", title: "Customer requirements", body: q.requirements || "Requirements to be confirmed at survey." },
    { id: "solution", title: "Proposed solution", body: "We will supply and install " + (eq.length ? eq.map((l) => l.qty + " × " + l.description.toLowerCase()).join(", ") : "the items listed in the investment breakdown") + ". The design is based on our site survey at " + site.name + " and the requirements above." },
    { id: "spec", title: "Equipment specification", body: eq.length ? eq.map((l) => { const p = sel.product(state, l.productId); return "• " + l.description + (p ? ": " + p.description : "") + " (qty " + l.qty + ")"; }).join("\n") : "No equipment lines selected." },
    { id: "scope", title: "Scope of installation", body: "Included: " + q.lines.map((l) => l.description.toLowerCase()).join("; ") + ".\nNot included: builder's work, making good of decoration, and any item not listed in the investment breakdown." },
    { id: "method", title: "Work methodology", body: "Our engineers work to an agreed programme with the site contact, keep the site safe and tidy each day, and keep existing systems live wherever possible during changeover. Access arrangements are agreed in advance and are never included in customer documents." },
    { id: "timeline", title: "Project timeline", body: days >= 5 ? "Week 1: survey confirmation, first fix and containment.\n" + (days > 5 ? "Week 2: device installation and second fix.\n" : "") + (days > 10 ? "Week 3: panel installation, commissioning and testing.\n" : "") + "Final day: handover and training." : "Single visit of " + days + " day" + (days > 1 ? "s" : "") + ", including testing and handover." },
    { id: "testing", title: "Testing and handover", body: "On completion we test every device installed, demonstrate the system to the site contact and issue a completion report. Certification is issued only where our engineers are qualified to issue it for the work carried out." },
    { id: "investment", title: "Investment breakdown", body: q.lines.map((l) => l.description + ": " + l.qty + " × " + euro2(l.unitPrice) + " = " + euro2(l.qty * l.unitPrice)).join("\n") + (q.discountPct ? "\nDiscount: " + q.discountPct + "%" : "") + "\nNet: " + euro2(quoteNet(q)) + "\nVAT: " + euro2(quoteGross(q) - quoteNet(q)) + "\nTotal: " + euro2(total) },
    { id: "terms", title: "Terms and acceptance", body: "Payment terms: " + q.paymentTerms + ". This quotation is valid until " + fmtDate(q.validUntil, true) + ". To accept, sign below or reply to this email. Prepared for " + c.name + "." },
  ];
  updateQuote(id, { proposal: sections, format: "detailed" }, "Detailed proposal generated (10 sections)");
  log(q.number + ": detailed proposal generated", "quote", undefined, "Quoting Agent");
  commit();
  return sections;
}

/** Accepted quote → scheduled installation job, nothing re-typed. */
export function convertQuoteToJob(id: string, booking?: { from: string; to: string; engineerIds: string[] }): Job {
  const q = sel.quote(state, id)!;
  if (q.jobId) return sel.job(state, q.jobId)!;
  const j = createJob({
    siteId: q.siteId, division: q.division, type: "Installation", priority: "Normal", description: q.title + ". " + q.requirements,
    engineerIds: booking?.engineerIds || [], scheduled: booking?.from || null, scheduledEnd: booking?.to || null, source: "Quote", estHours: Math.max(8, q.estDays * 8), quoteId: q.id, agreedPrice: quoteNet(q),
  });
  patchJob(j.id, (x) => ({ internalNotes: [...x.internalNotes, "From " + q.number + ": " + q.lines.map((l) => l.qty + " × " + l.description).join("; ")] }));
  if (booking) state = { ...state, installBookings: [...state.installBookings, { id: uid("b"), jobId: j.id, engineerIds: booking.engineerIds, from: booking.from, to: booking.to, label: sel.site(state, q.siteId)!.name + ": " + q.title }] };
  state = { ...state, quotes: state.quotes.map((x) => (x.id === id ? { ...x, stage: "Accepted", jobId: j.id, history: [...x.history, { at: stamp(), who: actorName(), text: "Converted to installation job " + j.number }] } : x)) };
  resolveProposalsWhere((p) => p.kind === "convert-quote" && p.payload.quoteId === id);
  automationRan("11", q.number + " → " + j.number);
  log(q.number + " converted to " + j.number, "quote", j.id);
  commit();
  toast(q.number + " converted to installation job " + j.number);
  return j;
}

/* ── Website enquiries ──────────────────────────────────────────────────── */
export function submitEnquiry(e: Omit<Enquiry, "id" | "receivedAt" | "status" | "source" | "division"> & { source?: Enquiry["source"] }): Enquiry {
  const t = (e.service + " " + e.description).toLowerCase();
  const division: DivisionId = /cctv|camera|access|intercom|security/.test(t) ? "SS" : /maint|garden|grounds|paint|repair/.test(t) && !/fire|alarm|light/.test(t) ? "LPM" : "LFL";
  const existing = state.customers.find((c) => e.company && c.name.toLowerCase().includes(e.company.toLowerCase().split(" ")[0]));
  const en: Enquiry = { ...e, id: uid("en"), receivedAt: stamp(), status: "new", source: e.source || "Website", division, customerId: existing?.id };
  state = { ...state, enquiries: [en, ...state.enquiries] };
  automationRan("10", (e.company || e.name) + ": opportunity created" + (existing ? " (matched existing customer " + existing.name + ")" : ""));
  log("Website enquiry from " + (e.company || e.name) + " added to New Enquiry", "web", undefined, "Job Intake Agent");
  state = {
    ...state,
    agentRuns: [{ id: uid("r"), agentId: "intake", at: stamp(), status: "completed", summary: "Website enquiry from " + (e.company || e.name) + " turned into an opportunity.", steps: [{ label: "Parsed enquiry", detail: e.service + ", " + e.location }, { label: "Checked duplicates", detail: existing ? "Matched existing customer " + existing.name : "No matching customer" }, { label: "Created opportunity", detail: "Sales pipeline, New Enquiry" }], records: [e.company || e.name], proposalIds: [] }, ...state.agentRuns],
  };
  commit();
  return en;
}

/** Turn an enquiry into a customer (if new) and a quote in preparation. */
export function quoteFromEnquiry(enquiryId: string): Quote {
  const en = state.enquiries.find((x) => x.id === enquiryId)!;
  let customerId = en.customerId;
  let siteId: string;
  if (!customerId) {
    customerId = uid("c");
    siteId = uid("s");
    state = {
      ...state,
      customers: [...state.customers, { id: customerId, name: en.company || en.name, kind: "Commercial", divisions: [en.division], accountsEmail: en.email, phone: en.phone, paymentTerms: 30, since: "2026", notes: "New customer from a website enquiry." }],
      sites: [...state.sites, { id: siteId, customerId, name: en.company || en.name, address: en.location, town: en.location.split(",")[0], county: en.location.split(",")[1]?.trim() || "", eircode: "", accessNotes: "To be confirmed at survey.", accessCode: "Not yet recorded", keyholder: en.name }],
      contacts: [...state.contacts, { id: uid("p"), customerId, name: en.name, role: "Enquirer", email: en.email, phone: en.phone, primary: true }],
    };
  } else {
    siteId = state.sites.find((s) => s.customerId === customerId)!.id;
  }
  const q = createQuote({ customerId, siteId, division: en.division, title: en.service + ", " + (en.company || en.name), requirements: en.description, enquiryId });
  const prods = state.products.filter((p) => p.division === en.division);
  const svc = en.service.toLowerCase();
  const pick = (sku: string, qty: number) => { const p = prods.find((x) => x.sku === sku); if (p) addQuoteLine(q.id, { productId: p.id, description: p.name, qty, unitPrice: p.price, kind: p.category === "Labour" ? "Labour" : p.category === "Installation" ? "Installation" : p.category === "Material" ? "Material" : p.category === "Maintenance plan" ? "Maintenance" : "Equipment" }); };
  if (en.division === "LFL") { if (/servic/.test(svc)) { pick("LAB-FIRE", 4); pick("FA-BAT", 1); } else { pick("FA-OPT", 6); pick("LAB-FIRE", 8); } }
  if (en.division === "SS") { pick("CC-DOME", 4); pick("CC-NVR8", 1); pick("IC-DOOR", /intercom/.test(en.description.toLowerCase()) ? 1 : 0); pick("INS-SEC", 1); }
  if (en.division === "LPM") { pick("LAB-MAINT", 8); }
  updateQuote(q.id, { lines: sel.quote(state, q.id)!.lines.filter((l) => l.qty > 0) }, "Starter lines added from the approved catalogue");
  return sel.quote(state, q.id)!;
}

/* ── Scheduling: installation slot finder ───────────────────────────────── */
export type SlotOption = {
  id: string;
  engineerIds: string[];
  from: string;
  to: string;
  days: string[];
  conflicts: { engineerId: string; date: string; kind: "holiday" | "install" | "service" | "job"; label: string; svId?: string; jobId?: string; hard: boolean }[];
  score: number;
  note: string;
};
export function findInstallSlots(s: FMState, opts: { skill: Skill; engineers: number; workingDays: number; from: string; until?: string }): SlotOption[] {
  const qualified = s.engineers.filter((e) => e.skills.includes(opts.skill));
  const pairs: string[][] = [];
  for (let i = 0; i < qualified.length; i++) {
    if (opts.engineers === 1) pairs.push([qualified[i].id]);
    else for (let k = i + 1; k < qualified.length; k++) pairs.push([qualified[i].id, qualified[k].id]);
  }
  const options: SlotOption[] = [];
  let start = nextWorkingDay(opts.from);
  const until = opts.until || addDays(opts.from, 75);
  while (start <= until) {
    const end = addWorkingDays(start, opts.workingDays - 1);
    const days = workingDaysBetween(start, end);
    pairs.forEach((pair) => {
      const conflicts: SlotOption["conflicts"] = [];
      pair.forEach((eid) => days.forEach((d) => {
        engineerDay(s, eid, d).items.forEach((it) => conflicts.push({ engineerId: eid, date: d, kind: it.kind, label: it.label, svId: it.svId, jobId: it.jobId, hard: it.kind === "holiday" || it.kind === "install" }));
      }));
      const hard = conflicts.filter((c) => c.hard).length;
      const soft = conflicts.length - hard;
      const spansShutdown = start < COMPANY.companyShutdown.from && end > COMPANY.companyShutdown.to;
      options.push({ id: pair.join("+") + start, engineerIds: pair, from: start, to: end, days, conflicts, score: hard * 4 + soft + diffDays(start, opts.from) / 20 + (spansShutdown ? 6 : 0), note: "" });
    });
    start = addWorkingDays(start, 1);
  }
  options.sort((a, b) => a.score - b.score);
  // Earliest workable option (≤ 2 hard clashes), then the best conflict-free, then a different pair.
  const earliest = options.filter((o) => o.conflicts.filter((c) => c.hard).length <= 2).sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : a.score - b.score))[0];
  const clean = options.find((o) => o.conflicts.length === 0);
  const picks: SlotOption[] = [];
  if (earliest) picks.push({ ...earliest, note: earliest.conflicts.length ? "Earliest start. " + earliest.conflicts.length + " clash" + (earliest.conflicts.length > 1 ? "es" : "") + " to resolve first" : "Earliest start, no clashes" });
  if (clean && (!earliest || clean.id !== earliest.id)) picks.push({ ...clean, note: "First option with no clashes at all" });
  const alt = options.find((o) => !picks.some((p) => p.id === o.id) && !picks.some((p) => p.engineerIds.join() === o.engineerIds.join() && p.from === o.from) && o.engineerIds.join() !== picks[0]?.engineerIds.join());
  if (alt) picks.push({ ...alt, note: "Alternative crew" });
  return picks.slice(0, 3);
}

/** Resolve clashes: reassign movable service visits / jobs, cover leave with another qualified engineer. */
export function resolveConflicts(opt: SlotOption, skill: Skill): { option: SlotOption; changes: string[] } {
  const changes: string[] = [];
  const s = state;
  const others = s.engineers.filter((e) => !opt.engineerIds.includes(e.id));
  let engineerIds = opt.engineerIds.slice();
  const remaining: SlotOption["conflicts"] = [];
  opt.conflicts.forEach((c) => {
    if (c.kind === "service" && c.svId) {
      const v = s.serviceVisits.find((x) => x.id === c.svId)!;
      const need = v.services.map(skillForAsset);
      const cover = others.find((e) => need.every((n) => e.skills.includes(n) || (n === "Emergency lighting" && e.skills.includes("Fire"))) && engineerDay(s, e.id, c.date).free >= v.estHours);
      if (cover) changes.push("Move PPM at " + sel.site(s, v.siteId)!.name + " on " + fmtDate(c.date) + " to " + cover.name);
      else changes.push("Move PPM at " + sel.site(s, v.siteId)!.name + " to " + fmtDate(addWorkingDays(opt.to, 1)) + " (after the install)");
    } else if (c.kind === "holiday") {
      const cover = others.find((e) => e.skills.includes(skill) && !e.holidays.includes(c.date) && engineerDay(s, e.id, c.date).free >= 8);
      if (cover) changes.push(cover.name + " covers " + fmtDate(c.date) + " while " + sel.engineer(s, c.engineerId)!.name.split(" ")[0] + " is on leave");
      else remaining.push(c);
    } else if (c.kind === "job" && c.jobId) {
      const j = sel.job(s, c.jobId)!;
      const cover = others.find((e) => e.skills.includes(skillFor(j.division, j.description)) && engineerDay(s, e.id, c.date).free >= j.estHours);
      changes.push(cover ? "Reassign " + j.number + " to " + cover.name : "Move " + j.number + " to " + fmtDate(addWorkingDays(c.date, 1)));
    } else remaining.push(c);
  });
  engineerIds = Array.from(new Set(engineerIds));
  return { option: { ...opt, engineerIds, conflicts: remaining, note: "Clashes resolved (" + changes.length + " change" + (changes.length === 1 ? "" : "s") + ")" }, changes };
}

let lastBookingNotes: string[] = [];
export const getLastBookingNotes = () => lastBookingNotes;

/** Crew bookings that skip each engineer's leave, with a qualified cover on those days. */
function addCrewBookings(jobId: string, opt: SlotOption, label: string, skill: Skill, notes: string[]) {
  const add: FMState["installBookings"] = [];
  opt.engineerIds.forEach((eid) => {
    const eng = sel.engineer(state, eid)!;
    let run: string[] = [];
    const flush = () => {
      if (run.length) add.push({ id: uid("b"), jobId, engineerIds: [eid], from: run[0], to: run[run.length - 1], label });
      run = [];
    };
    opt.days.forEach((d) => {
      if (eng.holidays.includes(d)) {
        flush();
        const cover = state.engineers.find((e) => !opt.engineerIds.includes(e.id) && e.skills.includes(skill) && !e.holidays.includes(d) && engineerDay(state, e.id, d).free >= 8);
        if (cover) {
          add.push({ id: uid("b"), jobId, engineerIds: [cover.id], from: d, to: d, label });
          notes.push(cover.name + " covers " + fmtDate(d) + " while " + eng.name.split(" ")[0] + " is on leave");
        } else notes.push("No cover found for " + fmtDate(d) + " (" + eng.name.split(" ")[0] + " on leave)");
      } else run.push(d);
    });
    flush();
  });
  state = { ...state, installBookings: [...state.installBookings, ...add] };
}

/** Books an installation. With applyChanges, movable work in the window is
    reassigned or moved first (re-checked against live data, not the option). */
export function bookInstallation(opt: SlotOption, input: { quoteId?: string; jobId?: string; siteId: string; division: DivisionId; title: string; skill: Skill }, applyChanges: boolean) {
  const notes: string[] = [];
  if (applyChanges) {
    const others = () => state.engineers.filter((e) => !opt.engineerIds.includes(e.id));
    opt.engineerIds.forEach((eid) => opt.days.forEach((d) => {
      engineerDay(state, eid, d).items.forEach((it) => {
        if (it.kind === "service" && it.svId) {
          const v = state.serviceVisits.find((x) => x.id === it.svId)!;
          const need = v.services.map(skillForAsset);
          const cover = others().find((e) => need.every((n) => e.skills.includes(n) || (n === "Emergency lighting" && e.skills.includes("Fire"))) && !e.holidays.includes(d) && engineerDay(state, e.id, d).free >= v.estHours);
          if (cover) {
            state = { ...state, serviceVisits: state.serviceVisits.map((x) => (x.id === v.id ? { ...x, engineerId: cover.id } : x)) };
            if (v.jobId) patchJob(v.jobId, { engineerIds: [cover.id] }, "Reassigned to " + cover.name + " by the Scheduling Agent to make room for an installation");
            notes.push("PPM at " + sel.site(state, v.siteId)!.name + " on " + fmtDate(d) + " moved to " + cover.name);
          } else {
            let to = addWorkingDays(opt.to, 1);
            let guard = 0;
            while (guard++ < 30 && (sel.engineer(state, eid)!.holidays.includes(to) || engineerDay(state, eid, to).hours + v.estHours > 8)) to = addWorkingDays(to, 1);
            state = { ...state, serviceVisits: state.serviceVisits.map((x) => (x.id === v.id ? { ...x, date: to } : x)) };
            if (v.jobId) patchJob(v.jobId, { scheduled: to }, "Moved to " + fmtDate(to) + " by the Scheduling Agent to make room for an installation");
            notes.push("PPM at " + sel.site(state, v.siteId)!.name + " moved to " + fmtDate(to) + ", after the installation");
          }
        } else if (it.kind === "job" && it.jobId) {
          const j = sel.job(state, it.jobId)!;
          const cover = others().find((e) => e.skills.includes(skillFor(j.division, j.description)) && engineerDay(state, e.id, d).free >= j.estHours);
          if (cover) {
            patchJob(j.id, { engineerIds: j.engineerIds.map((x) => (x === eid ? cover.id : x)) }, "Reassigned to " + cover.name + " by the Scheduling Agent");
            notes.push(j.number + " reassigned to " + cover.name);
          } else {
            const to = addWorkingDays(opt.to, 1);
            patchJob(j.id, { scheduled: to }, "Moved to " + fmtDate(to) + " by the Scheduling Agent");
            notes.push(j.number + " moved to " + fmtDate(to));
          }
        }
      });
    }));
  }
  let jobId = input.jobId;
  if (input.quoteId) {
    const q = sel.quote(state, input.quoteId)!;
    jobId = q.jobId || convertQuoteToJob(input.quoteId).id;
    patchJob(jobId, { engineerIds: opt.engineerIds, scheduled: opt.from, scheduledEnd: opt.to, estHours: opt.days.length * 8 * opt.engineerIds.length }, "Installation booked " + fmtDate(opt.from) + " to " + fmtDate(opt.to));
  } else if (!jobId) {
    const j = createJob({ siteId: input.siteId, division: input.division, type: "Installation", priority: "Normal", description: input.title, engineerIds: opt.engineerIds, scheduled: opt.from, scheduledEnd: opt.to, source: "Charlie AI", estHours: opt.days.length * 8 });
    jobId = j.id;
  } else {
    patchJob(jobId, { engineerIds: opt.engineerIds, scheduled: opt.from, scheduledEnd: opt.to }, "Installation booked");
  }
  state = { ...state, installBookings: state.installBookings.filter((b) => b.jobId !== jobId) };
  addCrewBookings(jobId!, opt, input.title, input.skill, notes);
  lastBookingNotes = notes;
  resolveProposalsWhere((p) => p.kind === "book-installation");
  log("Installation booked " + fmtDate(opt.from) + " to " + fmtDate(opt.to) + " (" + opt.engineerIds.map((e) => sel.engineer(state, e)!.name.split(" ")[0]).join(" and ") + ")" + (notes.length ? ". " + notes.join("; ") : ""), "schedule", jobId, "Scheduling Agent");
  commit();
  toast("Installation booked " + fmtDate(opt.from) + " to " + fmtDate(opt.to));
  return jobId!;
}

/* ── Timesheets ─────────────────────────────────────────────────────────── */
export function approveTime(ids: string[]) {
  state = { ...state, time: state.time.map((t) => (ids.includes(t.id) ? { ...t, approved: true } : t)) };
  log(ids.length + " time entr" + (ids.length > 1 ? "ies" : "y") + " approved", "system");
  commit();
  toast(ids.length + " entr" + (ids.length > 1 ? "ies" : "y") + " approved");
}
export function correctTime(id: string, hours: number, kind: TimeEntry["kind"], reason: string) {
  const t = state.time.find((x) => x.id === id)!;
  state = {
    ...state,
    time: state.time.map((x) => (x.id === id ? { ...x, hours, kind, approved: false, corrections: [...x.corrections, { at: stamp(), who: actorName(), from: x.hours + " h " + x.kind, to: hours + " h " + kind, reason }] } : x)),
  };
  if (t.jobId) patchJob(t.jobId, {}, "Time corrected: " + t.hours + " h → " + hours + " h (" + reason + ")");
  commit();
  toast("Correction saved with audit trail");
}
export function addTime(e: Omit<TimeEntry, "id" | "approved" | "corrections">) {
  state = { ...state, time: [...state.time, { ...e, id: uid("t"), approved: false, corrections: [] }] };
  commit();
  toast("Time added");
}

/* ── Agents and approvals ───────────────────────────────────────────────── */
function resolveProposalsWhere(fn: (p: Proposal) => boolean, status: "approved" | "rejected" = "approved") {
  state = { ...state, proposals: state.proposals.map((p) => (p.status === "pending" && fn(p) ? { ...p, status, decidedAt: stamp() } : p)) };
}
export function approveProposal(id: string) {
  const p = state.proposals.find((x) => x.id === id)!;
  if (!p || p.status !== "pending") return;
  switch (p.kind) {
    case "issue-invoice": {
      const inv = p.payload.invoiceId ? sel.invoice(state, p.payload.invoiceId) : draftInvoiceForJob(p.payload.jobId, true);
      if (inv) approveInvoice(inv.id);
      break;
    }
    case "send-comm":
      sendComm(p.payload.commId);
      break;
    case "send-reminder": {
      const inv = sel.invoice(state, p.payload.invoiceId)!;
      const cust = sel.customer(state, inv.customerId)!;
      state = { ...state, comms: [{ id: uid("cm"), kind: "Payment reminder", customerId: cust.id, invoiceId: inv.id, to: cust.accountsEmail, subject: "Reminder: invoice " + inv.number, body: "A friendly reminder that invoice " + inv.number + " (" + euro2(invoiceBalance(inv)) + ") was due on " + fmtDate(inv.dueDate, true) + ".", at: stamp(), status: "sent (simulated)" }, ...state.comms] };
      patchInvoice(inv.id, {}, "Payment reminder sent (simulated)");
      automationRan("09", inv.number + ": reminder sent to " + cust.name);
      toast("Reminder sent to " + cust.accountsEmail + " (simulated)");
      break;
    }
    case "approve-service-plan":
      approveServicePlan(p.payload.period);
      break;
    case "recurring-invoices":
      approveRecurring(p.payload.period);
      break;
    case "convert-quote":
      convertQuoteToJob(p.payload.quoteId);
      break;
    case "create-job":
      createJob(p.payload as any);
      toast("Job created");
      break;
    case "book-installation":
      bookInstallation(p.payload.option, p.payload.input, true);
      break;
    case "allocate-job":
      allocateJob(p.payload.jobId, p.payload.engineerIds, p.payload.date);
      break;
    case "accountant-export":
      automationRan("12", monthName(p.payload.period) + " export published to the accountant workspace");
      toast("Export published to the accountant workspace");
      break;
  }
  state = { ...state, proposals: state.proposals.map((x) => (x.id === id ? { ...x, status: "approved", decidedAt: stamp() } : x)) };
  log("Approved: " + p.title, "agent");
  commit();
}
export function rejectProposal(id: string) {
  const p = state.proposals.find((x) => x.id === id)!;
  state = { ...state, proposals: state.proposals.map((x) => (x.id === id ? { ...x, status: "rejected", decidedAt: stamp() } : x)) };
  log("Declined: " + p.title, "agent");
  commit();
  toast("Declined. Nothing was changed", "info");
}
export function proposeBooking(option: SlotOption, input: any, source: Proposal["agentId"] = "scheduling") {
  const p = addProposal({ agentId: source, kind: "book-installation", title: "Book installation " + fmtDate(option.from) + " → " + fmtDate(option.to), detail: input.title + ". Crew: " + option.engineerIds.map((e) => sel.engineer(state, e)!.name).join(" and ") + ".", ref: input.title, payload: { option, input }, category: "Schedule" });
  commit();
  return p;
}
export function toggleAgentPause(id: AgentId) {
  set((s) => ({ agentPaused: { ...s.agentPaused, [id]: !s.agentPaused[id] } }));
  toast(state.agentPaused[id] ? "Agent paused. It won't run until resumed" : "Agent resumed", "info");
}
export function toggleAutomation(id: string) {
  set((s) => ({ automations: s.automations.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)) }));
}

/** Simulated agent execution with visible states. Uses real records. */
export function runAgent(agentId: AgentId) {
  if (state.agentPaused[agentId]) {
    toast("Agent is paused. Resume it to run", "warn");
    return;
  }
  const run: AgentRun = { id: uid("r"), agentId, at: stamp(), status: "running", summary: "Running…", steps: [], records: [], proposalIds: [] };
  set((s) => ({ agentRuns: [run, ...s.agentRuns] }));
  const plan = agentPlan(agentId);
  plan.steps.forEach((step, i) => {
    setTimeout(() => {
      set((s) => ({ agentRuns: s.agentRuns.map((r) => (r.id === run.id ? { ...r, steps: [...r.steps, step] } : r)) }));
    }, 450 * (i + 1));
  });
  setTimeout(() => {
    const proposalIds = plan.finish();
    set((s) => ({ agentRuns: s.agentRuns.map((r) => (r.id === run.id ? { ...r, status: proposalIds.length ? "needs approval" : "completed", summary: plan.summary, records: plan.records, proposalIds } : r)) }));
  }, 450 * (plan.steps.length + 1));
}

function agentPlan(agentId: AgentId): { steps: { label: string; detail: string }[]; summary: string; records: string[]; finish: () => string[] } {
  const s = state;
  const m = metrics({ ...s, division: "ALL" });
  const al = alerts({ ...s, division: "ALL" });
  switch (agentId) {
    case "briefing":
      return {
        steps: [{ label: "Read jobs", detail: s.jobs.length + " job records" }, { label: "Read invoices", detail: m.outstanding.length + " outstanding, " + m.overdue.length + " overdue" }, { label: "Read schedule", detail: m.available.length + " engineers with free time today" }, { label: "Wrote briefing", detail: "Posted to Charlie AI" }],
        summary: m.unallocated.length + " unallocated jobs, " + m.completed.length + " completed not invoiced (" + euro(m.unbilledValue) + "), " + m.overdue.length + " overdue invoices.",
        records: m.unallocated.map((j) => j.number), finish: () => [],
      };
    case "watchdog": {
      const unb = s.jobs.filter((j) => j.status === "completed" && j.completedAt && diffDays(TODAY, j.completedAt) >= COMPANY.unbilledDays && !s.proposals.some((p) => p.status === "pending" && p.payload.jobId === j.id));
      return {
        steps: [{ label: "Scanned jobs in progress", detail: m.inProgress.length + " jobs" }, { label: "Scanned completed work", detail: m.completed.length + " not invoiced" }, { label: "Checked deadlines and bookings", detail: al.length + " items need attention" }],
        summary: al.length + " items flagged. " + (unb.length ? unb.length + " unbilled job(s) sent to the Invoice Agent." : "No new unbilled work."),
        records: al.slice(0, 4).map((a) => a.title.split(" ")[0]),
        finish: () => unb.map((j) => { const inv = draftInvoiceForJob(j.id, true); return addProposal({ agentId: "invoice", kind: "issue-invoice", title: "Issue invoice for " + j.number, detail: "Flagged by the Operations Watchdog: completed " + diffDays(TODAY, j.completedAt!) + " days ago.", value: invoiceGross(inv), ref: j.number, payload: { jobId: j.id, invoiceId: inv.id }, category: "Financial" }).id; }),
      };
    }
    case "invoice": {
      const ready = s.jobs.filter((j) => j.status === "completed" && j.billedVia === "job");
      return {
        steps: [{ label: "Found completed work", detail: ready.length + " jobs ready to invoice" }, { label: "Consolidated visits, time and materials", detail: "One draft per job" }, { label: "Checked for duplicates", detail: "Skipped jobs that already have a draft" }],
        summary: ready.length + " jobs ready to invoice, " + euro(ready.reduce((a, j) => a + jobTotals(s, j).value, 0)) + " net.",
        records: ready.map((j) => j.number),
        finish: () => ready.filter((j) => !s.proposals.some((p) => p.status === "pending" && p.payload.jobId === j.id)).map((j) => { const inv = draftInvoiceForJob(j.id, true); return addProposal({ agentId: "invoice", kind: "issue-invoice", title: "Issue invoice for " + j.number + ", " + sel.site(state, j.siteId)!.name, detail: "Consolidated from " + jobTotals(state, j).visits.length + " visit(s).", value: invoiceGross(inv), ref: j.number, payload: { jobId: j.id, invoiceId: inv.id }, category: "Financial" }).id; }),
      };
    }
    case "service": {
      const due = dueVisits(s, "2026-12");
      return {
        steps: [{ label: "Reviewed active contracts", detail: s.contracts.length + " contracts" }, { label: "Visits due in December", detail: due.length + " due, " + due.filter((d) => d.existing).length + " already planned" }],
        summary: due.filter((d) => !d.existing).length ? due.filter((d) => !d.existing).length + " December visits ready to plan. Open Servicing to generate." : "December is fully planned.",
        records: [], finish: () => [],
      };
    }
    case "scheduling": {
      const clashes = al.filter((a) => a.id.startsWith("clash"));
      return {
        steps: [{ label: "Checked bookings", detail: "Next 10 working days, 6 engineers" }, { label: "Checked leave and installs", detail: s.holidays.length + " leave periods, " + s.installBookings.length + " installation bookings" }],
        summary: clashes.length ? clashes.length + " booking clash(es): " + clashes.map((c) => c.title.split(": ")[1]).join("; ") : "No clashes in the next 10 working days.",
        records: [], finish: () => [],
      };
    }
    case "comms": {
      const overdue = s.invoices.filter((i) => (i.status === "overdue" || (isOutstanding(i) && i.dueDate! < TODAY)) && !s.proposals.some((p) => p.status === "pending" && p.payload.invoiceId === i.id) && !s.comms.some((c) => c.invoiceId === i.id && c.kind === "Payment reminder"));
      const notices = s.comms.filter((c) => c.status === "awaiting approval");
      return {
        steps: [{ label: "Checked overdue invoices", detail: overdue.length + " need a reminder" }, { label: "Checked completion notices", detail: notices.length + " waiting for approval" }, { label: "Checked appointments", detail: "Reminders for Monday's visits drafted" }],
        summary: overdue.length + " payment reminder(s) drafted. Nothing is sent without approval.",
        records: overdue.map((i) => i.number || ""),
        finish: () => overdue.map((i) => addProposal({ agentId: "comms", kind: "send-reminder", title: "Send payment reminder for " + i.number, detail: sel.customer(state, i.customerId)!.name + ", " + euro2(invoiceBalance(i)) + " outstanding.", value: invoiceBalance(i), ref: i.number || "", payload: { invoiceId: i.id }, category: "External communication" }).id),
      };
    }
    case "quoting": {
      const prep = s.quotes.filter((q) => q.stage === "Quote Preparation");
      return {
        steps: [{ label: "Found quotes in preparation", detail: prep.length + " quotes" }, { label: "Checked catalogue prices", detail: s.products.length + " approved products and services" }],
        summary: prep.length + " quotes in preparation. Open one in the Quote Builder to generate a proposal.",
        records: prep.map((q) => q.number), finish: () => [],
      };
    }
    case "intake": {
      const newE = s.enquiries.filter((e) => e.status === "new");
      return {
        steps: [{ label: "Checked new requests", detail: newE.length + " website enquiries" }, { label: "Checked for duplicates", detail: "Against customers and open jobs" }],
        summary: newE.length + " enquiries in New Enquiry. No duplicates found.",
        records: newE.map((e) => e.company), finish: () => [],
      };
    }
  }
}

/* ── Accountant ─────────────────────────────────────────────────────────── */
export function exportForAccountant(period: string, division: "ALL" | DivisionId) {
  const inv = state.invoices.filter((i) => i.issueDate && periodOf(i.issueDate) === period && (division === "ALL" || i.division === division));
  const pur = state.purchases.filter((p) => periodOf(p.date) === period && (division === "ALL" || p.division === division));
  const rows = [["Type", "Number", "Date", "Division", "Party", "Net", "VAT", "Gross", "Status"]];
  inv.forEach((i) => rows.push(["Sale", i.number || "", i.issueDate || "", i.division, sel.customer(state, i.customerId)!.name, invoiceNet(i).toFixed(2), (invoiceGross(i) - invoiceNet(i)).toFixed(2), invoiceGross(i).toFixed(2), i.status]));
  pur.forEach((p) => rows.push(["Purchase", p.ref, p.date, p.division, p.supplier, p.net.toFixed(2), p.vat.toFixed(2), (p.net + p.vat).toFixed(2), p.status]));
  const csv = rows.map((r) => r.map((c) => (/[",]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c)).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "export-" + period + "-" + division + ".csv";
  a.click();
  automationRan("12", monthName(period) + " export downloaded (" + inv.length + " sales, " + pur.length + " purchases)");
  log(monthName(period) + " accountant export (" + inv.length + " sales, " + pur.length + " purchases)", "finance");
  commit();
  toast("Export downloaded: " + inv.length + " sales, " + pur.length + " purchases");
}

/* ── Settings ───────────────────────────────────────────────────────────── */
export function setPrefix(d: DivisionId, prefix: string) {
  set((s) => ({ prefixes: { ...s.prefixes, [d]: prefix.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || s.prefixes[d] } }));
}
export function setVat(rate: number) {
  set({ vatRate: rate });
  toast("Default VAT set to " + Math.round(rate * 1000) / 10 + "%. Existing invoices keep their own rate", "info");
}

export const getState = () => state;

/* For module-specific actions living in their own files. */
export function mutate(fn: (s: FMState) => Partial<FMState>, logText?: string, kind: LogEvent["kind"] = "system", ref?: string) {
  state = { ...state, ...fn(state) };
  if (logText) log(logText, kind, ref);
  commit();
}
export const newId = (prefix: string) => uid(prefix);
export const nowStamp = stamp;
export { actorName, log as logEvent };
