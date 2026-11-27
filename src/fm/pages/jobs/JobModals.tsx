/* Job modals: create, allocate, log visit, add material, complete, leave site, photo. */
import { useMemo, useState } from "react";
import {
  useFM, sel, closeModal, createJob, findDuplicateJobs, allocateJob, logVisit, addMaterial, completeJob, leaveSiteReturn,
  addPhoto, engineerDay, jobTotals, openDrawer,
} from "../../store";
import { DIVISIONS, divisionById, type DivisionId } from "../../config";
import { TODAY, fmtDate, addWorkingDays } from "../../dates";
import { Modal, Field, Btn, Money, Avatar, Pill, Ico } from "../../ui";
import type { Job, TimeEntry } from "../../types";

const TYPES: Job["type"][] = ["Reactive callout", "Repair", "Installation", "PPM service", "Maintenance", "Inspection"];
const PRIORITIES: Job["priority"][] = ["Emergency", "High", "Normal", "Low"];

export function hoursBetween(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  const m = bh * 60 + bm - (ah * 60 + am);
  return Math.max(0, Math.round((m / 60) * 4) / 4);
}

export default function JobModals(): JSX.Element | null {
  const s = useFM();
  const m = s.ui.modal;
  if (!m) return null;
  switch (m.kind) {
    case "new-job": return <NewJob preset={m} />;
    case "allocate-job": return <Allocate jobId={m.jobId} />;
    case "log-visit": return <LogVisit jobId={m.jobId} preset={m} />;
    case "add-material": return <AddMaterial jobId={m.jobId} />;
    case "complete-job": return <Complete jobId={m.jobId} />;
    case "leave-site": return <LeaveSite jobId={m.jobId} />;
    case "add-photo": return <AddPhoto jobId={m.jobId} />;
  }
  return null;
}

function NewJob({ preset }: { preset: Record<string, any> }) {
  const s = useFM();
  const [customerId, setCustomer] = useState<string>(preset.customerId || s.customers[0].id);
  const sites = s.sites.filter((x) => x.customerId === customerId);
  const [siteId, setSite] = useState<string>(preset.siteId || sites[0]?.id || "");
  const cust = sel.customer(s, customerId)!;
  const [division, setDivision] = useState<DivisionId>(preset.division || (s.division !== "ALL" && cust.divisions.includes(s.division) ? s.division : cust.divisions[0]));
  const [type, setType] = useState<Job["type"]>("Reactive callout");
  const [priority, setPriority] = useState<Job["priority"]>("Normal");
  const [description, setDescription] = useState<string>(preset.description || "");
  const [woRef, setWo] = useState("");
  const [engineerIds, setEngs] = useState<string[]>(s.role === "engineer" ? [s.meEngineerId] : []);
  const [date, setDate] = useState<string>(s.role === "engineer" ? TODAY : "");
  const [source, setSource] = useState<Job["source"]>(s.role === "engineer" ? "Engineer" : "Phone");
  const dupes = useMemo(() => (siteId && description.length > 8 ? findDuplicateJobs(s, siteId, description) : []), [s, siteId, description]);
  const ok = siteId && description.trim().length > 5;
  const save = () => {
    const j = createJob({ siteId, division, type, priority, description: description.trim(), woRef, engineerIds, scheduled: date || null, source });
    closeModal();
    openDrawer({ kind: "job", id: j.id });
  };
  const changeCustomer = (id: string) => {
    setCustomer(id);
    const c = sel.customer(s, id)!;
    setSite(s.sites.find((x) => x.customerId === id)?.id || "");
    if (!c.divisions.includes(division)) setDivision(c.divisions[0]);
  };
  return (
    <Modal title="New job" sub="Goes into the shared job box unless you allocate it now" onClose={closeModal} width={620}
      footer={<><Btn kind="ghost" onClick={closeModal}>Cancel</Btn><Btn kind="primary" icon="plus" disabled={!ok} onClick={save}>Create job</Btn></>}>
      <div className="fm-grid fm-g2">
        <Field label="Customer">
          <select className="fm-select" value={customerId} onChange={(e) => changeCustomer(e.target.value)}>
            {s.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Site">
          <select className="fm-select" value={siteId} onChange={(e) => setSite(e.target.value)}>
            {sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label="Division">
          <select className="fm-select" value={division} onChange={(e) => setDivision(e.target.value as DivisionId)}>
            {DIVISIONS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Job type">
          <select className="fm-select" value={type} onChange={(e) => setType(e.target.value as Job["type"])}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="fm-select" value={priority} onChange={(e) => setPriority(e.target.value as Job["priority"])}>
            {PRIORITIES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Customer work order ref" hint="Optional">
          <input className="fm-input" value={woRef} onChange={(e) => setWo(e.target.value)} placeholder="e.g. WO-88412" />
        </Field>
      </div>
      <Field label="What needs doing">
        <textarea className="fm-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Fire panel showing a fault on zone 2, sounders not resetting" />
      </Field>
      {dupes.length > 0 && (
        <div className="fm-note warn">
          <b>Possible duplicate.</b> {dupes.length === 1 ? "There's an open job" : "There are " + dupes.length + " open jobs"} at this site that look similar:
          {dupes.map((d) => (
            <div key={d.id} style={{ marginTop: 6 }}>
              <button className="fm-link" onClick={() => { closeModal(); openDrawer({ kind: "job", id: d.id }); }}>{d.number}</button> <span className="fm-muted">{d.description.split(".")[0]}</span>
            </div>
          ))}
        </div>
      )}
      <div className="fm-grid fm-g2">
        <Field label="Request came in by">
          <select className="fm-select" value={source} onChange={(e) => setSource(e.target.value as Job["source"])}>
            {(["Phone", "Email", "Website", "Engineer"] as Job["source"][]).map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Scheduled date" hint="Leave blank to leave it in the job box">
          <input type="date" className="fm-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <EngineerPicker value={engineerIds} onChange={setEngs} date={date || TODAY} division={division} />
    </Modal>
  );
}

export function EngineerPicker({ value, onChange, date, division }: { value: string[]; onChange: (v: string[]) => void; date: string; division?: DivisionId }) {
  const s = useFM();
  const list = s.engineers.slice().sort((a, b) => (division ? Number(!a.divisions.includes(division)) - Number(!b.divisions.includes(division)) : 0));
  return (
    <div className="fm-field">
      <span>Engineers <span className="fm-faint" style={{ fontWeight: 400 }}>(availability on {fmtDate(date)})</span></span>
      <div style={{ display: "grid", gap: 6 }}>
        {list.map((e) => {
          const day = engineerDay(s, e.id, date);
          const on = value.includes(e.id);
          return (
            <label key={e.id} className="fm-check" style={{ alignItems: "center", padding: "8px 10px", borderRadius: 10, border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)"), background: on ? "var(--accent-faint)" : "none" }}>
              <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== e.id) : [...value, e.id])} />
              <Avatar e={e} size={24} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="fm-ink">{e.name}</span> <span className="fm-faint" style={{ fontSize: 12 }}>{e.skills.join(", ")}</span>
              </span>
              {day.onLeave ? <Pill tone="bad">On leave</Pill> : day.free >= 6 ? <Pill tone="ok">{day.free} h free</Pill> : day.free > 0 ? <Pill tone="warn">{day.free} h free</Pill> : <Pill tone="bad">Fully booked</Pill>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Allocate({ jobId }: { jobId: string }) {
  const s = useFM();
  const j = sel.job(s, jobId)!;
  const [ids, setIds] = useState<string[]>(j.engineerIds);
  const [date, setDate] = useState<string>(j.scheduled || addWorkingDays(TODAY, 0) || TODAY);
  return (
    <Modal title={"Allocate " + j.number} sub={sel.site(s, j.siteId)!.name + ", " + j.description.split(".")[0]} onClose={closeModal} width={560}
      footer={<><Btn kind="ghost" onClick={closeModal}>Cancel</Btn><Btn kind="primary" disabled={!ids.length} onClick={() => { allocateJob(jobId, ids, date || null); closeModal(); }}>Allocate</Btn></>}>
      <Field label="Date"><input type="date" className="fm-input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <EngineerPicker value={ids} onChange={setIds} date={date || TODAY} division={j.division} />
    </Modal>
  );
}

function LogVisit({ jobId, preset }: { jobId: string; preset: Record<string, any> }) {
  const s = useFM();
  const j = sel.job(s, jobId)!;
  const [engineerId, setEng] = useState<string>(preset.engineerId || (s.role === "engineer" ? s.meEngineerId : j.engineerIds[0] || s.engineers[0].id));
  const [date, setDate] = useState<string>(preset.date || (j.scheduled && j.scheduled >= TODAY ? j.scheduled : TODAY));
  const [start, setStart] = useState<string>(preset.start || "09:00");
  const [end, setEnd] = useState<string>(preset.end || "12:00");
  const [summary, setSummary] = useState<string>(preset.summary || "");
  const [kind, setKind] = useState<TimeEntry["kind"]>("billable");
  const [ret, setRet] = useState(false);
  const [verified, setVerified] = useState<boolean>(!!preset.verified);
  const hours = hoursBetween(start, end);
  const t = jobTotals(s, j);
  const ok = hours > 0 && summary.trim().length > 3;
  const save = () => {
    logVisit(jobId, { engineerId, date, start, end, hours, summary: summary.trim(), returnRequired: ret, verified, kind });
    closeModal();
  };
  return (
    <Modal title={"Log a visit on " + j.number} sub={"So far: " + t.visits.length + " visit" + (t.visits.length === 1 ? "" : "s") + ", " + t.billableHours + " h billable. New time adds to the same job."} onClose={closeModal} width={580}
      footer={<><Btn kind="ghost" onClick={closeModal}>Cancel</Btn><Btn kind="primary" icon="check" disabled={!ok} onClick={save}>Save visit ({hours} h)</Btn></>}>
      <div className="fm-grid fm-g2">
        <Field label="Engineer">
          <select className="fm-select" value={engineerId} onChange={(e) => setEng(e.target.value)} disabled={s.role === "engineer"}>
            {s.engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" className="fm-input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Arrived"><input type="time" className="fm-input" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Left"><input type="time" className="fm-input" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label="Time type" hint="Only billable time goes onto the invoice">
        <select className="fm-select" value={kind} onChange={(e) => setKind(e.target.value as TimeEntry["kind"])}>
          <option value="billable">Billable labour</option>
          <option value="non-billable">Non-billable (rework, waiting, warranty)</option>
          <option value="overtime">Overtime (approved)</option>
        </select>
      </Field>
      <Field label="What was done">
        <textarea className="fm-textarea" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Fitted the replacement zone interface module, tested zone 4 and the full sounder circuit" />
      </Field>
      <label className="fm-check"><input type="checkbox" checked={ret} onChange={(e) => setRet(e.target.checked)} /><span><b className="fm-ink">Return visit required.</b> The job stays In progress.</span></label>
      <label className="fm-check"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /><span>Verify arrival and departure location <span className="fm-faint">(simulated, recorded only at this moment, no background tracking)</span></span></label>
    </Modal>
  );
}

function AddMaterial({ jobId }: { jobId: string }) {
  const s = useFM();
  const j = sel.job(s, jobId)!;
  const [q, setQ] = useState("");
  const [productId, setProduct] = useState<string | undefined>();
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setPrice] = useState(0);
  const list = s.products.filter((p) => p.division === j.division && p.category !== "Labour" && p.category !== "Installation" && (!q || (p.name + " " + p.sku).toLowerCase().includes(q.toLowerCase()))).slice(0, 8);
  const pick = (id: string) => {
    const p = sel.product(s, id)!;
    setProduct(p.id); setDescription(p.name); setPrice(p.price);
  };
  const ok = description.trim() && qty > 0;
  return (
    <Modal title={"Add materials to " + j.number} sub={"From the " + divisionById(j.division).name + " catalogue, or type your own"} onClose={closeModal} width={580}
      footer={<><Btn kind="ghost" onClick={closeModal}>Cancel</Btn><Btn kind="primary" icon="plus" disabled={!ok} onClick={() => { addMaterial(jobId, { productId, description: description.trim(), qty, unitPrice, addedBy: s.role === "engineer" ? sel.engineer(s, s.meEngineerId)!.name : undefined }); closeModal(); }}>Add to job</Btn></>}>
      <Field label="Search the catalogue">
        <input className="fm-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. zone interface, detector, camera" autoFocus />
      </Field>
      <div style={{ display: "grid", gap: 4, maxHeight: 220, overflowY: "auto" }}>
        {list.map((p) => (
          <button key={p.id} className="fm-chip" style={{ justifyContent: "space-between", height: 34, borderRadius: 10, ...(productId === p.id ? { borderColor: "var(--accent-line)", color: "var(--accent)", background: "var(--accent-soft)" } : {}) }} onClick={() => pick(p.id)}>
            <span className="fm-trunc"><span className="fm-mono fm-faint">{p.sku}</span> {p.name}</span>
            <Money v={p.price} dp={2} />
          </button>
        ))}
        {!list.length && <div className="fm-faint" style={{ fontSize: 12.5, padding: 6 }}>Nothing matches. Type the item below instead.</div>}
      </div>
      <div className="fm-grid" style={{ gridTemplateColumns: "minmax(0,2fr) 80px 110px" }}>
        <Field label="Item"><input className="fm-input" value={description} onChange={(e) => { setDescription(e.target.value); setProduct(undefined); }} /></Field>
        <Field label="Qty"><input type="number" min={0} step={1} className="fm-input" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
        <Field label="Unit price €"><input type="number" min={0} step={0.01} className="fm-input" value={unitPrice} onChange={(e) => setPrice(Number(e.target.value))} /></Field>
      </div>
    </Modal>
  );
}

function Complete({ jobId }: { jobId: string }) {
  const s = useFM();
  const j = sel.job(s, jobId)!;
  const t = jobTotals(s, j);
  const [confirmed, setConfirmed] = useState(false);
  const [by, setBy] = useState<string>(s.role === "engineer" ? s.meEngineerId : j.engineerIds[0] || s.engineers[0].id);
  const [notes, setNotes] = useState<string>(j.completionNotes || j.description);
  const done = () => {
    completeJob(jobId, sel.engineer(s, by)!.name, notes.trim());
    closeModal();
  };
  return (
    <Modal title={"Complete " + j.number} sub="Nothing is sent or invoiced until you confirm and Charlie approves" onClose={closeModal} width={600}
      footer={<><Btn kind="ghost" onClick={closeModal}>Not yet</Btn><Btn kind="primary" icon="check" disabled={!confirmed || !notes.trim()} onClick={done}>Confirm complete</Btn></>}>
      <div className="fm-kv">
        <div><div className="k">Visits</div><div className="v">{t.visits.length}</div></div>
        <div><div className="k">Billable labour</div><div className="v">{t.billableHours} h</div></div>
        <div><div className="k">Materials</div><div className="v">{t.materials.length} lines, <Money v={t.materialsValue} /></div></div>
        <div><div className="k">Job value</div><div className="v"><Money v={t.value} /></div></div>
      </div>
      {t.visits.length === 0 && <div className="fm-note warn">No visits are logged on this job yet. Log the time first so it reaches the invoice.</div>}
      <div style={{ display: "grid", gap: 4 }}>
        {t.visits.map((v) => (
          <div key={v.id} className="fm-row" style={{ fontSize: 12.5 }}>
            <span className="fm-mono fm-faint" style={{ width: 90 }}>{fmtDate(v.date)}</span>
            <span className="fm-ink" style={{ width: 40 }}>{v.hours} h</span>
            <span className="fm-trunc fm-muted">{sel.engineer(s, v.engineerId)?.name}: {v.summary}</span>
          </div>
        ))}
      </div>
      <Field label="Confirmed by">
        <select className="fm-select" value={by} onChange={(e) => setBy(e.target.value)} disabled={s.role === "engineer"}>
          {s.engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </Field>
      <Field label="Completion notes for the customer" hint="Goes on the completion notice. Never include access codes.">
        <textarea className="fm-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <label className="fm-check" style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid " + (confirmed ? "var(--accent-line)" : "var(--border-strong)"), background: confirmed ? "var(--accent-faint)" : "none" }}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        <span><b className="fm-ink">I confirm the work is complete and tested.</b> A completion notice and {j.billedVia === "contract" ? "no invoice (covered by contract)" : "a draft invoice"} will be prepared for approval.</span>
      </label>
    </Modal>
  );
}

function LeaveSite({ jobId }: { jobId: string }) {
  const s = useFM();
  const j = sel.job(s, jobId)!;
  const [note, setNote] = useState("");
  const [date, setDate] = useState(addWorkingDays(TODAY, 1));
  return (
    <Modal title="Leave site, return required" sub={j.number + " stays In progress. Time and materials so far stay on the job."} onClose={closeModal}
      footer={<><Btn kind="ghost" onClick={closeModal}>Cancel</Btn><Btn kind="primary" disabled={!note.trim()} onClick={() => { leaveSiteReturn(jobId, note.trim(), date || null); closeModal(); }}>Save</Btn></>}>
      <Field label="Why a return is needed"><textarea className="fm-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Replacement part on order, due Monday" /></Field>
      <Field label="Return date" hint="Optional. Leave blank if you don't know yet."><input type="date" className="fm-input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
    </Modal>
  );
}

function AddPhoto({ jobId }: { jobId: string }) {
  const s = useFM();
  const j = sel.job(s, jobId)!;
  const [caption, setCaption] = useState("");
  return (
    <Modal title={"Add a photo to " + j.number} sub="Simulated upload for the demo. The photo is stored against the job." onClose={closeModal}
      footer={<><Btn kind="ghost" onClick={closeModal}>Cancel</Btn><Btn kind="primary" icon="camera" disabled={!caption.trim()} onClick={() => { addPhoto(jobId, caption.trim()); closeModal(); }}>Upload</Btn></>}>
      <div className="fm-note" style={{ display: "flex", alignItems: "center", gap: 10 }}><Ico d="camera" /> Tap to take a photo or choose one from the phone.</div>
      <Field label="Caption"><input className="fm-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. New module fitted, zone 4" autoFocus /></Field>
    </Modal>
  );
}
