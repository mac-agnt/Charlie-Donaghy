/* Helpers shared by the Servicing and Schedule modules. */
import { engineerDay, sel, mutate, createJob, allocateJob, checklistTemplate, toast } from "../../store";
import { fmtDate } from "../../dates";
import type { AssetType, Engineer, FMState, Skill } from "../../types";

export function skillOfAsset(t: AssetType): Skill {
  return t === "CCTV" ? "CCTV" : t === "Access control" ? "Access control" : t === "Intercom" ? "Intercom" : t === "Grounds" || t === "Building fabric" ? "Gardening" : t === "Emergency lighting" ? "Emergency lighting" : t === "Fire extinguishers" ? "Extinguishers" : "Fire";
}

export function qualifiedFor(s: FMState, services: AssetType[]): Engineer[] {
  const need = services.map(skillOfAsset);
  return s.engineers.filter((e) => need.every((n) => e.skills.includes(n) || (n === "Emergency lighting" && e.skills.includes("Fire")) || (n === "Gardening" && e.skills.includes("Maintenance"))));
}

export type CalEv = { key: string; kind: "install" | "job" | "service" | "holiday"; label: string; hours: number; jobId?: string; svId?: string; ref?: string; proposed?: boolean; draggable: boolean };

/** engineerDay, with a PPM visit and its own service job shown once. */
export function dayEvents(s: FMState, engineerId: string, date: string) {
  const day = engineerDay(s, engineerId, date);
  const svcJobs = new Set(day.items.filter((i) => i.kind === "service" && i.jobId).map((i) => i.jobId));
  const items = day.items.filter((i) => !(i.kind === "job" && svcJobs.has(i.jobId)));
  const evs: CalEv[] = items.map((i, k) => {
    const sv = i.svId ? s.serviceVisits.find((v) => v.id === i.svId) : undefined;
    return {
      key: i.kind + (i.jobId || i.svId || "") + k,
      kind: i.kind,
      label: i.label,
      hours: i.hours,
      jobId: i.jobId,
      svId: i.svId,
      ref: i.ref,
      proposed: sv ? sv.status === "proposed" : false,
      draggable: i.kind === "job" || i.kind === "service",
    };
  });
  const hours = evs.reduce((a, e) => a + e.hours, 0);
  const onLeave = day.onLeave;
  const clash = hours > 8 || (onLeave && evs.length > 1);
  return { evs, hours, free: Math.max(0, 8 - hours), onLeave, clash };
}

/** Most free hours first; skips anyone on leave. */
export function suggestEngineers(s: FMState, list: Engineer[], date: string) {
  return list
    .map((e) => ({ e, day: dayEvents(s, e.id, date) }))
    .filter((x) => !x.day.onLeave)
    .sort((a, b) => b.day.free - a.day.free);
}

/** Allocate a service visit. Creates its service job if it doesn't have one yet. */
export function allocateServiceVisit(s: FMState, svId: string, engineerId: string, date: string) {
  const v = s.serviceVisits.find((x) => x.id === svId)!;
  const c = sel.contract(s, v.contractId)!;
  let jobId = v.jobId;
  if (!jobId) {
    const j = createJob({
      siteId: v.siteId, division: c.division, type: "PPM service", priority: "Normal",
      description: "Planned service (" + c.ref + "): " + v.services.join(", ") + ". " + c.title + ".", engineerIds: [engineerId],
      scheduled: date, source: "Service plan", estHours: v.estHours, serviceVisitId: v.id, contractId: c.id, billedVia: c.billing === "per-visit" ? "job" : "contract",
      agreedPrice: c.billing === "per-visit" ? c.billingAmount : undefined,
    });
    jobId = j.id;
  } else {
    allocateJob(jobId, [engineerId], date);
  }
  const eng = sel.engineer(s, engineerId)!;
  mutate(
    (st) => ({ serviceVisits: st.serviceVisits.map((x) => (x.id === svId ? { ...x, engineerId, date, jobId, status: x.status === "completed" ? x.status : "scheduled", checklist: x.checklist.length ? x.checklist : checklistTemplate(x.services) } : x)) }),
    "Service visit at " + sel.site(s, v.siteId)!.name + " allocated to " + eng.name + " for " + fmtDate(date),
    "service",
    jobId,
  );
  toast("Allocated to " + eng.name.split(" ")[0] + " for " + fmtDate(date));
}

/** Move a PPM visit on the calendar (and its job, if it has one). */
export function moveService(s: FMState, svId: string, engineerId: string, date: string) {
  const v = s.serviceVisits.find((x) => x.id === svId)!;
  if (v.status === "proposed" && !v.jobId) {
    mutate((st) => ({ serviceVisits: st.serviceVisits.map((x) => (x.id === svId ? { ...x, engineerId, date } : x)) }), "Proposed visit at " + sel.site(s, v.siteId)!.name + " moved to " + fmtDate(date), "schedule");
    toast("Proposed visit moved to " + fmtDate(date));
    return;
  }
  allocateServiceVisit(s, svId, engineerId, date);
}

const DOC_CSS = `body{margin:0;padding:24px;background:#fff;font-family:"Instrument Sans",system-ui,sans-serif}
.fm-doc{color:#1b1d22;padding:10px 6px;font-size:12.5px;line-height:1.55;max-width:760px;margin:0 auto}
.fm-doc h1{font-size:22px;margin:0;letter-spacing:-.4px}.fm-doc h2{font-size:14px;margin:22px 0 6px}
.fm-doc .muted{color:#6b7078}.fm-doc table{width:100%;border-collapse:collapse;margin-top:12px}
.fm-doc th{text-align:left;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#6b7078;border-bottom:1px solid #d9dadf;padding:6px 4px}
.fm-doc td{border-bottom:1px solid #ececef;padding:7px 4px;vertical-align:top}
.fm-doc .brand{display:flex;align-items:center;gap:12px}
.fm-doc .mark{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.fm-doc pre{white-space:pre-wrap;font:inherit;margin:0}`;

/** Print one document element on its own, not the whole app. */
export function printEl(el: HTMLElement | null, title: string) {
  if (!el) return;
  const w = window.open("", "_blank", "width=860,height=1000");
  if (!w) {
    toast("Pop-up blocked. Allow pop-ups to print", "warn");
    return;
  }
  w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>" + title + "</title><style>" + DOC_CSS + "</style></head><body>" + el.outerHTML + "</body></html>");
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
