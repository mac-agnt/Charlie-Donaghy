/* Agents: workforce control, automation library, WhatsApp demo, approvals. */
import { useEffect, useRef, useState } from "react";
import AgentFace from "../../components/AgentFace";
import { useFM, runAgent, toggleAgentPause, toggleAutomation, approveProposal, rejectProposal, euro, openDrawer, sel } from "../store";
import { AGENTS, agentMeta } from "../agents";
import { answerFM, type FMAnswer } from "../assistant";
import { canSeeMoney } from "../config";
import { Page, Card, Btn, Pill, Ico, Empty, Steps, Seg } from "../ui";
import type { AgentId, Proposal } from "../types";

export default function AgentsFM({ tab }: { tab: string }) {
  if (tab === "automations") return <Automations />;
  if (tab === "whatsapp") return <WhatsApp />;
  if (tab === "approvals") return <Approvals />;
  return <Workforce />;
}

/* ── Workforce ─────────────────────────────────────────────────────────── */
function Workforce() {
  const s = useFM();
  const [open, setOpen] = useState<AgentId>("watchdog");
  const a = agentMeta(open)!;
  const runs = s.agentRuns.filter((r) => r.agentId === open);
  const live = runs.find((r) => r.status === "running");
  const props = s.proposals.filter((p) => p.agentId === open);
  return (
    <Page noDivision eyebrow="Agent workforce" title="Eight agents, one set of records" sub="Each agent reads the same jobs, schedules, invoices and contracts as you. They prepare and propose; anything financial or customer-facing waits for your approval.">
      <div className="fm-grid fm-g4">
        {AGENTS.map((ag) => {
          const last = s.agentRuns.find((r) => r.agentId === ag.id);
          const paused = !!s.agentPaused[ag.id];
          const running = last?.status === "running";
          const waiting = s.proposals.filter((p) => p.agentId === ag.id && p.status === "pending").length;
          return (
            <button key={ag.id} className="fm-stat" onClick={() => setOpen(ag.id)} style={{ borderColor: open === ag.id ? "var(--accent-line)" : undefined, background: open === ag.id ? "var(--accent-faint)" : undefined }}>
              <span className="fm-row" style={{ gap: 10 }}>
                <AgentFace shape={ag.shape} state={paused ? "idle" : running ? "working" : waiting ? "waiting" : "complete"} tint={ag.tint} size="34" />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{ag.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--faint)" }}>{paused ? "Paused" : running ? "Running now" : last ? "Last run " + last.at.slice(11) + (last.at.slice(0, 10) === "2026-11-27" ? "" : ", " + last.at.slice(5, 10)) : "Not run yet"}</span>
                </span>
              </span>
              <span className="s" style={{ whiteSpace: "normal", lineHeight: 1.45 }}>{ag.role}</span>
              <span className="fm-row" style={{ gap: 6 }}>
                {paused ? <Pill>Paused</Pill> : running ? <Pill tone="accent" dot>Running</Pill> : waiting ? <Pill tone="warn">{waiting} to approve</Pill> : <Pill tone="ok">Idle</Pill>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="fm-grid fm-g-main">
        <Card
          title={<span className="fm-row"><AgentFace shape={a.shape} state={live ? "working" : "idle"} tint={a.tint} size="26" />{a.name} agent</span>}
          sub={a.schedule}
          action={
            <span className="fm-row" style={{ gap: 6 }}>
              <Btn size="sm" icon={s.agentPaused[open] ? "play" : "pause"} onClick={() => toggleAgentPause(open)}>{s.agentPaused[open] ? "Resume" : "Pause"}</Btn>
              <Btn size="sm" kind="primary" icon="play" disabled={!!live || !!s.agentPaused[open]} onClick={() => runAgent(open)}>{live ? "Running" : "Run now"}</Btn>
            </span>
          }
        >
          <div className="fm-grid fm-g2">
            <div>
              <div className="fm-sec">Responsibilities</div>
              <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "var(--body)" }}>{a.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
            <div>
              <div className="fm-sec">Connected data</div>
              <div className="fm-chips" style={{ marginTop: 12 }}>{a.sources.map((x) => <span key={x} className="fm-chip" style={{ cursor: "default" }}><Ico d="link" size={11} />{x}</span>)}</div>
              <div className="fm-sec" style={{ marginTop: 18 }}>Approval requirements</div>
              <div className="fm-note accent" style={{ marginTop: 12 }}><Ico d="shield" size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />{a.approvals}</div>
            </div>
          </div>
          <div className="fm-sec" style={{ marginTop: 20 }}>Run history</div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {runs.length === 0 && <Empty title="No runs yet" hint="Run it now to see what it does." />}
            {runs.slice(0, 5).map((r) => (
              <div key={r.id} className="fm-note" style={{ padding: "12px 14px" }}>
                <div className="fm-row">
                  <span className="fm-mono fm-faint">{r.at}</span>
                  <span className="fm-spacer" />
                  {r.status === "running" ? <Pill tone="accent" dot>Running</Pill> : r.status === "needs approval" ? <Pill tone="warn">Needs approval</Pill> : <Pill tone="ok">Completed</Pill>}
                </div>
                <div style={{ marginTop: 8, color: "var(--ink)" }}>{r.summary}</div>
                {r.steps.length > 0 && <div style={{ marginTop: 10 }}><Steps steps={r.steps} running={r.status === "running"} /></div>}
                {r.records.length > 0 && <div className="fm-faint" style={{ fontSize: 11.5, marginTop: 8 }}>Records: {r.records.join(", ")}</div>}
              </div>
            ))}
          </div>
        </Card>
        <Card title="Proposed actions" sub="From this agent" flush>
          {props.length === 0 && <Empty title="No proposals" hint="This agent hasn't proposed anything that needs a decision." />}
          {props.slice(0, 8).map((p) => <ProposalRow key={p.id} p={p} />)}
        </Card>
      </div>
    </Page>
  );
}

function ProposalRow({ p }: { p: Proposal }) {
  const s = useFM();
  const money = canSeeMoney(s.role);
  const who = p.agentId === "charlie-ai" ? "Charlie AI" : p.agentId === "automation" ? "Automation" : agentMeta(p.agentId)?.name + " agent";
  return (
    <div style={{ padding: "13px 18px", borderTop: "1px solid var(--border)" }}>
      <div className="fm-row" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{p.title}</div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3, lineHeight: 1.5 }}>{p.detail}</div>
          <div className="fm-row" style={{ gap: 8, marginTop: 7, flexWrap: "wrap" }}>
            <Pill tone={p.category === "Financial" ? "warn" : p.category === "External communication" ? "info" : ""}>{p.category}</Pill>
            <span className="fm-faint" style={{ fontSize: 11.5 }}>{who} · {p.createdAt.slice(5)}</span>
            {p.value && money ? <span className="fm-mono fm-ink" style={{ fontSize: 12 }}>{euro(p.value)}</span> : null}
          </div>
        </div>
        {p.status === "pending" ? (
          <span className="fm-row" style={{ gap: 6, flex: "none" }}>
            <Btn size="sm" kind="ghost" onClick={() => rejectProposal(p.id)}>Decline</Btn>
            <Btn size="sm" kind="primary" onClick={() => approveProposal(p.id)}>Approve</Btn>
          </span>
        ) : (
          <Pill tone={p.status === "approved" ? "ok" : ""}>{p.status === "approved" ? "Approved" : "Declined"}</Pill>
        )}
      </div>
    </div>
  );
}

/* ── Approvals ─────────────────────────────────────────────────────────── */
function Approvals() {
  const s = useFM();
  const [cat, setCat] = useState<"all" | Proposal["category"]>("all");
  const money = canSeeMoney(s.role);
  const visible = s.proposals.filter((p) => (money || p.category !== "Financial") && (cat === "all" || p.category === cat));
  const pending = visible.filter((p) => p.status === "pending");
  const decided = visible.filter((p) => p.status !== "pending");
  return (
    <Page noDivision eyebrow="Approvals" title={pending.length ? pending.length + " waiting for your decision" : "Nothing waiting"} sub="Agents and automations prepare the work. Invoices, payments, customer emails and schedule changes only happen once approved here, in Charlie AI or on the record itself."
      actions={<Seg value={cat} onChange={setCat} options={[["all", "All"], ["Financial", "Financial"], ["External communication", "Customer comms"], ["Schedule", "Schedule"], ["Operations", "Operations"]]} />}>
      <Card title="Waiting" flush>
        {pending.length === 0 && <Empty title="All caught up" hint="New proposals appear here as agents run." />}
        {pending.map((p) => <ProposalRow key={p.id} p={p} />)}
      </Card>
      <Card title="Decided" sub="Audit trail" flush>
        {decided.length === 0 && <Empty title="No decisions yet" />}
        {decided.slice(0, 20).map((p) => <ProposalRow key={p.id} p={p} />)}
      </Card>
    </Page>
  );
}

/* ── Automations ───────────────────────────────────────────────────────── */
function Automations() {
  const s = useFM();
  const [open, setOpen] = useState<string | null>("au05");
  return (
    <Page noDivision eyebrow="Automation library" title="Twelve automations" sub="Trigger, conditions, actions and every execution. External emails and financial writes are simulated in this demo and still wait for approval.">
      <Card flush>
        {s.automations.map((a) => (
          <div key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
            <div className="fm-row" style={{ padding: "13px 18px", cursor: "pointer" }} onClick={() => setOpen(open === a.id ? null : a.id)}>
              <span className="fm-mono fm-faint" style={{ width: 26 }}>{a.no}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{a.trigger} <span className="fm-faint">→</span> {a.name}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--faint)", marginTop: 2 }}>{a.runs.length} runs · last {a.runs[0]?.at.slice(5) || "never"} · {a.simulated}</span>
              </span>
              <label className="fm-check" onClick={(e) => e.stopPropagation()} style={{ alignItems: "center" }}>
                <input type="checkbox" checked={a.enabled} onChange={() => toggleAutomation(a.id)} />
                <span>{a.enabled ? "On" : "Off"}</span>
              </label>
              <Ico d={open === a.id ? "x" : "arrow"} size={12} style={{ color: "var(--faint)" }} />
            </div>
            {open === a.id && (
              <div className="fm-grid fm-g3" style={{ padding: "0 18px 18px 54px" }}>
                <div><div className="fm-sec">Trigger</div><div className="fm-note" style={{ marginTop: 10 }}>{a.trigger}</div></div>
                <div><div className="fm-sec">Conditions</div><div className="fm-note" style={{ marginTop: 10 }}>{a.conditions.map((c) => <div key={c}>• {c}</div>)}</div></div>
                <div><div className="fm-sec">Actions</div><div className="fm-note" style={{ marginTop: 10 }}>{a.actions.map((c) => <div key={c}>• {c}</div>)}</div></div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="fm-sec">Execution history</div>
                  <div style={{ marginTop: 10 }}>
                    {a.runs.slice(0, 6).map((r, i) => (
                      <div key={i} className="fm-row" style={{ padding: "7px 0", borderTop: i ? "1px solid var(--border)" : undefined, fontSize: 12.5 }}>
                        <span className="fm-mono fm-faint" style={{ width: 120 }}>{r.at.slice(5)}</span>
                        <span style={{ flex: 1 }}>{r.outcome}</span>
                        <Pill tone={r.status === "ok" ? "ok" : r.status === "awaiting approval" ? "warn" : ""}>{r.status === "ok" ? "Done" : r.status === "awaiting approval" ? "Awaiting approval" : "Skipped"}</Pill>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>
    </Page>
  );
}

/* ── WhatsApp (proposed integration, simulated) ───────────────────────── */
type Msg = { from: "me" | "ai"; text: string; a?: FMAnswer; done?: boolean; at: string };
function WhatsApp() {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "ai", text: "Hi Charlie. Ask me anything about the business. I read the same records as Pulse and I'll always ask before changing anything.", at: "08:02" }]);
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);
  const time = () => new Date().toTimeString().slice(0, 5);
  const send = (text: string) => {
    if (!text.trim()) return;
    const a = answerFM(text);
    setMsgs((m) => [...m, { from: "me", text, at: time() }]);
    setDraft("");
    setTimeout(() => setMsgs((m) => [...m, { from: "ai", text: a.confirm ? a.confirmSummary || a.text : a.text, a, at: time() }]), 650);
  };
  const act = (idx: number, label: string) => {
    const msg = msgs[idx];
    const action = msg.a?.actions?.find((x) => x.label === label);
    if (!action) return;
    if (!action.run) return send(label);
    const res = action.run();
    setMsgs((m) => m.map((x, i) => (i === idx ? { ...x, done: true } : x)).concat(res ? [{ from: "ai", text: res.text, a: res, at: time() }] : []));
  };
  const chips = ["What's the story with Allendale?", "Can we fit in a three-week fire alarm installation in December?", "Book the first option", "Which completed jobs haven't been invoiced?"];
  return (
    <Page noDivision eyebrow="Proposed integration · simulated" title="WhatsApp management assistant" sub="How Charlie could run the business from WhatsApp Business. This is a working simulation against the demo records, not a connected WhatsApp account.">
      <div className="fm-grid fm-wa">
        <div className="fm-phone">
          <div className="fm-phone-s" style={{ background: "#0b141a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px 12px", background: "#1f2c34", color: "#e9edef" }}>
              <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#25d366", color: "#0b141a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>AI</span>
              <span style={{ flex: 1 }}><b style={{ fontSize: 14.5, fontWeight: 600 }}>Charlie AI</b><span style={{ display: "block", fontSize: 11.5, color: "#8696a0" }}>Business account · simulated</span></span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 10px", display: "flex", flexDirection: "column", gap: 8, background: "#0b141a" }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ alignSelf: m.from === "me" ? "flex-end" : "flex-start", maxWidth: "86%", background: m.from === "me" ? "#005c4b" : "#202c33", color: "#e9edef", borderRadius: 10, padding: "8px 10px 6px", fontSize: 13.5, lineHeight: 1.45, boxShadow: "0 1px 1px rgba(0,0,0,.3)" }}>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                  {m.a?.rows && m.a.rows.length > 0 && (
                    <div style={{ marginTop: 6, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 6 }}>
                      {m.a.rows.slice(0, 5).map((r, k) => <div key={k} style={{ fontSize: 12, color: "#d1d7db", padding: "2px 0" }}>• {r.cells.filter(Boolean).join(" · ")}</div>)}
                    </div>
                  )}
                  {m.a?.actions && !m.done && m.from === "ai" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                      {m.a.actions.slice(0, 2).map((x) => (
                        <button key={x.label} onClick={() => act(i, x.label)} style={{ all: "unset", cursor: "pointer", textAlign: "center", padding: "7px 8px", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "#53bdeb", fontSize: 13 }}>{x.label}</button>
                      ))}
                    </div>
                  )}
                  {m.a?.confirm && !m.done && <div style={{ fontSize: 11, color: "#ffd279", marginTop: 6 }}>Needs your approval</div>}
                  <div style={{ textAlign: "right", fontSize: 10.5, color: "#8696a0", marginTop: 3 }}>{m.at}</div>
                </div>
              ))}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(draft); }} style={{ display: "flex", gap: 8, padding: 10, background: "#1f2c34" }}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message" style={{ flex: 1, height: 40, borderRadius: 20, border: 0, padding: "0 14px", background: "#2a3942", color: "#e9edef", font: "inherit", fontSize: 14, outline: 0 }} />
              <button type="submit" aria-label="Send" style={{ width: 40, height: 40, borderRadius: "50%", border: 0, background: "#00a884", color: "#0b141a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico d="arrow" size={16} stroke={2.4} /></button>
            </form>
          </div>
        </div>
        <div className="fm-col-flex" style={{ gap: 14 }}>
          <Card title="Try the demo conversation" sub="Tap in order, or type your own question">
            <div className="fm-col-flex" style={{ gap: 8 }}>
              {chips.map((c, i) => (
                <button key={c} className="fm-chip" style={{ height: "auto", padding: "10px 14px", whiteSpace: "normal", lineHeight: 1.4 }} onClick={() => send(c)}>
                  <span className="fm-mono fm-faint">{i + 1}</span>{c}
                </button>
              ))}
            </div>
          </Card>
          <Card title="How it would work">
            <div className="fm-col-flex" style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>
              <div>• Messages from Charlie's number are answered from the same records as Pulse, with the same role permissions.</div>
              <div>• Anything that books, bills or contacts a customer comes back as a proposal and waits for a yes.</div>
              <div>• Every exchange is written to the activity log. Access codes are never sent over WhatsApp.</div>
              <div className="fm-note warn" style={{ marginTop: 6 }}>Proposed integration. Requires a WhatsApp Business account and Charlie's approval before it goes live.</div>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

export { sel, openDrawer };
