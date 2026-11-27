/* Finance: invoices, ready-to-invoice work, payments, purchases, recurring
   contract billing and the accountant's workspace. An administration layer,
   not an accounting or payroll system. */
import { useEffect, useMemo, useRef, useState } from "react";
import { COMPANY, DIVISIONS, divisionById, type DivisionId } from "../config";
import {
  useFM, metrics, invoiceNet, invoiceGross, invoiceBalance, isOutstanding, jobTotals, draftInvoiceForJob, approveInvoice,
  updateInvoice, recordPayment, cancelInvoice, generateRecurringInvoices, approveRecurring, contractsDueForBilling,
  exportForAccountant, openDrawer, openModal, closeModal, mutate, newId, euro, euro2, sel, inDivision, toast, setFilter,
} from "../store";
import { TODAY, diffDays, fmtDate, fmtDay, monthName, period as periodOf, addDays } from "../dates";
import { Page, Card, Stat, Table, Btn, Pill, InvoiceStatusPill, Modal, Field, RecLink, Seg, Bar, Ico, DivTag, Empty, type Col } from "../ui";
import { DrawerHead } from "../FMLayer";
import type { FMState, Invoice, InvoiceStatus, Job } from "../types";
import { printElement } from "./finance/print";
import "./finance/finance.css";

const custName = (s: FMState, id: string) => sel.customer(s, id)?.name || "";
const siteName = (s: FMState, id: string) => sel.site(s, id)?.name || "";
const daysOutstanding = (inv: Invoice) => (inv.issueDate ? diffDays(TODAY, inv.issueDate) : 0);
const isOverdue = (inv: Invoice) => inv.status === "overdue" || (isOutstanding(inv) && !!inv.dueDate && inv.dueDate < TODAY);
const shownStatus = (inv: Invoice): InvoiceStatus => (isOverdue(inv) ? "overdue" : inv.status);

export default function FinancePage({ tab }: { tab: string }) {
  const s = useFM();
  if (s.role !== "owner" && s.role !== "accountant") {
    return <Page title="Finance"><Empty title="Finance is restricted" hint="Only the owner and the accountant can see financial records." /></Page>;
  }
  switch (tab) {
    case "invoices": return <InvoicesTab />;
    case "ready": return <ReadyTab />;
    case "payments": return <PaymentsTab />;
    case "purchases": return <PurchasesTab />;
    case "recurring": return <RecurringTab />;
    case "accountant": return <AccountantTab />;
    default: return <OverviewTab />;
  }
}

/* ── Overview ───────────────────────────────────────────────────────────── */
function OverviewTab() {
  const s = useFM();
  const m = metrics(s);
  const outstanding = s.invoices.filter((i) => inDivision(s, i.division) && isOutstanding(i));
  const buckets: [string, (d: number) => boolean][] = [["0 to 30 days", (d) => d <= 30], ["31 to 60 days", (d) => d > 30 && d <= 60], ["61 to 90 days", (d) => d > 60 && d <= 90], ["Over 90 days", (d) => d > 90]];
  const maxMonth = Math.max(1, ...m.months.map((x) => x.value));
  const recentPayments = s.payments.filter((p) => { const i = sel.invoice(s, p.invoiceId); return i && inDivision(s, i.division); }).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  const drafts = s.invoices.filter((i) => i.status === "draft" && inDivision(s, i.division));
  return (
    <Page eyebrow="Finance" title="Finance overview" sub={"Figures for " + monthName(periodOf(TODAY)) + ", calculated from the invoice register, payments and completed jobs."}
      actions={<Btn kind="primary" icon="finance" onClick={() => go("ready")}>Ready to invoice</Btn>}>
      <div className="fm-grid fm-g4">
        <Stat icon="finance" label={"Invoiced in " + monthName(periodOf(TODAY)).split(" ")[0]} value={euro(m.revenueMonth)} sub="Net of VAT, issued this month" onClick={() => go("invoices")} />
        <Stat icon="jobs" label="Completed, not invoiced" value={euro(m.unbilledValue)} sub={m.completed.length + " jobs waiting"} tone={m.unbilledValue ? "warn" : "ok"} onClick={() => go("ready")} />
        <Stat icon="clock" label="Outstanding" value={euro(m.outstandingValue)} sub={m.outstanding.length + " invoices unpaid"} onClick={() => go("invoices")} />
        <Stat icon="alert" label="Overdue" value={euro(m.overdueValue)} sub={m.overdue.length + " invoices past due"} tone={m.overdue.length ? "bad" : "ok"} onClick={() => go("invoices")} />
      </div>
      <div className="fm-grid fm-g-main">
        <Card title="Revenue by month" sub="Net invoiced, last six months">
          <div className="fm-cols" style={{ height: 150 }}>
            {m.months.map((x, i) => (
              <div key={x.period} title={monthName(x.period) + ": " + euro(x.value)}>
                <span className="fm-faint" style={{ fontSize: 10.5, fontVariantNumeric: "tabular-nums" }}>{x.value >= 1000 ? "€" + (x.value / 1000).toFixed(1) + "k" : euro(x.value)}</span>
                <div className={"c" + (i === m.months.length - 1 ? " on" : "")} style={{ height: Math.max(4, (x.value / maxMonth) * 110) }} />
                <span className="l">{monthName(x.period).slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Revenue by division" sub={monthName(periodOf(TODAY))}>
          <div className="fm-col-flex">
            {m.revenueByDivision.map((d) => (
              <div key={d.id}>
                <div className="fm-row" style={{ justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <DivTag id={d.id as DivisionId} long />
                  <b className="fm-ink" style={{ fontWeight: 600 }}>{euro(d.value)}</b>
                </div>
                <Bar value={d.value} max={Math.max(1, ...m.revenueByDivision.map((x) => x.value))} color={d.color} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Aged debt" sub="Unpaid balances by age from issue date">
        <div className="fin-aged">
          {buckets.map(([label, f]) => {
            const list = outstanding.filter((i) => f(daysOutstanding(i)));
            return (
              <div key={label}>
                <div className="k">{label}</div>
                <div className="v">{euro2(list.reduce((a, i) => a + invoiceBalance(i), 0))}</div>
                <div className="n">{list.length} invoice{list.length === 1 ? "" : "s"}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="fm-grid fm-g2">
        <Card title="Recent payments" flush action={<Btn size="sm" kind="ghost" onClick={() => go("payments")}>All payments</Btn>}>
          <Table cols={[
            { h: "Date", w: "90px", r: (p) => fmtDate(p.date) },
            { h: "Invoice", w: "100px", cls: "mono", r: (p) => <RecLink to={{ kind: "invoice", id: p.invoiceId }}>{sel.invoice(s, p.invoiceId)?.number}</RecLink> },
            { h: "Customer", w: "1fr", r: (p) => custName(s, sel.invoice(s, p.invoiceId)!.customerId) },
            { h: "Amount", w: "100px", num: true, r: (p) => euro2(p.amount) },
          ] as Col<FMState["payments"][number]>[]} rows={recentPayments} />
        </Card>
        <Card title="Waiting for your approval" flush sub={drafts.length ? drafts.length + " draft invoices" : "Nothing waiting"}>
          {drafts.length ? (
            <Table cols={[
              { h: "Customer", w: "1fr", cls: "main", r: (i) => custName(s, i.customerId) },
              { h: "Source", w: "110px", r: (i) => (i.jobId ? sel.job(s, i.jobId)?.number : i.period ? "Contract" : "") },
              { h: "Net", w: "90px", num: true, r: (i) => euro(invoiceNet(i)) },
            ] as Col<Invoice>[]} rows={drafts} onRow={(i) => openDrawer({ kind: "invoice", id: i.id })} />
          ) : <Empty title="No drafts" hint="Drafts appear here when work is completed or contracts are due for billing." />}
        </Card>
      </div>
    </Page>
  );
}
const go = (tab: string) => import("../store").then((m) => m.setTab("Finance", tab));

/* ── Invoice register ───────────────────────────────────────────────────── */
function InvoicesTab() {
  const s = useFM();
  const [q, setQ] = useState("");
  const preset = s.ui.filters["finance.status"] || "";
  const [status, setStatus] = useState(preset || "all");
  // The dashboard hands over "outstanding" or "overdue" before opening this tab.
  useEffect(() => {
    if (!preset) return;
    setStatus(preset);
    setFilter("finance.status", "");
  }, [preset]);
  const [year, setYear] = useState("all");
  const [cust, setCust] = useState("all");
  const [limit, setLimit] = useState(40);
  const years = Array.from(new Set(s.invoices.map((i) => (i.issueDate || i.createdAt).slice(0, 4)))).sort().reverse();
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = useMemo(() => s.invoices
    .filter((i) => inDivision(s, i.division))
    .filter((i) => status === "all" || (status === "outstanding" ? isOutstanding(i) : shownStatus(i) === status))
    .filter((i) => year === "all" || (i.issueDate || i.createdAt).startsWith(year))
    .filter((i) => cust === "all" || i.customerId === cust)
    .filter((i) => {
      if (!tokens.length) return true;
      const hay = [i.number || "draft", custName(s, i.customerId), siteName(s, i.siteId), i.woRef, i.jobId ? sel.job(s, i.jobId)?.number : "", i.lines.map((l) => l.description).join(" ")].join(" ").toLowerCase();
      return tokens.every((t) => (/^\d{4}$/.test(t) ? (i.issueDate || i.createdAt).startsWith(t) || hay.includes(t) : hay.includes(t)));
    })
    .sort((a, b) => ((b.issueDate || "9999") + b.createdAt < (a.issueDate || "9999") + a.createdAt ? -1 : 1)), [s, q, status, year, cust]);
  const total = rows.reduce((a, i) => a + invoiceNet(i), 0);
  const cols: Col<Invoice>[] = [
    { h: "Number", w: "100px", cls: "mono", r: (i) => i.number || <Pill>Draft</Pill> },
    { h: "Customer", w: "1.3fr", cls: "main", r: (i) => custName(s, i.customerId) },
    { h: "Site", w: "1.1fr", r: (i) => siteName(s, i.siteId) },
    { h: "Job / WO", w: "110px", cls: "mono", r: (i) => (i.jobId ? sel.job(s, i.jobId)?.number : i.period ? "Contract" : "") + (i.woRef ? " · " + i.woRef : "") },
    { h: "Division", w: "130px", r: (i) => <DivTag id={i.division} /> },
    { h: "Issued", w: "96px", r: (i) => (i.issueDate ? fmtDay(i.issueDate) : "Not issued") },
    { h: "Due", w: "96px", r: (i) => (i.dueDate ? fmtDay(i.dueDate) : "") },
    { h: "Net", w: "92px", num: true, r: (i) => euro2(invoiceNet(i)) },
    { h: "Gross", w: "92px", num: true, r: (i) => euro2(invoiceGross(i)) },
    { h: "Balance", w: "92px", num: true, r: (i) => (i.status === "cancelled" || i.status === "draft" ? "" : euro2(invoiceBalance(i))) },
    { h: "Status", w: "104px", r: (i) => <InvoiceStatusPill s={shownStatus(i)} /> },
  ];
  return (
    <Page eyebrow="Finance" title="Invoices" sub="Every invoice issued across the three series, current and historical. Search by customer, site, number, work order or year, for example Allendale 2025.">
      <Card flush>
        <div className="fin-toolbar">
          <input className="fm-input" placeholder="Search invoices" value={q} onChange={(e) => { setQ(e.target.value); setLimit(40); }} aria-label="Search invoices" />
          <select className="fm-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="all">All statuses</option>
            <option value="outstanding">Outstanding (unpaid)</option>
            {["draft", "issued", "part-paid", "paid", "overdue", "cancelled"].map((x) => <option key={x} value={x}>{x === "part-paid" ? "Part-paid" : x.charAt(0).toUpperCase() + x.slice(1)}</option>)}
          </select>
          <select className="fm-select" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year">
            <option value="all">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="fm-select" value={cust} onChange={(e) => setCust(e.target.value)} aria-label="Customer">
            <option value="all">All customers</option>
            {s.customers.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="fm-spacer" />
          <span className="fm-muted" style={{ fontSize: 12.5 }}>{rows.length} invoices, {euro2(total)} net</span>
        </div>
        <Table cols={cols} rows={rows.slice(0, limit)} minWidth={1180} onRow={(i) => openDrawer({ kind: "invoice", id: i.id })} empty={<Empty title="No invoices match" hint="Try fewer words or clear a filter." />} />
        {rows.length > limit && <div style={{ padding: 12, textAlign: "center" }}><Btn size="sm" onClick={() => setLimit(rows.length)}>Show all {rows.length}</Btn></div>}
      </Card>
    </Page>
  );
}

/* ── Ready to invoice ───────────────────────────────────────────────────── */
function ReadyTab() {
  const s = useFM();
  const m = metrics(s);
  const ready = s.jobs.filter((j) => j.status === "completed" && j.billedVia === "job" && inDivision(s, j.division)).sort((a, b) => ((a.completedAt || "") < (b.completedAt || "") ? -1 : 1));
  const drafts = s.invoices.filter((i) => i.status === "draft" && inDivision(s, i.division));
  const prepare = (j: Job) => {
    const inv = draftInvoiceForJob(j.id);
    openDrawer({ kind: "invoice", id: inv.id });
  };
  return (
    <Page eyebrow="Finance" title="Ready to invoice" sub="Completed work that hasn't been billed yet. Every visit, hour and material on the job is pulled into one invoice, so nothing is rebuilt from timesheets.">
      <div className="fm-grid fm-g3">
        <Stat icon="jobs" label="Unbilled completed work" value={euro(m.unbilledValue)} sub={ready.length + " jobs"} tone={m.unbilledValue ? "warn" : "ok"} />
        <Stat icon="note" label="Draft invoices" value={String(drafts.length)} sub={euro(drafts.reduce((a, i) => a + invoiceNet(i), 0)) + " net waiting for approval"} />
        <Stat icon="clock" label="Oldest unbilled" value={ready[0]?.completedAt ? diffDays(TODAY, ready[0].completedAt) + " days" : "None"} sub={ready[0] ? ready[0].number + ", " + siteName(s, ready[0].siteId) : "All completed work is invoiced"} tone={ready[0]?.completedAt && diffDays(TODAY, ready[0].completedAt) >= 7 ? "bad" : undefined} />
      </div>
      <Card title="Completed jobs" sub="Labour and materials consolidated across every visit" flush>
        <Table cols={[
          { h: "Job", w: "84px", cls: "mono", r: (j) => <RecLink to={{ kind: "job", id: j.id }}>{j.number}</RecLink> },
          { h: "Customer and site", w: "1.5fr", r: (j) => <span><span className="fm-ink">{custName(s, j.customerId)}</span>{siteName(s, j.siteId) !== custName(s, j.customerId) && <span className="fm-faint">, {siteName(s, j.siteId)}</span>}</span> },
          { h: "Division", w: "130px", r: (j) => <DivTag id={j.division} /> },
          { h: "Completed", w: "120px", r: (j) => { const d = diffDays(TODAY, j.completedAt || TODAY); return <span style={{ color: d >= 7 ? "var(--bad)" : d >= 3 ? "var(--warn)" : undefined }}>{d === 0 ? "Today" : d + " days ago"}</span>; } },
          { h: "Visits", w: "60px", num: true, r: (j) => jobTotals(s, j).visits.length },
          { h: "Labour", w: "70px", num: true, r: (j) => jobTotals(s, j).billableHours + " h" },
          { h: "Materials", w: "90px", num: true, r: (j) => euro2(jobTotals(s, j).materialsValue) },
          { h: "Value", w: "90px", num: true, r: (j) => <b className="fm-ink">{euro2(jobTotals(s, j).value)}</b> },
          { h: "", w: "150px", r: (j) => {
            const inv = j.invoiceId ? sel.invoice(s, j.invoiceId) : undefined;
            return inv && inv.status === "draft"
              ? <Btn size="sm" icon="note" onClick={(e) => { e.stopPropagation(); openDrawer({ kind: "invoice", id: inv.id }); }}>Review draft</Btn>
              : <Btn size="sm" kind="primary" icon="plus" onClick={(e) => { e.stopPropagation(); prepare(j); }}>Prepare invoice</Btn>;
          } },
        ] as Col<Job>[]} rows={ready} minWidth={980} empty={<Empty title="Nothing waiting to be invoiced" hint="When an engineer confirms a job complete it lands here." />} />
      </Card>
      <Card title="Drafts waiting for approval" sub="A draft has no invoice number. The number is assigned in the right series only when you approve it." flush>
        <Table cols={[
          { h: "Customer", w: "1.4fr", cls: "main", r: (i) => custName(s, i.customerId) },
          { h: "Source", w: "1fr", r: (i) => (i.jobId ? sel.job(s, i.jobId)?.number + " " + siteName(s, i.siteId) : "Contract " + (sel.contract(s, i.contractId)?.ref || "") + ", " + (i.period ? monthName(i.period) : "")) },
          { h: "Series", w: "90px", cls: "mono", r: (i) => s.prefixes[i.division] + "-" },
          { h: "Gross", w: "100px", num: true, r: (i) => euro2(invoiceGross(i)) },
          { h: "", w: "170px", r: (i) => <Btn size="sm" kind="primary" icon="check" onClick={(e) => { e.stopPropagation(); openDrawer({ kind: "invoice", id: i.id }); }}>Review and approve</Btn> },
        ] as Col<Invoice>[]} rows={drafts} minWidth={760} onRow={(i) => openDrawer({ kind: "invoice", id: i.id })} empty={<Empty title="No drafts" hint="Prepared invoices wait here for your approval." />} />
      </Card>
    </Page>
  );
}

/* ── Payments and purchases ─────────────────────────────────────────────── */
function PaymentsTab() {
  const s = useFM();
  const rows = s.payments.filter((p) => { const i = sel.invoice(s, p.invoiceId); return i && inDivision(s, i.division); }).sort((a, b) => (a.date < b.date ? 1 : -1));
  const month = rows.filter((p) => periodOf(p.date) === periodOf(TODAY));
  const unpaid = s.invoices.filter((i) => inDivision(s, i.division) && isOutstanding(i)).sort((a, b) => ((a.dueDate || "") < (b.dueDate || "") ? -1 : 1));
  return (
    <Page eyebrow="Finance" title="Payments" sub="Payments received against invoices. Recording a payment updates the invoice, the customer balance and the dashboard straight away.">
      <div className="fm-grid fm-g3">
        <Stat icon="finance" label={"Received in " + monthName(periodOf(TODAY)).split(" ")[0]} value={euro2(month.reduce((a, p) => a + p.amount, 0))} sub={month.length + " payments"} />
        <Stat icon="clock" label="Still to collect" value={euro2(unpaid.reduce((a, i) => a + invoiceBalance(i), 0))} sub={unpaid.length + " invoices"} />
        <Stat icon="alert" label="Overdue" value={String(unpaid.filter(isOverdue).length)} sub="invoices past their due date" tone={unpaid.some(isOverdue) ? "bad" : "ok"} />
      </div>
      <div className="fm-grid fm-g-main">
        <Card title="Payments received" flush>
          <Table cols={[
            { h: "Date", w: "100px", r: (p) => fmtDay(p.date) },
            { h: "Invoice", w: "100px", cls: "mono", r: (p) => <RecLink to={{ kind: "invoice", id: p.invoiceId }}>{sel.invoice(s, p.invoiceId)?.number}</RecLink> },
            { h: "Customer", w: "1fr", r: (p) => custName(s, sel.invoice(s, p.invoiceId)!.customerId) },
            { h: "Method", w: "80px", r: (p) => p.method },
            { h: "Amount", w: "100px", num: true, r: (p) => <b className="fm-ink">{euro2(p.amount)}</b> },
          ] as Col<FMState["payments"][number]>[]} rows={rows.slice(0, 60)} minWidth={560} />
        </Card>
        <Card title="Awaiting payment" flush>
          <Table cols={[
            { h: "Invoice", w: "90px", cls: "mono", r: (i) => i.number },
            { h: "Customer", w: "1fr", r: (i) => custName(s, i.customerId) },
            { h: "Balance", w: "90px", num: true, r: (i) => euro2(invoiceBalance(i)) },
            { h: "", w: "96px", r: (i) => <Btn size="sm" onClick={(e) => { e.stopPropagation(); openModal({ kind: "record-payment", invoiceId: i.id }); }}>Record</Btn> },
          ] as Col<Invoice>[]} rows={unpaid} onRow={(i) => openDrawer({ kind: "invoice", id: i.id })} />
        </Card>
      </div>
    </Page>
  );
}

function PurchasesTab() {
  const s = useFM();
  const rows = s.purchases.filter((p) => inDivision(s, p.division)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const month = rows.filter((p) => periodOf(p.date) === periodOf(TODAY));
  return (
    <Page eyebrow="Finance" title="Purchases" sub="Supplier invoices, matched to jobs where they relate to one. These flow to the accountant workspace each month." actions={<Btn kind="primary" icon="plus" onClick={() => openModal({ kind: "add-purchase" })}>Add purchase</Btn>}>
      <div className="fm-grid fm-g3">
        <Stat icon="box" label={"Purchases in " + monthName(periodOf(TODAY)).split(" ")[0]} value={euro2(month.reduce((a, p) => a + p.net, 0))} sub={"Net, " + month.length + " supplier invoices"} />
        <Stat icon="finance" label="VAT on purchases" value={euro2(month.reduce((a, p) => a + p.vat, 0))} sub="This month" />
        <Stat icon="alert" label="To review" value={String(rows.filter((p) => p.status === "to review").length)} sub="Not yet matched" tone={rows.some((p) => p.status === "to review") ? "warn" : "ok"} />
      </div>
      <Card flush>
        <Table cols={[
          { h: "Date", w: "100px", r: (p) => fmtDay(p.date) },
          { h: "Supplier", w: "1.2fr", cls: "main", r: (p) => p.supplier },
          { h: "Reference", w: "120px", cls: "mono", r: (p) => p.ref },
          { h: "Category", w: "1.5fr", r: (p) => p.category },
          { h: "Job", w: "80px", cls: "mono", r: (p) => (p.jobId ? <RecLink to={{ kind: "job", id: p.jobId }}>{sel.job(s, p.jobId)?.number || p.jobId}</RecLink> : "") },
          { h: "Division", w: "130px", r: (p) => <DivTag id={p.division} /> },
          { h: "Net", w: "92px", num: true, r: (p) => euro2(p.net) },
          { h: "VAT", w: "80px", num: true, r: (p) => euro2(p.vat) },
          { h: "Status", w: "110px", r: (p) => p.status === "matched" ? <Pill tone="ok" dot>Matched</Pill> : <button className="fm-pill warn" style={{ border: 0, cursor: "pointer" }} onClick={() => mutate((st) => ({ purchases: st.purchases.map((x) => (x.id === p.id ? { ...x, status: "matched" } : x)) }), "Purchase " + p.ref + " marked matched", "finance")}>To review, mark matched</button> },
        ] as Col<FMState["purchases"][number]>[]} rows={rows} minWidth={1040} />
      </Card>
    </Page>
  );
}

/* ── Recurring billing ──────────────────────────────────────────────────── */
function RecurringTab() {
  const s = useFM();
  const P = "2026-12";
  const due = contractsDueForBilling(s, P).filter((c) => inDivision(s, c.division) && !s.invoices.some((i) => i.contractId === c.id && i.period === P && i.status !== "cancelled"));
  const dec = s.invoices.filter((i) => i.period === P && i.contractId && inDivision(s, i.division) && i.status !== "cancelled");
  const decDrafts = dec.filter((i) => i.status === "draft");
  const contracts = s.contracts.filter((c) => inDivision(s, c.division) && c.billing !== "per-visit");
  const monthly = s.contracts.filter((c) => c.billing === "monthly" && inDivision(s, c.division));
  const inv = (cid: string, p: string) => s.invoices.find((i) => i.contractId === cid && i.period === p && i.status !== "cancelled");
  return (
    <Page eyebrow="Finance" title="Recurring billing" sub="Contract invoices come from each contract's billing schedule. No more opening last November's invoices and copying them. Service visits on these contracts are never charged a second time per job."
      actions={<>
        <Btn kind="primary" icon="spark" onClick={() => generateRecurringInvoices(P)}>Generate December contract invoices</Btn>
        {decDrafts.length > 0 && <Btn icon="check" onClick={() => approveRecurring(P)}>Approve all {decDrafts.length}</Btn>}
      </>}>
      <div className="fm-grid fm-g3">
        <Stat icon="calendar" label="Due for December" value={String(due.length)} sub={euro(due.reduce((a, c) => a + c.billingAmount, 0)) + " net to bill"} tone={due.length ? "warn" : "ok"} />
        <Stat icon="note" label="December drafts" value={String(decDrafts.length)} sub={euro(decDrafts.reduce((a, i) => a + invoiceNet(i), 0)) + " net waiting for approval"} />
        <Stat icon="check" label="December issued" value={String(dec.filter((i) => i.status !== "draft").length)} sub="Numbered in each division's series" tone="ok" />
      </div>
      <Card title="Contracts due for billing" sub="Active contracts whose billing date has come round and whose period isn't billed yet" flush>
        <Table cols={[
          { h: "Contract", w: "84px", cls: "mono", r: (c) => <RecLink to={{ kind: "contract", id: c.id }}>{c.ref}</RecLink> },
          { h: "Customer and site", w: "1.6fr", r: (c) => <span><span className="fm-ink">{custName(s, c.customerId)}</span>{siteName(s, c.siteId) !== custName(s, c.customerId) && <span className="fm-faint">, {siteName(s, c.siteId)}</span>}</span> },
          { h: "Division", w: "130px", r: (c) => <DivTag id={c.division} /> },
          { h: "Cycle", w: "90px", r: (c) => c.billing.charAt(0).toUpperCase() + c.billing.slice(1) },
          { h: "Last billed", w: "120px", r: (c) => monthName(c.lastBilledPeriod) },
          { h: "Amount", w: "90px", num: true, r: (c) => euro2(c.billingAmount) },
        ] as Col<FMState["contracts"][number]>[]} rows={due} minWidth={760} empty={<Empty title="Nothing left to bill for December" hint="Every contract due this period has a draft or an issued invoice. Running the generator again creates no duplicates." />} />
      </Card>
      {dec.length > 0 && (
        <Card title="December contract invoices" flush action={decDrafts.length ? <Btn size="sm" kind="primary" icon="check" onClick={() => approveRecurring(P)}>Approve all</Btn> : undefined}>
          <Table cols={[
            { h: "Number", w: "100px", cls: "mono", r: (i) => i.number || <Pill>Draft</Pill> },
            { h: "Customer", w: "1.4fr", cls: "main", r: (i) => custName(s, i.customerId) },
            { h: "Line", w: "2fr", r: (i) => i.lines[0]?.description },
            { h: "Gross", w: "100px", num: true, r: (i) => euro2(invoiceGross(i)) },
            { h: "Status", w: "100px", r: (i) => <InvoiceStatusPill s={i.status} /> },
          ] as Col<Invoice>[]} rows={dec} minWidth={760} onRow={(i) => openDrawer({ kind: "invoice", id: i.id })} />
        </Card>
      )}
      <Card title="Monthly contracts, year on year" sub="The November invoices Charlie used to copy by hand, next to this year's and December's" flush>
        <Table cols={[
          { h: "Contract", w: "1.6fr", r: (c) => <span><span className="fm-ink">{custName(s, c.customerId)}</span><span className="fm-faint">, {c.ref}</span></span> },
          { h: "Nov 2025", w: "120px", num: true, r: (c) => { const i = inv(c.id, "2025-11"); return i ? <RecLink to={{ kind: "invoice", id: i.id }}>{euro2(invoiceNet(i))}</RecLink> : "None"; } },
          { h: "Nov 2026", w: "120px", num: true, r: (c) => { const i = inv(c.id, "2026-11"); return i ? <RecLink to={{ kind: "invoice", id: i.id }}>{euro2(invoiceNet(i))}</RecLink> : "None"; } },
          { h: "Dec 2026", w: "140px", num: true, r: (c) => { const i = inv(c.id, P); return i ? <RecLink to={{ kind: "invoice", id: i.id }}>{(i.number || "Draft") + " " + euro2(invoiceNet(i))}</RecLink> : <span className="fm-faint">Not generated</span>; } },
        ] as Col<FMState["contracts"][number]>[]} rows={monthly} minWidth={640} />
      </Card>
      <Card title="All billed contracts" sub={contracts.length + " contracts billed monthly, quarterly or annually"} flush>
        <Table cols={[
          { h: "Contract", w: "84px", cls: "mono", r: (c) => c.ref },
          { h: "Customer", w: "1.4fr", r: (c) => custName(s, c.customerId) },
          { h: "Cycle", w: "90px", r: (c) => c.billing },
          { h: "Next billing", w: "110px", r: (c) => fmtDay(c.nextBillingDate) },
          { h: "Last billed", w: "120px", r: (c) => monthName(c.lastBilledPeriod) },
          { h: "Annual value", w: "110px", num: true, r: (c) => euro(c.annualValue) },
        ] as Col<FMState["contracts"][number]>[]} rows={contracts} minWidth={680} onRow={(c) => openDrawer({ kind: "contract", id: c.id })} />
      </Card>
    </Page>
  );
}

/* ── Accountant workspace ───────────────────────────────────────────────── */
function AccountantTab() {
  const s = useFM();
  const periods = Array.from(new Set(s.invoices.filter((i) => i.issueDate).map((i) => periodOf(i.issueDate!)).concat(s.purchases.map((p) => periodOf(p.date))))).sort().reverse().slice(0, 14);
  const [p, setP] = useState(periodOf(TODAY));
  const [div, setDiv] = useState<"ALL" | DivisionId>("ALL");
  const inD = (d: DivisionId) => div === "ALL" || d === div;
  const sales = s.invoices.filter((i) => i.issueDate && periodOf(i.issueDate) === p && inD(i.division) && i.status !== "draft");
  const purchases = s.purchases.filter((x) => periodOf(x.date) === p && inD(x.division));
  const payments = s.payments.filter((x) => periodOf(x.date) === p && inD(sel.invoice(s, x.invoiceId)!.division));
  const approved = s.time.filter((t) => t.approved && periodOf(t.date) === p && (div === "ALL" || sel.engineer(s, t.engineerId)!.divisions.includes(div)));
  const pending = s.time.filter((t) => !t.approved && periodOf(t.date) === p).length;
  const byEng = s.engineers.map((e) => {
    const list = approved.filter((t) => t.engineerId === e.id);
    const k = (kind: string) => list.filter((t) => t.kind === kind).reduce((a, t) => a + t.hours, 0);
    return { e, billable: k("billable"), non: k("non-billable"), travel: k("travel"), overtime: k("overtime"), total: list.reduce((a, t) => a + t.hours, 0) };
  }).filter((r) => r.total > 0);
  const docs = s.documents.filter((d) => d.kind === "Invoice PDF" && periodOf(d.date) === p && sales.some((i) => i.number && d.name.startsWith(i.number)));
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  return (
    <Page eyebrow="Accountant workspace" title="Monthly records for the accountant" noDivision
      sub={s.role === "accountant" ? "Restricted view for Fiona Brennan: sales, purchases, payments, approved timesheets and supporting documents. No job, site or access details." : "What the accountant sees. Shared without anyone compiling it by hand each month."}
      actions={<Btn kind="primary" icon="download" onClick={() => exportForAccountant(p, div)}>Export {monthName(p)}</Btn>}>
      <div className="fm-row" style={{ flexWrap: "wrap", gap: 10 }}>
        <select className="fm-select" style={{ width: 180 }} value={p} onChange={(e) => setP(e.target.value)} aria-label="Month">
          {periods.map((x) => <option key={x} value={x}>{monthName(x)}</option>)}
        </select>
        <Seg value={div} options={[["ALL", "All divisions"], ...DIVISIONS.map((d) => [d.id, d.short] as [DivisionId, string])]} onChange={setDiv} />
      </div>
      <div className="fm-grid fm-g4">
        <Stat icon="finance" label="Sales (net)" value={euro2(sum(sales.map(invoiceNet)))} sub={sales.length + " invoices, VAT " + euro2(sum(sales.map((i) => invoiceGross(i) - invoiceNet(i))))} />
        <Stat icon="box" label="Purchases (net)" value={euro2(sum(purchases.map((x) => x.net)))} sub={purchases.length + " supplier invoices, VAT " + euro2(sum(purchases.map((x) => x.vat)))} />
        <Stat icon="check" label="Payments received" value={euro2(sum(payments.map((x) => x.amount)))} sub={payments.length + " payments"} />
        <Stat icon="clock" label="Approved hours" value={sum(approved.map((t) => t.hours)) + " h"} sub={pending ? pending + " entries still awaiting approval" : "All entries approved"} tone={pending ? "warn" : undefined} />
      </div>
      <Card title="Invoice series" sub="Each trading division numbers its own invoices. Prefixes are set in Settings.">
        <div className="fm-grid fm-g3">
          {DIVISIONS.map((d) => (
            <div key={d.id} className="fm-note">
              <DivTag id={d.id} long />
              <div className="fm-mono fm-ink" style={{ fontSize: 15, marginTop: 8 }}>{s.prefixes[d.id]}-{String(s.counters.invoice[d.id]).padStart(4, "0")}</div>
              <div className="fm-faint" style={{ fontSize: 11.5, marginTop: 2 }}>Next number</div>
            </div>
          ))}
        </div>
      </Card>
      <Card title={"Sales invoices, " + monthName(p)} flush>
        <Table cols={[
          { h: "Number", w: "100px", cls: "mono", r: (i) => i.number },
          { h: "Date", w: "100px", r: (i) => fmtDay(i.issueDate) },
          { h: "Customer", w: "1.4fr", r: (i) => custName(s, i.customerId) },
          { h: "Division", w: "130px", r: (i) => <DivTag id={i.division} /> },
          { h: "Net", w: "92px", num: true, r: (i) => euro2(invoiceNet(i)) },
          { h: "VAT", w: "80px", num: true, r: (i) => euro2(invoiceGross(i) - invoiceNet(i)) },
          { h: "Gross", w: "92px", num: true, r: (i) => euro2(invoiceGross(i)) },
          { h: "Status", w: "100px", r: (i) => <InvoiceStatusPill s={shownStatus(i)} /> },
        ] as Col<Invoice>[]} rows={sales} minWidth={880} onRow={(i) => openDrawer({ kind: "invoice", id: i.id })} empty={<Empty title="No sales invoices this month" />} />
      </Card>
      <div className="fm-grid fm-g2">
        <Card title={"Purchase invoices, " + monthName(p)} flush>
          <Table cols={[
            { h: "Date", w: "90px", r: (x) => fmtDate(x.date) },
            { h: "Supplier", w: "1fr", r: (x) => x.supplier },
            { h: "Net", w: "90px", num: true, r: (x) => euro2(x.net) },
            { h: "VAT", w: "80px", num: true, r: (x) => euro2(x.vat) },
          ] as Col<FMState["purchases"][number]>[]} rows={purchases} empty={<Empty title="No purchases this month" />} />
        </Card>
        <Card title={"Payments, " + monthName(p)} flush>
          <Table cols={[
            { h: "Date", w: "90px", r: (x) => fmtDate(x.date) },
            { h: "Invoice", w: "100px", cls: "mono", r: (x) => sel.invoice(s, x.invoiceId)?.number },
            { h: "Method", w: "70px", r: (x) => x.method },
            { h: "Amount", w: "1fr", num: true, r: (x) => euro2(x.amount) },
          ] as Col<FMState["payments"][number]>[]} rows={payments} empty={<Empty title="No payments this month" />} />
        </Card>
      </div>
      <Card title="Approved timesheet summary" sub="Approved entries only. Hours worked are not all chargeable: billable, non-billable, travel and overtime are kept apart." flush>
        <Table cols={[
          { h: "Engineer", w: "1.3fr", cls: "main", r: (r) => r.e.name },
          { h: "Billable", w: "90px", num: true, r: (r) => r.billable + " h" },
          { h: "Non-billable", w: "100px", num: true, r: (r) => r.non + " h" },
          { h: "Travel", w: "80px", num: true, r: (r) => r.travel + " h" },
          { h: "Overtime", w: "90px", num: true, r: (r) => r.overtime + " h" },
          { h: "Total", w: "80px", num: true, r: (r) => <b className="fm-ink">{r.total} h</b> },
        ] as Col<(typeof byEng)[number]>[]} rows={byEng} minWidth={600} empty={<Empty title="No approved hours this month" hint="Hours appear here once they're approved in Engineers, Timesheets." />} />
      </Card>
      <Card title="Supporting documents" sub="Invoice PDFs issued this month" flush>
        <Table cols={[
          { h: "Document", w: "1.5fr", cls: "main", r: (d) => <span className="fm-row"><Ico d="quote" size={13} />{d.name}</span> },
          { h: "Customer", w: "1.2fr", r: (d) => custName(s, d.customerId) },
          { h: "Date", w: "100px", r: (d) => fmtDay(d.date) },
        ] as Col<FMState["documents"][number]>[]} rows={docs} empty={<Empty title="No documents this month" />} />
      </Card>
    </Page>
  );
}

/* ── Invoice drawer and document ────────────────────────────────────────── */
export function InvoiceDocument({ inv, docRef }: { inv: Invoice; docRef?: React.Ref<HTMLDivElement> }) {
  const s = useFM();
  const d = divisionById(inv.division);
  const c = sel.customer(s, inv.customerId);
  const site = sel.site(s, inv.siteId);
  const contact = c ? sel.primaryContact(s, c.id) : undefined;
  const net = invoiceNet(inv), gross = invoiceGross(inv);
  const job = inv.jobId ? sel.job(s, inv.jobId) : undefined;
  return (
    <div className="fm-doc" ref={docRef} style={{ position: "relative" }}>
      {inv.status === "draft" && <div className="fin-draftmark">DRAFT</div>}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div className="brand">
          <div className="mark" style={{ background: d.color }}>{d.prefix}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
            <div className="muted" style={{ fontSize: 11 }}>Part of {COMPANY.umbrellaName}</div>
            <div className="muted" style={{ fontSize: 11 }}>{COMPANY.address}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <h1>Invoice</h1>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, marginTop: 4 }}>{inv.number || "Number assigned on approval"}</div>
          <div className="muted" style={{ fontSize: 11.5 }}>Date: {inv.issueDate ? fmtDay(inv.issueDate) : "On approval"}</div>
          <div className="muted" style={{ fontSize: 11.5 }}>Due: {inv.dueDate ? fmtDay(inv.dueDate) : (c?.paymentTerms || 30) + " days from issue"}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 24 }}>
        <div>
          <div className="muted" style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase" }}>Bill to</div>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{c?.name}</div>
          {contact && <div>{contact.name}</div>}
          <div className="muted">{c?.accountsEmail}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase" }}>Site</div>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{site?.name}</div>
          <div className="muted">{site?.address}, {site?.town}</div>
          {inv.woRef && <div style={{ marginTop: 4 }}>Your work order: <b>{inv.woRef}</b></div>}
          {job && <div className="muted">Our job: {job.number}</div>}
          {inv.period && <div className="muted">Period: {monthName(inv.period)}</div>}
        </div>
      </div>
      <table>
        <thead><tr><th>Description</th><th className="r">Qty</th><th className="r">Unit</th><th className="r">Amount</th></tr></thead>
        <tbody>
          {inv.lines.map((l, i) => (
            <tr key={i}><td>{l.description}</td><td className="r">{l.qty}</td><td className="r">{euro2(l.unitPrice)}</td><td className="r">{euro2(l.qty * l.unitPrice)}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="tot">
        <table>
          <tbody>
            <tr><td>Net</td><td className="r">{euro2(net)}</td></tr>
            <tr><td>VAT at {Math.round(inv.vatRate * 1000) / 10}%</td><td className="r">{euro2(gross - net)}</td></tr>
            <tr><td><b>Total</b></td><td className="r"><b>{euro2(gross)}</b></td></tr>
            {inv.paid > 0 && <tr><td>Paid</td><td className="r">{euro2(inv.paid)}</td></tr>}
            {inv.paid > 0 && <tr><td><b>Balance due</b></td><td className="r"><b>{euro2(invoiceBalance(inv))}</b></td></tr>}
          </tbody>
        </table>
      </div>
      <h2>Payment</h2>
      <div>Payment terms: {c?.paymentTerms || 30} days. Please quote {inv.number || "the invoice number"} with your payment.</div>
      <div className="muted">Bank details as on file with your accounts department.</div>
      <div className="muted" style={{ marginTop: 20, fontSize: 10.5 }}>{d.name}, trading division of {COMPANY.umbrellaName}. {COMPANY.phone}, {COMPANY.email}</div>
    </div>
  );
}

export function InvoiceDrawer({ id }: { id: string }) {
  const s = useFM();
  const inv = sel.invoice(s, id);
  const ref = useRef<HTMLDivElement>(null);
  if (!inv) return <><DrawerHead eyebrow="Invoice" title="Not found" /><div className="fm-drawer-b"><Empty title="This invoice no longer exists" hint="A discarded draft is removed completely." /></div></>;
  const st = shownStatus(inv);
  const d = divisionById(inv.division);
  const nextNo = s.prefixes[inv.division] + "-" + String(s.counters.invoice[inv.division]).padStart(4, "0");
  const canSee = s.role === "owner" || s.role === "accountant";
  if (!canSee) return <><DrawerHead eyebrow="Invoice" title={inv.number || "Draft"} /><div className="fm-drawer-b"><div className="fm-lock"><Ico d="lock" size={13} /> Financial details are hidden for this role.</div></div></>;
  return (
    <>
      <DrawerHead eyebrow={"Invoice · " + d.name} title={inv.number || "Draft invoice"} pills={<InvoiceStatusPill s={st} />}
        sub={custName(s, inv.customerId) + ", " + siteName(s, inv.siteId) + (inv.jobId ? " · " + sel.job(s, inv.jobId)?.number : "")} />
      <div className="fm-drawer-b">
        {inv.status === "draft" && (
          <div className="fm-note accent">
            This is a draft and has no number yet. Approving it assigns <b className="fm-mono">{nextNo}</b>, the next number in the {d.name} series, and emails it to {sel.customer(s, inv.customerId)?.accountsEmail} (simulated).
          </div>
        )}
        {isOverdue(inv) && <div className="fm-note bad">Overdue by {diffDays(TODAY, inv.dueDate!)} days. {euro2(invoiceBalance(inv))} outstanding.</div>}
        <div className="fm-kv">
          <div><div className="k">Net</div><div className="v">{euro2(invoiceNet(inv))}</div></div>
          <div><div className="k">Total</div><div className="v">{euro2(invoiceGross(inv))}</div></div>
          <div><div className="k">Balance</div><div className="v">{inv.status === "draft" || inv.status === "cancelled" ? "n/a" : euro2(invoiceBalance(inv))}</div></div>
          <div>
            <div className="k">VAT</div>
            {inv.status === "draft" ? (
              <select className="fm-select" style={{ height: 28, marginTop: 4, fontSize: 12 }} value={String(inv.vatRate)} onChange={(e) => updateInvoice(inv.id, { vatRate: Number(e.target.value) })} aria-label="VAT rate">
                {COMPANY.vatOptions.map((o) => <option key={o.id} value={String(o.rate)}>{o.label}</option>)}
              </select>
            ) : <div className="v">{Math.round(inv.vatRate * 1000) / 10}%</div>}
          </div>
        </div>
        <div style={{ flex: "none", background: "var(--surface-faint)", borderRadius: 12, padding: 14, border: "1px solid var(--border)", overflowX: "auto" }}>
          <InvoiceDocument inv={inv} docRef={ref} />
        </div>
        {inv.jobId && (
          <div className="fm-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Btn size="sm" icon="jobs" onClick={() => openDrawer({ kind: "job", id: inv.jobId! })}>Open job {sel.job(s, inv.jobId)?.number}</Btn>
            <Btn size="sm" icon="customers" onClick={() => openDrawer({ kind: "customer", id: inv.customerId })}>Open customer</Btn>
          </div>
        )}
        <div className="fm-sec">History</div>
        <div className="fm-timeline">
          {inv.history.slice().reverse().map((h, i) => (
            <div className="fm-tl" key={i}><i /><div><div className="t">{h.text}</div><div className="m">{h.at} · {h.who}</div></div></div>
          ))}
        </div>
        {s.payments.some((p) => p.invoiceId === inv.id) && (
          <>
            <div className="fm-sec">Payments</div>
            {s.payments.filter((p) => p.invoiceId === inv.id).map((p) => (
              <div key={p.id} className="fm-row" style={{ fontSize: 13, justifyContent: "space-between" }}><span>{fmtDay(p.date)} · {p.method}</span><b className="fm-ink">{euro2(p.amount)}</b></div>
            ))}
          </>
        )}
      </div>
      <div className="fm-drawer-f">
        {inv.status === "draft" && <Btn kind="primary" icon="check" onClick={() => approveInvoice(inv.id)}>Approve and issue as {nextNo}</Btn>}
        {isOutstanding(inv) && <Btn kind="primary" icon="finance" onClick={() => openModal({ kind: "record-payment", invoiceId: inv.id })}>Record payment</Btn>}
        <Btn icon="print" onClick={() => printElement(ref.current, inv.number || "Draft invoice")}>Print or save PDF</Btn>
        <span className="fm-spacer" />
        {inv.status === "draft" && <Btn kind="danger" onClick={() => cancelInvoice(inv.id)}>Discard draft</Btn>}
        {(inv.status === "issued" || inv.status === "overdue") && inv.paid === 0 && <Btn kind="danger" onClick={() => cancelInvoice(inv.id)}>Cancel invoice</Btn>}
      </div>
    </>
  );
}

/* ── Modals ─────────────────────────────────────────────────────────────── */
export function FinanceModals() {
  const s = useFM();
  const m = s.ui.modal;
  if (!m) return null;
  if (m.kind === "record-payment") return <PaymentModal invoiceId={m.invoiceId} />;
  if (m.kind === "add-purchase") return <PurchaseModal />;
  return null;
}

function PaymentModal({ invoiceId }: { invoiceId: string }) {
  const s = useFM();
  const inv = sel.invoice(s, invoiceId)!;
  const bal = invoiceBalance(inv);
  const [amt, setAmt] = useState(String(bal));
  const [method, setMethod] = useState<"EFT" | "Cheque" | "Card">("EFT");
  const n = Number(amt);
  const ok = n > 0 && n <= bal + 0.005;
  return (
    <Modal title={"Record payment against " + inv.number} sub={custName(s, inv.customerId) + ", balance " + euro2(bal)} onClose={closeModal}
      footer={<><Btn onClick={closeModal}>Cancel</Btn><Btn kind="primary" disabled={!ok} onClick={() => { recordPayment(inv.id, Math.round(n * 100) / 100, method); closeModal(); }}>Record {ok ? euro2(n) : ""}</Btn></>}>
      <Field label="Amount received" hint={n > bal + 0.005 ? "More than the balance due" : n < bal - 0.005 && n > 0 ? "Part payment. The invoice stays open for the rest." : undefined}>
        <input className="fm-input" type="number" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} autoFocus />
      </Field>
      <Field label="Method">
        <Seg value={method} options={[["EFT", "Bank transfer"], ["Cheque", "Cheque"], ["Card", "Card"]]} onChange={setMethod} />
      </Field>
    </Modal>
  );
}

function PurchaseModal() {
  const s = useFM();
  const [f, setF] = useState({ supplier: "", ref: "", date: TODAY, net: "", division: "LFL" as DivisionId, category: "", jobId: "" });
  const up = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const net = Number(f.net);
  const ok = f.supplier.trim() && f.ref.trim() && net > 0;
  const save = () => {
    mutate((st) => ({ purchases: [{ id: newId("pu"), supplier: f.supplier.trim(), ref: f.ref.trim(), date: f.date, net, vat: Math.round(net * 0.23 * 100) / 100, division: f.division, category: f.category.trim() || "General", jobId: f.jobId || undefined, status: f.jobId ? "matched" : "to review" }, ...st.purchases] }), "Purchase " + f.ref + " from " + f.supplier + " added", "finance");
    toast("Purchase added");
    closeModal();
  };
  return (
    <Modal title="Add purchase invoice" sub="Supplier invoices feed the accountant workspace for the month." onClose={closeModal}
      footer={<><Btn onClick={closeModal}>Cancel</Btn><Btn kind="primary" disabled={!ok} onClick={save}>Add purchase</Btn></>}>
      <div className="fm-grid fm-g2">
        <Field label="Supplier"><input className="fm-input" value={f.supplier} onChange={(e) => up("supplier", e.target.value)} autoFocus /></Field>
        <Field label="Supplier reference"><input className="fm-input" value={f.ref} onChange={(e) => up("ref", e.target.value)} /></Field>
        <Field label="Date"><input className="fm-input" type="date" value={f.date} max={addDays(TODAY, 0)} onChange={(e) => up("date", e.target.value)} /></Field>
        <Field label="Net amount" hint={net > 0 ? "VAT at 23%: " + euro2(net * 0.23) : undefined}><input className="fm-input" type="number" step="0.01" value={f.net} onChange={(e) => up("net", e.target.value)} /></Field>
        <Field label="Division">
          <select className="fm-select" value={f.division} onChange={(e) => up("division", e.target.value)}>{DIVISIONS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        </Field>
        <Field label="Job (optional)">
          <select className="fm-select" value={f.jobId} onChange={(e) => up("jobId", e.target.value)}>
            <option value="">Not linked to a job</option>
            {s.jobs.filter((j) => j.status !== "invoiced").map((j) => <option key={j.id} value={j.id}>{j.number} {siteName(s, j.siteId)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="What was bought"><input className="fm-input" value={f.category} onChange={(e) => up("category", e.target.value)} placeholder="For example, detector stock" /></Field>
    </Modal>
  );
}

