/* Engineers: team, the mobile engineer app and timesheets. */
import { useEffect, useMemo, useState } from "react";
import {
  useFM, sel, engineerDay, jobTotals, openDrawer, openModal, acceptJob, startJob, pauseJob, addNote, approveTime, correctTime, addTime,
} from "../store";
import { canSeeAccessCodes, divisionById } from "../config";
import { TODAY, addDays, fmtDate, rel, weekStart, addWorkingDays, dayShort, isWorkingDay } from "../dates";
import { Page, Card, Stat, Table, Btn, Pill, JobStatusPill, PriorityPill, DivTag, Avatar, Money, Seg, Modal, Field, Ico, Empty, Bar, type Col } from "../ui";
import { DrawerHead } from "../FMLayer";
import type { Engineer, FMState, Job, TimeEntry } from "../types";
import "./jobs/jobs.css";

const KIND_LABEL: Record<TimeEntry["kind"], string> = { billable: "Billable", "non-billable": "Non-billable", travel: "Travel", overtime: "Overtime" };

function weekDays(start: string) {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(start, i));
}
function weekTotals(s: FMState, engineerId: string, start: string) {
  const end = addDays(start, 6);
  const entries = s.time.filter((t) => t.engineerId === engineerId && t.date >= start && t.date <= end);
  const sum = (k?: TimeEntry["kind"]) => Math.round(entries.filter((t) => !k || t.kind === k).reduce((a, t) => a + t.hours, 0) * 100) / 100;
  return { entries, worked: sum(), billable: sum("billable"), nonBillable: sum("non-billable"), travel: sum("travel"), overtime: sum("overtime"), pending: entries.filter((t) => !t.approved).length };
}

/** Jobs for an engineer on a date: bookings, single-day jobs, multi-day jobs and service visits. */
function engineerToday(s: FMState, engineerId: string, date: string) {
  const day = engineerDay(s, engineerId, date);
  const jobIds = new Set<string>();
  day.items.forEach((i) => i.jobId && jobIds.add(i.jobId));
  s.jobs.forEach((j) => {
    if (j.engineerIds.includes(engineerId) && (j.status === "new" || j.status === "progress") && j.scheduled && j.scheduled <= date && (j.scheduledEnd || j.scheduled) >= date) jobIds.add(j.id);
  });
  const jobs = Array.from(jobIds).map((id) => sel.job(s, id)!).filter(Boolean).filter((j) => j.status !== "invoiced");
  const services = day.items.filter((i) => i.kind === "service" && i.svId && !i.jobId).map((i) => s.serviceVisits.find((v) => v.id === i.svId)!);
  return { day, jobs, services };
}

/* ── Team ──────────────────────────────────────────────────────────────── */
function Team() {
  const s = useFM();
  const ws = weekStart(TODAY);
  return (
    <div className="fm-grid fm-g3">
      {s.engineers.map((e) => {
        const day = engineerDay(s, e.id, TODAY);
        const wk = weekTotals(s, e.id, ws);
        const leave = s.holidays.filter((h) => h.engineerId === e.id && h.to >= TODAY);
        const open = s.jobs.filter((j) => j.engineerIds.includes(e.id) && (j.status === "new" || j.status === "progress")).length;
        return (
          <button key={e.id} className="fm-stat" style={{ gap: 10 }} onClick={() => openDrawer({ kind: "engineer", id: e.id })}>
            <span className="fm-row"><Avatar e={e} size={38} /><span style={{ minWidth: 0 }}><span className="fm-ink" style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{e.name}</span><span className="fm-faint" style={{ fontSize: 12 }}>{e.title}</span></span></span>
            <span className="fm-chips">{e.skills.map((k) => <Pill key={k}>{k}</Pill>)}</span>
            <span className="fm-row" style={{ gap: 12 }}>{e.divisions.map((d) => <DivTag key={d} id={d} />)}</span>
            <span className="fm-row" style={{ fontSize: 12.5 }}>
              <span className="fm-muted" style={{ width: 70 }}>Today</span>
              {day.onLeave ? <Pill tone="bad">On leave</Pill> : <span style={{ flex: 1 }}><Bar value={8 - day.free} max={8} color={day.free < 2 ? "var(--warn)" : e.color} /></span>}
              {!day.onLeave && <span className="fm-ink">{8 - day.free} / 8 h</span>}
            </span>
            <span className="fm-row" style={{ fontSize: 12.5 }}>
              <span className="fm-muted" style={{ width: 70 }}>This week</span>
              <span className="fm-ink">{wk.worked} h worked, {wk.billable} h billable</span>
            </span>
            <span className="fm-faint" style={{ fontSize: 12 }}>{open} open job{open === 1 ? "" : "s"}{leave.length ? " · leave " + fmtDate(leave[0].from) + (leave[0].to !== leave[0].from ? " to " + fmtDate(leave[0].to) : "") : ""}</span>
            {e.arrangement && <span className="fm-faint" style={{ fontSize: 12 }}>{e.arrangement}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function EngineerDrawer({ id }: { id: string }) {
  const s = useFM();
  const e = sel.engineer(s, id);
  if (!e) return <div className="fm-drawer-b"><Empty title="Engineer not found" /></div>;
  const days = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => addWorkingDays(TODAY, i === 0 && isWorkingDay(TODAY) ? 0 : i)).filter((d, i, a) => a.indexOf(d) === i);
  const open = s.jobs.filter((j) => j.engineerIds.includes(e.id) && (j.status === "new" || j.status === "progress"));
  const wk = weekTotals(s, e.id, weekStart(TODAY));
  return (
    <>
      <DrawerHead eyebrow="Engineer" title={e.name} sub={e.title + " · " + e.phone} pills={e.divisions.map((d) => <DivTag key={d} id={d} />)} />
      <div className="fm-drawer-b">
        <div className="fm-chips">{e.skills.map((k) => <Pill key={k} tone="accent">{k}</Pill>)}</div>
        {e.arrangement && <div className="fm-note">{e.arrangement}</div>}
        <div className="fm-sec">Next 10 working days</div>
        <div className="fm-col-flex" style={{ gap: 6 }}>
          {days.map((d) => {
            const day = engineerDay(s, e.id, d);
            return (
              <div key={d} className="fm-row" style={{ alignItems: "flex-start", fontSize: 12.5, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 10 }}>
                <span className="fm-mono" style={{ width: 82, color: d === TODAY ? "var(--accent)" : "var(--dim)" }}>{fmtDate(d)}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  {day.items.length ? day.items.map((it, i) => (
                    <span key={i} className="fm-trunc">
                      <Pill tone={it.kind === "holiday" ? "bad" : it.kind === "install" ? "info" : it.kind === "service" ? "ok" : ""}>{it.kind === "holiday" ? "Leave" : it.kind === "install" ? "Install" : it.kind === "service" ? "PPM" : "Job"}</Pill>{" "}
                      {it.jobId ? <button className="fm-link" onClick={() => openDrawer({ kind: "job", id: it.jobId! })}>{it.ref || "Job"}</button> : null} <span className="fm-muted">{it.label}</span>
                    </span>
                  )) : <span className="fm-faint">Free</span>}
                </span>
                <span className={day.free < 1 ? "" : "fm-faint"} style={{ color: day.free < 1 ? "var(--warn)" : undefined }}>{day.onLeave ? "" : day.free + " h free"}</span>
              </div>
            );
          })}
        </div>
        <div className="fm-sec">Open jobs</div>
        {open.length ? open.map((j) => (
          <button key={j.id} className="fm-row fm-app-card" style={{ flexDirection: "row", padding: 10 }} onClick={() => openDrawer({ kind: "job", id: j.id })}>
            <span className="fm-mono fm-faint">{j.number}</span><span className="fm-trunc fm-ink" style={{ flex: 1 }}>{sel.site(s, j.siteId)!.name}</span><JobStatusPill s={j.status} />
          </button>
        )) : <div className="fm-faint" style={{ fontSize: 13 }}>None</div>}
        <div className="fm-sec">This week's time</div>
        <div className="fm-kv">
          <div><div className="k">Worked</div><div className="v">{wk.worked} h</div></div>
          <div><div className="k">Billable</div><div className="v">{wk.billable} h</div></div>
          <div><div className="k">Non-billable</div><div className="v">{wk.nonBillable} h</div></div>
          <div><div className="k">Travel</div><div className="v">{wk.travel} h</div></div>
          <div><div className="k">Overtime</div><div className="v">{wk.overtime} h</div></div>
          <div><div className="k">To approve</div><div className="v">{wk.pending}</div></div>
        </div>
      </div>
      <div className="fm-drawer-f">
        <Btn onClick={() => { import("../store").then((m) => { m.setTab("Engineers", "timesheets"); m.go("Engineers"); }); }}>Open timesheets</Btn>
        <Btn onClick={() => { import("../store").then((m) => { m.setTab("Engineers", "app"); m.go("Engineers"); }); }}>See their app</Btn>
      </div>
    </>
  );
}

/* ── Engineer app ──────────────────────────────────────────────────────── */
type Timer = { jobId: string; startMs: number; accMs: number; running: boolean; startClock: string; verified: boolean };
const hhmm = (d: Date) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
const fmtElapsed = (ms: number) => {
  const sec = Math.floor(ms / 1000);
  return String(Math.floor(sec / 3600)).padStart(2, "0") + ":" + String(Math.floor((sec % 3600) / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
};

export function EngineerApp() {
  const s = useFM();
  const [pick, setPick] = useState(s.meEngineerId);
  const engId = s.role === "engineer" ? s.meEngineerId : pick;
  const e = sel.engineer(s, engId)!;
  const [screen, setScreen] = useState<"today" | "box" | "mine" | "time" | "profile">("today");
  const [jobId, setJobId] = useState<string | null>(null);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!timer?.running) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [timer?.running]);
  useEffect(() => { setJobId(null); }, [engId]);
  const today = engineerToday(s, engId, TODAY);
  const box = s.jobs.filter((j) => j.status === "new" && !j.engineerIds.length);
  const mine = s.jobs.filter((j) => j.engineerIds.includes(engId) && (j.status === "new" || j.status === "progress")).sort((a, b) => ((a.scheduled || "9") < (b.scheduled || "9") ? -1 : 1));
  const elapsed = timer ? timer.accMs + (timer.running ? Date.now() - timer.startMs : 0) : 0;
  const go = (sc: typeof screen) => { setScreen(sc); setJobId(null); };
  const job = jobId ? sel.job(s, jobId) : null;

  return (
    <div className="fm-col-flex" style={{ alignItems: "center", gap: 14 }}>
      {s.role !== "engineer" ? (
        <div className="fm-row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <span className="fm-muted" style={{ fontSize: 13 }}>Preview the app as</span>
          <select className="fm-select" style={{ width: 200 }} value={pick} onChange={(ev) => setPick(ev.target.value)}>
            {s.engineers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <span className="fm-faint" style={{ fontSize: 12 }}>Same records as the office. Nothing to sync.</span>
        </div>
      ) : (
        <div className="fm-faint" style={{ fontSize: 12 }}>Signed in as {e.name}</div>
      )}
      <div className="fm-phone">
        <div className="fm-phone-s">
          {job ? (
            <AppJob job={job} engId={engId} timer={timer?.jobId === job.id ? timer : null} elapsed={timer?.jobId === job.id ? elapsed : 0} setTimer={setTimer} back={() => setJobId(null)} otherTimer={!!timer && timer.jobId !== job.id} />
          ) : (
            <>
              <div className="fm-app-top">
                <div className="sub">{fmtDate(TODAY, true)}</div>
                <div className="hi">{screen === "today" ? "Morning, " + e.name.split(" ")[0] : screen === "box" ? "Job box" : screen === "mine" ? "My jobs" : screen === "time" ? "Timesheet" : "Profile"}</div>
                <div className="sub">{screen === "today" ? (today.day.onLeave ? "You're on leave today" : today.jobs.length + today.services.length + " job" + (today.jobs.length + today.services.length === 1 ? "" : "s") + " today") : screen === "box" ? box.length + " unallocated, anyone can take one" : screen === "mine" ? mine.length + " open" : screen === "time" ? "Week of " + fmtDate(weekStart(TODAY)) : e.title}</div>
              </div>
              <div className="fm-app-body">
                {timer && (
                  <button className="fm-app-card" style={{ borderColor: "var(--accent-line)", background: "var(--accent-faint)" }} onClick={() => setJobId(timer.jobId)}>
                    <span className="when">{timer.running ? "On the clock" : "Paused"} · {fmtElapsed(elapsed)}</span>
                    <span className="t">{sel.job(s, timer.jobId)?.number} {sel.site(s, sel.job(s, timer.jobId)!.siteId)!.name}</span>
                  </button>
                )}
                {screen === "today" && (
                  <>
                    {today.jobs.map((j) => <AppJobCard key={j.id} j={j} onOpen={() => setJobId(j.id)} />)}
                    {today.services.map((v) => (
                      <button key={v.id} className="fm-app-card" onClick={() => openDrawer({ kind: "serviceVisit", id: v.id })}>
                        <span className="when">Planned service · {v.estHours} h</span>
                        <span className="t">{sel.site(s, v.siteId)!.name}</span>
                        <span className="d">{v.services.join(", ")}</span>
                      </button>
                    ))}
                    {!today.jobs.length && !today.services.length && <Empty title={today.day.onLeave ? "Enjoy the day off" : "Nothing booked today"} hint={today.day.onLeave ? "" : "Have a look in the job box."} />}
                    {!today.day.onLeave && box.length > 0 && <button className="fm-app-act" onClick={() => go("box")}><Ico d="box" /> {box.length} job{box.length > 1 ? "s" : ""} waiting in the job box<span className="fm-spacer" /><Ico d="arrow" size={14} /></button>}
                  </>
                )}
                {screen === "box" && (
                  <>
                    {box.map((j) => {
                      const fits = e.divisions.includes(j.division);
                      return (
                        <div key={j.id} className="fm-app-card" onClick={() => setJobId(j.id)}>
                          <span className="when">{j.number} · {j.priority} priority{fits ? "" : " · outside your division"}</span>
                          <span className="t">{sel.site(s, j.siteId)!.name}</span>
                          <span className="d">{j.description}</span>
                          <span className="fm-row" onClick={(ev) => ev.stopPropagation()}>
                            <DivTag id={j.division} />
                            <span className="fm-spacer" />
                            <Btn size="sm" kind="primary" onClick={() => acceptJob(j.id, engId)}>Accept</Btn>
                          </span>
                        </div>
                      );
                    })}
                    {!box.length && <Empty title="The job box is empty" hint="Everything is allocated." />}
                  </>
                )}
                {screen === "mine" && (
                  <>
                    {mine.map((j) => <AppJobCard key={j.id} j={j} onOpen={() => setJobId(j.id)} />)}
                    {!mine.length && <Empty title="No open jobs" />}
                  </>
                )}
                {screen === "time" && <AppTimesheet e={e} />}
                {screen === "profile" && <AppProfile e={e} />}
              </div>
            </>
          )}
          <div className="fm-app-nav">
            {([["today", "Today", "calendar", 0], ["box", "Job box", "box", box.length], ["mine", "My jobs", "jobs", mine.length], ["time", "Time", "clock", 0], ["profile", "Profile", "engineer", 0]] as [typeof screen, string, string, number][]).map(([k, l, ic, n]) => (
              <button key={k} className={screen === k && !job ? "on" : ""} onClick={() => go(k)}>
                <Ico d={ic} size={19} />
                {l}
                {n > 0 && <span className="badge">{n}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppJobCard({ j, onOpen }: { j: Job; onOpen: () => void }) {
  const s = useFM();
  const site = sel.site(s, j.siteId)!;
  const t = jobTotals(s, j);
  const multi = j.scheduledEnd && j.scheduledEnd !== j.scheduled;
  return (
    <button className="fm-app-card" onClick={onOpen}>
      <span className="when">{j.number} · {multi ? "Day " + (Math.max(0, Math.round((new Date(TODAY).getTime() - new Date(j.scheduled!).getTime()) / 864e5)) + 1) + " of install" : j.scheduled === TODAY ? "Today" : rel(j.scheduled)}{j.status === "progress" ? " · " + t.visits.length + " visit" + (t.visits.length === 1 ? "" : "s") + " so far" : ""}</span>
      <span className="t">{site.name}</span>
      <span className="d">{site.address}, {site.town}</span>
      <span className="d" style={{ color: "var(--body)" }}>{j.description.split(".")[0]}</span>
      <span className="fm-row"><JobStatusPill s={j.status} /><PriorityPill p={j.priority} /></span>
    </button>
  );
}

function AppJob({ job: j, engId, timer, elapsed, setTimer, back, otherTimer }: { job: Job; engId: string; timer: Timer | null; elapsed: number; setTimer: (t: Timer | null) => void; back: () => void; otherTimer: boolean }) {
  const s = useFM();
  const site = sel.site(s, j.siteId)!;
  const contact = sel.primaryContact(s, j.customerId);
  const t = jobTotals(s, j);
  const assigned = j.engineerIds.includes(engId);
  const showCode = canSeeAccessCodes(s.role) && assigned;
  const [verify, setVerify] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const startClock = () => {
    if (j.status === "new") startJob(j.id, engId);
    setTimer({ jobId: j.id, startMs: Date.now(), accMs: 0, running: true, startClock: hhmm(new Date()), verified: verify });
  };
  const pause = () => {
    if (!timer) return;
    pauseJob(j.id);
    setTimer({ ...timer, running: false, accMs: elapsed });
  };
  const resume = () => timer && setTimer({ ...timer, running: true, startMs: Date.now() });
  const finish = () => {
    const mins = Math.max(15, Math.round(elapsed / 60000 / 15) * 15);
    const start = new Date(Date.now() - mins * 60000);
    setTimer(null);
    openModal({ kind: "log-visit", jobId: j.id, engineerId: engId, date: TODAY, start: hhmm(start), end: hhmm(new Date()), verified: timer?.verified && verify });
  };
  const quoteNote = j.internalNotes.find((n) => n.startsWith("From Q-"));
  return (
    <>
      <div className="fm-app-top">
        <button className="fm-link" onClick={back} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}><Ico d="back" size={14} /> Back</button>
        <div className="sub" style={{ marginTop: 8 }}>{j.number} · {j.type}{j.woRef ? " · " + j.woRef : ""}</div>
        <div className="hi">{site.name}</div>
        <div className="fm-row" style={{ marginTop: 6 }}><JobStatusPill s={j.status} /><PriorityPill p={j.priority} /></div>
      </div>
      <div className="fm-app-body">
        {timer && (
          <div className="fm-app-timer">
            <span className="fm-faint" style={{ fontSize: 12 }}>{timer.running ? "On the clock since " + timer.startClock : "Paused"}{timer.verified ? " · arrival location verified (simulated)" : ""}</span>
            <span className="clock">{fmtElapsed(elapsed)}</span>
            <div className="fm-app-acts">
              {timer.running ? <button className="fm-app-act" onClick={pause}><Ico d="pause" /> Pause</button> : <button className="fm-app-act" onClick={resume}><Ico d="play" /> Resume</button>}
              <button className="fm-app-act" style={{ background: "var(--ink)", color: "var(--bg)" }} onClick={finish}><Ico d="check" /> Finish visit</button>
            </div>
          </div>
        )}
        {!assigned && j.status === "new" && <button className="fm-app-act primary" onClick={() => acceptJob(j.id, engId)}>Accept this job</button>}
        {assigned && !timer && (j.status === "new" || j.status === "progress") && (
          <>
            <button className="fm-app-act primary" disabled={otherTimer} onClick={startClock}><Ico d="play" /> {j.status === "new" ? "Start work" : "Start today's visit"}</button>
            <label className="fm-check" style={{ fontSize: 12.5 }}><input type="checkbox" checked={verify} onChange={(ev) => setVerify(ev.target.checked)} /><span>Verify my location on arrival and departure <span className="fm-faint">(simulated, only at those two moments, never in the background)</span></span></label>
            {otherTimer && <div className="fm-faint" style={{ fontSize: 12 }}>Finish the visit that's already running first.</div>}
          </>
        )}
        <a className="fm-app-act" href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(site.eircode || site.address)} target="_blank" rel="noreferrer"><Ico d="route" /> Directions<span className="fm-spacer" /><span className="fm-faint" style={{ fontSize: 12 }}>{site.eircode}</span></a>
        <div className="fm-app-sec">Where</div>
        <div className="fm-note">{site.address}, {site.town}, {site.county}{contact && <><br /><span className="fm-muted">{contact.name}, {contact.role} · <a href={"tel:" + contact.phone} style={{ color: "var(--accent)" }}>{contact.phone}</a></span></>}</div>
        <div className="fm-app-sec">Access</div>
        <div className="fm-note">{site.accessNotes}{showCode ? <><br /><b className="fm-ink">Code:</b> {site.accessCode}</> : null}</div>
        {!showCode && <div className="fm-lock"><Ico d="lock" size={12} /> Access code shown once the job is yours.</div>}
        <div className="fm-app-sec">The job</div>
        <div className="fm-note">{j.description}{j.returnRequired && j.returnNote ? <><br /><span style={{ color: "var(--warn)" }}>Return: {j.returnNote}</span></> : null}</div>
        <div className="fm-app-sec">Materials</div>
        <div className="fm-note">
          {quoteNote && <div style={{ marginBottom: 6 }}>{quoteNote}</div>}
          {t.materials.length ? t.materials.map((m) => <div key={m.id}>{m.qty} × {m.description}</div>) : !quoteNote && <span className="fm-faint">Nothing logged yet. Add anything you use.</span>}
        </div>
        {t.visits.length > 0 && (
          <>
            <div className="fm-app-sec">Visits so far ({t.billableHours} h)</div>
            {t.visits.map((v) => <div key={v.id} className="fm-faint" style={{ fontSize: 12.5 }}>{fmtDate(v.date)}, {v.hours} h, {sel.engineer(s, v.engineerId)?.name.split(" ")[0]}: {v.summary.split(".")[0]}</div>)}
          </>
        )}
        {(j.status === "new" || j.status === "progress") && assigned && (
          <>
            <div className="fm-app-sec">Actions</div>
            <div className="fm-app-acts">
              <button className="fm-app-act" onClick={() => openModal({ kind: "log-visit", jobId: j.id, engineerId: engId })}><Ico d="clock" /> Add time</button>
              <button className="fm-app-act" onClick={() => openModal({ kind: "add-material", jobId: j.id })}><Ico d="box" /> Materials</button>
              <button className="fm-app-act" onClick={() => openModal({ kind: "add-photo", jobId: j.id })}><Ico d="camera" /> Photo</button>
              <button className="fm-app-act" onClick={() => setNoteOpen(!noteOpen)}><Ico d="note" /> Note</button>
              <button className="fm-app-act warn" onClick={() => openModal({ kind: "leave-site", jobId: j.id })}><Ico d="flag" /> Leave site, return required</button>
              <button className="fm-app-act" onClick={() => openModal({ kind: "complete-job", jobId: j.id })}><Ico d="check" /> Complete job</button>
            </div>
            {noteOpen && (
              <div className="fm-col-flex">
                <textarea className="fm-textarea" value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Note for the office" />
                <Btn kind="primary" disabled={!note.trim()} onClick={() => { addNote(j.id, note.trim()); setNote(""); setNoteOpen(false); }}>Save note</Btn>
              </div>
            )}
          </>
        )}
        {(j.status === "completed" || j.status === "invoiced") && <div className="fm-note ok">Completed {fmtDate(j.completedAt)}. Thanks, the office has it from here.</div>}
      </div>
    </>
  );
}

function AppTimesheet({ e }: { e: Engineer }) {
  const s = useFM();
  const wk = weekTotals(s, e.id, weekStart(TODAY));
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(1);
  const [kind, setKind] = useState<TimeEntry["kind"]>("non-billable");
  const [note, setNote] = useState("");
  return (
    <>
      <div className="fm-kv">
        <div><div className="k">Worked</div><div className="v">{wk.worked} h</div></div>
        <div><div className="k">Billable</div><div className="v">{wk.billable} h</div></div>
        <div><div className="k">Overtime</div><div className="v">{wk.overtime} h</div></div>
      </div>
      {e.arrangement && <div className="fm-faint" style={{ fontSize: 12 }}>{e.arrangement}</div>}
      <button className="fm-app-act" onClick={() => setOpen(!open)}><Ico d="plus" /> Add time not on a job</button>
      {open && (
        <div className="fm-col-flex">
          <div className="fm-row">
            <input type="number" className="fm-input" style={{ width: 80 }} min={0.25} step={0.25} value={hours} onChange={(ev) => setHours(Number(ev.target.value))} />
            <select className="fm-select" value={kind} onChange={(ev) => setKind(ev.target.value as TimeEntry["kind"])}>
              <option value="non-billable">Non-billable</option><option value="travel">Travel</option><option value="overtime">Overtime</option>
            </select>
          </div>
          <input className="fm-input" value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="What was it for" />
          <Btn kind="primary" disabled={!note.trim() || hours <= 0} onClick={() => { addTime({ engineerId: e.id, date: TODAY, hours, kind, note: note.trim() }); setOpen(false); setNote(""); }}>Save</Btn>
        </div>
      )}
      {wk.entries.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((t) => (
        <div key={t.id} className="fm-row" style={{ fontSize: 12.5, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
          <span className="fm-mono fm-faint" style={{ width: 70 }}>{fmtDate(t.date)}</span>
          <span className="fm-trunc" style={{ flex: 1 }}>{t.jobId ? sel.job(s, t.jobId)?.number + " " : ""}<span className="fm-muted">{t.note}</span></span>
          <span className="fm-ink">{t.hours} h</span>
          {t.approved ? <Ico d="check" size={13} style={{ color: "var(--ok)" }} /> : <span style={{ width: 13 }} />}
        </div>
      ))}
    </>
  );
}

function AppProfile({ e }: { e: Engineer }) {
  return (
    <>
      <div className="fm-row"><Avatar e={e} size={48} /><div><div className="fm-ink" style={{ fontSize: 16, fontWeight: 600 }}>{e.name}</div><div className="fm-faint" style={{ fontSize: 12.5 }}>{e.phone}</div></div></div>
      <div className="fm-chips">{e.skills.map((k) => <Pill key={k}>{k}</Pill>)}</div>
      <div className="fm-col-flex" style={{ gap: 4 }}>{e.divisions.map((d) => <span key={d} className="fm-muted" style={{ fontSize: 13 }}>{divisionById(d).name}</span>)}</div>
      {e.arrangement && <div className="fm-note">{e.arrangement}</div>}
      {e.holidays.length > 0 && <div className="fm-note">Leave booked: {e.holidays.map((h) => fmtDate(h)).join(", ")}</div>}
      <div className="fm-note accent"><b>Your location.</b> It's only recorded when you tap verify at arrival or departure on a job. Nothing tracks you in the background. Vans stay on the existing tracking system.</div>
    </>
  );
}

/* ── Timesheets ────────────────────────────────────────────────────────── */
function Timesheets() {
  const s = useFM();
  const [ws, setWs] = useState(weekStart(TODAY));
  const [eng, setEng] = useState(s.role === "engineer" ? s.meEngineerId : "");
  const [fix, setFix] = useState<string | null>(null);
  const engs = s.engineers.filter((e) => (s.role === "engineer" ? e.id === s.meEngineerId : !eng || e.id === eng));
  const days = weekDays(ws);
  const entries = s.time.filter((t) => t.date >= ws && t.date <= addDays(ws, 6) && engs.some((e) => e.id === t.engineerId)).sort((a, b) => (a.date + a.engineerId < b.date + b.engineerId ? -1 : 1));
  const pending = entries.filter((t) => !t.approved);
  const canApprove = s.role === "owner" || s.role === "ops";
  const cols: Col<TimeEntry>[] = [
    { h: "Date", w: "84px", r: (t) => <span className="mono">{fmtDate(t.date)}</span> },
    { h: "Engineer", w: "130px", r: (t) => sel.engineer(s, t.engineerId)!.name },
    { h: "Job", w: "80px", r: (t) => t.jobId ? <button className="fm-link" onClick={(ev) => { ev.stopPropagation(); openDrawer({ kind: "job", id: t.jobId! }); }}>{sel.job(s, t.jobId)?.number}</button> : <span className="fm-faint">None</span> },
    { h: "Note", w: "minmax(160px,1fr)", r: (t) => <span title={t.note}>{t.note}{t.corrections.length ? <span className="fm-faint"> · corrected</span> : null}</span> },
    { h: "Type", w: "110px", r: (t) => <Pill tone={t.kind === "billable" ? "accent" : t.kind === "overtime" ? "warn" : ""}>{KIND_LABEL[t.kind]}</Pill> },
    { h: "Hours", w: "60px", num: true, r: (t) => t.hours },
    { h: "Status", w: "92px", r: (t) => t.approved ? <Pill tone="ok">Approved</Pill> : <Pill>Pending</Pill> },
    { h: "", w: "150px", r: (t) => <span className="fm-row" style={{ gap: 6 }} onClick={(ev) => ev.stopPropagation()}>{canApprove && !t.approved && <Btn size="sm" onClick={() => approveTime([t.id])}>Approve</Btn>}<Btn size="sm" kind="ghost" onClick={() => setFix(t.id)}>Correct</Btn></span> },
  ];
  return (
    <>
      <div className="fm-row" style={{ flexWrap: "wrap", gap: 8 }}>
        <Btn size="sm" icon="back" onClick={() => setWs(addDays(ws, -7))}>Previous</Btn>
        <span className="fm-ink" style={{ fontWeight: 600, fontSize: 14 }}>Week of {fmtDate(ws, true)}</span>
        <Btn size="sm" onClick={() => setWs(addDays(ws, 7))}>Next <Ico d="arrow" size={13} /></Btn>
        {ws !== weekStart(TODAY) && <Btn size="sm" kind="ghost" onClick={() => setWs(weekStart(TODAY))}>This week</Btn>}
        <span className="fm-spacer" />
        {s.role !== "engineer" && (
          <select className="fm-select" style={{ width: 190 }} value={eng} onChange={(ev) => setEng(ev.target.value)}>
            <option value="">All engineers</option>
            {s.engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        )}
        {canApprove && <Btn kind="primary" icon="check" disabled={!pending.length} onClick={() => approveTime(pending.map((t) => t.id))}>Approve {pending.length} pending</Btn>}
      </div>
      <div className="fm-note">Recorded time is not automatically chargeable. Only entries marked billable on a job reach an invoice. Non-billable, travel and overtime stay on the timesheet and in the accountant's approved summary.</div>
      <Card flush title="Summary" sub="Hours by type for the week">
        <Table<Engineer> minWidth={820} cols={[
          { h: "Engineer", w: "minmax(150px,1fr)", r: (e) => <span className="fm-row"><Avatar e={e} size={22} /><span className="main">{e.name}</span></span> },
          ...days.filter((d) => isWorkingDay(d) || s.time.some((t) => t.date === d)).map((d) => ({ h: dayShort(d) + " " + d.slice(8), w: "58px", num: true, r: (e: Engineer) => { const h = Math.round(s.time.filter((t) => t.engineerId === e.id && t.date === d).reduce((a, t) => a + t.hours, 0) * 100) / 100; return h ? h : <span className="fm-faint">·</span>; } })),
          { h: "Worked", w: "64px", num: true, r: (e) => <b className="fm-ink">{weekTotals(s, e.id, ws).worked}</b> },
          { h: "Billable", w: "64px", num: true, r: (e) => weekTotals(s, e.id, ws).billable },
          { h: "Non-bill.", w: "64px", num: true, r: (e) => weekTotals(s, e.id, ws).nonBillable },
          { h: "Travel", w: "56px", num: true, r: (e) => weekTotals(s, e.id, ws).travel },
          { h: "OT", w: "48px", num: true, r: (e) => weekTotals(s, e.id, ws).overtime },
          { h: "Arrangement", w: "minmax(120px,1fr)", r: (e) => <span className="fm-faint" title={e.arrangement}>{e.arrangement || "Standard week"}</span> },
        ]} rows={engs} onRow={(e) => openDrawer({ kind: "engineer", id: e.id })} />
      </Card>
      <Card flush title="Entries" sub={entries.length + " entries, " + pending.length + " waiting for approval"}>
        <Table cols={cols} rows={entries} minWidth={900} />
      </Card>
      {fix && <CorrectModal id={fix} close={() => setFix(null)} />}
    </>
  );
}

function CorrectModal({ id, close }: { id: string; close: () => void }) {
  const s = useFM();
  const t = s.time.find((x) => x.id === id)!;
  const [hours, setHours] = useState(t.hours);
  const [kind, setKind] = useState<TimeEntry["kind"]>(t.kind);
  const [reason, setReason] = useState("");
  return (
    <Modal title="Correct a time entry" sub={sel.engineer(s, t.engineerId)!.name + ", " + fmtDate(t.date) + (t.jobId ? ", " + sel.job(s, t.jobId)?.number : "")} onClose={close}
      footer={<><Btn kind="ghost" onClick={close}>Cancel</Btn><Btn kind="primary" disabled={!reason.trim() || (hours === t.hours && kind === t.kind)} onClick={() => { correctTime(id, hours, kind, reason.trim()); close(); }}>Save correction</Btn></>}>
      <div className="fm-grid fm-g2">
        <Field label="Hours"><input type="number" className="fm-input" min={0} step={0.25} value={hours} onChange={(e) => setHours(Number(e.target.value))} /></Field>
        <Field label="Type"><select className="fm-select" value={kind} onChange={(e) => setKind(e.target.value as TimeEntry["kind"])}>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      </div>
      <Field label="Reason" hint="Required. Kept in the audit trail and shown to the engineer."><input className="fm-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Travel logged inside the job" /></Field>
      <div className="fm-sec">Audit trail</div>
      {t.corrections.length ? t.corrections.map((c, i) => <div key={i} className="fm-note" style={{ fontSize: 12.5 }}><b className="fm-ink">{c.from} → {c.to}</b> by {c.who}, {c.at}<br /><span className="fm-muted">{c.reason}</span></div>) : <div className="fm-faint" style={{ fontSize: 12.5 }}>No corrections yet. Corrections reset approval.</div>}
    </Modal>
  );
}

export default function EngineersPage({ tab }: { tab: string }) {
  const s = useFM();
  const ws = weekStart(TODAY);
  const totals = useMemo(() => s.engineers.map((e) => weekTotals(s, e.id, ws)), [s, ws]);
  const onLeave = s.engineers.filter((e) => engineerDay(s, e.id, TODAY).onLeave).length;
  const titles: Record<string, [string, string]> = {
    team: ["Engineers", "Who is where, what they can do and how the week is loading up."],
    app: ["Engineer app", "What engineers see on their phones. Same jobs, same records, nothing to re-key in the office."],
    timesheets: ["Timesheets", "Time worked, what's billable and what needs approving. Corrections keep a visible audit trail."],
  };
  const [title, sub] = titles[tab] || titles.team;
  return (
    <Page eyebrow="Operations" title={title} sub={sub} noDivision={tab !== "team"}>
      {tab === "team" && (
        <div className="fm-grid fm-g4">
          <Stat label="Engineers" value={s.engineers.length} sub={onLeave ? onLeave + " on leave today" : "All in today"} />
          <Stat label="Free time today" value={s.engineers.reduce((a, e) => a + engineerDay(s, e.id, TODAY).free, 0) + " h"} sub="Across the team" onClick={() => import("../store").then((m) => m.go("Schedule", "availability"))} />
          <Stat label="Worked this week" value={Math.round(totals.reduce((a, t) => a + t.worked, 0) * 10) / 10 + " h"} sub={Math.round(totals.reduce((a, t) => a + t.billable, 0) * 10) / 10 + " h billable"} onClick={() => import("../store").then((m) => m.setTab("Engineers", "timesheets"))} />
          <Stat label="Time to approve" value={totals.reduce((a, t) => a + t.pending, 0)} sub="Entries this week" tone={totals.reduce((a, t) => a + t.pending, 0) ? "warn" : "ok"} onClick={() => import("../store").then((m) => m.setTab("Engineers", "timesheets"))} />
        </div>
      )}
      {tab === "app" ? <EngineerApp /> : tab === "timesheets" ? <Timesheets /> : <Team />}
      {tab === "app" && <div className="fm-faint" style={{ fontSize: 12, textAlign: "center" }}>Prices and invoice values are hidden in the engineer's view. Vehicle tracking stays on the existing system.</div>}
    </Page>
  );
}
