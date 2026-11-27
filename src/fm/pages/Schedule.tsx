/* Scheduling and dispatch: company calendar, engineer agendas, the
   installation planner, unallocated work and availability.
   Vehicle tracking stays in Charlie's existing system and is not duplicated. */
import { useState, type DragEvent } from "react";
import {
  fm, useFM, sel, inDivision, allocateJob, openDrawer, setFilter, go, toast, mutate, skillFor,
  findInstallSlots, resolveConflicts, bookInstallation, proposeBooking, engineerDay, getLastBookingNotes, type SlotOption,
} from "../store";
import { TODAY, addDays, addWorkingDays, dayShort, diffDays, fmtDate, fmtDay, isWeekend, isWorkingDay, monthName, nextWorkingDay, parse, weekStart, isShutdown } from "../dates";
import { Page, Card, Stat, Table, Btn, Pill, Avatar, Avatars, Field, Steps, Seg, Ico, DivTag, Empty, PriorityPill, Money } from "../ui";
import { dayEvents, moveService, qualifiedFor, suggestEngineers, allocateServiceVisit, type CalEv } from "./service/shared";
import type { FMState, Job, Skill } from "../types";

export default function SchedulePage({ tab }: { tab: string }) {
  switch (tab) {
    case "engineer": return <EngineerSchedule />;
    case "installs": return <InstallPlanner />;
    case "unallocated": return <Unallocated />;
    case "availability": return <Availability />;
    default: return <CompanyCalendar />;
  }
}

/* ── Company calendar ───────────────────────────────────────────────────── */
type View = "day" | "week" | "month";

function engineersInScope(s: FMState) {
  if (s.role === "engineer") return s.engineers.filter((e) => e.id === s.meEngineerId);
  return s.engineers.filter((e) => s.division === "ALL" || e.divisions.includes(s.division));
}

function EvChip({ ev, s }: { ev: CalEv; s: FMState }) {
  const job = ev.jobId ? sel.job(s, ev.jobId) : undefined;
  const label = ev.kind === "holiday" ? "Annual leave" : (ev.ref ? ev.ref + " · " : ev.kind === "service" ? "PPM · " : "") + ev.label.replace(/^PPM: /, "");
  return (
    <button
      className={"fm-ev " + ev.kind + (ev.proposed ? " proposed" : "")}
      draggable={ev.draggable && s.role !== "engineer"}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ jobId: ev.kind === "job" ? ev.jobId : undefined, svId: ev.svId }))}
      onClick={() => (ev.svId ? openDrawer({ kind: "serviceVisit", id: ev.svId }) : ev.jobId ? openDrawer({ kind: "job", id: ev.jobId }) : undefined)}
      title={label + (ev.kind !== "holiday" ? " (" + ev.hours + " h)" + (ev.proposed ? ", proposed" : "") : "") + (job ? ", " + job.priority + " priority" : "")}
    >
      {label}
    </button>
  );
}

function useDrop(s: FMState) {
  const [over, setOver] = useState("");
  const onDrop = (e: DragEvent, engineerId: string, date: string) => {
    e.preventDefault();
    setOver("");
    let data: { jobId?: string; svId?: string } = {};
    try { data = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
    const eng = sel.engineer(s, engineerId)!;
    if (eng.holidays.includes(date)) return toast(eng.name.split(" ")[0] + " is on annual leave on " + fmtDate(date), "warn");
    if (!isWorkingDay(date)) return toast(fmtDate(date) + " is not a working day", "warn");
    if (data.svId) return moveService(s, data.svId, engineerId, date);
    if (data.jobId) {
      const j = sel.job(s, data.jobId)!;
      if (j.scheduledEnd) return toast("Multi-day installations are moved from the Installation planner", "warn");
      const skill = skillFor(j.division, j.description);
      if (!eng.skills.includes(skill)) toast(eng.name.split(" ")[0] + " isn't listed for " + skill.toLowerCase() + ". Allocated anyway, check the job", "warn");
      allocateJob(j.id, [engineerId], date);
    }
  };
  const cellProps = (engineerId: string, date: string) => ({
    onDragOver: (e: DragEvent) => { e.preventDefault(); if (over !== engineerId + date) setOver(engineerId + date); },
    onDragLeave: () => setOver(""),
    onDrop: (e: DragEvent) => onDrop(e, engineerId, date),
  });
  return { over, cellProps };
}

function CompanyCalendar() {
  const s = useFM();
  const anchor = s.ui.filters.schedWeek || weekStart(addDays(TODAY, 3));
  const view = (s.ui.filters.schedView as View) || "week";
  const week = weekStart(anchor);
  const mfirst = (view === "month" ? anchor : addDays(week, 3)).slice(0, 8) + "01";
  const [day, setDay] = useState(nextWorkingDay(addDays(TODAY, 1)));
  const [who, setWho] = useState("all");
  const { over, cellProps } = useDrop(s);
  const engineers = engineersInScope(s).filter((e) => who === "all" || e.id === who);
  const unalloc = s.jobs.filter((j) => j.status === "new" && !j.engineerIds.length && inDivision(s, j.division));
  const days = view === "day" ? [day] : [0, 1, 2, 3, 4].map((k) => addDays(week, k));
  const shift = (n: number) => {
    if (view === "day") setDay((d) => (n > 0 ? addWorkingDays(d, 1) : (() => { let x = addDays(d, -1); while (!isWorkingDay(x)) x = addDays(x, -1); return x; })()));
    else if (view === "week") setFilter("schedWeek", addDays(week, 7 * n));
    else setFilter("schedWeek", addDays(mfirst, n > 0 ? 40 : -10).slice(0, 8) + "15");
  };
  const title = view === "day" ? fmtDate(day, true) : view === "week" ? "Week of " + fmtDay(week) : monthName(mfirst.slice(0, 7));
  return (
    <Page eyebrow="Schedule" title="Company calendar" sub="Reactive callouts, planned servicing, multi-day installations and leave in one view. Drag a job or service visit onto an engineer and day to allocate it."
      actions={<>
        <Seg value={view} options={[["day", "Day"], ["week", "Week"], ["month", "Month"]]} onChange={(v) => setFilter("schedView", v)} />
      </>}>
      <div className="fm-row" style={{ flexWrap: "wrap" }}>
        <Btn size="sm" icon="back" onClick={() => shift(-1)}>Previous</Btn>
        <Btn size="sm" onClick={() => { setFilter("schedWeek", weekStart(addDays(TODAY, 3))); setDay(nextWorkingDay(TODAY)); }}>This week</Btn>
        <Btn size="sm" onClick={() => shift(1)}>Next <Ico d="arrow" size={13} /></Btn>
        <b className="fm-ink" style={{ fontSize: 15, marginLeft: 6 }}>{title}</b>
        <span className="fm-spacer" />
        {s.role !== "engineer" && (
          <select className="fm-select" style={{ width: 210, height: 32 }} value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="all">Whole company</option>
            {engineersInScope(s).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}
        <Legend />
      </div>
      {view === "month" ? (
        <MonthGrid s={s} first={mfirst} engineers={engineers} onPick={(d) => { setDay(d); setFilter("schedWeek", weekStart(d)); setFilter("schedView", "day"); }} />
      ) : (
        <div className="fm-grid" style={{ gridTemplateColumns: unalloc.length && s.role !== "engineer" ? "minmax(0,1fr) 230px" : "minmax(0,1fr)" }}>
          <Card flush>
            <div className="fm-scrollx">
              <div className="fm-cal" style={{ gridTemplateColumns: "170px repeat(" + days.length + ", minmax(" + (view === "day" ? 380 : 150) + "px,1fr))", minWidth: view === "day" ? 560 : 920 }}>
                <div className="hd">Engineer</div>
                {days.map((d) => <div key={d} className={"hd" + (d === TODAY ? " today" : "")}>{dayShort(d)} {parse(d).getDate()}{isShutdown(d) ? " · closed" : ""}</div>)}
                {engineers.map((e) => (
                  <Row key={e.id} e={e} days={days} s={s} over={over} cellProps={cellProps} />
                ))}
              </div>
            </div>
            {!engineers.length && <Empty title="No engineers in this division" />}
          </Card>
          {unalloc.length > 0 && s.role !== "engineer" && (
            <Card title="Unallocated jobs" sub="Drag onto the calendar">
              <div className="fm-col-flex" style={{ gap: 8 }}>
                {unalloc.map((j) => (
                  <button key={j.id} className="fm-jc" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ jobId: j.id }))} onClick={() => openDrawer({ kind: "job", id: j.id })}>
                    <span className="n">{j.number} <PriorityPill p={j.priority} /></span>
                    <span className="t">{sel.site(s, j.siteId)!.name}</span>
                    <span className="s">{j.description.split(".")[0]}</span>
                    <span className="f"><DivTag id={j.division} /><span className="fm-faint" style={{ fontSize: 11.5 }}>{j.estHours} h</span></span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
}

function Row({ e, days, s, over, cellProps }: { e: FMState["engineers"][number]; days: string[]; s: FMState; over: string; cellProps: (eid: string, d: string) => object }) {
  return (
    <>
      <div className="rowh">
        <Avatar e={e} size={24} />
        <div style={{ minWidth: 0 }}>
          <div className="fm-trunc" style={{ fontWeight: 500 }}>{e.name}</div>
          <div className="fm-faint fm-trunc" style={{ fontSize: 11 }}>{e.skills.slice(0, 2).join(", ")}</div>
        </div>
      </div>
      {days.map((d) => {
        const day = dayEvents(s, e.id, d);
        const off = !isWorkingDay(d);
        return (
          <div key={d} className={"cell" + (off ? " we" : "") + (over === e.id + d ? " over" : "")} {...cellProps(e.id, d)} style={day.clash ? { boxShadow: "inset 0 0 0 1px var(--bad)" } : undefined}>
            {day.evs.map((ev) => <EvChip key={ev.key} ev={ev} s={s} />)}
            {!off && (
              <span style={{ marginTop: "auto", fontSize: 10.5, color: day.clash ? "var(--bad)" : "var(--faint)", fontFamily: "var(--mono)" }}>
                {day.onLeave ? (day.evs.length > 1 ? "Booked on leave" : "") : day.clash ? day.hours + " h booked, over capacity" : day.evs.length ? day.free + " h free" : "Free"}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

function Legend() {
  const item = (cls: string, l: string) => <span className="fm-tag" key={l}><i className={"fm-ev " + cls} style={{ width: 10, height: 10, padding: 0, borderLeftWidth: 3 }} />{l}</span>;
  return <div className="fm-row" style={{ gap: 12, flexWrap: "wrap" }}>{[item("job", "Job"), item("install", "Installation"), item("service", "PPM service"), item("holiday", "Leave")]}</div>;
}

function MonthGrid({ s, first, engineers, onPick }: { s: FMState; first: string; engineers: FMState["engineers"]; onPick: (d: string) => void }) {
  const start = weekStart(first);
  const cells = Array.from({ length: 42 }, (_, k) => addDays(start, k)).filter((d, k) => k < 35 || d.slice(0, 7) === first.slice(0, 7));
  return (
    <Card flush>
      <div className="fm-cal" style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="hd">{d}</div>)}
        {cells.map((d) => {
          const inMonth = d.slice(0, 7) === first.slice(0, 7);
          const counts = { install: 0, job: 0, service: 0, holiday: 0, clash: 0 };
          engineers.forEach((e) => {
            const day = dayEvents(s, e.id, d);
            day.evs.forEach((ev) => counts[ev.kind]++);
            if (day.clash) counts.clash++;
          });
          return (
            <button key={d} className={"cell" + (isWeekend(d) || isShutdown(d) ? " we" : "")} onClick={() => onPick(d)} style={{ all: "unset", boxSizing: "border-box", padding: 7, minHeight: 84, cursor: "pointer", opacity: inMonth ? 1 : 0.45, display: "flex", flexDirection: "column", gap: 3, borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, fontWeight: d === TODAY ? 700 : 500, color: d === TODAY ? "var(--accent)" : "var(--ink)" }}>{parse(d).getDate()}{isShutdown(d) ? " · closed" : ""}</span>
              {counts.install > 0 && <span className="fm-ev install">{counts.install} on installs</span>}
              {counts.job > 0 && <span className="fm-ev job">{counts.job} job{counts.job > 1 ? "s" : ""}</span>}
              {counts.service > 0 && <span className="fm-ev service">{counts.service} PPM</span>}
              {counts.holiday > 0 && <span className="fm-ev holiday">{counts.holiday} on leave</span>}
              {counts.clash > 0 && <span style={{ fontSize: 10.5, color: "var(--bad)" }}>{counts.clash} clash{counts.clash > 1 ? "es" : ""}</span>}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Engineer schedule ──────────────────────────────────────────────────── */
function EngineerSchedule() {
  const s = useFM();
  const [eid, setEid] = useState(s.role === "engineer" ? s.meEngineerId : "e1");
  const e = sel.engineer(s, eid)!;
  const days = [TODAY].concat(Array.from({ length: 9 }, (_, k) => addWorkingDays(TODAY, k + 1)));
  const total = days.reduce((a, d) => a + dayEvents(s, eid, d).hours, 0);
  return (
    <Page eyebrow="Schedule" title="Engineer schedule" sub="The next two working weeks for one engineer, from the same records the engineer app uses."
      actions={s.role !== "engineer" ? (
        <select className="fm-select" style={{ width: 220 }} value={eid} onChange={(ev) => setEid(ev.target.value)}>
          {s.engineers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      ) : undefined} noDivision>
      <Card>
        <div className="fm-row" style={{ flexWrap: "wrap", gap: 14 }}>
          <Avatar e={e} size={40} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="fm-card-t">{e.name}</div>
            <div className="fm-card-s">{e.title} · {e.skills.join(", ")}{e.arrangement ? " · " + e.arrangement : ""}</div>
          </div>
          <Stat label="Booked, next 10 days" value={total + " h"} sub={Math.round((total / 80) * 100) + "% of capacity"} />
        </div>
      </Card>
      <div className="fm-col-flex">
        {days.map((d) => {
          const day = dayEvents(s, eid, d);
          return (
            <Card key={d} title={<span className="fm-row">{fmtDate(d)}{d === TODAY && <Pill tone="accent">Today</Pill>}{day.clash && <Pill tone="bad">Clash</Pill>}</span>} sub={day.onLeave ? "Annual leave" : day.hours + " h booked · " + day.free + " h free"}>
              {!day.evs.length && <div className="fm-faint" style={{ fontSize: 13 }}>Nothing booked. Free for reactive work.</div>}
              <div className="fm-col-flex" style={{ gap: 6 }}>
                {day.evs.map((ev) => (
                  <div key={ev.key} className="fm-row fm-note" style={{ padding: "9px 12px", cursor: ev.jobId || ev.svId ? "pointer" : undefined }} onClick={() => (ev.svId ? openDrawer({ kind: "serviceVisit", id: ev.svId }) : ev.jobId ? openDrawer({ kind: "job", id: ev.jobId }) : undefined)}>
                    <Pill tone={ev.kind === "install" ? "accent" : ev.kind === "service" ? "ok" : ev.kind === "holiday" ? "" : "info"}>{ev.kind === "install" ? "Installation" : ev.kind === "service" ? (ev.proposed ? "PPM, proposed" : "PPM service") : ev.kind === "holiday" ? "Leave" : "Job"}</Pill>
                    {ev.ref && <span className="fm-mono fm-faint">{ev.ref}</span>}
                    <span className="fm-ink fm-trunc" style={{ flex: 1 }}>{ev.label.replace(/^PPM: /, "")}</span>
                    <span className="fm-faint" style={{ fontSize: 12 }}>{ev.kind === "holiday" ? "All day" : ev.hours + " h"}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

/* ── Installation planner (Story four) ──────────────────────────────────── */
function dedupe(o: SlotOption): SlotOption {
  const svcJobs = new Set(o.conflicts.filter((c) => c.kind === "service" && c.jobId).map((c) => c.engineerId + c.date + c.jobId));
  const seen = new Set<string>();
  const conflicts = o.conflicts.filter((c) => {
    if (c.kind === "job" && svcJobs.has(c.engineerId + c.date + c.jobId)) return false;
    const k = c.engineerId + c.date + c.kind + (c.svId || c.jobId || c.label);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const n = conflicts.length;
  const note = o.note.startsWith("Earliest start") ? (n ? "Earliest start. " + n + " clash" + (n > 1 ? "es" : "") + " to resolve first" : "Earliest start, no clashes") : o.note;
  return { ...o, conflicts, note };
}

/** Put a qualified engineer on any day a crew member is on leave. */
function coverLeave(s: FMState, jobId: string, opt: SlotOption, skill: Skill) {
  const leave = opt.conflicts.filter((c) => c.kind === "holiday");
  if (!leave.length) return [];
  const notes: string[] = [];
  let bookings = s.installBookings.slice();
  leave.forEach((c) => {
    const cover = s.engineers.find((e) => !opt.engineerIds.includes(e.id) && e.skills.includes(skill) && !e.holidays.includes(c.date) && engineerDay(s, e.id, c.date).free >= 8);
    const b = bookings.find((x) => x.jobId === jobId && x.engineerIds.includes(c.engineerId) && x.from <= c.date && x.to >= c.date);
    if (!b) return;
    const rest = b.engineerIds.filter((x) => x !== c.engineerId);
    const parts = [] as typeof bookings;
    if (rest.length) parts.push({ ...b, id: b.id + "r", engineerIds: rest });
    if (b.from < c.date) parts.push({ ...b, id: b.id + "a", engineerIds: [c.engineerId], to: addDays(c.date, -1) });
    if (b.to > c.date) parts.push({ ...b, id: b.id + "b", engineerIds: [c.engineerId], from: addDays(c.date, 1) });
    if (cover) parts.push({ ...b, id: b.id + "c", engineerIds: [cover.id], from: c.date, to: c.date });
    bookings = bookings.filter((x) => x.id !== b.id).concat(parts);
    notes.push(cover ? cover.name + " covers " + fmtDate(c.date) : "No cover found for " + fmtDate(c.date));
  });
  mutate(() => ({ installBookings: bookings }), "Leave cover arranged on the installation: " + notes.join("; "), "schedule", jobId);
  return notes;
}

/** Visits pushed to after the install can pile onto one day; spread them out. */
function spreadOverflow(engineerIds: string[], after: string): string[] {
  const notes: string[] = [];
  engineerIds.forEach((eid) => {
    let d = addWorkingDays(after, 1);
    for (let k = 0; k < 12; k++) {
      let st = fm.get();
      let day = dayEvents(st, eid, d);
      let guard = 0;
      while (day.hours > 8 && guard++ < 6) {
        const ev = day.evs.filter((x) => x.kind === "service" && x.svId).pop();
        if (!ev) break;
        let to = addWorkingDays(d, 1);
        while (dayEvents(st, eid, to).hours + ev.hours > 8 || sel.engineer(st, eid)!.holidays.includes(to)) to = addWorkingDays(to, 1);
        const v = st.serviceVisits.find((x) => x.id === ev.svId)!;
        mutate((x) => ({
          serviceVisits: x.serviceVisits.map((y) => (y.id === v.id ? { ...y, date: to } : y)),
          jobs: x.jobs.map((j) => (v.jobId && j.id === v.jobId ? { ...j, scheduled: to } : j)),
        }), "PPM at " + sel.site(st, v.siteId)!.name + " moved to " + fmtDate(to) + " to keep " + sel.engineer(st, eid)!.name.split(" ")[0] + " within 8 hours", "schedule");
        notes.push("PPM at " + sel.site(st, v.siteId)!.name + " spread to " + fmtDate(to) + " so nobody is over 8 hours");
        st = fm.get();
        day = dayEvents(st, eid, d);
      }
      d = addWorkingDays(d, 1);
    }
  });
  return notes;
}

type Opt = { opt: SlotOption; resolved?: { option: SlotOption; changes: string[] } };

function InstallPlanner() {
  const s = useFM();
  const q = sel.quote(s, "q6");
  const [quoteId, setQuoteId] = useState(q && !q.jobId ? "q6" : "");
  const quote = quoteId ? sel.quote(s, quoteId) : undefined;
  const [title, setTitle] = useState(quote?.title || "Fire alarm system replacement, production hall");
  const [siteId, setSiteId] = useState(quote?.siteId || "s26");
  const [skill, setSkill] = useState<Skill>("Fire");
  const [crew, setCrew] = useState(2);
  const [daysN, setDaysN] = useState(quote?.estDays || 15);
  const [from, setFrom] = useState("2026-12-01");
  const [steps, setSteps] = useState<{ label: string; detail: string }[]>([]);
  const [running, setRunning] = useState(false);
  const [opts, setOpts] = useState<Opt[]>([]);
  const [booked, setBooked] = useState<{ jobId: string; from: string; to: string; notes: string[] } | null>(null);
  const [proposed, setProposed] = useState(false);
  const site = sel.site(s, siteId)!;
  const division = quote?.division || (skill === "CCTV" || skill === "Access control" || skill === "Intercom" ? "SS" : skill === "Maintenance" || skill === "Gardening" ? "LPM" : "LFL");
  const openQuotes = s.quotes.filter((x) => !x.jobId && (x.stage === "Awaiting Decision" || x.stage === "Quote Sent" || x.stage === "Accepted"));

  const check = () => {
    setRunning(true);
    setSteps([]);
    setOpts([]);
    setBooked(null);
    setProposed(false);
    const found = findInstallSlots(s, { skill, engineers: crew, workingDays: daysN, from }).map(dedupe);
    const qual = s.engineers.filter((e) => e.skills.includes(skill));
    const installs = s.installBookings.filter((b) => b.to >= from).length;
    const svc = s.serviceVisits.filter((v) => v.status !== "completed" && v.date >= from && v.engineerId && qual.some((e) => e.id === v.engineerId)).length;
    const st = [
      { label: "Required skills", detail: qual.length + " engineers qualified for " + skill.toLowerCase() + ": " + qual.map((e) => e.name.split(" ")[0]).join(", ") },
      { label: "Current bookings", detail: "Checked every booking from " + fmtDate(from) + " for " + crew + "-person crews" },
      { label: "Available working days", detail: daysN + " working days needed. Weekends and the 24 Dec to 1 Jan shutdown excluded" },
      { label: "Existing installations", detail: installs + " installation booking" + (installs === 1 ? "" : "s") + " running or upcoming" },
      { label: "Service commitments", detail: svc + " planned service visit" + (svc === 1 ? "" : "s") + " for qualified engineers" },
      { label: "Conflicts", detail: found.length + " options found. " + (found[0]?.conflicts.length ? "Earliest has " + found[0].conflicts.length + " clash" + (found[0].conflicts.length > 1 ? "es" : "") + " to resolve" : "Earliest is clear") },
    ];
    st.forEach((x, i) => setTimeout(() => setSteps((l) => [...l, x]), 380 * (i + 1)));
    setTimeout(() => { setRunning(false); setOpts(found.map((opt) => ({ opt }))); }, 380 * (st.length + 1));
  };
  const resolve = (k: number) => setOpts((l) => l.map((o, i) => (i === k ? { ...o, resolved: resolveConflicts(o.opt, skill) } : o)));
  const input = { quoteId: quoteId || undefined, siteId, division: division as "LFL" | "SS" | "LPM", title: (site?.name || "") + ": " + title, skill };
  const book = (o: Opt) => {
    const jobId = bookInstallation(o.opt, input, true);
    setBooked({ jobId, from: o.opt.from, to: o.opt.to, notes: getLastBookingNotes() });
    setOpts([]);
  };
  return (
    <Page eyebrow="Schedule" title="Installation planner" sub="Check skills, bookings, leave, existing installations and service commitments before committing a crew to a multi-day installation.">
      <Card title="What needs booking">
        <div className="fm-grid fm-g3">
          <Field label="From an accepted or pending quote">
            <select className="fm-select" value={quoteId} onChange={(e) => { const nq = sel.quote(s, e.target.value); setQuoteId(e.target.value); if (nq) { setTitle(nq.title); setSiteId(nq.siteId); setDaysN(nq.estDays || 5); setSkill(nq.division === "SS" ? "CCTV" : nq.division === "LPM" ? "Maintenance" : "Fire"); } }}>
              <option value="">No quote, new installation</option>
              {openQuotes.map((x) => <option key={x.id} value={x.id}>{x.number} · {sel.customer(s, x.customerId)!.name}</option>)}
            </select>
          </Field>
          <Field label="Installation">
            <input className="fm-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Site">
            <select className="fm-select" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              {s.sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Skill required">
            <select className="fm-select" value={skill} onChange={(e) => setSkill(e.target.value as Skill)}>
              {(["Fire", "Emergency lighting", "CCTV", "Access control", "Intercom", "Maintenance"] as Skill[]).map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Engineers on the crew">
            <select className="fm-select" value={crew} onChange={(e) => setCrew(Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option></select>
          </Field>
          <Field label="Working days" hint={daysN >= 15 ? "About three weeks" : undefined}>
            <input className="fm-input" type="number" min={1} max={40} value={daysN} onChange={(e) => setDaysN(Math.max(1, Number(e.target.value)))} />
          </Field>
          <Field label="Earliest start">
            <input className="fm-input" type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </Field>
        </div>
        <div className="fm-row" style={{ marginTop: 16 }}>
          <Btn kind="primary" size="lg" icon="search" onClick={check} disabled={running}>{running ? "Checking…" : "Check availability"}</Btn>
          {quote && <span className="fm-muted" style={{ fontSize: 12.5 }}>{quote.number}: <Money v={quote.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0) * (1 - quote.discountPct / 100)} /> net, {quote.stage.toLowerCase()}</span>}
        </div>
        {(steps.length > 0 || running) && <div style={{ marginTop: 16 }}><Steps steps={steps} running={running} /></div>}
      </Card>

      {booked && (
        <div className="fm-note ok" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b>Booked: {fmtDate(booked.from, true)} to {fmtDate(booked.to, true)} as {sel.job(s, booked.jobId)?.number}.</b>
          {booked.notes.length > 0 && <ul style={{ margin: 0, paddingLeft: 18 }}>{booked.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
          <div className="fm-row">
            <Btn kind="primary" icon="calendar" onClick={() => go("Schedule", "company", { schedWeek: weekStart(booked.from), schedView: "week" })}>Show on the calendar</Btn>
            <Btn onClick={() => go("Schedule", "company", { schedWeek: booked.from, schedView: "month" })}>Month view</Btn>
            <Btn kind="ghost" onClick={() => openDrawer({ kind: "job", id: booked.jobId })}>Open the job</Btn>
          </div>
        </div>
      )}
      {proposed && <div className="fm-note accent">Sent for approval. It's waiting under Agents, Approvals. Nothing is booked until it's approved.</div>}

      {opts.length > 0 && (
        <div className="fm-grid fm-g3">
          {opts.map((o, k) => {
            const view = o.resolved ? o.resolved.option : o.opt;
            const clean = view.conflicts.length === 0;
            return (
              <Card key={o.opt.id} title={<span className="fm-row">Option {k + 1}{k === 0 && <Pill tone="accent">Earliest</Pill>}{clean ? <Pill tone="ok" dot>{o.resolved ? "Resolved" : "No clashes"}</Pill> : <Pill tone="warn" dot>{view.conflicts.length} clash{view.conflicts.length > 1 ? "es" : ""}</Pill>}</span>} sub={o.opt.note}>
                <div className="fm-col-flex">
                  <div>
                    <div className="fm-ink" style={{ fontSize: 16, fontWeight: 600 }}>{fmtDate(o.opt.from)} to {fmtDate(o.opt.to)}</div>
                    <div className="fm-faint" style={{ fontSize: 12 }}>{o.opt.days.length} working days, {diffDays(o.opt.to, o.opt.from) + 1} calendar days</div>
                  </div>
                  <div className="fm-row"><Avatars ids={o.opt.engineerIds} /><span className="fm-muted" style={{ fontSize: 12.5 }}>{o.opt.engineerIds.map((e) => sel.engineer(s, e)!.name).join(" and ")}</span></div>
                  <Gantt opt={o.opt} resolved={!!o.resolved} />
                  {!o.resolved && o.opt.conflicts.length > 0 && (
                    <div className="fm-col-flex" style={{ gap: 4 }}>
                      {o.opt.conflicts.slice(0, 6).map((c, i) => (
                        <div key={i} style={{ fontSize: 12, color: c.hard ? "var(--bad)" : "var(--warn)" }}>
                          {fmtDate(c.date)}: {sel.engineer(s, c.engineerId)!.name.split(" ")[0]}, {c.kind === "holiday" ? "annual leave" : c.label.replace(/^PPM: /, "PPM at ")}
                        </div>
                      ))}
                      {o.opt.conflicts.length > 6 && <div className="fm-faint" style={{ fontSize: 12 }}>and {o.opt.conflicts.length - 6} more</div>}
                    </div>
                  )}
                  {o.resolved && (
                    <div className="fm-note accent" style={{ fontSize: 12.5 }}>
                      <b>Proposed changes</b>
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{o.resolved.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  )}
                  <div className="fm-row" style={{ flexWrap: "wrap" }}>
                    {!o.resolved && o.opt.conflicts.length > 0 && <Btn kind="primary" icon="bolt" onClick={() => resolve(k)}>Resolve conflicts</Btn>}
                    {(o.resolved || !o.opt.conflicts.length) && <Btn kind="primary" icon="check" onClick={() => book(o)}>Approve and book</Btn>}
                    <Btn kind="ghost" onClick={() => { proposeBooking(o.opt, input); setProposed(true); toast("Booking sent for approval"); }}>Send for approval</Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {!opts.length && !running && !booked && steps.length === 0 && (
        <Card><Empty title="Check availability to see options" hint="The planner proposes the earliest start, the first clash-free start and an alternative crew." /></Card>
      )}
    </Page>
  );
}

function Gantt({ opt, resolved }: { opt: SlotOption; resolved: boolean }) {
  const s = useFM();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {opt.engineerIds.map((eid) => (
        <div key={eid} className="fm-row" style={{ gap: 6 }}>
          <span className="fm-mono fm-faint" style={{ width: 22 }}>{sel.engineer(s, eid)!.initials}</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(" + opt.days.length + ",1fr)", gap: 2, flex: 1 }}>
            {opt.days.map((d) => {
              const c = opt.conflicts.find((x) => x.engineerId === eid && x.date === d);
              const bg = !c || resolved ? "var(--accent)" : c.hard ? "var(--bad)" : "var(--warn)";
              return <span key={d} title={fmtDate(d) + (c ? ": " + (c.kind === "holiday" ? "leave" : c.label) : "")} style={{ height: 14, borderRadius: 3, background: bg, opacity: !c || resolved ? 0.75 : 1 }} />;
            })}
          </div>
        </div>
      ))}
      <div className="fm-row fm-faint" style={{ fontSize: 10.5, justifyContent: "space-between", paddingLeft: 28 }}><span>{fmtDate(opt.from)}</span><span>{fmtDate(opt.to)}</span></div>
    </div>
  );
}

/* ── Unallocated ────────────────────────────────────────────────────────── */
function bestFor(s: FMState, j: Job) {
  const skill = skillFor(j.division, j.description);
  const qual = s.engineers.filter((e) => e.skills.includes(skill));
  let date = j.scheduled && j.scheduled >= TODAY ? j.scheduled : TODAY;
  for (let k = 0; k < 8; k++) {
    const sug = suggestEngineers(s, qual, date).filter((x) => x.day.free >= j.estHours);
    if (sug.length && isWorkingDay(date)) return { e: sug[0].e, date, free: sug[0].day.free, skill };
    date = addWorkingDays(date, 1);
  }
  return { e: undefined, date, free: 0, skill };
}

function Unallocated() {
  const s = useFM();
  const jobs = s.jobs.filter((j) => j.status === "new" && !j.engineerIds.length && inDivision(s, j.division));
  const svs = s.serviceVisits.filter((v) => !v.engineerId && v.status !== "completed" && inDivision(s, sel.contract(s, v.contractId)!.division));
  return (
    <Page eyebrow="Schedule" title="Unallocated work" sub="Jobs and service visits with nobody on them yet, with a suggested engineer by skill and free time.">
      <Card title="Jobs" sub={jobs.length + " waiting in the job box"} flush>
        <Table
          rows={jobs}
          minWidth={900}
          onRow={(j) => openDrawer({ kind: "job", id: j.id })}
          cols={[
            { h: "Job", w: "80px", cls: "mono", r: (j) => j.number },
            { h: "Site", w: "1.3fr", cls: "main", r: (j) => sel.site(s, j.siteId)!.name },
            { h: "Work", w: "1.6fr", r: (j) => j.description.split(".")[0] },
            { h: "Priority", w: "90px", r: (j) => <PriorityPill p={j.priority} /> },
            { h: "Suggested", w: "190px", r: (j) => { const b = bestFor(s, j); return b.e ? <span className="fm-row" style={{ gap: 7 }}><Avatar e={b.e} size={22} />{b.e.name.split(" ")[0]}, {fmtDate(b.date)}</span> : <span className="fm-faint">No one free</span>; } },
            { h: "", w: "100px", r: (j) => { const b = bestFor(s, j); return <Btn size="sm" kind="primary" disabled={!b.e} onClick={(e) => { e.stopPropagation(); if (b.e) allocateJob(j.id, [b.e.id], b.date); }}>Allocate</Btn>; } },
          ]}
          empty={<Empty title="Job box is empty" hint="Every job has an engineer." />}
        />
      </Card>
      <Card title="Service visits" sub={svs.length + " need an engineer"} flush>
        <Table
          rows={svs}
          minWidth={900}
          onRow={(v) => openDrawer({ kind: "serviceVisit", id: v.id })}
          cols={[
            { h: "Date", w: "90px", r: (v) => fmtDate(v.date) },
            { h: "Site", w: "1.3fr", cls: "main", r: (v) => sel.site(s, v.siteId)!.name },
            { h: "Services", w: "1.3fr", r: (v) => v.services.join(", ") },
            { h: "Suggested", w: "190px", r: (v) => { const sug = suggestEngineers(s, qualifiedFor(s, v.services), v.date < TODAY ? nextWorkingDay(TODAY) : v.date)[0]; return sug ? <span className="fm-row" style={{ gap: 7 }}><Avatar e={sug.e} size={22} />{sug.e.name.split(" ")[0]}, {sug.day.free} h free</span> : <span className="fm-faint">No one free</span>; } },
            { h: "", w: "100px", r: (v) => { const d = v.date < TODAY ? nextWorkingDay(TODAY) : v.date; const sug = suggestEngineers(s, qualifiedFor(s, v.services), d)[0]; return <Btn size="sm" kind="primary" disabled={!sug} onClick={(e) => { e.stopPropagation(); if (sug) allocateServiceVisit(s, v.id, sug.e.id, d); }}>Allocate</Btn>; } },
          ]}
          empty={<Empty title="All service visits allocated" />}
        />
      </Card>
    </Page>
  );
}

/* ── Availability ───────────────────────────────────────────────────────── */
function Availability() {
  const s = useFM();
  const days = [TODAY].concat(Array.from({ length: 9 }, (_, k) => addWorkingDays(TODAY, k + 1)));
  const engineers = engineersInScope(s);
  const tue = "2026-12-01";
  const free = engineers.map((e) => ({ e, d: dayEvents(s, e.id, tue) })).filter((x) => !x.d.onLeave).sort((a, b) => b.d.free - a.d.free);
  return (
    <Page eyebrow="Schedule" title="Availability" sub="Free hours per engineer for the next ten working days. Leave, installations and booked work are taken off.">
      <div className="fm-grid fm-g-main">
        <Card flush>
          <div className="fm-scrollx">
            <div className="fm-cal" style={{ gridTemplateColumns: "170px repeat(" + days.length + ", minmax(70px,1fr))", minWidth: 900 }}>
              <div className="hd">Engineer</div>
              {days.map((d) => <div key={d} className={"hd" + (d === TODAY ? " today" : "")}>{dayShort(d)} {parse(d).getDate()}</div>)}
              {engineers.map((e) => (
                <AvailRow key={e.id} e={e} days={days} s={s} />
              ))}
            </div>
          </div>
        </Card>
        <div className="fm-col-flex">
          <Card title="Who's free on Tuesday 1 December" sub="Most free hours first">
            <div className="fm-col-flex" style={{ gap: 6 }}>
              {free.map(({ e, d }) => (
                <div key={e.id} className="fm-row">
                  <Avatar e={e} size={24} />
                  <span className="fm-ink" style={{ flex: 1 }}>{e.name}</span>
                  <Pill tone={d.free >= 6 ? "ok" : d.free >= 3 ? "warn" : ""}>{d.free} h free</Pill>
                </div>
              ))}
              {engineers.filter((e) => e.holidays.includes(tue)).map((e) => <div key={e.id} className="fm-faint" style={{ fontSize: 12.5 }}>{e.name} on leave</div>)}
            </div>
          </Card>
          <Card title="Leave" sub="Booked annual leave">
            <div className="fm-col-flex" style={{ gap: 6 }}>
              {s.holidays.map((h, i) => (
                <div key={i} className="fm-row">
                  <Avatar e={sel.engineer(s, h.engineerId)} size={22} />
                  <span className="fm-ink" style={{ flex: 1 }}>{sel.engineer(s, h.engineerId)!.name}</span>
                  <span className="fm-muted" style={{ fontSize: 12 }}>{h.from === h.to ? fmtDate(h.from) : fmtDate(h.from) + " to " + fmtDate(h.to)}</span>
                </div>
              ))}
              <div className="fm-faint" style={{ fontSize: 12 }}>Company closed 24 December to 1 January.</div>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

function AvailRow({ e, days, s }: { e: FMState["engineers"][number]; days: string[]; s: FMState }) {
  return (
    <>
      <div className="rowh"><Avatar e={e} size={24} /><span className="fm-trunc">{e.name}</span></div>
      {days.map((d) => {
        const day = dayEvents(s, e.id, d);
        const inst = day.evs.some((x) => x.kind === "install");
        const bg = day.onLeave ? "var(--track)" : day.free >= 6 ? "var(--ok-soft)" : day.free >= 3 ? "var(--warn-soft)" : "var(--bad-soft)";
        return (
          <div key={d} className="cell" style={{ minHeight: 52, alignItems: "center", justifyContent: "center", background: bg }} title={day.evs.map((x) => x.label).join(", ") || "Free"}>
            <b style={{ fontSize: 13, color: day.onLeave ? "var(--dim)" : "var(--ink)" }}>{day.onLeave ? "Leave" : day.free + " h"}</b>
            <span style={{ fontSize: 10, color: "var(--faint)" }}>{inst ? "Install" : day.evs.length ? day.evs.length + " booked" : "Free"}</span>
          </div>
        );
      })}
    </>
  );
}

export function ScheduleModals(): JSX.Element | null {
  return null;
}
