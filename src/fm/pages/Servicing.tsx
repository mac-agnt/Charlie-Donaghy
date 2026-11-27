/* Servicing and planned preventative maintenance. Recurring contracts are
   planned and billed here, never treated as ordinary one-off jobs. */
import { useMemo, useRef, useState } from "react";
import {
  useFM, sel, inDivision, metrics, dueVisits, generateServicePlan, approveServicePlan, updateServiceVisit, completeServiceVisit,
  checklistTemplate, createQuote, openDrawer, openModal, closeModal, go, mutate, toast, euro, invoiceGross,
} from "../store";
import { TODAY, addDays, addMonths, addWorkingDays, diffDays, fmtDate, fmtDay, monthName, period as periodOf, weekStart } from "../dates";
import { divisionById, COMPANY } from "../config";
import { Page, Card, Stat, Table, Btn, Pill, Avatars, Avatar, Money, Modal, Field, RecLink, Steps, Seg, Ico, DivTag, Empty, InvoiceStatusPill, photoBg } from "../ui";
import { DrawerHead } from "../FMLayer";
import { qualifiedFor, suggestEngineers, allocateServiceVisit, printEl } from "./service/shared";
import type { AssetType, ChecklistItem, FMState, ServiceContract, ServiceVisit } from "../types";

const svStatusPill = (s: FMState, v: ServiceVisit) => {
  if (v.status === "completed") return <Pill tone="ok" dot>Completed</Pill>;
  if (!v.engineerId) return <Pill tone="bad" dot>Needs allocation</Pill>;
  if (v.date < TODAY) return <Pill tone="bad" dot>Overdue</Pill>;
  if (v.status === "proposed") return <Pill tone="accent" dot>Proposed</Pill>;
  return <Pill tone="info" dot>Scheduled</Pill>;
};
const contractOf = (s: FMState, v: ServiceVisit) => sel.contract(s, v.contractId)!;
const visitsIn = (s: FMState) => s.serviceVisits.filter((v) => inDivision(s, contractOf(s, v).division));
const nextDueOf = (c: ServiceContract) => c.schedule.map((l) => l.nextDue).sort()[0];
const freqLabel = (m: number) => (m === 1 ? "monthly" : m === 3 ? "quarterly" : m === 6 ? "six-monthly" : m === 12 ? "annual" : "every " + m + " months");

export default function ServicingPage({ tab }: { tab: string }) {
  switch (tab) {
    case "planner": return <Planner />;
    case "contracts": return <Contracts />;
    case "assets": return <AssetRegister />;
    case "reports": return <Reports />;
    case "due": return <UpcomingOverdue />;
    default: return <Overview />;
  }
}

/* ── Overview ───────────────────────────────────────────────────────────── */
function Overview() {
  const s = useFM();
  const m = metrics(s);
  const contracts = s.contracts.filter((c) => inDivision(s, c.division) && c.status !== "paused");
  const visits = visitsIn(s);
  const doneThisMonth = visits.filter((v) => v.status === "completed" && periodOf(v.date) === periodOf(TODAY));
  const defects = visits.filter((v) => v.status === "completed" && v.defects.length).flatMap((v) => v.defects.map((d) => ({ v, d })));
  const renewals = contracts.filter((c) => c.status === "renewal due" || diffDays(c.renewalDate, TODAY) <= 90);
  const next = visits.filter((v) => v.status !== "completed").sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 8);
  const decUnplanned = dueVisits(s, "2026-12").filter((d) => !d.existing && inDivision(s, d.contract.division));
  return (
    <Page eyebrow="Servicing & PPM" title="Service overview" sub="Recurring service contracts, planned visits and defects. Contract visits are planned and billed from here, separately from one-off jobs."
      actions={<Btn kind="primary" icon="spark" onClick={() => go("Servicing", "planner")}>Monthly planner</Btn>}>
      <div className="fm-grid fm-g4">
        <Stat label="Active contracts" value={contracts.length} sub={renewals.length + " renewal" + (renewals.length === 1 ? "" : "s") + " due within 90 days"} onClick={() => go("Servicing", "contracts")} icon="service" />
        <Stat label="Annual contract value" value={<Money v={m.contractValue} />} sub="Across active service contracts" onClick={() => go("Servicing", "contracts")} />
        <Stat label="Visits completed this month" value={doneThisMonth.length} sub={"On time: " + m.svOnTimePct + "%"} tone="ok" onClick={() => go("Servicing", "reports")} />
        <Stat label="Upcoming, next 21 days" value={m.upcoming.length} sub={decUnplanned.length ? decUnplanned.length + " December visits not yet planned" : "December fully planned"} onClick={() => go("Servicing", "due")} />
        <Stat label="Need allocation" value={m.unallocatedService.length} tone={m.unallocatedService.length ? "warn" : undefined} sub="Visits with no engineer" onClick={() => go("Servicing", "due")} />
        <Stat label="Open defects" value={defects.length} tone={defects.length ? "bad" : undefined} sub="Found on service visits" onClick={() => go("Servicing", "reports")} />
        <Stat label="December plan" value={decUnplanned.length ? "Not planned" : "Planned"} tone={decUnplanned.length ? "warn" : "ok"} sub={dueVisits(s, "2026-12").length + " visits due"} onClick={() => go("Servicing", "planner")} />
        <Stat label="Renewals due" value={renewals.length} sub={renewals.map((c) => sel.customer(s, c.customerId)!.name.split(" ")[0]).join(", ") || "None"} onClick={() => go("Servicing", "contracts")} />
      </div>
      <div className="fm-grid fm-g-main">
        <Card title="Next service visits" sub="Click a visit to open its checklist" flush action={<Btn size="sm" kind="ghost" onClick={() => go("Servicing", "due")}>All upcoming</Btn>}>
          <Table
            rows={next}
            onRow={(v) => openDrawer({ kind: "serviceVisit", id: v.id })}
            cols={[
              { h: "Date", w: "90px", r: (v) => <span className={v.date < TODAY ? "fm-ink" : ""}>{fmtDate(v.date)}</span> },
              { h: "Site", w: "1.4fr", cls: "main", r: (v) => sel.site(s, v.siteId)!.name },
              { h: "Services", w: "1.2fr", r: (v) => v.services.join(", ") },
              { h: "Engineer", w: "90px", r: (v) => <Avatars ids={v.engineerId ? [v.engineerId] : []} size={22} /> },
              { h: "Status", w: "130px", r: (v) => svStatusPill(s, v) },
            ]}
            empty={<Empty title="No visits booked" hint="Generate next month's plan to book visits." />}
          />
          {decUnplanned.length > 0 && (
            <div style={{ padding: "12px 16px" }}>
              <div className="fm-note warn fm-row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                <span>{decUnplanned.length} visits are due in December and not planned yet.</span>
                <Btn size="sm" kind="primary" onClick={() => go("Servicing", "planner")}>Plan December</Btn>
              </div>
            </div>
          )}
        </Card>
        <Card title="Defects needing remedial work" sub="Raised from completed service visits">
          {defects.length === 0 && <Empty title="No open defects" hint="Defects recorded on a service visit appear here." />}
          <div className="fm-col-flex">
            {defects.map(({ v, d }, i) => (
              <div key={i} className="fm-note" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="fm-row"><Pill tone="bad">Defect</Pill><span className="fm-faint" style={{ fontSize: 12 }}>{fmtDate(v.date)}, {sel.site(s, v.siteId)!.name}</span></div>
                <div className="fm-ink">{d}</div>
                <div className="fm-row">
                  <Btn size="sm" onClick={() => openDrawer({ kind: "serviceVisit", id: v.id })}>Open visit</Btn>
                  <Btn size="sm" kind="ghost" icon="quote" onClick={() => raiseRemedialQuote(s, v, [d])}>Raise remedial quote</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}

function raiseRemedialQuote(s: FMState, v: ServiceVisit, defects: string[]) {
  const c = contractOf(s, v);
  const q = createQuote({ customerId: c.customerId, siteId: v.siteId, division: c.division, title: "Remedial works: " + defects[0].toLowerCase(), requirements: "Defects found on the service visit of " + fmtDay(v.date) + ": " + defects.join("; ") + "." });
  toast(q.number + " started from the defect");
  openDrawer({ kind: "quote", id: q.id });
}

/* ── Monthly planner ────────────────────────────────────────────────────── */
const PERIODS: [string, string][] = [["2026-11", "November 2026"], ["2026-12", "December 2026"], ["2027-01", "January 2027"]];

function Planner() {
  const s = useFM();
  const [p, setP] = useState("2026-12");
  const [steps, setSteps] = useState<{ label: string; detail: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const due = dueVisits(s, p).filter((d) => inDivision(s, d.contract.division));
  const planned = visitsIn(s).filter((v) => v.period === p).sort((a, b) => (a.date < b.date ? -1 : 1));
  const proposed = planned.filter((v) => v.status === "proposed");
  const notPlanned = due.filter((d) => !d.existing);
  const label = monthName(p).split(" ")[0];

  const generate = () => {
    if (running) return;
    setSteps([]);
    setResult(null);
    setRunning(true);
    const r = generateServicePlan(p);
    r.steps.forEach((st, i) => setTimeout(() => setSteps((x) => [...x, st]), 450 * (i + 1)));
    setTimeout(() => {
      setRunning(false);
      setResult({ created: r.created.length, skipped: r.skipped });
      if (!r.created.length) toast("Nothing new to plan. " + r.skipped + " visits already planned, duplicates skipped", "info");
    }, 450 * (r.steps.length + 1));
  };
  type Row = { key: string; v?: ServiceVisit; due?: (typeof due)[number] };
  const rows: Row[] = [...planned.map((v) => ({ key: v.id, v })), ...notPlanned.map((d) => ({ key: "due" + d.contract.id, due: d }))];
  const contractFor = (r: Row) => (r.v ? contractOf(s, r.v) : r.due!.contract);

  return (
    <Page eyebrow="Servicing & PPM" title="Monthly service planner" sub="Each contract has its own schedule per asset. The planner builds the month's visits, matches engineers by skill and availability and groups nearby sites. Nothing is booked until you approve it."
      actions={<Seg value={p} options={PERIODS.map(([k, l]) => [k, l.split(" ")[0]] as [string, string])} onChange={(v) => { setP(v); setSteps([]); setResult(null); }} />}>
      <Card>
        <div className="fm-row" style={{ flexWrap: "wrap", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="fm-card-t">{monthName(p)}</div>
            <div className="fm-card-s" style={{ marginTop: 4 }}>
              {due.length} visit{due.length === 1 ? "" : "s"} due from active contracts. {planned.length} planned, {proposed.length} awaiting approval, {notPlanned.length} not yet planned.
            </div>
          </div>
          <Btn kind="primary" size="lg" icon="spark" onClick={generate} disabled={running}>{running ? "Generating…" : "Generate " + label + " service plan"}</Btn>
          {proposed.length > 0 && !running && (
            <Btn size="lg" icon="check" onClick={() => approveServicePlan(p)}>Approve plan ({proposed.length})</Btn>
          )}
        </div>
        {(steps.length > 0 || running) && (
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 12 }}>
            <Steps steps={steps} running={running} />
            {result && (
              result.created
                ? <div className="fm-note accent">{result.created} visits proposed{result.skipped ? ", " + result.skipped + " already planned and skipped" : ""}. Review engineers and dates below, then approve to put them on the calendar and in engineers' apps.</div>
                : <div className="fm-note warn">Nothing new to plan. {result.skipped} visit{result.skipped === 1 ? " is" : "s are"} already planned for {monthName(p)}, so no duplicate visits, jobs or invoices were created.</div>
            )}
          </div>
        )}
      </Card>
      <Card title={"Visits for " + monthName(p)} sub="Change the engineer or date on a proposed visit before approving" flush
        action={planned.some((v) => v.status === "scheduled") ? <Btn size="sm" kind="ghost" icon="calendar" onClick={() => go("Schedule", "company", { schedWeek: weekStart(planned.find((v) => v.status === "scheduled")!.date), schedView: "week" })}>Show on calendar</Btn> : undefined}>
        <Table<Row>
          rows={rows}
          minWidth={1100}
          onRow={(r) => (r.v ? openDrawer({ kind: "serviceVisit", id: r.v.id }) : openDrawer({ kind: "contract", id: r.due!.contract.id }))}
          cols={[
            { h: "Customer and site", w: "1.5fr", r: (r) => { const c = contractFor(r); return <div style={{ minWidth: 0 }}><div className="fm-ink fm-trunc" style={{ fontWeight: 500 }}>{sel.site(s, c.siteId)!.name}</div><div className="fm-faint fm-trunc" style={{ fontSize: 11.5 }}>{sel.customer(s, c.customerId)!.name}</div></div>; } },
            { h: "Services", w: "1.2fr", r: (r) => (r.v ? r.v.services : r.due!.services).join(", ") },
            { h: "Date", w: "150px", r: (r) => (r.v && r.v.status === "proposed" ? <input className="fm-input" type="date" value={r.v.date} onClick={(e) => e.stopPropagation()} onChange={(e) => e.target.value && updateServiceVisit(r.v!.id, { date: e.target.value })} style={{ height: 30 }} /> : fmtDate(r.v ? r.v.date : r.due!.date)) },
            { h: "Engineer", w: "170px", r: (r) => (r.v && r.v.status === "proposed"
              ? <select className="fm-select" value={r.v.engineerId || ""} onClick={(e) => e.stopPropagation()} onChange={(e) => updateServiceVisit(r.v!.id, { engineerId: e.target.value || null })} style={{ height: 30 }}>
                  <option value="">Unallocated</option>
                  {qualifiedFor(s, r.v.services).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              : r.v ? <span className="fm-row" style={{ gap: 7 }}><Avatars ids={r.v.engineerId ? [r.v.engineerId] : []} size={22} />{r.v.engineerId ? sel.engineer(s, r.v.engineerId)!.name.split(" ")[0] : ""}</span> : <span className="fm-faint">Not planned</span>) },
            { h: "Est.", w: "60px", num: true, r: (r) => (r.v ? r.v.estHours : r.due!.hours) + " h" },
            { h: "Access", w: "1.3fr", r: (r) => <span className="fm-muted" title={contractFor(r).accessRequirements}>{contractFor(r).accessRequirements}</span> },
            { h: "Status", w: "170px", r: (r) => (r.v ? <span className="fm-row" style={{ gap: 6 }}>{svStatusPill(s, r.v)}{r.v.groupedWith && <Pill tone="info">Grouped</Pill>}</span> : <Pill tone="warn" dot>Due, not planned</Pill>) },
            { h: "Defects", w: "70px", num: true, r: (r) => (r.v && r.v.defects.length ? <span style={{ color: "var(--bad)" }}>{r.v.defects.length}</span> : <span className="fm-faint">0</span>) },
          ]}
          empty={<Empty title={"Nothing due in " + monthName(p)} hint="No contract lines fall due this month." />}
        />
      </Card>
    </Page>
  );
}

/* ── Contracts ──────────────────────────────────────────────────────────── */
function Contracts() {
  const s = useFM();
  const list = s.contracts.filter((c) => inDivision(s, c.division));
  return (
    <Page eyebrow="Servicing & PPM" title="Service contracts" sub="Every contract sets its own frequency per asset type and its own billing cycle. Contract-billed visits are never charged again as jobs.">
      <Card flush>
        <Table
          rows={list}
          minWidth={1200}
          onRow={(c) => openDrawer({ kind: "contract", id: c.id })}
          cols={[
            { h: "Ref", w: "80px", cls: "mono", r: (c) => c.ref },
            { h: "Customer and site", w: "1.6fr", r: (c) => <div style={{ minWidth: 0 }}><div className="fm-ink fm-trunc" style={{ fontWeight: 500 }}>{sel.customer(s, c.customerId)!.name}</div><div className="fm-faint fm-trunc" style={{ fontSize: 11.5 }}>{sel.site(s, c.siteId)!.name}</div></div> },
            { h: "Division", w: "120px", r: (c) => <DivTag id={c.division} /> },
            { h: "Services and frequency", w: "1.8fr", r: (c) => c.schedule.map((l) => l.type + " (" + freqLabel(l.everyMonths) + ")").join(", ") },
            { h: "Billing", w: "90px", r: (c) => c.billing },
            { h: "Amount", w: "90px", num: true, r: (c) => <Money v={c.billingAmount} /> },
            { h: "Annual", w: "90px", num: true, r: (c) => <Money v={c.annualValue} /> },
            { h: "Next visit", w: "90px", r: (c) => fmtDate(nextDueOf(c)) },
            { h: "Renewal", w: "100px", r: (c) => fmtDay(c.renewalDate) },
            { h: "Status", w: "110px", r: (c) => <Pill tone={c.status === "active" ? "ok" : c.status === "renewal due" ? "warn" : ""} dot>{c.status}</Pill> },
          ]}
        />
      </Card>
    </Page>
  );
}

export function ContractDrawer({ id }: { id: string }) {
  const s = useFM();
  const c = sel.contract(s, id);
  if (!c) return <div className="fm-drawer-b"><Empty title="Contract not found" /></div>;
  const cust = sel.customer(s, c.customerId)!;
  const site = sel.site(s, c.siteId)!;
  const visits = s.serviceVisits.filter((v) => v.contractId === id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const assets = s.assets.filter((a) => a.siteId === c.siteId && c.schedule.some((l) => l.type === a.type));
  const invoices = s.invoices.filter((i) => i.contractId === id).sort((a, b) => ((a.issueDate || "9") < (b.issueDate || "9") ? 1 : -1));
  const setFreq = (type: AssetType, every: number) =>
    mutate((st) => ({ contracts: st.contracts.map((x) => (x.id === id ? { ...x, schedule: x.schedule.map((l) => (l.type === type ? { ...l, everyMonths: every } : l)) } : x)) }), c.ref + ": " + type + " frequency set to " + freqLabel(every), "service");
  return (
    <>
      <DrawerHead eyebrow={"Service contract " + c.ref} title={c.title} pills={<><DivTag id={c.division} /><Pill tone={c.status === "active" ? "ok" : "warn"} dot>{c.status}</Pill></>} sub={<><RecLink to={{ kind: "customer", id: cust.id }}>{cust.name}</RecLink> · <RecLink to={{ kind: "site", id: site.id }}>{site.name}</RecLink></>} />
      <div className="fm-drawer-b">
        <div className="fm-kv">
          <div><div className="k">Billing</div><div className="v">{c.billing}</div></div>
          <div><div className="k">Per cycle</div><div className="v"><Money v={c.billingAmount} /></div></div>
          <div><div className="k">Annual value</div><div className="v"><Money v={c.annualValue} /></div></div>
          <div><div className="k">Next billing</div><div className="v">{fmtDay(c.nextBillingDate)}</div></div>
          <div><div className="k">Last billed</div><div className="v">{c.billing === "per-visit" ? "Per visit" : monthName(c.lastBilledPeriod)}</div></div>
          <div><div className="k">Renewal</div><div className="v">{fmtDay(c.renewalDate)}</div></div>
        </div>
        <div className="fm-note accent">
          {c.billing === "per-visit"
            ? "Billed per visit: each completed service visit raises one invoice at the agreed visit price of " + euro(c.billingAmount) + "."
            : "Billed " + c.billing + " from the contract billing schedule. Service visits under this contract are never charged again as jobs, so there are no duplicate charges."}
        </div>
        <div className="fm-sec">Schedule per asset</div>
        <Card flush>
          <Table
            rows={c.schedule}
            cols={[
              { h: "Asset type", w: "1.2fr", cls: "main", r: (l) => l.type },
              { h: "Frequency", w: "150px", r: (l) => (
                <select className="fm-select" value={l.everyMonths} onChange={(e) => setFreq(l.type, Number(e.target.value))} style={{ height: 30 }}>
                  {[1, 3, 6, 12].map((n) => <option key={n} value={n}>{freqLabel(n)}</option>)}
                </select>
              ) },
              { h: "Hours", w: "60px", num: true, r: (l) => l.hours },
              { h: "Next due", w: "90px", r: (l) => fmtDate(l.nextDue) },
            ]}
          />
        </Card>
        <div className="fm-sec">Access requirements</div>
        <div className="fm-note">{c.accessRequirements}</div>
        <div className="fm-sec">Covered assets</div>
        <Card flush>
          <Table rows={assets} cols={[
            { h: "Asset", w: "1.6fr", cls: "main", r: (a) => a.description },
            { h: "Type", w: "1fr", r: (a) => a.type },
            { h: "Last service", w: "100px", r: (a) => fmtDate(a.lastService) },
          ]} empty={<Empty title="No assets linked" />} />
        </Card>
        <div className="fm-sec">Visit history</div>
        <Card flush>
          <Table rows={visits} onRow={(v) => openDrawer({ kind: "serviceVisit", id: v.id })} cols={[
            { h: "Date", w: "100px", r: (v) => fmtDate(v.date) },
            { h: "Services", w: "1.4fr", r: (v) => v.services.join(", ") },
            { h: "Engineer", w: "70px", r: (v) => <Avatars ids={v.engineerId ? [v.engineerId] : []} size={22} /> },
            { h: "Status", w: "130px", r: (v) => svStatusPill(s, v) },
          ]} empty={<Empty title="No visits yet" />} />
        </Card>
        <div className="fm-sec">Related invoices</div>
        <Card flush>
          <Table rows={invoices} onRow={(i) => openDrawer({ kind: "invoice", id: i.id })} cols={[
            { h: "Invoice", w: "100px", cls: "mono", r: (i) => i.number || "Draft" },
            { h: "Period", w: "1fr", r: (i) => (i.period ? monthName(i.period) : "") },
            { h: "Gross", w: "100px", num: true, r: (i) => <Money v={invoiceGross(i)} dp={2} /> },
            { h: "Status", w: "110px", r: (i) => <InvoiceStatusPill s={i.status} /> },
          ]} empty={<Empty title={c.billing === "per-visit" ? "Billed per visit" : "No contract invoices yet"} hint={c.billing === "per-visit" ? "Per-visit invoices sit against each service job." : "Generate them from Finance, Recurring billing."} />} />
        </Card>
      </div>
    </>
  );
}

/* ── Asset register ─────────────────────────────────────────────────────── */
function AssetRegister() {
  const s = useFM();
  const [type, setType] = useState("All");
  const [q, setQ] = useState("");
  const types = ["All", ...Array.from(new Set(s.assets.map((a) => a.type)))];
  const rows = s.assets
    .filter((a) => {
      const site = sel.site(s, a.siteId)!;
      const cust = sel.customer(s, site.customerId)!;
      if (s.division !== "ALL" && !cust.divisions.includes(s.division)) return false;
      if (type !== "All" && a.type !== type) return false;
      const hay = (a.description + " " + site.name + " " + site.town + " " + cust.name).toLowerCase();
      return !q || hay.includes(q.toLowerCase());
    })
    .map((a) => {
      const contract = a.contractId ? sel.contract(s, a.contractId) : undefined;
      const line = contract?.schedule.find((l) => l.type === a.type);
      const next = line ? line.nextDue : addMonths(a.lastService, a.frequencyMonths);
      return { a, contract, next, every: line ? line.everyMonths : a.frequencyMonths };
    })
    .sort((x, y) => (x.next < y.next ? -1 : 1));
  return (
    <Page eyebrow="Servicing & PPM" title="Asset register" sub="Every serviceable asset across every site, with its own service frequency.">
      <div className="fm-row" style={{ flexWrap: "wrap" }}>
        <div className="fm-chips">{types.map((t) => <button key={t} className={"fm-chip" + (type === t ? " on" : "")} onClick={() => setType(t)}>{t}</button>)}</div>
        <span className="fm-spacer" />
        <input className="fm-input" style={{ width: 260 }} placeholder="Search site, town or customer" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card flush sub={rows.length + " assets"} title="Assets">
        <Table
          rows={rows}
          minWidth={1050}
          onRow={(r) => openDrawer({ kind: "site", id: r.a.siteId })}
          cols={[
            { h: "Asset", w: "1.6fr", cls: "main", r: (r) => r.a.description },
            { h: "Type", w: "130px", r: (r) => r.a.type },
            { h: "Site", w: "1.3fr", r: (r) => sel.site(s, r.a.siteId)!.name },
            { h: "Location", w: "1fr", r: (r) => r.a.location },
            { h: "Frequency", w: "110px", r: (r) => freqLabel(r.every) },
            { h: "Last service", w: "100px", r: (r) => fmtDate(r.a.lastService) },
            { h: "Next due", w: "100px", r: (r) => <span style={{ color: r.next < TODAY ? "var(--bad)" : undefined }}>{fmtDate(r.next)}</span> },
            { h: "Contract", w: "90px", r: (r) => (r.contract ? <RecLink to={{ kind: "contract", id: r.contract.id }}>{r.contract.ref}</RecLink> : <span className="fm-faint">None</span>) },
          ]}
        />
      </Card>
    </Page>
  );
}

/* ── Service reports ────────────────────────────────────────────────────── */
function Reports() {
  const s = useFM();
  const done = visitsIn(s).filter((v) => v.status === "completed").sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <Page eyebrow="Servicing & PPM" title="Service reports" sub="Every completed visit produces a professional report from the engineer's record. Site access details are never printed.">
      <Card flush>
        <Table
          rows={done}
          onRow={(v) => openModal({ kind: "service-report", svId: v.id })}
          cols={[
            { h: "Date", w: "100px", r: (v) => fmtDate(v.date) },
            { h: "Site", w: "1.4fr", cls: "main", r: (v) => sel.site(s, v.siteId)!.name },
            { h: "Contract", w: "90px", cls: "mono", r: (v) => contractOf(s, v).ref },
            { h: "Services", w: "1.3fr", r: (v) => v.services.join(", ") },
            { h: "Engineer", w: "130px", r: (v) => (v.engineerId ? sel.engineer(s, v.engineerId)!.name : "") },
            { h: "Result", w: "140px", r: (v) => (v.defects.length ? <Pill tone="bad" dot>{v.defects.length} defect{v.defects.length > 1 ? "s" : ""}</Pill> : <Pill tone="ok" dot>All clear</Pill>) },
            { h: "", w: "110px", r: (v) => <Btn size="sm" icon="note" onClick={(e) => { e.stopPropagation(); openModal({ kind: "service-report", svId: v.id }); }}>Report</Btn> },
          ]}
          empty={<Empty title="No completed visits" hint="Completed service visits appear here with their report." />}
        />
      </Card>
    </Page>
  );
}

function ServiceReportDoc({ v }: { v: ServiceVisit }) {
  const s = useFM();
  const c = contractOf(s, v);
  const d = divisionById(c.division);
  const site = sel.site(s, v.siteId)!;
  const cust = sel.customer(s, c.customerId)!;
  const eng = v.engineerId ? sel.engineer(s, v.engineerId) : undefined;
  const fails = v.checklist.filter((i) => i.result === "fail").length;
  return (
    <div className="fm-doc">
      <div className="brand" style={{ justifyContent: "space-between" }}>
        <div className="brand">
          <div className="mark" style={{ background: d.color }}>{d.prefix}</div>
          <div><b style={{ fontSize: 15 }}>{d.name}</b><div className="muted">{COMPANY.umbrellaName} · {COMPANY.phone} · {COMPANY.email}</div></div>
        </div>
        <div style={{ textAlign: "right" }}><div className="muted">Service report</div><b>{c.ref}-{v.date.replace(/-/g, "").slice(2)}</b></div>
      </div>
      <h1 style={{ marginTop: 26 }}>Service report</h1>
      <div className="muted">{v.services.join(", ")}</div>
      <table>
        <tbody>
          <tr><td className="muted" style={{ width: 150 }}>Customer</td><td>{cust.name}</td></tr>
          <tr><td className="muted">Site</td><td>{site.name}, {site.address}, {site.town}, {site.county} {site.eircode}</td></tr>
          <tr><td className="muted">Contract</td><td>{c.ref}, {c.title}</td></tr>
          <tr><td className="muted">Visit date</td><td>{fmtDay(v.date)}</td></tr>
          <tr><td className="muted">Engineer</td><td>{eng ? eng.name + ", " + eng.title : "Not recorded"}</td></tr>
          <tr><td className="muted">Outcome</td><td>{v.defects.length ? v.defects.length + " defect" + (v.defects.length > 1 ? "s" : "") + " recorded" : "All checks passed"}{fails ? ", " + fails + " check" + (fails > 1 ? "s" : "") + " failed" : ""}</td></tr>
        </tbody>
      </table>
      <h2>Checklist results</h2>
      <table>
        <thead><tr><th>Check</th><th style={{ width: 90 }}>Result</th></tr></thead>
        <tbody>
          {v.checklist.map((i, k) => (
            <tr key={k}><td>{i.item}</td><td style={{ color: i.result === "fail" ? "#b3261e" : i.result === "pass" ? "#12794a" : "#6b7078", fontWeight: 600 }}>{i.result === "n/a" ? "N/A" : i.result.charAt(0).toUpperCase() + i.result.slice(1)}</td></tr>
          ))}
          {!v.checklist.length && <tr><td colSpan={2} className="muted">No checklist recorded.</td></tr>}
        </tbody>
      </table>
      <h2>Defects</h2>
      {v.defects.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{v.defects.map((x, k) => <li key={k}>{x}</li>)}</ul> : <div className="muted">None found.</div>}
      <h2>Remedial work required</h2>
      {v.remedial.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{v.remedial.map((x, k) => <li key={k}>{x}</li>)}</ul> : <div className="muted">None.</div>}
      <h2>Engineer's notes</h2>
      <pre>{v.notes || "No notes."}</pre>
      <div style={{ marginTop: 30, paddingTop: 12, borderTop: "1px solid #d9dadf", display: "flex", justifyContent: "space-between" }} className="muted">
        <span>Signed: {eng ? eng.name : ""}</span>
        <span>Next visit due: {fmtDay(c.schedule.filter((l) => v.services.includes(l.type)).map((l) => l.nextDue).sort()[0])}</span>
      </div>
    </div>
  );
}

/* ── Upcoming and overdue ───────────────────────────────────────────────── */
function UpcomingOverdue() {
  const s = useFM();
  const open = visitsIn(s).filter((v) => v.status !== "completed").sort((a, b) => (a.date < b.date ? -1 : 1));
  const unalloc = open.filter((v) => !v.engineerId);
  const overdue = open.filter((v) => v.date < TODAY);
  const decNot = dueVisits(s, "2026-12").filter((d) => !d.existing && inDivision(s, d.contract.division));
  return (
    <Page eyebrow="Servicing & PPM" title="Upcoming and overdue" sub="Visits that need a decision: unallocated, overdue, or due and not yet planned.">
      <div className="fm-grid fm-g3">
        <Stat label="Need allocation" value={unalloc.length} tone={unalloc.length ? "warn" : undefined} sub="No engineer assigned" />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? "bad" : undefined} sub="Past their visit date" />
        <Stat label="Due in December, not planned" value={decNot.length} sub="Generate the December plan" onClick={() => go("Servicing", "planner")} />
      </div>
      <Card title="Open visits" flush>
        <Table
          rows={open}
          minWidth={980}
          onRow={(v) => openDrawer({ kind: "serviceVisit", id: v.id })}
          cols={[
            { h: "Date", w: "100px", r: (v) => fmtDate(v.date) },
            { h: "Site", w: "1.4fr", cls: "main", r: (v) => sel.site(s, v.siteId)!.name },
            { h: "Services", w: "1.2fr", r: (v) => v.services.join(", ") },
            { h: "Period", w: "110px", r: (v) => monthName(v.period) },
            { h: "Engineer", w: "130px", r: (v) => (v.engineerId ? sel.engineer(s, v.engineerId)!.name : <span className="fm-faint">Unallocated</span>) },
            { h: "Status", w: "140px", r: (v) => <span className="fm-row" style={{ gap: 6 }}>{svStatusPill(s, v)}{v.period < periodOf(v.date) && <Pill tone="warn">Carried over</Pill>}</span> },
            { h: "", w: "100px", r: (v) => <Btn size="sm" kind={v.engineerId ? undefined : "primary"} onClick={(e) => { e.stopPropagation(); openModal({ kind: "allocate-service", svId: v.id }); }}>{v.engineerId ? "Change" : "Allocate"}</Btn> },
          ]}
          empty={<Empty title="Nothing open" hint="All visits are completed." />}
        />
      </Card>
      {decNot.length > 0 && (
        <Card title="Due in December, not yet planned" sub="These come from contract schedules. Generating the plan turns them into proposed visits." action={<Btn size="sm" kind="primary" icon="spark" onClick={() => go("Servicing", "planner")}>Plan December</Btn>} flush>
          <Table rows={decNot} onRow={(d) => openDrawer({ kind: "contract", id: d.contract.id })} cols={[
            { h: "Due", w: "100px", r: (d) => fmtDate(d.date) },
            { h: "Site", w: "1.4fr", cls: "main", r: (d) => sel.site(s, d.contract.siteId)!.name },
            { h: "Services", w: "1.3fr", r: (d) => d.services.join(", ") },
            { h: "Contract", w: "90px", cls: "mono", r: (d) => d.contract.ref },
            { h: "Hours", w: "70px", num: true, r: (d) => d.hours + " h" },
          ]} />
        </Card>
      )}
    </Page>
  );
}

/* ── Service visit drawer ───────────────────────────────────────────────── */
export function ServiceVisitDrawer({ id }: { id: string }) {
  const s = useFM();
  const v = s.serviceVisits.find((x) => x.id === id);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => (v && v.checklist.length ? v.checklist : v ? checklistTemplate(v.services) : []));
  const [defects, setDefects] = useState<string[]>(v?.defects || []);
  const [remedial, setRemedial] = useState<string[]>(v?.remedial || []);
  const [notes, setNotes] = useState(v?.notes || "");
  const [hours, setHours] = useState(v?.estHours || 2);
  const [engineerId, setEngineerId] = useState(v?.engineerId || "");
  const [materials, setMaterials] = useState<{ description: string; qty: number; unitPrice: number }[]>([]);
  const [photos, setPhotos] = useState<{ caption: string; hue: number }[]>([]);
  const [newDefect, setNewDefect] = useState("");
  const [newRemedial, setNewRemedial] = useState("");
  const [matPick, setMatPick] = useState("");
  if (!v) return <div className="fm-drawer-b"><Empty title="Visit not found" /></div>;
  const c = contractOf(s, v);
  const site = sel.site(s, v.siteId)!;
  const cust = sel.customer(s, c.customerId)!;
  const done = v.status === "completed";
  const pending = checklist.filter((i) => i.result === "pending").length;
  const qualified = qualifiedFor(s, v.services);
  const products = s.products.filter((p) => p.division === c.division && (p.category === "Equipment" || p.category === "Material"));
  const setResult = (k: number, r: ChecklistItem["result"]) => setChecklist((l) => l.map((x, i) => (i === k ? { ...x, result: r } : x)));
  const save = () => {
    updateServiceVisit(v.id, { checklist, defects, remedial, notes });
    toast("Progress saved on the visit");
  };
  const complete = () => {
    if (!engineerId) return toast("Choose the engineer who did the visit", "warn");
    if (pending) return toast(pending + " checklist item" + (pending > 1 ? "s are" : " is") + " still pending", "warn");
    if (v.date > TODAY) updateServiceVisit(v.id, { date: TODAY });
    completeServiceVisit(v.id, { checklist, defects, remedial, notes, hours, engineerId, materials });
    openModal({ kind: "service-report", svId: v.id });
  };
  return (
    <>
      <DrawerHead eyebrow={"Service visit · " + c.ref} title={site.name} pills={<>{svStatusPill(s, v)}<DivTag id={c.division} /></>}
        sub={<><RecLink to={{ kind: "customer", id: cust.id }}>{cust.name}</RecLink> · {fmtDate(v.date, true)} · <RecLink to={{ kind: "contract", id: c.id }}>{c.title}</RecLink></>} />
      <div className="fm-drawer-b">
        <div className="fm-kv">
          <div><div className="k">Services</div><div className="v">{v.services.join(", ")}</div></div>
          <div><div className="k">Estimated</div><div className="v">{v.estHours} h</div></div>
          <div><div className="k">Period</div><div className="v">{monthName(v.period)}</div></div>
          <div><div className="k">Billing</div><div className="v">{c.billing === "per-visit" ? "Per visit" : "Under contract (" + c.billing + ")"}</div></div>
          {v.jobId && <div><div className="k">Service job</div><div className="v"><RecLink to={{ kind: "job", id: v.jobId }}>{sel.job(s, v.jobId)?.number}</RecLink></div></div>}
        </div>
        <div className="fm-note"><b className="fm-ink">Access requirements.</b> {c.accessRequirements}</div>
        {!done && (
          <div className="fm-grid fm-g2">
            <Field label="Engineer">
              <select className="fm-select" value={engineerId} onChange={(e) => setEngineerId(e.target.value)}>
                <option value="">Choose engineer</option>
                {qualified.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Time spent (hours)">
              <input className="fm-input" type="number" min={0.5} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            </Field>
          </div>
        )}
        <div className="fm-sec">Checklist {pending ? "· " + pending + " pending" : ""}</div>
        <Card flush>
          {checklist.map((i, k) => (
            <div key={k} className="fm-tr" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="fm-ink" style={{ whiteSpace: "normal" }}>{i.item}</div>
              <div>
                {done ? (
                  <Pill tone={i.result === "pass" ? "ok" : i.result === "fail" ? "bad" : ""}>{i.result}</Pill>
                ) : (
                  <Seg value={i.result} options={[["pass", "Pass"], ["fail", "Fail"], ["n/a", "N/A"]] as [ChecklistItem["result"], string][]} onChange={(r) => setResult(k, r)} />
                )}
              </div>
            </div>
          ))}
        </Card>
        <div className="fm-sec">Defects</div>
        <ListEditor items={defects} setItems={setDefects} value={newDefect} setValue={setNewDefect} placeholder="Describe a defect, e.g. Camera 3 image soft at night" readOnly={done} tone="bad" />
        <div className="fm-sec">Remedial work required</div>
        <ListEditor items={remedial} setItems={setRemedial} value={newRemedial} setValue={setNewRemedial} placeholder="e.g. Replace detector head in plant room" readOnly={done} />
        {!done && (
          <>
            <div className="fm-sec">Materials used</div>
            {materials.map((m, k) => (
              <div key={k} className="fm-row fm-note" style={{ justifyContent: "space-between" }}>
                <span>{m.qty} × {m.description}</span>
                <span className="fm-row"><Money v={m.qty * m.unitPrice} /><button className="fm-x" style={{ width: 26, height: 26 }} onClick={() => setMaterials((l) => l.filter((_, i) => i !== k))}><Ico d="x" size={11} /></button></span>
              </div>
            ))}
            <div className="fm-row">
              <select className="fm-select" value={matPick} onChange={(e) => setMatPick(e.target.value)}>
                <option value="">Add a part or material</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({euro(p.price)})</option>)}
              </select>
              <Btn icon="plus" disabled={!matPick} onClick={() => { const p = sel.product(s, matPick)!; setMaterials((l) => [...l, { description: p.name, qty: 1, unitPrice: p.price }]); setMatPick(""); }}>Add</Btn>
            </div>
          </>
        )}
        <div className="fm-sec">Service notes</div>
        {done ? <div className="fm-note" style={{ whiteSpace: "pre-wrap" }}>{v.notes || "No notes."}</div> : <textarea className="fm-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done, anything the customer should know" />}
        <div className="fm-sec">Photographs</div>
        <div className="fm-grid fm-g3">
          {photos.map((p, k) => <div key={k} className="fm-photo" style={{ background: photoBg(p.hue) }}><span>{p.caption}</span></div>)}
          {!done && (
            <button className="fm-photo" style={{ all: "unset", aspectRatio: "4/3", border: "1px dashed var(--border-strong)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--dim)", fontSize: 12, gap: 6 }}
              onClick={() => { setPhotos((l) => [...l, { caption: v.services[l.length % v.services.length] + " photo " + (l.length + 1), hue: Math.floor(Math.random() * 360) }]); mutate(() => ({}), "Photo attached to the service visit at " + site.name, "service"); }}>
              <Ico d="camera" size={15} /> Add photo
            </button>
          )}
          {done && !photos.length && <span className="fm-faint" style={{ fontSize: 12.5 }}>No photographs on this visit.</span>}
        </div>
      </div>
      <div className="fm-drawer-f">
        {done ? (
          <>
            <Btn kind="primary" icon="note" onClick={() => openModal({ kind: "service-report", svId: v.id })}>View service report</Btn>
            {v.defects.length > 0 && <Btn icon="quote" onClick={() => raiseRemedialQuote(s, v, v.defects)}>Raise remedial quote</Btn>}
          </>
        ) : (
          <>
            <Btn kind="primary" icon="check" onClick={complete}>Complete visit and generate report</Btn>
            <Btn onClick={save}>Save progress</Btn>
            {defects.length > 0 && <Btn kind="ghost" icon="quote" onClick={() => raiseRemedialQuote(s, v, defects)}>Raise remedial quote</Btn>}
            <span className="fm-spacer" />
            <Btn kind="ghost" onClick={() => openModal({ kind: "allocate-service", svId: v.id })}>Reschedule</Btn>
          </>
        )}
      </div>
    </>
  );
}

function ListEditor({ items, setItems, value, setValue, placeholder, readOnly, tone }: { items: string[]; setItems: (f: (l: string[]) => string[]) => void; value: string; setValue: (v: string) => void; placeholder: string; readOnly?: boolean; tone?: "bad" }) {
  const add = () => {
    if (!value.trim()) return;
    setItems((l) => [...l, value.trim()]);
    setValue("");
  };
  return (
    <div className="fm-col-flex" style={{ gap: 6 }}>
      {items.map((d, k) => (
        <div key={k} className={"fm-note" + (tone === "bad" ? " bad" : "")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px" }}>
          <span style={{ flex: 1 }}>{d}</span>
          {!readOnly && <button className="fm-x" style={{ width: 26, height: 26 }} onClick={() => setItems((l) => l.filter((_, i) => i !== k))} aria-label="Remove"><Ico d="x" size={11} /></button>}
        </div>
      ))}
      {!items.length && readOnly && <span className="fm-faint" style={{ fontSize: 12.5 }}>None.</span>}
      {!readOnly && (
        <div className="fm-row">
          <input className="fm-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Btn icon="plus" onClick={add} disabled={!value.trim()}>Add</Btn>
        </div>
      )}
    </div>
  );
}

/* ── Modals ─────────────────────────────────────────────────────────────── */
export function ServiceModals(): JSX.Element | null {
  const s = useFM();
  const m = s.ui.modal;
  if (!m) return null;
  if (m.kind === "service-report") return <ReportModal svId={m.svId} />;
  if (m.kind === "allocate-service") return <AllocateModal svId={m.svId} />;
  return null;
}

function ReportModal({ svId }: { svId: string }) {
  const s = useFM();
  const ref = useRef<HTMLDivElement>(null);
  const v = s.serviceVisits.find((x) => x.id === svId);
  if (!v) return null;
  return (
    <Modal title="Service report" sub={sel.site(s, v.siteId)!.name + ", " + fmtDate(v.date, true)} onClose={closeModal} width={860}
      footer={<><Btn kind="ghost" onClick={closeModal}>Close</Btn><Btn kind="primary" icon="print" onClick={() => printEl(ref.current?.querySelector(".fm-doc") as HTMLElement, "Service report")}>Print or save as PDF</Btn></>}>
      <div ref={ref} style={{ maxHeight: "62vh", overflowY: "auto", padding: 4 }}>
        <ServiceReportDoc v={v} />
      </div>
    </Modal>
  );
}

function AllocateModal({ svId }: { svId: string }) {
  const s = useFM();
  const v = s.serviceVisits.find((x) => x.id === svId)!;
  const [date, setDate] = useState(v.date < TODAY ? addDays(TODAY, 3) : v.date);
  const sugg = useMemo(() => suggestEngineers(s, qualifiedFor(s, v.services), date), [s, v, date]);
  const [eng, setEng] = useState(v.engineerId || sugg.find((x) => x.day.free >= v.estHours)?.e.id || sugg[0]?.e.id || "");
  const c = contractOf(s, v);
  const anyFree = sugg.some((x) => x.day.free >= v.estHours);
  const nextFree = (() => {
    let d = date;
    for (let k = 0; k < 15; k++) {
      d = addWorkingDays(d, 1);
      const top = suggestEngineers(s, qualifiedFor(s, v.services), d).find((x) => x.day.free >= v.estHours);
      if (top) return { d, e: top.e };
    }
    return null;
  })();
  return (
    <Modal title="Allocate service visit" sub={sel.site(s, v.siteId)!.name + " · " + v.services.join(", ") + " · " + v.estHours + " h"} onClose={closeModal}
      footer={<><Btn kind="ghost" onClick={closeModal}>Cancel</Btn><Btn kind="primary" disabled={!eng || !date} onClick={() => { allocateServiceVisit(s, svId, eng, date); closeModal(); }}>Allocate</Btn></>}>
      <Field label="Visit date" hint={"Access: " + c.accessRequirements}>
        <input className="fm-input" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </Field>
      {!anyFree && nextFree && (
        <div className="fm-note warn fm-row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <span>Nobody qualified has {v.estHours} h free on {fmtDate(date)}. Next option: {nextFree.e.name.split(" ")[0]} on {fmtDate(nextFree.d)}.</span>
          <Btn size="sm" onClick={() => { setDate(nextFree.d); setEng(nextFree.e.id); }}>Use {fmtDate(nextFree.d)}</Btn>
        </div>
      )}
      <div className="fm-sec">Engineers with the right skills, most free time first</div>
      <div className="fm-col-flex" style={{ gap: 6 }}>
        {sugg.map((x, k) => (
          <label key={x.e.id} className="fm-note" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderColor: eng === x.e.id ? "var(--accent-line)" : undefined }}>
            <input type="radio" name="eng" checked={eng === x.e.id} onChange={() => setEng(x.e.id)} style={{ accentColor: "var(--accent)" }} />
            <Avatar e={x.e} size={24} />
            <span style={{ flex: 1 }}><b className="fm-ink" style={{ fontWeight: 500 }}>{x.e.name}</b> <span className="fm-faint" style={{ fontSize: 12 }}>{x.e.title}</span></span>
            <span className="fm-muted" style={{ fontSize: 12 }}>{x.day.free} h free</span>
            {k === 0 && x.day.free >= v.estHours && <Pill tone="accent">Suggested</Pill>}
          </label>
        ))}
        {!sugg.length && <Empty title="Nobody qualified is free" hint="Try another date." />}
      </div>
    </Modal>
  );
}
