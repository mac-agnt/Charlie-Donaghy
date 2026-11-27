/* Customers & Sites: one connected view of every customer, site, contact,
   asset and the full history behind them. */
import { useMemo, useState, type ReactNode } from "react";
import { canSeeAccessCodes, divisionById, type DivisionId } from "../config";
import { TODAY, fmtDate, fmtDay } from "../dates";
import {
  useFM, sel, inDivision, jobTotals, invoiceBalance, isOutstanding, invoiceGross, quoteNet, openDrawer, go, setFilter,
} from "../store";
import type { Drawer, FMState, Job } from "../types";
import { DrawerHead } from "../FMLayer";
import {
  Page, Card, Stat, Table, Btn, Pill, StagePill, InvoiceStatusPill, JobStatusPill, Money, RecLink, Seg, Ico, DivTag, Empty, Avatars,
} from "../ui";
import "./commercial/commercial.css";

/* ── Shared helpers ─────────────────────────────────────────────────────── */
function customerStats(s: FMState, customerId: string) {
  const jobs = s.jobs.filter((j) => j.customerId === customerId);
  const invoices = s.invoices.filter((i) => i.customerId === customerId);
  const outstanding = invoices.filter(isOutstanding).reduce((a, i) => a + invoiceBalance(i), 0);
  const overdue = invoices.filter((i) => isOutstanding(i) && (i.status === "overdue" || (i.dueDate || "") < TODAY));
  return {
    jobs,
    openJobs: jobs.filter((j) => j.status === "new" || j.status === "progress"),
    invoices,
    outstanding,
    overdue,
    sites: s.sites.filter((x) => x.customerId === customerId),
    contracts: s.contracts.filter((c) => c.customerId === customerId),
    quotes: s.quotes.filter((q) => q.customerId === customerId),
  };
}

type TLItem = { at: string; kind: string; title: string; meta: string; to?: Drawer; tone?: string };

export function customerTimeline(s: FMState, customerId: string, siteId?: string): TLItem[] {
  const out: TLItem[] = [];
  const siteOk = (id?: string) => !siteId || id === siteId;
  const siteName = (id?: string) => sel.site(s, id)?.name || "";
  s.jobs.filter((j) => j.customerId === customerId && siteOk(j.siteId)).forEach((j) => {
    out.push({ at: j.createdAt + " 08:00", kind: "Job", title: j.number + " created: " + j.description.split(".")[0], meta: siteName(j.siteId) + ", " + j.type, to: { kind: "job", id: j.id } });
    if (j.completedAt) out.push({ at: j.completedAt + " 17:00", kind: "Job", title: j.number + " completed", meta: j.completionConfirmedBy ? "Confirmed by " + j.completionConfirmedBy : siteName(j.siteId), to: { kind: "job", id: j.id }, tone: "ok" });
  });
  const jobIds = new Set(s.jobs.filter((j) => j.customerId === customerId && siteOk(j.siteId)).map((j) => j.id));
  s.visits.filter((v) => jobIds.has(v.jobId)).forEach((v) => {
    const j = sel.job(s, v.jobId)!;
    out.push({ at: v.date + " " + v.start, kind: "Visit", title: (sel.engineer(s, v.engineerId)?.name || "Engineer") + " on site, " + v.hours + " h", meta: j.number + ". " + v.summary.split(".")[0], to: { kind: "job", id: j.id } });
  });
  s.serviceVisits.filter((v) => sel.contract(s, v.contractId)?.customerId === customerId && siteOk(v.siteId)).forEach((v) => {
    out.push({ at: v.date + " 09:00", kind: "Service", title: "Service visit " + (v.status === "completed" ? "completed" : v.status) + ": " + v.services.join(", "), meta: siteName(v.siteId) + (v.defects.length ? ". Defects: " + v.defects.join("; ") : ""), to: { kind: "serviceVisit", id: v.id }, tone: v.defects.length ? "warn" : undefined });
  });
  s.invoices.filter((i) => i.customerId === customerId && i.issueDate && siteOk(i.siteId)).forEach((i) => {
    out.push({ at: i.issueDate + " 10:00", kind: "Invoice", title: (i.number || "Draft") + " issued, " + euroish(invoiceGross(i)), meta: siteName(i.siteId) + ", " + i.status, to: { kind: "invoice", id: i.id } });
  });
  const invIds = new Set(s.invoices.filter((i) => i.customerId === customerId && siteOk(i.siteId)).map((i) => i.id));
  s.payments.filter((p) => invIds.has(p.invoiceId)).forEach((p) => {
    const inv = sel.invoice(s, p.invoiceId)!;
    out.push({ at: p.date + " 15:00", kind: "Payment", title: "Payment received, " + euroish(p.amount), meta: (inv.number || "") + " by " + p.method, to: { kind: "invoice", id: inv.id }, tone: "ok" });
  });
  s.quotes.filter((q) => q.customerId === customerId && siteOk(q.siteId)).forEach((q) => {
    out.push({ at: q.createdAt + " 11:00", kind: "Quote", title: q.number + ": " + q.title, meta: q.stage, to: { kind: "quote", id: q.id } });
  });
  s.comms.filter((c) => c.customerId === customerId && (!siteId || !c.jobId || jobIds.has(c.jobId))).forEach((c) => {
    out.push({ at: c.at, kind: "Email", title: c.kind + ": " + c.subject, meta: "To " + c.to + ", " + c.status, to: c.jobId ? { kind: "job", id: c.jobId } : c.invoiceId ? { kind: "invoice", id: c.invoiceId } : undefined });
  });
  s.documents.filter((d) => d.customerId === customerId && siteOk(d.siteId)).forEach((d) => {
    out.push({ at: d.date + " 12:00", kind: "Document", title: d.name, meta: d.kind, to: d.jobId ? { kind: "job", id: d.jobId } : undefined });
  });
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}
const euroish = (n: number) => "€" + n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const KIND_ICON: Record<string, string> = { Job: "jobs", Visit: "pin", Service: "service", Invoice: "finance", Payment: "check", Quote: "quote", Email: "mail", Document: "note" };

export function Timeline({ items, limit }: { items: TLItem[]; limit?: number }) {
  const [more, setMore] = useState(false);
  const shown = limit && !more ? items.slice(0, limit) : items;
  if (!items.length) return <Empty title="No history yet" hint="Jobs, invoices and visits will appear here." />;
  return (
    <div className="fm-timeline">
      {shown.map((t, i) => (
        <div className="fm-tl cm-tl" key={i}>
          <i className={t.tone ? "cm-tl-" + t.tone : ""} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="t">
              {t.to ? <RecLink to={t.to}>{t.title}</RecLink> : t.title}
            </div>
            <div className="m">
              <span className="cm-kind"><Ico d={KIND_ICON[t.kind] || "note"} size={11} /> {t.kind}</span> {fmtDate(t.at.slice(0, 10), true)} · {t.meta}
            </div>
          </div>
        </div>
      ))}
      {limit && items.length > limit && (
        <Btn size="sm" kind="ghost" onClick={() => setMore(!more)}>{more ? "Show less" : "Show all " + items.length + " events"}</Btn>
      )}
    </div>
  );
}

function Section({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="cm-sec">
      <div className="cm-sec-h">
        <span className="fm-sec" style={{ margin: 0 }}>{title}{count !== undefined ? " · " + count : ""}</span>
        <span className="fm-spacer" />
        {action}
      </div>
      {children}
    </div>
  );
}

function JobRow({ j }: { j: Job }) {
  const s = useFM();
  const site = sel.site(s, j.siteId);
  const t = jobTotals(s, j);
  return (
    <button className="cm-row" onClick={() => openDrawer({ kind: "job", id: j.id })}>
      <span className="fm-mono fm-faint" style={{ width: 58, flex: "none" }}>{j.number}</span>
      <span className="fm-trunc" style={{ flex: 1 }}>
        <span className="fm-ink">{j.description.split(".")[0]}</span>
        <span className="fm-faint" style={{ display: "block", fontSize: 11.5 }}>{site?.name} · {t.visits.length} visit{t.visits.length === 1 ? "" : "s"}, {t.billableHours} h · {j.scheduled ? fmtDate(j.scheduled) : "Not scheduled"}</span>
      </span>
      <JobStatusPill s={j.status} />
    </button>
  );
}

/* ── Customers page ─────────────────────────────────────────────────────── */
export default function CustomersPage({ tab }: { tab: string }) {
  if (tab === "sites") return <SitesTab />;
  if (tab === "contacts") return <ContactsTab />;
  if (tab === "history") return <HistoryTab />;
  if (tab === "assets") return <AssetsTab />;
  return <CustomersTab />;
}

const visibleCustomer = (s: FMState, divs: DivisionId[]) => s.division === "ALL" || divs.includes(s.division as DivisionId);

function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="cm-search">
      <Ico d="search" size={14} />
      <input className="fm-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function CustomersTab() {
  const s = useFM();
  const [q, setQ] = useState("");
  const rows = s.customers
    .filter((c) => visibleCustomer(s, c.divisions))
    .filter((c) => !q || (c.name + " " + c.kind).toLowerCase().includes(q.toLowerCase()))
    .map((c) => ({ c, st: customerStats(s, c.id) }));
  const totalOutstanding = rows.reduce((a, r) => a + r.st.outstanding, 0);
  const withOpen = rows.filter((r) => r.st.openJobs.length).length;
  const contracts = rows.reduce((a, r) => a + r.st.contracts.length, 0);
  return (
    <Page eyebrow="Commercial" title="Customers & Sites" sub="Every customer, their sites, equipment, work and money in one place. Open a customer to see the full story.">
      <div className="fm-grid fm-g4">
        <Stat label="Customers" value={rows.length} sub={rows.reduce((a, r) => a + r.st.sites.length, 0) + " sites"} icon="customers" onClick={() => go("Customers", "sites")} />
        <Stat label="With open jobs" value={withOpen} sub="New or in progress" icon="jobs" onClick={() => go("Jobs", "all")} />
        <Stat label="Service contracts" value={contracts} sub="Active and renewal due" icon="service" onClick={() => go("Servicing", "contracts")} />
        <Stat label="Outstanding balance" value={<Money v={totalOutstanding} />} sub="Issued and not yet paid" icon="finance" tone={totalOutstanding > 0 ? "warn" : undefined} onClick={() => go("Finance", "invoices")} />
      </div>
      <Card title="Customers" sub={rows.length + " shown"} action={<Search value={q} onChange={setQ} placeholder="Search customers" />} flush>
        <Table
          minWidth={860}
          rows={rows}
          onRow={(r) => openDrawer({ kind: "customer", id: r.c.id })}
          cols={[
            { h: "Customer", w: "2fr", cls: "main", r: (r) => r.c.name },
            { h: "Type", w: "1.2fr", r: (r) => <span className="fm-muted">{r.c.kind}</span> },
            { h: "Divisions", w: "1.6fr", r: (r) => <span className="fm-row" style={{ gap: 10 }}>{r.c.divisions.map((d) => { const dv = divisionById(d); return <span key={d} className="fm-tag" title={dv.name}><i style={{ background: dv.color }} />{dv.short.split(" ")[0]}</span>; })}</span> },
            { h: "Sites", w: ".5fr", num: true, r: (r) => r.st.sites.length },
            { h: "Open jobs", w: ".7fr", num: true, r: (r) => (r.st.openJobs.length ? <span className="fm-ink">{r.st.openJobs.length}</span> : <span className="fm-faint">0</span>) },
            { h: "Contracts", w: ".7fr", num: true, r: (r) => r.st.contracts.length },
            { h: "Outstanding", w: "1fr", num: true, r: (r) => (r.st.outstanding ? <span style={{ color: r.st.overdue.length ? "var(--bad)" : "var(--ink)" }}><Money v={r.st.outstanding} dp={2} /></span> : <span className="fm-faint">None</span>) },
          ]}
          empty={<Empty title="No customers match" hint="Try another name or switch to All divisions." />}
        />
      </Card>
    </Page>
  );
}

function SitesTab() {
  const s = useFM();
  const [q, setQ] = useState("");
  const rows = s.sites
    .filter((x) => visibleCustomer(s, sel.customer(s, x.customerId)?.divisions || []))
    .filter((x) => !q || (x.name + " " + x.town + " " + x.county + " " + x.eircode + " " + sel.customer(s, x.customerId)?.name).toLowerCase().includes(q.toLowerCase()));
  return (
    <Page eyebrow="Commercial" title="Sites" sub="A customer can run many sites. Each one carries its own access arrangements, equipment and service history.">
      <Card title="All sites" sub={rows.length + " sites"} action={<Search value={q} onChange={setQ} placeholder="Search sites, towns, Eircodes" />} flush>
        <Table
          minWidth={880}
          rows={rows}
          onRow={(x) => openDrawer({ kind: "site", id: x.id })}
          cols={[
            { h: "Site", w: "1.8fr", cls: "main", r: (x) => x.name },
            { h: "Customer", w: "1.6fr", r: (x) => sel.customer(s, x.customerId)?.name },
            { h: "Town", w: "1fr", r: (x) => x.town + ", " + x.county },
            { h: "Eircode", w: ".8fr", cls: "mono", r: (x) => x.eircode },
            { h: "Assets", w: ".6fr", num: true, r: (x) => s.assets.filter((a) => a.siteId === x.id).length },
            { h: "Open jobs", w: ".7fr", num: true, r: (x) => s.jobs.filter((j) => j.siteId === x.id && (j.status === "new" || j.status === "progress")).length },
            { h: "Contract", w: ".8fr", r: (x) => (s.contracts.some((c) => c.siteId === x.id) ? <Pill tone="ok">On contract</Pill> : <span className="fm-faint">Ad hoc</span>) },
          ]}
        />
      </Card>
    </Page>
  );
}

function ContactsTab() {
  const s = useFM();
  const [q, setQ] = useState("");
  const rows = s.contacts
    .filter((p) => visibleCustomer(s, sel.customer(s, p.customerId)?.divisions || []))
    .filter((p) => !q || (p.name + " " + p.role + " " + p.email + " " + sel.customer(s, p.customerId)?.name).toLowerCase().includes(q.toLowerCase()));
  return (
    <Page eyebrow="Commercial" title="Contacts" sub="Property managers, caretakers and accounts contacts at every customer.">
      <Card title="Contacts" sub={rows.length + " people"} action={<Search value={q} onChange={setQ} placeholder="Search name, role, email" />} flush>
        <Table
          minWidth={860}
          rows={rows}
          onRow={(p) => openDrawer({ kind: "customer", id: p.customerId })}
          cols={[
            { h: "Name", w: "1.4fr", cls: "main", r: (p) => <>{p.name} {p.primary && <Pill tone="accent">Primary</Pill>}</> },
            { h: "Role", w: "1.2fr", r: (p) => p.role },
            { h: "Customer", w: "1.6fr", r: (p) => sel.customer(s, p.customerId)?.name },
            { h: "Email", w: "1.6fr", cls: "mono", r: (p) => p.email },
            { h: "Phone", w: "1fr", cls: "mono", r: (p) => p.phone },
          ]}
        />
      </Card>
    </Page>
  );
}

const TL_KINDS = ["All", "Job", "Visit", "Service", "Invoice", "Payment", "Quote", "Email", "Document"];
function HistoryTab() {
  const s = useFM();
  const custs = s.customers.filter((c) => visibleCustomer(s, c.divisions));
  const [cid, setCid] = useState(s.ui.filters.historyCustomer || "c1");
  const [year, setYear] = useState("All");
  const [kind, setKind] = useState("All");
  const all = useMemo(() => customerTimeline(s, cid), [s, cid]);
  const years = Array.from(new Set(all.map((t) => t.at.slice(0, 4)))).sort().reverse();
  const items = all.filter((t) => (year === "All" || t.at.startsWith(year)) && (kind === "All" || t.kind === kind));
  const cust = sel.customer(s, cid);
  return (
    <Page eyebrow="Commercial" title="Customer history" sub="Everything that has happened with a customer, newest first. Filter by year or by record type.">
      <Card>
        <div className="fm-row" style={{ flexWrap: "wrap", gap: 12 }}>
          <select className="fm-select" style={{ width: 280 }} value={cid} onChange={(e) => { setCid(e.target.value); setFilter("historyCustomer", e.target.value); setYear("All"); }}>
            {custs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Seg value={year} options={[["All", "All years"], ...years.map((y) => [y, y] as [string, string])]} onChange={setYear} />
          <span className="fm-spacer" />
          {cust && <Btn size="sm" icon="customers" onClick={() => openDrawer({ kind: "customer", id: cust.id })}>Open customer</Btn>}
        </div>
        <div className="fm-chips" style={{ marginTop: 12 }}>
          {TL_KINDS.map((k) => (
            <button key={k} className={"fm-chip" + (kind === k ? " on" : "")} onClick={() => setKind(k)}>
              {k} <span className="fm-faint">{k === "All" ? all.filter((t) => year === "All" || t.at.startsWith(year)).length : all.filter((t) => t.kind === k && (year === "All" || t.at.startsWith(year))).length}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card title={(cust?.name || "") + (year !== "All" ? ", " + year : "")} sub={items.length + " events"}>
        <Timeline items={items} />
      </Card>
    </Page>
  );
}

function AssetsTab() {
  const s = useFM();
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const types = Array.from(new Set(s.assets.map((a) => a.type)));
  const rows = s.assets
    .filter((a) => visibleCustomer(s, sel.customer(s, sel.site(s, a.siteId)?.customerId)?.divisions || []))
    .filter((a) => type === "All" || a.type === type)
    .filter((a) => !q || (a.description + " " + sel.site(s, a.siteId)?.name + " " + a.type).toLowerCase().includes(q.toLowerCase()));
  return (
    <Page eyebrow="Commercial" title="Installed equipment" sub="Every serviceable asset by site, with its service frequency and when it was last looked at.">
      <Card action={<Search value={q} onChange={setQ} placeholder="Search assets or sites" />} title={rows.length + " assets"}>
        <div className="fm-chips">
          {["All", ...types].map((t) => <button key={t} className={"fm-chip" + (type === t ? " on" : "")} onClick={() => setType(t)}>{t}</button>)}
        </div>
      </Card>
      <Card flush>
        <Table
          minWidth={900}
          rows={rows}
          onRow={(a) => openDrawer({ kind: "site", id: a.siteId })}
          cols={[
            { h: "Asset", w: "1fr", cls: "main", r: (a) => a.type },
            { h: "Description", w: "2fr", r: (a) => a.description },
            { h: "Site", w: "1.6fr", r: (a) => sel.site(s, a.siteId)?.name },
            { h: "Every", w: ".7fr", r: (a) => a.frequencyMonths + (a.frequencyMonths === 1 ? " month" : " months") },
            { h: "Last service", w: ".9fr", r: (a) => fmtDay(a.lastService) },
            { h: "Contract", w: ".8fr", r: (a) => (a.contractId ? <span className="fm-mono">{sel.contract(s, a.contractId)?.ref}</span> : <span className="fm-faint">None</span>) },
          ]}
        />
      </Card>
    </Page>
  );
}

/* ── Customer drawer ────────────────────────────────────────────────────── */
export function CustomerDrawer({ id }: { id: string }) {
  const s = useFM();
  const c = sel.customer(s, id);
  const [year, setYear] = useState("All");
  if (!c) return <Empty title="Customer not found" />;
  const st = customerStats(s, id);
  const inProgress = st.jobs.filter((j) => j.status === "progress" || j.status === "new");
  const done = st.jobs.filter((j) => j.status === "completed" || j.status === "invoiced").sort((a, b) => ((a.completedAt || "") < (b.completedAt || "") ? 1 : -1));
  const upcoming = s.serviceVisits.filter((v) => sel.contract(s, v.contractId)?.customerId === id && v.status !== "completed").sort((a, b) => (a.date < b.date ? -1 : 1));
  const outstanding = st.invoices.filter(isOutstanding);
  const issued = st.invoices.filter((i) => i.issueDate).sort((a, b) => (a.issueDate! < b.issueDate! ? 1 : -1));
  const invYears = Array.from(new Set(issued.map((i) => i.issueDate!.slice(0, 4)))).sort().reverse();
  const invShown = issued.filter((i) => year === "All" || i.issueDate!.startsWith(year));
  const openQuotes = st.quotes.filter((q) => q.stage !== "Lost");
  const notes = st.jobs.flatMap((j) => j.internalNotes.map((n) => ({ j, n })));
  const docs = s.documents.filter((d) => d.customerId === id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const contacts = s.contacts.filter((p) => p.customerId === id);
  const tl = customerTimeline(s, id);
  return (
    <>
      <DrawerHead eyebrow={"Customer · " + c.kind} title={c.name} pills={<span className="fm-row" style={{ gap: 8 }}>{c.divisions.map((d) => <DivTag key={d} id={d} />)}</span>} sub={"Customer since " + c.since + " · " + c.paymentTerms + " day terms · " + c.accountsEmail} />
      <div className="fm-drawer-b">
        <div className="fm-grid fm-g4 cm-mini">
          <Stat label="Open jobs" value={st.openJobs.length} tone={st.openJobs.length ? "warn" : undefined} />
          <Stat label="Sites" value={st.sites.length} />
          <Stat label="Contracts" value={st.contracts.length} />
          <Stat label="Outstanding" value={<Money v={st.outstanding} />} tone={st.overdue.length ? "bad" : undefined} sub={st.overdue.length ? st.overdue.length + " overdue" : "Nothing overdue"} />
        </div>
        {c.notes && <div className="fm-note">{c.notes}</div>}

        <Section title="Work in progress" count={inProgress.length}>
          {inProgress.length ? inProgress.map((j) => <JobRow key={j.id} j={j} />) : <div className="fm-faint cm-none">No open jobs.</div>}
          {inProgress.filter((j) => j.returnRequired).map((j) => (
            <div key={j.id} className="fm-note warn" style={{ marginTop: 8 }}>
              <b>{j.number}</b>: {j.returnNote} {j.scheduled && <>Return booked {fmtDate(j.scheduled)} with <Avatars ids={j.engineerIds} size={20} />.</>}
            </div>
          ))}
        </Section>

        {notes.length > 0 && (
          <Section title="Engineer notes" count={notes.length}>
            {notes.map((x, i) => (
              <div key={i} className="fm-note" style={{ marginBottom: 6 }}>
                <span className="fm-mono fm-faint">{x.j.number}</span> {x.n}
              </div>
            ))}
          </Section>
        )}

        <Section title="Upcoming service visits" count={upcoming.length} action={<Btn size="sm" kind="ghost" onClick={() => go("Servicing", "planner")}>Planner</Btn>}>
          {upcoming.length ? upcoming.map((v) => (
            <button key={v.id} className="cm-row" onClick={() => openDrawer({ kind: "serviceVisit", id: v.id })}>
              <span style={{ width: 92, flex: "none" }} className="fm-ink">{fmtDate(v.date)}</span>
              <span className="fm-trunc" style={{ flex: 1 }}>{v.services.join(", ")}<span className="fm-faint" style={{ display: "block", fontSize: 11.5 }}>{sel.site(s, v.siteId)?.name} · {sel.contract(s, v.contractId)?.ref}</span></span>
              {v.engineerId ? <Avatars ids={[v.engineerId]} size={22} /> : <Pill tone="warn">Needs allocation</Pill>}
              <Pill tone={v.status === "scheduled" ? "ok" : ""}>{v.status}</Pill>
            </button>
          )) : <div className="fm-faint cm-none">{st.contracts.length ? "Nothing booked yet. Next month's plan has not been generated." : "No service contracts."}</div>}
        </Section>

        <Section title="Outstanding invoices" count={outstanding.length}>
          {outstanding.length ? (
            <Table
              rows={outstanding}
              onRow={(i) => openDrawer({ kind: "invoice", id: i.id })}
              cols={[
                { h: "Invoice", w: "1fr", cls: "mono", r: (i) => i.number || "Draft" },
                { h: "Issued", w: "1fr", r: (i) => fmtDate(i.issueDate) },
                { h: "Due", w: "1fr", r: (i) => fmtDate(i.dueDate) },
                { h: "Status", w: "1fr", r: (i) => <InvoiceStatusPill s={i.status} /> },
                { h: "Balance", w: "1fr", num: true, r: (i) => <Money v={invoiceBalance(i)} dp={2} /> },
              ]}
            />
          ) : <div className="fm-faint cm-none">Nothing outstanding.</div>}
        </Section>

        <Section title="Current quotes" count={openQuotes.length} action={<Btn size="sm" kind="ghost" icon="plus" onClick={() => startQuoteFor(c.id, st.sites[0]?.id, c.divisions[0])}>New quote</Btn>}>
          {openQuotes.length ? openQuotes.map((q) => (
            <button key={q.id} className="cm-row" onClick={() => openDrawer({ kind: "quote", id: q.id })}>
              <span className="fm-mono fm-faint" style={{ width: 58, flex: "none" }}>{q.number}</span>
              <span className="fm-trunc fm-ink" style={{ flex: 1 }}>{q.title}</span>
              <StagePill s={q.stage} />
              <span style={{ width: 90, textAlign: "right" }}><Money v={quoteNet(q)} /></span>
            </button>
          )) : <div className="fm-faint cm-none">No quotes.</div>}
        </Section>

        <Section title="Invoices issued" count={invShown.length} action={<Seg value={year} options={[["All", "All"], ...invYears.map((y) => [y, y] as [string, string])]} onChange={setYear} />}>
          <Table
            rows={invShown}
            onRow={(i) => openDrawer({ kind: "invoice", id: i.id })}
            cols={[
              { h: "Invoice", w: "1fr", cls: "mono", r: (i) => i.number },
              { h: "Date", w: "1fr", r: (i) => fmtDay(i.issueDate) },
              { h: "Site", w: "1.6fr", r: (i) => sel.site(s, i.siteId)?.name },
              { h: "Status", w: "1fr", r: (i) => <InvoiceStatusPill s={i.status} /> },
              { h: "Gross", w: "1fr", num: true, r: (i) => <Money v={invoiceGross(i)} dp={2} /> },
            ]}
            empty={<div className="fm-faint cm-none">No invoices in {year}.</div>}
          />
          {invShown.length > 0 && <div className="fm-faint" style={{ fontSize: 12, marginTop: 8, textAlign: "right" }}>{year === "All" ? "All years" : year}: <Money v={invShown.reduce((a, i) => a + invoiceGross(i), 0)} dp={2} /> across {invShown.length} invoices</div>}
        </Section>

        <Section title="Completed work" count={done.length}>
          {done.slice(0, 6).map((j) => <JobRow key={j.id} j={j} />)}
          {!done.length && <div className="fm-faint cm-none">No completed jobs on record yet.</div>}
        </Section>

        <Section title="Sites" count={st.sites.length}>
          {st.sites.map((x) => (
            <button key={x.id} className="cm-row" onClick={() => openDrawer({ kind: "site", id: x.id })}>
              <Ico d="pin" size={14} style={{ color: "var(--faint)" }} />
              <span className="fm-trunc" style={{ flex: 1 }}><span className="fm-ink">{x.name}</span><span className="fm-faint" style={{ display: "block", fontSize: 11.5 }}>{x.address}, {x.town} · {x.eircode}</span></span>
              <span className="fm-faint" style={{ fontSize: 12 }}>{s.assets.filter((a) => a.siteId === x.id).length} assets</span>
            </button>
          ))}
        </Section>

        <Section title="Contacts" count={contacts.length}>
          <div className="fm-kv">
            {contacts.map((p) => (
              <div key={p.id}>
                <div className="k">{p.role}{p.primary ? " · primary" : ""}</div>
                <div className="v">{p.name}</div>
                <div className="fm-mono fm-faint" style={{ fontSize: 11, marginTop: 3 }}>{p.email}</div>
                <div className="fm-mono fm-faint" style={{ fontSize: 11 }}>{p.phone}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Documents" count={docs.length}>
          {docs.slice(0, 8).map((d) => (
            <div key={d.id} className="cm-row static">
              <Ico d="note" size={14} style={{ color: "var(--faint)" }} />
              <span className="fm-trunc fm-ink" style={{ flex: 1 }}>{d.name}</span>
              <span className="fm-faint" style={{ fontSize: 12 }}>{d.kind} · {fmtDay(d.date)}</span>
            </div>
          ))}
          {!docs.length && <div className="fm-faint cm-none">No documents.</div>}
        </Section>

        <Section title="Timeline" count={tl.length}>
          <Timeline items={tl} limit={14} />
        </Section>
      </div>
      <div className="fm-drawer-f">
        <Btn icon="quote" onClick={() => startQuoteFor(c.id, st.sites[0]?.id, c.divisions[0])}>New quote</Btn>
        <Btn icon="clock" kind="ghost" onClick={() => go("Customers", "history", { historyCustomer: c.id })}>Full history</Btn>
        <span className="fm-spacer" />
        <Btn kind="primary" icon="jobs" onClick={() => go("Jobs", "all", { jobsCustomer: c.id })}>All jobs</Btn>
      </div>
    </>
  );
}

function startQuoteFor(customerId: string, siteId: string | undefined, division: DivisionId) {
  go("Quotes", "builder", { "quotes.builder": "new", quoteBuilderCustomer: customerId, quoteBuilderSite: siteId || "", quoteBuilderDivision: division });
}

/* ── Site drawer ────────────────────────────────────────────────────────── */
export function SiteDrawer({ id }: { id: string }) {
  const s = useFM();
  const x = sel.site(s, id);
  if (!x) return <Empty title="Site not found" />;
  const c = sel.customer(s, x.customerId)!;
  const jobs = s.jobs.filter((j) => j.siteId === id);
  const open = jobs.filter((j) => j.status === "new" || j.status === "progress");
  const prev = jobs.filter((j) => j.status === "completed" || j.status === "invoiced");
  const assets = s.assets.filter((a) => a.siteId === id);
  const contracts = s.contracts.filter((k) => k.siteId === id);
  const upcoming = s.serviceVisits.filter((v) => v.siteId === id && v.status !== "completed");
  const quotes = s.quotes.filter((q) => q.siteId === id);
  const invoices = s.invoices.filter((i) => i.siteId === id && i.issueDate).sort((a, b) => (a.issueDate! < b.issueDate! ? 1 : -1));
  const docs = s.documents.filter((d) => d.siteId === id);
  const canCode = canSeeAccessCodes(s.role);
  const dueNext = contracts.flatMap((k) => k.schedule.map((l) => ({ k, l }))).sort((a, b) => (a.l.nextDue < b.l.nextDue ? -1 : 1));
  return (
    <>
      <DrawerHead eyebrow="Site" title={x.name} sub={<RecLink to={{ kind: "customer", id: c.id }}>{c.name}</RecLink>} pills={contracts.length ? <Pill tone="ok">On contract</Pill> : <Pill>Ad hoc</Pill>} />
      <div className="fm-drawer-b">
        <div className="fm-kv">
          <div><div className="k">Address</div><div className="v">{x.address}</div></div>
          <div><div className="k">Town</div><div className="v">{x.town}, {x.county}</div></div>
          <div><div className="k">Eircode</div><div className="v fm-mono">{x.eircode || "Not recorded"}</div></div>
          <div><div className="k">Keyholder</div><div className="v">{x.keyholder}</div></div>
        </div>
        <Section title="Access instructions">
          <div className="fm-note">{x.accessNotes}</div>
          {canCode ? (
            <div className="fm-note warn cm-secure" style={{ marginTop: 8 }}>
              <div className="fm-row"><Ico d="lock" size={14} /><b>Access code</b><span className="fm-spacer" /><Pill tone="warn">Authorised staff only</Pill></div>
              <div className="fm-mono" style={{ fontSize: 13.5, marginTop: 6 }}>{x.accessCode}</div>
              <div className="fm-faint" style={{ fontSize: 11.5, marginTop: 6 }}>Never included in customer-facing documents, quotes, invoices or completion notices.</div>
            </div>
          ) : (
            <div className="fm-note" style={{ marginTop: 8 }}>
              <span className="fm-lock"><Ico d="lock" size={13} /> Access codes are hidden for your role.</span>
            </div>
          )}
        </Section>

        <Section title="Service arrangements" count={contracts.length}>
          {contracts.length ? contracts.map((k) => (
            <button key={k.id} className="cm-row" onClick={() => openDrawer({ kind: "contract", id: k.id })}>
              <span className="fm-mono fm-faint" style={{ width: 62, flex: "none" }}>{k.ref}</span>
              <span className="fm-trunc" style={{ flex: 1 }}><span className="fm-ink">{k.title}</span><span className="fm-faint" style={{ display: "block", fontSize: 11.5 }}>{k.schedule.map((l) => l.type + " every " + l.everyMonths + "m").join(" · ")} · billed {k.billing}</span></span>
              <DivTag id={k.division} />
            </button>
          )) : <div className="fm-faint cm-none">No service contract on this site.</div>}
        </Section>

        <Section title="Upcoming maintenance" count={upcoming.length + dueNext.length}>
          {upcoming.map((v) => (
            <button key={v.id} className="cm-row" onClick={() => openDrawer({ kind: "serviceVisit", id: v.id })}>
              <span style={{ width: 92, flex: "none" }} className="fm-ink">{fmtDate(v.date)}</span>
              <span className="fm-trunc" style={{ flex: 1 }}>{v.services.join(", ")}</span>
              {v.engineerId ? <Avatars ids={[v.engineerId]} size={22} /> : <Pill tone="warn">Needs allocation</Pill>}
            </button>
          ))}
          {dueNext.filter((d) => !upcoming.some((v) => v.contractId === d.k.id && v.services.includes(d.l.type))).map((d, i) => (
            <div key={i} className="cm-row static">
              <span style={{ width: 92, flex: "none" }} className="fm-muted">{fmtDate(d.l.nextDue)}</span>
              <span className="fm-trunc" style={{ flex: 1 }}>{d.l.type} due <span className="fm-faint">(not yet planned)</span></span>
            </div>
          ))}
          {!upcoming.length && !dueNext.length && <div className="fm-faint cm-none">Nothing scheduled.</div>}
        </Section>

        <Section title="Installed equipment" count={assets.length}>
          <Table
            rows={assets}
            cols={[
              { h: "Asset", w: "1fr", cls: "main", r: (a) => a.type },
              { h: "Description", w: "2fr", r: (a) => a.description },
              { h: "Last service", w: "1fr", r: (a) => fmtDay(a.lastService) },
            ]}
            empty={<div className="fm-faint cm-none">No equipment recorded.</div>}
          />
        </Section>

        <Section title="Open jobs" count={open.length}>
          {open.length ? open.map((j) => <JobRow key={j.id} j={j} />) : <div className="fm-faint cm-none">No open jobs.</div>}
        </Section>
        <Section title="Previous jobs" count={prev.length}>
          {prev.length ? prev.map((j) => <JobRow key={j.id} j={j} />) : <div className="fm-faint cm-none">No previous jobs on record.</div>}
        </Section>
        <Section title="Quotes" count={quotes.length}>
          {quotes.map((q) => (
            <button key={q.id} className="cm-row" onClick={() => openDrawer({ kind: "quote", id: q.id })}>
              <span className="fm-mono fm-faint" style={{ width: 58, flex: "none" }}>{q.number}</span>
              <span className="fm-trunc fm-ink" style={{ flex: 1 }}>{q.title}</span>
              <StagePill s={q.stage} />
            </button>
          ))}
          {!quotes.length && <div className="fm-faint cm-none">No quotes for this site.</div>}
        </Section>
        <Section title="Invoices" count={invoices.length}>
          <Table
            rows={invoices.slice(0, 10)}
            onRow={(i) => openDrawer({ kind: "invoice", id: i.id })}
            cols={[
              { h: "Invoice", w: "1fr", cls: "mono", r: (i) => i.number },
              { h: "Date", w: "1fr", r: (i) => fmtDay(i.issueDate) },
              { h: "Status", w: "1fr", r: (i) => <InvoiceStatusPill s={i.status} /> },
              { h: "Gross", w: "1fr", num: true, r: (i) => <Money v={invoiceGross(i)} dp={2} /> },
            ]}
            empty={<div className="fm-faint cm-none">No invoices.</div>}
          />
        </Section>
        <Section title="Documents" count={docs.length}>
          {docs.map((d) => (
            <div key={d.id} className="cm-row static">
              <Ico d="note" size={14} style={{ color: "var(--faint)" }} />
              <span className="fm-trunc fm-ink" style={{ flex: 1 }}>{d.name}</span>
              <span className="fm-faint" style={{ fontSize: 12 }}>{fmtDay(d.date)}</span>
            </div>
          ))}
          {!docs.length && <div className="fm-faint cm-none">No documents.</div>}
        </Section>
        <Section title="Site timeline">
          <Timeline items={customerTimeline(s, c.id, id)} limit={10} />
        </Section>
      </div>
      <div className="fm-drawer-f">
        <Btn icon="quote" onClick={() => startQuoteFor(c.id, x.id, c.divisions[0])}>Quote for this site</Btn>
        <span className="fm-spacer" />
        <Btn kind="primary" icon="customers" onClick={() => openDrawer({ kind: "customer", id: c.id })}>Open customer</Btn>
      </div>
    </>
  );
}

export { inDivision };
