/* Jobs: the digital job box. Board, registers, reports and the job record. */
import { useEffect, useMemo, useState } from "react";
import {
  useFM, sel, jobTotals, inDivision, openDrawer, openModal, moveJob, acceptJob, startJob, addNote, sendComm,
  prepareCompletionNotice, draftInvoiceForJob, reopenJob, setFilter, invoiceGross, euro, setTab,
} from "../store";
import { canSeeAccessCodes, COMPANY, DIVISIONS, divisionById } from "../config";
import { TODAY, fmtDate, rel, diffDays } from "../dates";
import {
  Page, Card, Stat, Table, Btn, Pill, JobStatusPill, InvoiceStatusPill, PriorityPill, DivTag, Avatars, Money, RecLink, Seg, Bar,
  Ico, Empty, photoBg, useMoneyVisible, type Col,
} from "../ui";
import { DrawerHead } from "../FMLayer";
import Modals from "./jobs/JobModals";
import type { FMState, Job, JobStatus } from "../types";
import "./jobs/jobs.css";

export function JobModals() {
  return <Modals />;
}

const COLS: [JobStatus, string, string][] = [
  ["new", "New jobs", "The shared job box"],
  ["progress", "In progress", "Time and materials accumulate"],
  ["completed", "Completed", "Awaiting invoice"],
  ["invoiced", "Invoiced", "Issued or covered by contract"],
];
/** "today", "yesterday", "last Monday" or "Wed 18 Nov" (dates keep their capitals). */
const relLow = (d?: string | null) => { const r = rel(d); return /^(Today|Tomorrow|Yesterday|Last )/.test(r) ? r.charAt(0).toLowerCase() + r.slice(1) : r; };
const TYPES: Job["type"][] = ["Reactive callout", "Repair", "Installation", "PPM service", "Maintenance", "Inspection"];

function useFilteredJobs(s: FMState, f: { eng: string; type: string; q: string; status?: string }) {
  return s.jobs.filter((j) => {
    if (!inDivision(s, j.division)) return false;
    if (f.eng === "none" ? j.engineerIds.length : f.eng && !j.engineerIds.includes(f.eng)) return false;
    if (f.type && j.type !== f.type) return false;
    if (f.status && f.status !== "all" && j.status !== f.status) return false;
    if (f.q) {
      const site = sel.site(s, j.siteId)!;
      const hay = (j.number + " " + j.woRef + " " + j.description + " " + site.name + " " + sel.customer(s, j.customerId)!.name).toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    return true;
  });
}

function Filters({ f, set, showStatus }: { f: { eng: string; type: string; q: string; status: string }; set: (p: Partial<typeof f>) => void; showStatus?: boolean }) {
  const s = useFM();
  return (
    <div className="fm-row" style={{ flexWrap: "wrap", gap: 8 }}>
      <div className="fm-jobs-search">
        <Ico d="search" size={14} />
        <input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search job, site, customer or work order" />
      </div>
      <select className="fm-select" style={{ width: 170 }} value={f.eng} onChange={(e) => set({ eng: e.target.value })}>
        <option value="">All engineers</option>
        <option value="none">Unallocated</option>
        {s.engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <select className="fm-select" style={{ width: 160 }} value={f.type} onChange={(e) => set({ type: e.target.value })}>
        <option value="">All job types</option>
        {TYPES.map((t) => <option key={t}>{t}</option>)}
      </select>
      {showStatus && (
        <select className="fm-select" style={{ width: 150 }} value={f.status} onChange={(e) => { set({ status: e.target.value }); setFilter("jobs.status", e.target.value); }}>
          <option value="all">All statuses</option>
          {COLS.map((c) => <option key={c[0]} value={c[0]}>{c[1]}</option>)}
        </select>
      )}
    </div>
  );
}

function JobCard({ j }: { j: Job }) {
  const s = useFM();
  const site = sel.site(s, j.siteId)!;
  const t = jobTotals(s, j);
  const [drag, setDrag] = useState(false);
  const unalloc = j.status === "new" && !j.engineerIds.length;
  return (
    <div
      className={"fm-jc" + (drag ? " dragging" : "")}
      draggable={j.status === "new" || j.status === "progress"}
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", j.id); e.dataTransfer.effectAllowed = "move"; setDrag(true); }}
      onDragEnd={() => setDrag(false)}
      onClick={() => openDrawer({ kind: "job", id: j.id })}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && openDrawer({ kind: "job", id: j.id })}
    >
      <div className="n">
        <span>{j.number}</span>
        <DivTag id={j.division} />
        <span className="fm-spacer" />
        <PriorityPill p={j.priority} />
      </div>
      <div className="t">{site.name}</div>
      <div className="s" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{j.description}</div>
      {j.returnRequired && j.status === "progress" && <div className="fm-jobs-flag"><Ico d="flag" size={12} />{j.returnNote || "Return required"}</div>}
      <div className="f">
        <Avatars ids={j.engineerIds} size={22} />
        <span className="fm-faint" style={{ fontSize: 11.5 }}>
          {j.status === "progress" ? t.billableHours + " h · " + t.visits.length + " visit" + (t.visits.length === 1 ? "" : "s") : j.status === "completed" ? "Done " + rel(j.completedAt) : rel(j.scheduled)}
        </span>
      </div>
      {(j.status === "completed" || j.status === "invoiced") && (
        <div className="f" style={{ fontSize: 12 }}>
          <span className="fm-muted">{j.status === "invoiced" ? (j.billedVia === "contract" ? "Contract" : sel.invoice(s, j.invoiceId)?.number || "Invoiced") : j.invoiceId ? "Draft invoice ready" : "Not invoiced"}</span>
          <b className="fm-ink"><Money v={t.value} /></b>
        </div>
      )}
      {unalloc && (
        <div className="f" onClick={(e) => e.stopPropagation()}>
          <Pill tone="accent">In the job box</Pill>
          {s.role === "engineer" ? (
            <Btn size="sm" kind="primary" onClick={() => acceptJob(j.id, s.meEngineerId)}>Accept</Btn>
          ) : (
            <Btn size="sm" onClick={() => openModal({ kind: "allocate-job", jobId: j.id })}>Allocate</Btn>
          )}
        </div>
      )}
    </div>
  );
}

function Kanban({ jobs }: { jobs: Job[] }) {
  const [over, setOver] = useState<string | null>(null);
  const drop = (status: JobStatus, id: string) => {
    setOver(null);
    if (!id) return;
    const r = moveJob(id, status);
    if (r === "needs-confirm") openModal({ kind: "complete-job", jobId: id });
  };
  return (
    <div className="fm-kanban">
      {COLS.map(([status, label, hint]) => {
        const list = jobs.filter((j) => j.status === status).sort((a, b) => (status === "new" ? Number(!!a.engineerIds.length) - Number(!!b.engineerIds.length) : 0) || ((b.completedAt || b.scheduled || "") < (a.completedAt || a.scheduled || "") ? -1 : 1));
        return (
          <div
            key={status}
            className={"fm-col" + (over === status ? " over" : "")}
            onDragOver={(e) => { if (status !== "invoiced") { e.preventDefault(); setOver(status); } }}
            onDragLeave={() => setOver((o) => (o === status ? null : o))}
            onDrop={(e) => { e.preventDefault(); drop(status, e.dataTransfer.getData("text/plain")); }}
          >
            <div className="fm-col-h" style={{ flexWrap: "wrap", rowGap: 2 }}>
              <b>{label}</b>
              <span>{list.length}</span>
              <span className="fm-faint" style={{ fontSize: 11, flexBasis: "100%" }}>{hint}</span>
            </div>
            {list.map((j) => <JobCard key={j.id} j={j} />)}
            {!list.length && <div className="fm-faint" style={{ fontSize: 12, padding: "18px 8px", textAlign: "center" }}>{status === "new" ? "Job box is empty" : "Nothing here"}</div>}
            {status === "invoiced" && <div className="fm-faint" style={{ fontSize: 11, padding: "2px 6px" }}>Jobs arrive here when their invoice is approved, never by dragging.</div>}
          </div>
        );
      })}
    </div>
  );
}

type SortKey = "number" | "scheduled" | "status" | "value" | "site";
function JobsTable({ jobs, showInvoice }: { jobs: Job[]; showInvoice?: boolean }) {
  const s = useFM();
  const money = useMoneyVisible();
  const [sort, setSort] = useState<SortKey>("number");
  const [dir, setDir] = useState(-1);
  const rows = useMemo(() => {
    const val = (j: Job) => {
      if (sort === "number") return j.number;
      if (sort === "scheduled") return j.completedAt || j.scheduled || "";
      if (sort === "status") return ["new", "progress", "completed", "invoiced"].indexOf(j.status);
      if (sort === "site") return sel.site(s, j.siteId)!.name;
      return jobTotals(s, j).value;
    };
    return jobs.slice().sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * dir);
  }, [jobs, sort, dir, s]);
  const cols: Col<Job>[] = [
    { h: "Job", w: "84px", r: (j) => <span className="mono fm-ink">{j.number}</span> },
    { h: "Customer and site", w: "minmax(180px,1.4fr)", r: (j) => <span><span className="main">{sel.site(s, j.siteId)!.name}</span><br /><span className="fm-faint" style={{ fontSize: 11.5 }}>{sel.customer(s, j.customerId)!.name}</span></span> },
    { h: "Description", w: "minmax(160px,1.6fr)", r: (j) => j.description },
    { h: "Division", w: "130px", r: (j) => <DivTag id={j.division} /> },
    { h: "Type", w: "120px", r: (j) => j.type },
    { h: "Status", w: "112px", r: (j) => <JobStatusPill s={j.status} /> },
    { h: "Engineers", w: "90px", r: (j) => <Avatars ids={j.engineerIds} size={22} /> },
    { h: "Date", w: "96px", r: (j) => <span className="mono">{fmtDate(j.status === "completed" || j.status === "invoiced" ? j.completedAt : j.scheduled)}</span> },
  ];
  if (showInvoice) cols.push({ h: "Invoice", w: "150px", r: (j) => { const inv = sel.invoice(s, j.invoiceId); return j.billedVia === "contract" && j.status === "invoiced" ? <span className="fm-muted">Contract billed</span> : inv ? <span className="fm-row" style={{ gap: 6 }}><span className="mono">{inv.number || "Draft"}</span><InvoiceStatusPill s={inv.status} /></span> : <Pill tone="warn">Not invoiced</Pill>; } });
  if (money) cols.push({ h: "Value", w: "90px", num: true, r: (j) => <Money v={jobTotals(s, j).value} /> });
  return (
    <>
      <div className="fm-row" style={{ padding: "0 12px 10px", gap: 8 }}>
        <span className="fm-faint" style={{ fontSize: 12 }}>{rows.length} jobs, sorted by</span>
        <Seg<SortKey> value={sort} onChange={(k) => { if (k === sort) setDir(-dir); else { setSort(k); setDir(k === "site" ? 1 : -1); } }} options={[["number", "Number"], ["scheduled", "Date"], ["status", "Status"], ["site", "Site"], ...(money ? [["value", "Value"] as [SortKey, string]] : [])]} />
        <button className="fm-chip" onClick={() => setDir(-dir)}>{dir < 0 ? "Descending" : "Ascending"}</button>
      </div>
      <Table cols={cols} rows={rows} onRow={(j) => openDrawer({ kind: "job", id: j.id })} minWidth={1000} />
    </>
  );
}

function Board() {
  const s = useFM();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [f, setF] = useState({ eng: "", type: "", q: "", status: s.ui.filters["jobs.status"] || "all" });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const jobs = useFilteredJobs(s, view === "kanban" ? { ...f, status: "all" } : f);
  const all = s.jobs.filter((j) => inDivision(s, j.division));
  const box = all.filter((j) => j.status === "new" && !j.engineerIds.length);
  const prog = all.filter((j) => j.status === "progress");
  const comp = all.filter((j) => j.status === "completed");
  return (
    <>
      <div className="fm-grid fm-g4">
        <Stat icon="box" label="In the job box" value={box.length} sub={box.length ? "Unallocated, oldest " + relLow(box.map((j) => j.createdAt).sort()[0]) : "Everything is allocated"} tone={box.length ? "warn" : "ok"} onClick={() => { setView("table"); set({ eng: "none", status: "new" }); }} />
        <Stat icon="clock" label="In progress" value={prog.length} sub={prog.filter((j) => j.returnRequired).length + " waiting on a return visit"} onClick={() => { setView("table"); set({ eng: "", status: "progress" }); }} />
        <Stat icon="check" label="Completed, not invoiced" value={comp.length} sub={<Money v={comp.reduce((a, j) => a + jobTotals(s, j).value, 0)} />} tone={comp.length ? "bad" : "ok"} onClick={() => { setView("table"); set({ eng: "", status: "completed" }); }} />
        <Stat icon="finance" label="Invoiced" value={all.filter((j) => j.status === "invoiced").length} sub="Issued or covered by contract" onClick={() => { setView("table"); set({ eng: "", status: "invoiced" }); }} />
      </div>
      <div className="fm-row" style={{ flexWrap: "wrap", gap: 10 }}>
        <Filters f={f} set={set} showStatus={view === "table"} />
        <span className="fm-spacer" />
        <Seg value={view} onChange={setView} options={[["kanban", "Board"], ["table", "Table"]]} />
      </div>
      {view === "kanban" ? <Kanban jobs={jobs} /> : <Card flush><JobsTable jobs={jobs} showInvoice /></Card>}
    </>
  );
}

function AllJobs() {
  const s = useFM();
  const deep = s.ui.filters["jobs.status"] || "all";
  const [f, setF] = useState({ eng: "", type: "", q: "", status: deep });
  useEffect(() => { setF((x) => (x.status === deep ? x : { ...x, status: deep })); }, [deep]);
  const jobs = useFilteredJobs(s, f);
  return (
    <>
      <Filters f={f} set={(p) => setF({ ...f, ...p })} showStatus />
      <Card flush><JobsTable jobs={jobs} showInvoice /></Card>
    </>
  );
}

function MyJobs() {
  const s = useFM();
  const [eng, setEng] = useState(s.role === "engineer" ? s.meEngineerId : s.meEngineerId);
  const id = s.role === "engineer" ? s.meEngineerId : eng;
  const e = sel.engineer(s, id)!;
  const mine = s.jobs.filter((j) => j.engineerIds.includes(id));
  const open = mine.filter((j) => j.status === "new" || j.status === "progress").sort((a, b) => ((a.scheduled || "9") < (b.scheduled || "9") ? -1 : 1));
  const recent = mine.filter((j) => j.status === "completed" || j.status === "invoiced").sort((a, b) => ((b.completedAt || "") < (a.completedAt || "") ? -1 : 1)).slice(0, 6);
  const box = s.jobs.filter((j) => j.status === "new" && !j.engineerIds.length && e.divisions.includes(j.division));
  return (
    <>
      {s.role !== "engineer" && (
        <div className="fm-row" style={{ gap: 8 }}>
          <span className="fm-muted" style={{ fontSize: 13 }}>Showing jobs for</span>
          <select className="fm-select" style={{ width: 200 }} value={eng} onChange={(ev) => setEng(ev.target.value)}>
            {s.engineers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
      )}
      <div className="fm-grid fm-g-main">
        <Card title={"Open jobs, " + e.name} sub={open.length + " allocated and not yet complete"}>
          <div className="fm-col-flex">
            {open.map((j) => <JobCard key={j.id} j={j} />)}
            {!open.length && <Empty title="No open jobs" hint="Pick one up from the job box." />}
          </div>
        </Card>
        <div className="fm-col-flex">
          <Card title="Job box" sub={box.length + " unallocated in " + e.name.split(" ")[0] + "'s divisions"}>
            <div className="fm-col-flex">
              {box.map((j) => <JobCard key={j.id} j={j} />)}
              {!box.length && <Empty title="Job box is empty" />}
            </div>
          </Card>
          <Card title="Recently completed" flush>
            <Table<Job> cols={[{ h: "Job", w: "80px", r: (j) => <span className="mono">{j.number}</span> }, { h: "Site", w: "1fr", r: (j) => sel.site(s, j.siteId)!.name }, { h: "Done", w: "90px", r: (j) => fmtDate(j.completedAt) }, { h: "", w: "100px", r: (j) => <JobStatusPill s={j.status} /> }]} rows={recent} onRow={(j) => openDrawer({ kind: "job", id: j.id })} />
          </Card>
        </div>
      </div>
    </>
  );
}

function Completed() {
  const s = useFM();
  const [f, setF] = useState({ eng: "", type: "", q: "", status: "all" });
  const jobs = useFilteredJobs(s, f).filter((j) => j.status === "completed" || j.status === "invoiced");
  const unbilled = jobs.filter((j) => j.status === "completed");
  return (
    <>
      {unbilled.length > 0 && (
        <div className="fm-note accent fm-row" style={{ flexWrap: "wrap" }}>
          <span style={{ flex: 1 }}><b>{unbilled.length} completed job{unbilled.length > 1 ? "s" : ""} not invoiced yet</b>, <Money v={unbilled.reduce((a, j) => a + jobTotals(s, j).value, 0)} /> of work. Oldest finished {relLow(unbilled.map((j) => j.completedAt!).sort()[0])}.</span>
          <Btn size="sm" kind="primary" onClick={() => { const j = unbilled.sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1))[0]; openDrawer({ kind: "job", id: j.id }); }}>Open the oldest</Btn>
        </div>
      )}
      <Filters f={f} set={(p) => setF({ ...f, ...p })} />
      <Card flush><JobsTable jobs={jobs} showInvoice /></Card>
    </>
  );
}

function Reports() {
  const s = useFM();
  const money = useMoneyVisible();
  const jobs = s.jobs.filter((j) => inDivision(s, j.division));
  const by = <K extends string>(keys: K[], fn: (j: Job) => K) => keys.map((k) => ({ k, n: jobs.filter((j) => fn(j) === k).length }));
  const status = by(["new", "progress", "completed", "invoiced"] as JobStatus[], (j) => j.status);
  const divs = DIVISIONS.filter((d) => inDivision(s, d.id)).map((d) => ({ d, n: jobs.filter((j) => j.division === d.id).length, v: jobs.filter((j) => j.division === d.id).reduce((a, j) => a + jobTotals(s, j).value, 0) }));
  const types = by(TYPES, (j) => j.type).filter((x) => x.n);
  const done = jobs.filter((j) => j.startedAt && j.completedAt);
  const avgWork = done.length ? done.reduce((a, j) => a + Math.max(0, diffDays(j.completedAt!, j.startedAt!)), 0) / done.length : 0;
  const invd = jobs.filter((j) => j.status === "invoiced" && j.billedVia === "job" && j.completedAt && sel.invoice(s, j.invoiceId)?.issueDate);
  const avgBill = invd.length ? invd.reduce((a, j) => a + Math.max(0, diffDays(sel.invoice(s, j.invoiceId)!.issueDate!, j.completedAt!)), 0) / invd.length : 0;
  const hours = s.engineers.map((e) => {
    const t = s.time.filter((x) => x.engineerId === e.id && x.jobId && inDivision(s, sel.job(s, x.jobId)!.division));
    return { e, h: t.reduce((a, x) => a + x.hours, 0), b: t.filter((x) => x.kind === "billable").reduce((a, x) => a + x.hours, 0) };
  });
  const maxH = Math.max(...hours.map((h) => h.h), 1);
  const custs = s.customers.map((c) => ({ c, v: jobs.filter((j) => j.customerId === c.id).reduce((a, j) => a + jobTotals(s, j).value, 0), n: jobs.filter((j) => j.customerId === c.id).length })).filter((x) => x.n).sort((a, b) => b.v - a.v).slice(0, 6);
  const maxN = Math.max(...status.map((x) => x.n), 1);
  return (
    <>
      <div className="fm-grid fm-g4">
        <Stat label="Jobs on record" value={jobs.length} sub="Active and recent" />
        <Stat label="Average days on site" value={avgWork.toFixed(1)} sub="First visit to completion" />
        <Stat label="Average days to invoice" value={avgBill.toFixed(1)} sub="Completion to invoice issued" tone={avgBill > 3 ? "warn" : "ok"} />
        <Stat label="Waiting on a return visit" value={jobs.filter((j) => j.status === "progress" && j.returnRequired).length} sub="Parts on order or access" />
      </div>
      <div className="fm-grid fm-g3">
        <Card title="By status">
          <div className="fm-col-flex">
            {status.map((x) => (
              <button key={x.k} className="fm-jobs-barrow" onClick={() => { setFilter("jobs.status", x.k); openTab("all"); }}>
                <span style={{ width: 96 }}><JobStatusPill s={x.k} /></span><span style={{ flex: 1 }}><Bar value={x.n} max={maxN} /></span><b>{x.n}</b>
              </button>
            ))}
          </div>
        </Card>
        <Card title="By division">
          <div className="fm-col-flex">
            {divs.map((x) => (
              <div key={x.d.id} className="fm-jobs-barrow"><span style={{ width: 130 }}><DivTag id={x.d.id} /></span><span style={{ flex: 1 }}><Bar value={x.n} max={jobs.length} color={x.d.color} /></span><b>{x.n}</b>{money && <span className="fm-faint" style={{ width: 70, textAlign: "right" }}>{euro(x.v)}</span>}</div>
            ))}
          </div>
        </Card>
        <Card title="By job type">
          <div className="fm-col-flex">
            {types.map((x) => <div key={x.k} className="fm-jobs-barrow"><span style={{ width: 120 }} className="fm-muted">{x.k}</span><span style={{ flex: 1 }}><Bar value={x.n} max={jobs.length} /></span><b>{x.n}</b></div>)}
          </div>
        </Card>
      </div>
      <div className="fm-grid fm-g2">
        <Card title="Hours on jobs by engineer" sub="Billable share in colour, all recorded job time in grey">
          <div className="fm-col-flex">
            {hours.map((h) => (
              <button key={h.e.id} className="fm-jobs-barrow" onClick={() => openDrawer({ kind: "engineer", id: h.e.id })}>
                <span style={{ width: 120 }} className="fm-ink">{h.e.name}</span>
                <span style={{ flex: 1, position: "relative" }}><Bar value={h.h} max={maxH} color="var(--border-strong)" /><span style={{ position: "absolute", inset: 0 }}><Bar value={h.b} max={maxH} color={h.e.color} /></span></span>
                <b style={{ width: 72, textAlign: "right" }}>{h.b} / {h.h} h</b>
              </button>
            ))}
          </div>
        </Card>
        <Card title="Top customers by job value" flush>
          <Table cols={[{ h: "Customer", w: "1fr", r: (x: (typeof custs)[number]) => <span className="main">{x.c.name}</span> }, { h: "Jobs", w: "60px", num: true, r: (x) => x.n }, { h: "Value", w: "100px", num: true, r: (x) => <Money v={x.v} /> }]} rows={custs} onRow={(x) => openDrawer({ kind: "customer", id: x.c.id })} />
        </Card>
      </div>
    </>
  );
}

const openTab = (t: string) => setTab("Jobs", t);

export default function JobsPage({ tab }: { tab: string }) {
  const s = useFM();
  const titles: Record<string, [string, string]> = {
    board: ["Job board", "Every job from the phone call to the paid invoice. Drag between New and In progress; completion always needs the engineer's confirmation."],
    all: ["All jobs", "Search and sort every job on record."],
    mine: [s.role === "engineer" ? "My jobs" : "Jobs by engineer", "Allocated work and the shared job box."],
    completed: ["Completed jobs", "Finished work and whether it has been invoiced."],
    reports: ["Job reports", "Where the work is and how fast it turns into an invoice."],
  };
  const [title, sub] = titles[tab] || titles.board;
  return (
    <Page eyebrow="Operations" title={title} sub={sub} actions={<Btn kind="primary" icon="plus" onClick={() => openModal({ kind: "new-job" })}>New job</Btn>}>
      {tab === "all" ? <AllJobs /> : tab === "mine" ? <MyJobs /> : tab === "completed" ? <Completed /> : tab === "reports" ? <Reports /> : <Board />}
    </Page>
  );
}

/* ── Job record ─────────────────────────────────────────────────────────── */
export function JobDrawer({ id }: { id: string }) {
  const s = useFM();
  const j = sel.job(s, id);
  const [note, setNote] = useState("");
  if (!j) return <div className="fm-drawer-b"><Empty title="Job not found" /></div>;
  const site = sel.site(s, j.siteId)!;
  const cust = sel.customer(s, j.customerId)!;
  const t = jobTotals(s, j);
  const inv = sel.invoice(s, j.invoiceId);
  const notice = s.comms.find((c) => c.jobId === j.id && c.kind === "Completion notice");
  const assets = s.assets.filter((a) => j.assetIds.includes(a.id));
  const assigned = s.role !== "engineer" || j.engineerIds.includes(s.meEngineerId);
  const showCode = canSeeAccessCodes(s.role) && assigned;
  const open = j.status === "new" || j.status === "progress";
  const rate = COMPANY.labourRates[j.division];
  const quote = sel.quote(s, j.quoteId);
  const contract = sel.contract(s, j.contractId);
  const prepInvoice = () => {
    const d = inv || draftInvoiceForJob(j.id);
    openDrawer({ kind: "invoice", id: d.id });
  };
  return (
    <>
      <DrawerHead
        eyebrow={j.number + (j.woRef ? " · " + j.woRef : "")}
        title={site.name}
        pills={<><JobStatusPill s={j.status} /><PriorityPill p={j.priority} /></>}
        sub={<><DivTag id={j.division} long /> <span className="fm-faint">· {j.type} · created {fmtDate(j.createdAt)} by {j.source.toLowerCase()}</span></>}
      />
      <div className="fm-drawer-b">
        {j.returnRequired && j.status === "progress" && <div className="fm-note warn"><b>Return visit required.</b> {j.returnNote} {j.scheduled && j.scheduled >= TODAY ? "Booked " + fmtDate(j.scheduled) + "." : "No date booked yet."}</div>}
        {j.status === "completed" && !inv && j.billedVia === "job" && <div className="fm-note bad"><b>Completed {diffDays(TODAY, j.completedAt!) === 0 ? "today" : diffDays(TODAY, j.completedAt!) + " days ago"} and not invoiced.</b> All visits, time and materials are already consolidated below.</div>}
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--body)" }}>{j.description}</div>
        <div className="fm-kv">
          <div><div className="k">Customer</div><div className="v"><RecLink to={{ kind: "customer", id: cust.id }}>{cust.name}</RecLink></div></div>
          <div><div className="k">Site</div><div className="v"><RecLink to={{ kind: "site", id: site.id }}>{site.name}</RecLink></div></div>
          <div><div className="k">Address</div><div className="v" title={site.address}>{site.town}, {site.eircode}</div></div>
          <div><div className="k">Engineers</div><div className="v" style={{ display: "flex", gap: 6, alignItems: "center" }}><Avatars ids={j.engineerIds} size={20} /> {j.engineerIds.map((e) => sel.engineer(s, e)!.name.split(" ")[0]).join(", ")}</div></div>
          <div><div className="k">Scheduled</div><div className="v">{j.scheduled ? fmtDate(j.scheduled) + (j.scheduledEnd ? " to " + fmtDate(j.scheduledEnd) : "") : "Not scheduled"}</div></div>
          <div><div className="k">Work order</div><div className="v">{j.woRef || "None"}</div></div>
          {quote && <div><div className="k">From quote</div><div className="v"><RecLink to={{ kind: "quote", id: quote.id }}>{quote.number}</RecLink></div></div>}
          {contract && <div><div className="k">Contract</div><div className="v"><RecLink to={{ kind: "contract", id: contract.id }}>{contract.ref}</RecLink> ({j.billedVia === "contract" ? "billed by contract" : "billed per visit"})</div></div>}
        </div>

        <div className="fm-sec">Site access</div>
        <div className="fm-note">{site.accessNotes}</div>
        {showCode ? (
          <div className="fm-note" style={{ display: "flex", gap: 8, alignItems: "center" }}><Ico d="lock" size={14} /> <span><b className="fm-ink">Access code:</b> {site.accessCode} <span className="fm-faint">(internal only, never on customer documents)</span></span></div>
        ) : (
          <div className="fm-lock"><Ico d="lock" size={13} /> Access codes are only shown to authorised users and assigned engineers.</div>
        )}

        {assets.length > 0 && (
          <>
            <div className="fm-sec">Linked assets</div>
            <div className="fm-col-flex" style={{ gap: 6 }}>
              {assets.map((a) => <div key={a.id} className="fm-row" style={{ fontSize: 13 }}><Pill>{a.type}</Pill><span className="fm-trunc">{a.description}</span><span className="fm-faint" style={{ fontSize: 12 }}>last serviced {fmtDate(a.lastService)}</span></div>)}
            </div>
          </>
        )}

        <div className="fm-sec">Labour and materials, all visits</div>
        <div className="fm-kv">
          <div><div className="k">Visits</div><div className="v">{t.visits.length}</div></div>
          <div><div className="k">Billable labour</div><div className="v">{t.billableHours} h × <Money v={rate} /></div></div>
          <div><div className="k">Labour value</div><div className="v"><Money v={t.labourValue} /></div></div>
          <div><div className="k">Materials</div><div className="v"><Money v={t.materialsValue} /></div></div>
          <div style={{ borderColor: "var(--accent-line)" }}><div className="k">{j.agreedPrice ? "Agreed price" : "Job value"}</div><div className="v" style={{ fontWeight: 600 }}><Money v={t.value} /></div></div>
        </div>
        {j.agreedPrice && <div className="fm-faint" style={{ fontSize: 12 }}>This job has an agreed price from its quote. Time is recorded for costing, the invoice uses the agreed price.</div>}

        <div className="fm-sec">Visits</div>
        {t.visits.length ? (
          <div className="fm-timeline">
            {t.visits.map((v, i) => (
              <div className="fm-tl" key={v.id}>
                <i />
                <div style={{ minWidth: 0 }}>
                  <div className="t"><b>Visit {i + 1}</b>, {fmtDate(v.date)} {v.start} to {v.end}, {v.hours} h, {sel.engineer(s, v.engineerId)?.name}</div>
                  <div className="m">{v.summary}</div>
                  <div className="m">{v.locationVerified ? "Arrival and departure location verified (simulated)" : "Location not verified"}{v.returnRequired ? " · return required" : ""}</div>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="fm-faint" style={{ fontSize: 13 }}>No visits logged yet.</div>}

        <div className="fm-sec">Time entries</div>
        <Table cols={[
          { h: "Date", w: "84px", r: (x: (typeof t.time)[number]) => <span className="mono">{fmtDate(x.date)}</span> },
          { h: "Engineer", w: "1fr", r: (x) => sel.engineer(s, x.engineerId)?.name },
          { h: "Type", w: "110px", r: (x) => <Pill tone={x.kind === "billable" ? "accent" : ""}>{x.kind}</Pill> },
          { h: "Hours", w: "60px", num: true, r: (x) => x.hours },
          { h: "", w: "90px", r: (x) => x.approved ? <Pill tone="ok">Approved</Pill> : <span className="fm-faint" style={{ fontSize: 12 }}>Pending</span> },
        ]} rows={t.time} empty={<div className="fm-faint" style={{ fontSize: 12.5, padding: 12 }}>No time recorded.</div>} />

        <div className="fm-sec">Materials</div>
        <Table cols={[
          { h: "Item", w: "1fr", r: (m: (typeof t.materials)[number]) => <span className="main">{m.description}</span> },
          { h: "Added", w: "110px", r: (m) => <span className="fm-faint">{m.addedBy.split(" ")[0]}, {fmtDate(m.date)}</span> },
          { h: "Qty", w: "44px", num: true, r: (m) => m.qty },
          { h: "Each", w: "74px", num: true, r: (m) => <Money v={m.unitPrice} dp={2} /> },
          { h: "Total", w: "80px", num: true, r: (m) => <Money v={m.qty * m.unitPrice} dp={2} /> },
        ]} rows={t.materials} empty={<div className="fm-faint" style={{ fontSize: 12.5, padding: 12 }}>No materials recorded.</div>} />

        <div className="fm-sec">Photos</div>
        <div className="fm-grid fm-g3" style={{ gap: 8 }}>
          {j.photos.map((p) => <div key={p.id} className="fm-photo" style={{ background: photoBg(p.hue) }}><span>{p.caption}<br />{p.by.split(" ")[0]}, {p.at.slice(5, 16)}</span></div>)}
          <button className="fm-photo fm-jobs-addphoto" onClick={() => openModal({ kind: "add-photo", jobId: j.id })}><Ico d="camera" size={18} /> Add photo</button>
        </div>

        <div className="fm-sec">Internal notes</div>
        {j.internalNotes.map((n, i) => <div key={i} className="fm-note">{n}</div>)}
        <div className="fm-row">
          <input className="fm-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team (not shown to the customer)" onKeyDown={(e) => { if (e.key === "Enter" && note.trim()) { addNote(j.id, note.trim()); setNote(""); } }} />
          <Btn disabled={!note.trim()} onClick={() => { addNote(j.id, note.trim()); setNote(""); }}>Add</Btn>
        </div>

        {(j.status === "completed" || j.status === "invoiced") && (
          <>
            <div className="fm-sec">Completion</div>
            <div className="fm-note ok">
              <div><b>Confirmed complete by {j.completionConfirmedBy}</b> on {fmtDate(j.completedAt)}.</div>
              <div style={{ marginTop: 6 }}>{j.completionNotes}</div>
            </div>
            <div className="fm-row" style={{ flexWrap: "wrap" }}>
              <span style={{ fontSize: 13 }}>Completion notice: </span>
              {notice ? <Pill tone={notice.status === "sent (simulated)" ? "ok" : "warn"}>{notice.status === "sent (simulated)" ? "Sent " + notice.at.slice(5, 16) + " (simulated)" : "Waiting for approval"}</Pill> : <Pill>Not prepared</Pill>}
              <span className="fm-spacer" />
              {notice && notice.status !== "sent (simulated)" && <Btn size="sm" kind="primary" icon="mail" onClick={() => sendComm(notice.id)}>Approve and send notice</Btn>}
              {!notice && <Btn size="sm" icon="mail" onClick={() => prepareCompletionNotice(j.id)}>Prepare completion notice</Btn>}
            </div>
            {notice && notice.status !== "sent (simulated)" && <pre className="fm-note" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, fontSize: 12.5 }}>{"To: " + notice.to + "\nSubject: " + notice.subject + "\n\n" + notice.body}</pre>}
          </>
        )}

        <div className="fm-sec">Invoice</div>
        {j.billedVia === "contract" ? (
          <div className="fm-note">Covered by contract {contract?.ref}. Service visits on this contract are billed on the contract schedule, never per job.</div>
        ) : inv ? (
          <div className="fm-row" style={{ flexWrap: "wrap" }}>
            <span className="mono fm-ink">{inv.number || "Draft"}</span>
            <InvoiceStatusPill s={inv.status} />
            <Money v={invoiceGross(inv)} dp={2} />
            <span className="fm-spacer" />
            <Btn size="sm" kind={inv.status === "draft" ? "primary" : undefined} onClick={() => openDrawer({ kind: "invoice", id: inv.id })}>{inv.status === "draft" ? "Review and approve" : "Open invoice"}</Btn>
          </div>
        ) : (
          <div className="fm-faint" style={{ fontSize: 13 }}>{j.status === "completed" ? "Ready to invoice." : "Invoiced after the engineer confirms completion."}</div>
        )}

        <div className="fm-sec">Activity</div>
        <div className="fm-timeline">
          {j.history.slice().reverse().map((h, i) => (
            <div className="fm-tl" key={i}><i style={{ borderColor: "var(--border-strong)" }} /><div><div className="t">{h.text}</div><div className="m">{h.who} · {h.at.slice(0, 16)}</div></div></div>
          ))}
        </div>
      </div>
      <div className="fm-drawer-f">
        {j.status === "new" && (s.role === "engineer"
          ? (!j.engineerIds.includes(s.meEngineerId) && <Btn kind="primary" onClick={() => acceptJob(j.id, s.meEngineerId)}>Accept job</Btn>)
          : <Btn onClick={() => openModal({ kind: "allocate-job", jobId: j.id })}>{j.engineerIds.length ? "Reallocate" : "Allocate"}</Btn>)}
        {j.status === "new" && <Btn icon="play" onClick={() => startJob(j.id, s.role === "engineer" ? s.meEngineerId : undefined)}>Start work</Btn>}
        {open && <Btn kind={j.status === "progress" ? "primary" : undefined} icon="clock" onClick={() => openModal({ kind: "log-visit", jobId: j.id })}>Log visit</Btn>}
        {open && <Btn icon="box" onClick={() => openModal({ kind: "add-material", jobId: j.id })}>Add material</Btn>}
        {j.status === "progress" && <Btn icon="flag" onClick={() => openModal({ kind: "leave-site", jobId: j.id })}>Leave site, return</Btn>}
        {open && <Btn icon="check" onClick={() => openModal({ kind: "complete-job", jobId: j.id })}>Complete job</Btn>}
        {j.status === "completed" && j.billedVia === "job" && s.role !== "engineer" && <Btn kind="primary" icon="finance" onClick={prepInvoice}>{inv ? "Review invoice" : "Prepare invoice"}</Btn>}
        {j.status === "completed" && <Btn kind="ghost" onClick={() => reopenJob(j.id)}>Reopen</Btn>}
        <span className="fm-spacer" />
        <span className="fm-faint" style={{ fontSize: 11.5 }}>{divisionById(j.division).name}</span>
      </div>
    </>
  );
}
