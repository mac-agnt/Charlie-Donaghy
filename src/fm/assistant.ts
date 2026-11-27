/* Charlie AI: answers come from the live records, never from canned copy.
   Each answer can carry a table whose rows open the underlying record, and
   actions. Anything financial or customer-facing waits for an explicit yes. */

import { COMPANY, canSeeMoney, divisionById } from "./config";
import { TODAY, addDays, addWorkingDays, diffDays, fmtDate, nextWorkingDay, dayLong, monthName } from "./dates";
import {
  fm, sel, metrics, alerts, jobTotals, engineerDay, dueVisits, findInstallSlots, resolveConflicts, bookInstallation,
  invoiceGross, invoiceBalance, isOutstanding, euro, euro2, openDrawer, go, quoteFromEnquiry, draftInvoiceForJob, approveInvoice,
  createJob, createQuote, addQuoteLine, setTab, getLastBookingNotes, type SlotOption,
} from "./store";
import type { Customer, FMState, Job } from "./types";

export type FMAction = { label: string; primary?: boolean; run?: () => FMAnswer | void };
export type FMRow = { cells: string[]; open?: () => void };
export type FMAnswer = {
  tool: string;
  effect: "read" | "write";
  text: string;
  cols?: string[];
  rows?: FMRow[];
  actions?: FMAction[];
  confirm?: boolean;
  confirmSummary?: string;
};

let lastCustomerId: string | null = null;
let lastSlots: SlotOption[] = [];

const money = (s: FMState, n: number) => (canSeeMoney(s.role) || s.role === "ops" ? euro(n) : "hidden");
const siteName = (s: FMState, id: string) => sel.site(s, id)?.name || "";
const custName = (s: FMState, id: string) => sel.customer(s, id)?.name || "";
const jobRow = (s: FMState, j: Job, extra?: string): FMRow => ({
  cells: [j.number + " · " + siteName(s, j.siteId), j.engineerIds.map((e) => sel.engineer(s, e)!.name.split(" ")[0]).join(", ") || "Unallocated", j.scheduled ? fmtDate(j.scheduled) : "Not booked", extra ?? (j.status === "progress" ? "In progress" : j.status === "new" ? "New" : j.status)],
  open: () => openDrawer({ kind: "job", id: j.id }),
});

function findCustomer(s: FMState, q: string): Customer | undefined {
  const t = q.toLowerCase();
  const bySite = s.sites.find((x) => t.includes(x.name.toLowerCase().split(",")[0]) || (x.town.length > 4 && t.includes(x.name.toLowerCase())));
  return (
    s.customers.find((c) => t.includes(c.name.toLowerCase())) ||
    s.customers.find((c) => {
      const first = c.name.toLowerCase().replace(/^st\.?\s/, "").split(/[\s']/)[0];
      return first.length > 3 && new RegExp("\\b" + first + "\\b").test(t);
    }) ||
    (bySite ? sel.customer(s, bySite.customerId) : undefined)
  );
}

export function answerFM(q: string): FMAnswer {
  const s = fm.get();
  const t = q.toLowerCase();
  const m = metrics(s);

  /* Briefing */
  if (/happening|today|briefing|morning|overview|what changed/.test(t) && !/available|free|who/.test(t)) {
    const todays = s.engineers.map((e) => ({ e, d: engineerDay(s, e.id, TODAY) }));
    const al = alerts(s);
    return {
      tool: "daily_briefing", effect: "read",
      text: "Friday 27 November. " + m.newJobs.length + " new jobs (" + m.unallocated.length + " still unallocated), " + m.inProgress.length + " in progress and " + m.completed.length + " completed but not invoiced" + (canSeeMoney(s.role) ? " (" + money(s, m.unbilledValue) + ")" : "") + ". " +
        (canSeeMoney(s.role) ? m.overdue.length + " invoices are overdue (" + euro(m.overdueValue) + "). " : "") +
        "The one to act on first: " + (al[0] ? al[0].title.toLowerCase() + "." : "nothing urgent.") + " Here's who is where today.",
      cols: ["Engineer", "Today", "Hours", "Free"],
      rows: todays.map(({ e, d }) => ({ cells: [e.name, d.items.map((i) => i.ref || i.label.split(":")[0]).join(", ") || "Nothing booked", d.hours + " h", d.onLeave ? "On leave" : d.free + " h"], open: () => openDrawer({ kind: "engineer", id: e.id }) })),
      actions: [
        { label: "Open the dashboard", primary: true, run: () => go("Dashboard") },
        { label: "Allocate the " + m.unallocated.length + " unallocated jobs", run: () => go("Schedule", "unallocated") },
      ],
    };
  }

  /* Allendale / any customer story */
  const cust = findCustomer(s, q);
  if (cust && /story|what.*(going on|happening)|status|update|where are we|tell me about/.test(t)) {
    lastCustomerId = cust.id;
    const jobs = s.jobs.filter((j) => j.customerId === cust.id);
    const open = jobs.filter((j) => j.status === "new" || j.status === "progress");
    const lead = open.sort((a, b) => (a.priority === "High" ? -1 : 1) - (b.priority === "High" ? -1 : 1))[0];
    const upcoming = s.serviceVisits.filter((v) => sel.contract(s, v.contractId)?.customerId === cust.id && v.status !== "completed").sort((a, b) => (a.date < b.date ? -1 : 1));
    const due = dueVisits(s, "2026-12").filter((d) => d.contract.customerId === cust.id && !d.existing);
    const invs = s.invoices.filter((i) => i.customerId === cust.id && isOutstanding(i));
    const quotes = s.quotes.filter((x) => x.customerId === cust.id && !["Accepted", "Lost"].includes(x.stage));
    let lead1 = "";
    if (lead) {
      const tt = jobTotals(s, lead);
      const vs = tt.visits;
      const last = vs[vs.length - 1];
      lead1 = "The " + lead.description.split(".")[0].toLowerCase() + " (" + lead.number + ") is " + (lead.status === "progress" ? "still in progress" : "new") + ". " +
        (last ? (vs.length === 1 ? "" : vs.length + " visits so far. ") + Math.round(last.hours * 10) / 10 + " hours were completed on " + dayLong(last.date) + " by " + sel.engineer(s, last.engineerId)!.name.split(" ")[0] + ". " : "") +
        (lead.scheduled && lead.scheduled >= TODAY ? "The engineer is scheduled to return on " + dayLong(lead.scheduled) + " " + fmtDate(lead.scheduled).slice(4) + ". " : "") +
        (lead.returnNote && !(lead.scheduled && lead.scheduled >= TODAY) ? lead.returnNote + " " : lead.returnNote ? lead.returnNote.split(".")[0] + ". " : "");
    }
    const rows: FMRow[] = [
      ...open.map((j) => jobRow(s, j)),
      ...upcoming.slice(0, 2).map((v) => ({ cells: ["Service visit · " + siteName(s, v.siteId), v.engineerId ? sel.engineer(s, v.engineerId)!.name.split(" ")[0] : "Unallocated", fmtDate(v.date), v.status], open: () => openDrawer({ kind: "serviceVisit", id: v.id }) })),
      ...due.slice(0, 2).map((d) => ({ cells: ["Service due · " + siteName(s, d.contract.siteId), "Not planned", fmtDate(d.date), d.services.join(", ")], open: () => openDrawer({ kind: "contract", id: d.contract.id }) })),
      ...(canSeeMoney(s.role) ? invs.map((i) => ({ cells: [(i.number || "Draft") + " · invoice", i.status, fmtDate(i.dueDate), euro2(invoiceBalance(i))], open: () => openDrawer({ kind: "invoice", id: i.id }) })) : []),
      ...quotes.map((x) => ({ cells: [x.number + " · " + x.title, x.stage, fmtDate(x.validUntil), ""], open: () => openDrawer({ kind: "quote", id: x.id }) })),
    ];
    return {
      tool: "customer_story", effect: "read",
      text: (lead1 || "No open jobs at " + cust.name + " right now. ") + (due.length ? due.length + " service visit" + (due.length > 1 ? "s are" : " is") + " due in December. " : upcoming.length ? "Next service visit is " + fmtDate(upcoming[0].date) + ". " : "") +
        (canSeeMoney(s.role) && invs.length ? invs.length + " invoice" + (invs.length > 1 ? "s" : "") + " outstanding (" + euro2(invs.reduce((a, i) => a + invoiceBalance(i), 0)) + "). " : "") + (quotes.length ? quotes.length + " quote" + (quotes.length > 1 ? "s" : "") + " open." : ""),
      cols: ["Record", "Who / status", "When", "Detail"],
      rows,
      actions: [
        ...(lead ? [{ label: "Open " + lead.number, primary: true, run: () => openDrawer({ kind: "job", id: lead.id }) }] : []),
        { label: "Open " + cust.name, run: () => openDrawer({ kind: "customer", id: cust.id }) },
      ],
    };
  }

  /* Outstanding jobs */
  if (/outstanding job|jobs.*(outstanding|open|still)|open jobs|what jobs/.test(t)) {
    const list = s.jobs.filter((j) => j.status === "new" || j.status === "progress").sort((a, b) => (a.status === b.status ? 0 : a.status === "new" ? -1 : 1));
    return {
      tool: "jobs_find", effect: "read",
      text: list.length + " jobs are still open: " + m.newJobs.length + " new (" + m.unallocated.length + " unallocated in the job box) and " + m.inProgress.length + " in progress. " +
        (m.inProgress.filter((j) => j.returnRequired).length ? m.inProgress.filter((j) => j.returnRequired).length + " are waiting on a return visit." : ""),
      cols: ["Job · site", "Engineer", "Booked", "Status"],
      rows: list.map((j) => jobRow(s, j, j.status === "new" ? (j.engineerIds.length ? "New" : "In job box") : j.returnRequired ? "Return needed" : "In progress")),
      actions: [{ label: "Open the job board", primary: true, run: () => go("Jobs", "board") }],
    };
  }

  /* Unbilled work */
  if (/(not|n't|haven't|havent|un).*(invoiced|billed)|unbilled|ready to invoice/.test(t)) {
    const list = m.completed;
    if (!canSeeMoney(s.role) && s.role !== "ops") return { tool: "jobs_find", effect: "read", text: "That's financial information, which isn't available for your role." };
    return {
      tool: "invoice_agent.find_unbilled", effect: "read",
      text: list.length ? list.length + " completed jobs haven't been invoiced, worth " + euro(m.unbilledValue) + " net. " + (list[0] ? list.slice().sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1)).map((j) => j.number + " was finished " + diffDays(TODAY, j.completedAt!) + " days ago")[0] + ". " : "") + "Every visit, hour and material is already consolidated, so each invoice is one approval." : "Everything completed has been invoiced.",
      cols: ["Job · site", "Completed", "Hours", "Value"],
      rows: list.map((j) => { const tt = jobTotals(s, j); return { cells: [j.number + " · " + siteName(s, j.siteId), fmtDate(j.completedAt) + " (" + diffDays(TODAY, j.completedAt!) + "d)", tt.billableHours + " h", money(s, tt.value)], open: () => openDrawer({ kind: "job", id: j.id }) }; }),
      actions: list.length && canSeeMoney(s.role)
        ? [{ label: "Prepare all " + list.length + " invoices", primary: true, run: () => prepareAll(list.map((j) => j.id)) }, { label: "Open Ready to invoice", run: () => go("Finance", "ready") }]
        : [{ label: "Open completed jobs", run: () => go("Jobs", "completed") }],
    };
  }

  /* Invoices for a customer in a year */
  if (/invoice/.test(t) && /(20\d\d|this customer|every invoice|all invoices|history)/.test(t)) {
    if (!canSeeMoney(s.role)) return { tool: "invoice_search", effect: "read", text: "Invoice history isn't available for your role." };
    const c = cust || (lastCustomerId ? sel.customer(s, lastCustomerId) : undefined);
    const yr = (t.match(/20\d\d/) || ["2025"])[0];
    if (!c) return { tool: "invoice_search", effect: "read", text: "Which customer? Ask about one first (for example, \"What's the story with Allendale?\") or name them, and I'll pull every invoice for " + yr + "." };
    lastCustomerId = c.id;
    const list = s.invoices.filter((i) => i.customerId === c.id && i.issueDate && i.issueDate.startsWith(yr)).sort((a, b) => (a.issueDate! < b.issueDate! ? -1 : 1));
    const total = list.reduce((a, i) => a + invoiceGross(i), 0);
    return {
      tool: "invoice_search", effect: "read",
      text: list.length + " invoice" + (list.length === 1 ? "" : "s") + " issued to " + c.name + " in " + yr + ", totalling " + euro2(total) + " including VAT. " + (list.filter((i) => i.status === "paid").length === list.length ? "All paid." : list.filter((i) => i.status !== "paid").length + " not fully paid."),
      cols: ["Invoice", "Issued", "Site", "Total"],
      rows: list.map((i) => ({ cells: [i.number + " · " + divisionById(i.division).short, fmtDate(i.issueDate, true), siteName(s, i.siteId), euro2(invoiceGross(i)) + (i.status !== "paid" ? " · " + i.status : "")], open: () => openDrawer({ kind: "invoice", id: i.id }) })),
      actions: [{ label: "Open " + c.name, primary: true, run: () => openDrawer({ kind: "customer", id: c.id }) }, { label: "Open the invoice register", run: () => go("Finance", "invoices") }],
    };
  }

  /* December servicing */
  if (/servic|ppm|maintenance visit/.test(t) && /dec|month|schedul|plan/.test(t)) {
    const due = dueVisits(s, "2026-12");
    const planned = s.serviceVisits.filter((v) => v.period === "2026-12");
    if (!planned.length) {
      return {
        tool: "service_planning_agent", effect: "read",
        text: due.length + " service visits are due in December across " + due.length + " contracts, none planned yet. " + due.filter((d) => d.contract.division === "LFL").length + " are fire and lighting, " + due.filter((d) => d.contract.division === "SS").length + " surveillance and " + due.filter((d) => d.contract.division === "LPM").length + " grounds. I can generate the plan: engineers matched by skill and availability, nearby sites grouped, nothing booked until you approve.",
        cols: ["Site", "Services", "Due", "Hours"],
        rows: due.map((d) => ({ cells: [siteName(s, d.contract.siteId), d.services.join(", "), fmtDate(d.date), d.hours + " h"], open: () => openDrawer({ kind: "contract", id: d.contract.id }) })),
        actions: [{ label: "Generate the December plan", primary: true, run: () => go("Servicing", "planner") }],
      };
    }
    return {
      tool: "service_planning_agent", effect: "read",
      text: planned.length + " December service visits are planned, " + planned.filter((v) => v.status === "scheduled").length + " approved and booked" + (planned.filter((v) => v.status === "proposed").length ? ", " + planned.filter((v) => v.status === "proposed").length + " still waiting for your approval" : "") + ".",
      cols: ["Site", "Engineer", "Date", "Status"],
      rows: planned.sort((a, b) => (a.date < b.date ? -1 : 1)).map((v) => ({ cells: [siteName(s, v.siteId), v.engineerId ? sel.engineer(s, v.engineerId)!.name : "Unallocated", fmtDate(v.date), v.status], open: () => openDrawer({ kind: "serviceVisit", id: v.id }) })),
      actions: [{ label: "Open the monthly planner", primary: true, run: () => go("Servicing", "planner") }],
    };
  }

  /* Three-week installation */
  if (/install|fit in|three.?week|3.?week/.test(t) && /(fit|can we|week|book|when)/.test(t) && !/^book the/.test(t)) {
    const from = /jan/.test(t) ? "2027-01-04" : "2026-12-01";
    const skill = /cctv|camera/.test(t) ? "CCTV" : /access/.test(t) ? "Access control" : "Fire";
    lastSlots = findInstallSlots(s, { skill, engineers: 2, workingDays: 15, from });
    const o = lastSlots[0];
    return {
      tool: "scheduling_agent.find_slots", effect: "read",
      text: "I've checked the current installation schedule and engineer availability for a 15-working-day " + (skill === "Fire" ? "fire alarm" : skill.toLowerCase()) + " job with two engineers. " +
        (o ? "The earliest start is " + fmtDate(o.from) + ", finishing " + fmtDate(o.to) + " with " + o.engineerIds.map((e) => sel.engineer(s, e)!.name).join(" and ") + (o.conflicts.length ? ", but there " + (o.conflicts.length === 1 ? "is one clash" : "are " + o.conflicts.length + " clashes") + " to resolve (" + Array.from(new Set(o.conflicts.map((c) => c.kind === "holiday" ? "annual leave" : c.kind === "service" ? "PPM visits" : "a booking"))).join(", ") + ")." : ", no clashes.") : "There's no workable window in the next ten weeks.") +
        " The Boyne Valley Foods quote (Q-2606) is the obvious candidate. Here are the options.",
      cols: ["Option", "Crew", "Dates", "Clashes"],
      rows: lastSlots.map((x, i) => ({ cells: ["Option " + (i + 1), x.engineerIds.map((e) => sel.engineer(s, e)!.name.split(" ")[0]).join(" + "), fmtDate(x.from) + " → " + fmtDate(x.to), x.conflicts.length ? x.conflicts.length + " to resolve" : "None"], open: () => go("Schedule", "installs") })),
      actions: [
        { label: "Book the first option", primary: true, run: () => bookOption(0) },
        { label: "Open the installation planner", run: () => go("Schedule", "installs") },
      ],
    };
  }
  if (/^book (the )?(first|second|third|option)/.test(t)) {
    const idx = /second|option 2/.test(t) ? 1 : /third|option 3/.test(t) ? 2 : 0;
    return bookOption(idx) as FMAnswer;
  }

  /* Availability */
  if (/(who|anyone).*(available|free)|availability/.test(t)) {
    const dayWord = (["monday", "tuesday", "wednesday", "thursday", "friday"].find((d) => t.includes(d)) || "");
    let date = dayWord ? TODAY : TODAY;
    if (dayWord) {
      const target = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(dayWord);
      date = addDays(TODAY, 1);
      while (new Date(date + "T12:00").getDay() !== target) date = addDays(date, 1);
    }
    date = nextWorkingDay(date);
    const rows = s.engineers.map((e) => ({ e, d: engineerDay(s, e.id, date) }));
    const free = rows.filter((r) => !r.d.onLeave && r.d.free >= 4);
    return {
      tool: "scheduling_agent.availability", effect: "read",
      text: dayLong(date) + " " + fmtDate(date).slice(4) + ": " + (free.length ? free.map((r) => r.e.name.split(" ")[0] + " (" + r.d.free + " h free)").join(", ") + (free.length > 1 ? " have" : " has") + " room." : "nobody has more than half a day free.") +
        (rows.filter((r) => r.d.onLeave).length ? " " + rows.filter((r) => r.d.onLeave).map((r) => r.e.name.split(" ")[0]).join(", ") + " on leave." : "") +
        (rows.filter((r) => r.d.hours > 8).length ? " " + rows.filter((r) => r.d.hours > 8).map((r) => r.e.name.split(" ")[0]).join(", ") + " is overbooked." : ""),
      cols: ["Engineer", "Booked", "Hours", "Free"],
      rows: rows.map(({ e, d }) => ({ cells: [e.name, d.items.map((i) => i.ref || i.label.split(":")[0]).join(", ") || "Nothing booked", d.hours + " h", d.onLeave ? "On leave" : d.free + " h"], open: () => openDrawer({ kind: "engineer", id: e.id }) })),
      actions: [{ label: "Open availability", primary: true, run: () => go("Schedule", "availability") }],
    };
  }

  /* New CCTV quote */
  if (/quote/.test(t) && /(prepare|new|draft|create|make)/.test(t)) {
    const isCctv = /cctv|camera|surveil/.test(t);
    const enq = s.enquiries.find((e) => e.status === "new" && (isCctv ? e.division === "SS" : true));
    if (enq) {
      return {
        tool: "quoting_agent.prepare", effect: "read",
        text: "There's a fresh website enquiry that fits: " + enq.name + " at " + enq.company + " (" + enq.location + ") asked for " + enq.service.toLowerCase() + ": \"" + enq.description + "\" I can turn it into a customer and a quote in preparation with starter lines from the approved catalogue. Nothing is sent to them until you send it.",
        cols: ["From", "Service", "Received", "Source"],
        rows: [{ cells: [enq.company, enq.service, enq.receivedAt.slice(5, 16), enq.source], open: () => openDrawer({ kind: "enquiry", id: enq.id }) }],
        actions: [
          { label: "Prepare the quote from this enquiry", primary: true, run: () => { const q2 = quoteFromEnquiry(enq.id); setTab("Quotes", "builder"); go("Quotes", "builder", { "quotes.builder": q2.id }); return { tool: "quoting_agent.prepare", effect: "write", text: q2.number + " is in the Quote Builder with " + q2.lines.length + " starter lines. Add or change products, then generate the detailed proposal." }; } },
          { label: "Start a blank quote", run: () => go("Quotes", "builder") },
        ],
      };
    }
    const c = cust || (lastCustomerId ? sel.customer(s, lastCustomerId) : s.customers[0])!;
    return {
      tool: "quoting_agent.prepare", effect: "read",
      text: "I'll start a " + (isCctv ? "CCTV installation" : "new") + " quote for " + c.name + ". It opens in the Quote Builder with starter lines from the approved catalogue.",
      actions: [{ label: "Start the quote", primary: true, run: () => { const site = s.sites.find((x) => x.customerId === c.id)!; const q2 = createQuote({ customerId: c.id, siteId: site.id, division: isCctv ? "SS" : "LFL", title: (isCctv ? "CCTV installation" : "New works") + ", " + site.name, requirements: "To be confirmed at survey." }); if (isCctv) { ["CC-DOME", "CC-NVR8", "INS-SEC"].forEach((sku, i) => { const p = s.products.find((x) => x.sku === sku)!; addQuoteLine(q2.id, { productId: p.id, description: p.name, qty: [6, 1, 2][i], unitPrice: p.price, kind: i === 2 ? "Installation" : "Equipment" }); }); } go("Quotes", "builder", { "quotes.builder": q2.id }); } }],
    };
  }

  /* Create a job */
  if (/(create|log|new|raise|add).*job/.test(t)) {
    const c = cust;
    if (!c) return { tool: "job_intake_agent", effect: "read", text: "Which site is it for? Say something like \"Create a job at Harbourview Hotel: emergency light out on the 3rd floor\" and I'll draft it, check for duplicates and put it in the job box." };
    const site = s.sites.find((x) => x.customerId === c.id)!;
    const desc = q.split(/[:\--]/).slice(1).join(" ").trim() || "Reported by phone, details to confirm";
    const division = /cctv|camera|intercom|access/.test(t) ? "SS" : /door|gutter|paint|garden|leak/.test(t) ? "LPM" : "LFL";
    const dup = s.jobs.filter((j) => j.siteId === site.id && (j.status === "new" || j.status === "progress"));
    return {
      tool: "job_intake_agent.draft", effect: "write", confirm: true,
      confirmSummary: "Create a " + divisionById(division).short.toLowerCase() + " job at " + site.name + ": \"" + desc + "\". It goes into the shared job box unallocated." + (dup.length ? " Heads up: " + dup.map((j) => j.number).join(", ") + " already open at this site." : " No duplicate found."),
      text: "Drafted from your message. Creating a job writes to the records, so it waits for your yes.",
      actions: [
        { label: "Create the job", primary: true, run: () => { const j = createJob({ siteId: site.id, division, type: "Reactive callout", priority: "Normal", description: desc, source: "Charlie AI" }); return { tool: "jobs_create", effect: "write", text: j.number + " created and in the job box. Available " + divisionById(division).short.toLowerCase() + " engineers have been notified.", rows: [jobRow(fm.get(), j)], cols: ["Job · site", "Engineer", "Booked", "Status"] }; } },
        { label: "Not now", run: () => ({ tool: "jobs_create", effect: "read", text: "Left it. Nothing was created." }) },
      ],
    };
  }

  /* Overdue / money owed */
  if (/overdue|owe|outstanding invoice|debt|chase|payment/.test(t)) {
    if (!canSeeMoney(s.role)) return { tool: "invoice_search", effect: "read", text: "That's financial information, which isn't available for your role." };
    return {
      tool: "invoice_agent.outstanding", effect: "read",
      text: m.outstanding.length + " invoices are outstanding (" + euro(m.outstandingValue) + "), " + m.overdue.length + " of them overdue (" + euro(m.overdueValue) + "). The Customer Communication Agent drafts reminders; nothing goes out without your yes.",
      cols: ["Invoice", "Customer", "Due", "Balance"],
      rows: m.outstanding.sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1)).map((i) => ({ cells: [i.number || "", custName(s, i.customerId), fmtDate(i.dueDate) + (i.dueDate! < TODAY ? " (overdue)" : ""), euro2(invoiceBalance(i))], open: () => openDrawer({ kind: "invoice", id: i.id }) })),
      actions: [{ label: "Review reminders in Approvals", primary: true, run: () => { setTab("Agents", "approvals"); go("Agents"); } }],
    };
  }

  /* Fallback */
  return {
    tool: "records_search", effect: "read",
    text: "I can answer from every job, visit, invoice, quote, contract and schedule in " + COMPANY.umbrellaShort + ". Try one of these.",
    actions: [
      { label: "What's happening across the business today?" },
      { label: "What's the story with Allendale?" },
      { label: "Which completed jobs haven't been invoiced?" },
      { label: "Can we fit in a three-week fire alarm installation next month?" },
    ],
  };
}

function prepareAll(ids: string[]): FMAnswer {
  ids.forEach((id) => draftInvoiceForJob(id, true));
  const s = fm.get();
  const drafts = ids.map((id) => s.invoices.find((i) => i.jobId === id && i.status === "draft")).filter(Boolean) as FMState["invoices"];
  return {
    tool: "invoice_agent.draft", effect: "write", confirm: true,
    confirmSummary: "Issue " + drafts.length + " invoices totalling " + euro2(drafts.reduce((a, i) => a + invoiceGross(i), 0)) + " incl. VAT. Each gets the next number in its own division's series and is emailed to the customer's accounts address (simulated).",
    text: drafts.length + " drafts are ready. Issuing invoices is a financial action, so it waits for your yes.",
    actions: [
      { label: "Approve and issue all", primary: true, run: () => { drafts.forEach((i) => approveInvoice(i.id)); const after = fm.get(); return { tool: "invoice_agent.issue", effect: "write", text: "Done. " + drafts.map((d) => after.invoices.find((x) => x.id === d.id)!.number).join(", ") + " issued. Unbilled work is now " + euro(metrics(after).unbilledValue) + "." }; } },
      { label: "Review them first", run: () => go("Finance", "ready") },
    ],
  };
}

function bookOption(idx: number): FMAnswer {
  const s = fm.get();
  if (!lastSlots.length) lastSlots = findInstallSlots(s, { skill: "Fire", engineers: 2, workingDays: 15, from: "2026-12-01" });
  const o = lastSlots[idx] || lastSlots[0];
  const { option, changes } = resolveConflicts(o, "Fire");
  const q = s.quotes.find((x) => x.number === "Q-2606")!;
  const site = sel.site(s, q.siteId)!;
  return {
    tool: "scheduling_agent.book", effect: "write", confirm: true,
    confirmSummary: "Book " + q.title.toLowerCase() + " at " + site.name + ", " + fmtDate(option.from) + " to " + fmtDate(option.to) + " (" + option.days.length + " working days) with " + option.engineerIds.map((e) => sel.engineer(s, e)!.name).join(" and ") + "." + (changes.length ? " Changes: " + changes.join("; ") + "." : " No other bookings change.") + " Q-2606 becomes an accepted quote and an installation job.",
    text: "Here are the proposed scheduling changes. Booking moves other work, so it waits for your yes.",
    actions: [
      { label: "Approve the booking", primary: true, run: () => { const jobId = bookInstallation(o, { quoteId: q.id, siteId: q.siteId, division: "LFL", title: site.name + ": " + q.title, skill: "Fire" }, true); const j = sel.job(fm.get(), jobId)!; const notes = getLastBookingNotes(); return { tool: "scheduling_agent.book", effect: "write", text: "Booked. " + j.number + " runs " + fmtDate(option.from) + " to " + fmtDate(option.to) + " and shows across the company calendar." + (notes.length ? " Also done: " + notes.join("; ") + "." : ""), actions: [{ label: "See it on the calendar", primary: true, run: () => go("Schedule", "company") }, { label: "Open " + j.number, run: () => openDrawer({ kind: "job", id: j.id }) }] }; } },
      { label: "Not now", run: () => ({ tool: "scheduling_agent.book", effect: "read", text: "Nothing booked. The options stay in the installation planner." }) },
    ],
  };
}

export const SUGGESTED = [
  "What's happening across the business today?",
  "What jobs are still outstanding?",
  "What's the story with Allendale?",
  "Which completed jobs haven't been invoiced?",
  "Find every invoice issued to this customer in 2025",
  "What servicing is scheduled for December?",
  "Can we fit in a three-week fire alarm installation next month?",
  "Who is available on Tuesday?",
  "Prepare a quote for a new CCTV installation",
];

export { addWorkingDays, monthName };
