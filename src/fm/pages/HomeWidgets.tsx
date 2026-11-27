/* Right-hand widget rail on Home. Briefings, attention items and approvals
   live here so the centre column stays clean (locked layout rule). */
import type { ReactNode } from "react";
import { useFM, alerts, metrics, engineerDay, openDrawer, go, approveProposal, rejectProposal, euro, setTab, sel } from "../store";
import { SUGGESTED } from "../assistant";
import { TODAY } from "../dates";
import { canSeeMoney } from "../config";
import { Ico, Avatar } from "../ui";

function W({ title, hint, onRemove, edit, children }: { title: string; hint?: string; onRemove?: () => void; edit?: boolean; children: ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", overflow: "hidden", flex: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px 8px" }}>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, letterSpacing: "-.2px" }}>{title}</span>
        {hint && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)" }}>{hint}</span>}
        {edit && onRemove && (
          <button className="fm-x" style={{ width: 24, height: 24 }} onClick={onRemove} title="Remove widget"><Ico d="x" size={11} stroke={2.2} /></button>
        )}
      </div>
      <div style={{ paddingBottom: 8 }}>{children}</div>
    </div>
  );
}

const rowBtn: React.CSSProperties = { all: "unset", boxSizing: "border-box", display: "flex", alignItems: "flex-start", gap: 10, width: "100%", padding: "9px 16px", cursor: "pointer", fontSize: 12.5, lineHeight: 1.45, color: "var(--body)" };

export default function FMHomeWidgets({ v }: { v: any }) {
  const s = useFM();
  const edit = !!v.widgetEdit;
  const al = alerts(s).slice(0, 5);
  const m = metrics(s);
  const pending = s.proposals.filter((p) => p.status === "pending" && (canSeeMoney(s.role) || p.category !== "Financial"));
  const meId = s.role === "engineer" ? s.meEngineerId : null;
  const today = s.engineers.filter((e) => !meId || e.id === meId).flatMap((e) => engineerDay(s, e.id, TODAY).items.filter((i) => i.kind !== "holiday").map((i) => ({ e, i })));
  return (
    <>
      {v.show?.ask && (
        <W title="Ask Charlie AI" hint="TRY" edit={edit} onRemove={v.removeAsk}>
          {SUGGESTED.slice(0, s.role === "engineer" ? 3 : 6).map((q) => (
            <button key={q} className="ixh" style={rowBtn} onClick={() => v.askFM(q)}>
              <span style={{ color: "var(--accent)", marginTop: 1 }}><Ico d="spark" size={13} /></span>
              <span>{q}</span>
            </button>
          ))}
        </W>
      )}
      {v.show?.inbox && (
        <W title="Requires attention" hint={String(alerts(s).length)} edit={edit} onRemove={v.removeInbox}>
          {al.length === 0 && <div style={{ padding: "8px 16px 10px", fontSize: 12.5, color: "var(--dim)" }}>Nothing needs you right now.</div>}
          {al.map((a) => (
            <button key={a.id} className="ixh" style={rowBtn} onClick={() => (a.drawer ? openDrawer(a.drawer) : a.page && go(a.page, a.tab))}>
              <span style={{ width: 7, height: 7, borderRadius: 2, marginTop: 6, flex: "none", background: a.tone === "bad" ? "var(--bad)" : a.tone === "warn" ? "var(--warn)" : "var(--accent)" }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", color: "var(--ink)" }}>{a.title}</span>
                <span style={{ display: "block", color: "var(--faint)", fontSize: 11.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.detail}</span>
              </span>
            </button>
          ))}
          {s.role !== "engineer" && <button className="ixh" style={{ ...rowBtn, color: "var(--accent)", fontWeight: 500 }} onClick={() => go("Dashboard")}>Open the dashboard</button>}
        </W>
      )}
      {v.show?.visits && (
        <W title={meId ? "My day" : "Today's schedule"} hint={today.length + " BOOKED"} edit={edit} onRemove={v.removeVisits}>
          {today.slice(0, 7).map(({ e, i }, k) => (
            <button key={k} className="ixh" style={rowBtn} onClick={() => (i.jobId ? openDrawer({ kind: "job", id: i.jobId }) : i.svId ? openDrawer({ kind: "serviceVisit", id: i.svId }) : go("Schedule"))}>
              <Avatar e={e} size={22} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(i.ref ? i.ref + " · " : "") + (i.jobId ? sel.site(s, sel.job(s, i.jobId)!.siteId)?.name : i.label)}</span>
                <span style={{ display: "block", color: "var(--faint)", fontSize: 11.5 }}>{i.kind === "install" ? "Installation" : i.kind === "service" ? "Planned service" : "Job"} · {i.hours} h</span>
              </span>
            </button>
          ))}
          {!today.length && <div style={{ padding: "8px 16px 10px", fontSize: 12.5, color: "var(--dim)" }}>Nothing booked today.</div>}
          <button className="ixh" style={{ ...rowBtn, color: "var(--accent)", fontWeight: 500 }} onClick={() => go("Schedule")}>Open the schedule</button>
        </W>
      )}
      {v.show?.work && s.role !== "engineer" && (
        <W title="Waiting for approval" hint={String(pending.length)} edit={edit} onRemove={v.removeWork}>
          {pending.slice(0, 4).map((p) => (
            <div key={p.id} style={{ padding: "9px 16px", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.4 }}>{p.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 2 }}>{p.category}{p.value && canSeeMoney(s.role) ? " · " + euro(p.value) : ""}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button className="fm-btn sm primary" onClick={() => approveProposal(p.id)}>Approve</button>
                <button className="fm-btn sm ghost" onClick={() => rejectProposal(p.id)}>Decline</button>
              </div>
            </div>
          ))}
          {!pending.length && <div style={{ padding: "8px 16px 10px", fontSize: 12.5, color: "var(--dim)" }}>Nothing waiting for you.</div>}
          <button className="ixh" style={{ ...rowBtn, color: "var(--accent)", fontWeight: 500 }} onClick={() => { setTab("Agents", "approvals"); go("Agents"); }}>All approvals</button>
        </W>
      )}
      {v.show?.kpi && (
        <W title="Today's numbers" edit={edit} onRemove={v.removeKpi}>
          {[
            ["Awaiting allocation", String(m.unallocated.length), () => go("Jobs", "board")],
            ["In progress", String(m.inProgress.length), () => go("Jobs", "board")],
            ["Completed, not invoiced", canSeeMoney(s.role) ? euro(m.unbilledValue) : String(m.completed.length), () => go("Finance", "ready")],
            ["Overdue", canSeeMoney(s.role) ? euro(m.overdueValue) : String(m.overdue.length), () => go("Finance", "invoices")],
          ].map(([k, val, fn]) => (
            <button key={k as string} className="ixh" style={{ ...rowBtn, alignItems: "center" }} onClick={fn as () => void}>
              <span style={{ flex: 1 }}>{k as string}</span>
              <span style={{ fontFamily: "var(--mono)", color: "var(--ink)" }}>{val as string}</span>
            </button>
          ))}
        </W>
      )}
      {v.show?.activity && (
        <W title="Live activity" edit={edit} onRemove={v.removeActivity}>
          {s.log.slice(0, 5).map((e) => (
            <button key={e.id} className="ixh" style={rowBtn} onClick={() => e.ref && openDrawer({ kind: "job", id: e.ref })}>
              <span style={{ width: 6, height: 6, borderRadius: 2, marginTop: 6, flex: "none", background: "var(--accent)" }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", color: "var(--ink)" }}>{e.text}</span>
                <span style={{ display: "block", color: "var(--faint)", fontSize: 11.5 }}>{e.who} · {e.at.slice(11)}</span>
              </span>
            </button>
          ))}
        </W>
      )}
    </>
  );
}
