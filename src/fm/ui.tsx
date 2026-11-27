/* Shared building blocks for the facilities modules. */
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { DIVISIONS, divisionById, canSeeMoney, type DivisionId } from "./config";
import { useFM, setDivision, openDrawer, euro, euro2 } from "./store";
import type { Drawer, Engineer, JobStatus, InvoiceStatus, PipelineStage } from "./types";

/* Icons: stroke paths in the same style as the Pulse rail. */
export const IC: Record<string, string> = {
  plus: "M12 5v14 M5 12h14",
  x: "M6 6l12 12 M18 6 6 18",
  check: "M5 12.5l4.2 4.2L19 7",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  back: "M19 12H5 M11 6l-6 6 6 6",
  jobs: "M9.4 4.4h5.2a1.4 1.4 0 0 1 1.4 1.4v1.1h2.4A1.6 1.6 0 0 1 20 8.5v9.1a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.6V8.5a1.6 1.6 0 0 1 1.6-1.6H8V5.8a1.4 1.4 0 0 1 1.4-1.4Z M8 6.9h8",
  service: "M14.7 6.3a4 4 0 0 0-5.4 5.4l-5 5a1.5 1.5 0 0 0 2.1 2.1l5-5a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.1-.6-.6-2.1 2.4-2.4Z",
  calendar: "M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z",
  engineer: "M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9 M8.6 6.6h6.8",
  customers: "M4.5 20V6.4A1.4 1.4 0 0 1 5.9 5h6.2a1.4 1.4 0 0 1 1.4 1.4V20 M13.5 10.5h4.6A1.4 1.4 0 0 1 19.5 12v8 M3 20h18 M7.5 8.5h2.5 M7.5 12h2.5 M7.5 15.5h2.5",
  quote: "M6.4 3.6h7.4l4.2 4.2v12.6H6.4V3.6Z M13.4 3.8v4.2h4.2 M9 12.4h6 M9 16h4",
  finance: "M4 7.5h16v10.4a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.9V7.5Z M4 7.5 6 4.5h12l2 3 M14.6 12.4h2.6 M8 13.5h3",
  website: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3.5 12h17 M12 3c2.5 2.4 3.6 5.4 3.6 9S14.5 18.6 12 21c-2.5-2.4-3.6-5.4-3.6-9S9.5 5.4 12 3Z",
  pin: "M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2",
  box: "M4 8l8-4 8 4-8 4-8-4Z M4 8v8l8 4 8-4V8 M12 12v8",
  camera: "M4 8.5h3l1.5-2.5h7L17 8.5h3v10H4v-10Z M12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z",
  note: "M6 4.6h12a1.6 1.6 0 0 1 1.6 1.6v12.2A1.6 1.6 0 0 1 18 20H6a1.6 1.6 0 0 1-1.6-1.6V6.2A1.6 1.6 0 0 1 6 4.6Z M8.4 9h7.2 M8.4 12.5h7.2 M8.4 16h4.4",
  play: "M8 5.5v13l10-6.5-10-6.5Z",
  pause: "M8 5.5v13 M16 5.5v13",
  flag: "M5 21V4 M5 4h11l-2 4 2 4H5",
  alert: "M12 4 2.8 19.5h18.4L12 4Z M12 10v4 M12 17h.01",
  bolt: "M13 3 5 13h6l-1 8 8-10h-6l1-8Z",
  mail: "M4 6h16v12H4V6Z M4 6.5l8 6 8-6",
  lock: "M7 11V8a5 5 0 0 1 10 0v3 M5.5 11h13v9h-13v-9Z",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7",
  phone: "M7.5 3.5h9a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1.5-1.5Z M10.5 17.5h3",
  download: "M12 4v11 M7 10.5l5 5 5-5 M5 20h14",
  print: "M7 8V4h10v4 M5 8h14v8h-3 M8 16H5V8 M8 13h8v7H8v-7Z",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z",
  search: "m21 21-4.3-4.3 M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0",
  grid: "M4.4 4.4h6v6h-6v-6Z M13.6 4.4h6v6h-6v-6Z M13.6 13.6h6v6h-6v-6Z M4.4 13.6h6v6h-6v-6Z",
  list: "M8 6h12 M8 12h12 M8 18h12 M4 6h.01 M4 12h.01 M4 18h.01",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  whatsapp: "M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5Z M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1c-1.3-.5-2.5-1.7-3-3l1-1-1-2-1.5 1Z",
  shield: "M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
};

export function Ico({ d, size = 15, stroke = 1.8, style }: { d: string; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", ...style }}>
      <path d={IC[d] || d} />
    </svg>
  );
}

export function Btn({ children, kind, size, icon, onClick, disabled, title, style, type }: { children?: ReactNode; kind?: "primary" | "ghost" | "danger"; size?: "sm" | "lg"; icon?: string; onClick?: (e: React.MouseEvent) => void; disabled?: boolean; title?: string; style?: CSSProperties; type?: "button" | "submit" }) {
  return (
    <button type={type || "button"} className={["fm-btn", kind, size].filter(Boolean).join(" ")} onClick={onClick} disabled={disabled} title={title} style={style}>
      {icon && <Ico d={icon} size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

export type Tone = "ok" | "warn" | "bad" | "accent" | "info" | "";
export function Pill({ tone = "", children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={"fm-pill " + tone}>
      {dot && <span className="d" />}
      {children}
    </span>
  );
}

const JOB_STATUS: Record<JobStatus, [string, Tone]> = { new: ["New", "info"], progress: ["In progress", "warn"], completed: ["Completed", "accent"], invoiced: ["Invoiced", "ok"] };
export const jobStatusLabel = (s: JobStatus) => JOB_STATUS[s][0];
export const JobStatusPill = ({ s }: { s: JobStatus }) => <Pill tone={JOB_STATUS[s][1]} dot>{JOB_STATUS[s][0]}</Pill>;
const INV_STATUS: Record<InvoiceStatus, Tone> = { draft: "", issued: "info", "part-paid": "warn", paid: "ok", overdue: "bad", cancelled: "" };
export const InvoiceStatusPill = ({ s }: { s: InvoiceStatus }) => <Pill tone={INV_STATUS[s]} dot>{s === "part-paid" ? "Part-paid" : s.charAt(0).toUpperCase() + s.slice(1)}</Pill>;
const STAGE_TONE: Partial<Record<PipelineStage, Tone>> = { Accepted: "ok", Lost: "bad", "Awaiting Decision": "warn", "Quote Sent": "info", "New Enquiry": "accent" };
export const StagePill = ({ s }: { s: PipelineStage }) => <Pill tone={STAGE_TONE[s] || ""}>{s}</Pill>;
export const PriorityPill = ({ p }: { p: string }) => (p === "Emergency" || p === "High" ? <Pill tone={p === "Emergency" ? "bad" : "warn"}>{p}</Pill> : <span className="fm-faint" style={{ fontSize: 12 }}>{p}</span>);

export function DivTag({ id, long }: { id: DivisionId; long?: boolean }) {
  const d = divisionById(id);
  return (
    <span className="fm-tag">
      <i style={{ background: d.color }} />
      {long ? d.name : d.short}
    </span>
  );
}

export function Avatar({ e, size = 26 }: { e?: Engineer; size?: number }) {
  if (!e) return <span className="fm-av" style={{ width: size, height: size, background: "var(--track)", color: "var(--faint)" }}>?</span>;
  return <span className="fm-av" title={e.name} style={{ width: size, height: size, background: e.color, fontSize: size < 24 ? 8.5 : 9.5 }}>{e.initials}</span>;
}
export function Avatars({ ids, size }: { ids: string[]; size?: number }) {
  const s = useFM();
  if (!ids.length) return <span className="fm-faint" style={{ fontSize: 12 }}>Unallocated</span>;
  return <span className="fm-avs">{ids.map((id) => <Avatar key={id} e={s.engineers.find((x) => x.id === id)} size={size} />)}</span>;
}

/** Money respects the current role: engineers don't see financial figures. */
export function Money({ v, dp }: { v: number; dp?: 2 }) {
  const s = useFM();
  if (!canSeeMoney(s.role) && s.role !== "ops") return <span className="fm-faint" title="Hidden for this role">€ ···</span>;
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{dp ? euro2(v) : euro(v)}</span>;
}
export const useMoneyVisible = () => {
  const s = useFM();
  return s.role === "owner" || s.role === "accountant" || s.role === "ops";
};

export function DivisionSwitch({ compact }: { compact?: boolean }) {
  const s = useFM();
  return (
    <div className="fm-seg" role="tablist" aria-label="Division">
      <button className={s.division === "ALL" ? "on" : ""} onClick={() => setDivision("ALL")}>All divisions</button>
      {DIVISIONS.map((d) => (
        <button key={d.id} className={s.division === d.id ? "on" : ""} onClick={() => setDivision(d.id)} title={d.name}>
          <span className="dot" style={{ background: d.color }} />
          {compact ? d.short.split(" ")[0] : d.short}
        </button>
      ))}
    </div>
  );
}

export function Page({ eyebrow, title, sub, actions, children, noDivision }: { eyebrow?: string; title: string; sub?: ReactNode; actions?: ReactNode; children: ReactNode; noDivision?: boolean }) {
  return (
    <div className="fm-page">
      <div className="fm-head">
        <div className="fm-head-l">
          {eyebrow && <div className="fm-eyebrow">{eyebrow}</div>}
          <h1 className="fm-title">{title}</h1>
          {sub && <div className="fm-sub">{sub}</div>}
        </div>
        <div className="fm-head-r">
          {!noDivision && <DivisionSwitch />}
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Card({ title, sub, action, children, flush, style, className }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children?: ReactNode; flush?: boolean; style?: CSSProperties; className?: string }) {
  return (
    <section className={"fm-card " + (className || "")} style={style}>
      {(title || action) && (
        <div className="fm-card-h">
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <div className="fm-card-t">{title}</div>}
            {sub && <div className="fm-card-s">{sub}</div>}
          </div>
          {action}
        </div>
      )}
      <div className={"fm-card-b" + (flush ? " flush" : "")}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, tone, onClick, icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "ok" | "warn" | "bad"; onClick?: () => void; icon?: string }) {
  return (
    <button className={"fm-stat " + (tone || "")} onClick={onClick}>
      <span className="k">{icon && <Ico d={icon} size={13} />}{label}</span>
      <span className="v">{value}</span>
      {sub && <span className="s">{sub}</span>}
    </button>
  );
}

export type Col<T> = { h: string; w: string; r?: (row: T) => ReactNode; cls?: string; num?: boolean };
export function Table<T>({ cols, rows, onRow, empty, minWidth }: { cols: Col<T>[]; rows: T[]; onRow?: (row: T) => void; empty?: ReactNode; minWidth?: number }) {
  const tpl = cols.map((c) => c.w).join(" ");
  return (
    <div className="fm-scrollx">
      <div className="fm-table" style={{ minWidth }}>
        <div className="fm-tr h" style={{ gridTemplateColumns: tpl }}>
          {cols.map((c, i) => <div key={i} className={c.num ? "fm-num" : ""}>{c.h}</div>)}
        </div>
        {rows.map((row, i) => (
          <div key={i} className={"fm-tr" + (onRow ? " click" : "")} style={{ gridTemplateColumns: tpl }} onClick={onRow ? () => onRow(row) : undefined}>
            {cols.map((c, k) => <div key={k} className={[c.cls, c.num ? "fm-num" : ""].filter(Boolean).join(" ")}>{c.r ? c.r(row) : null}</div>)}
          </div>
        ))}
        {!rows.length && (empty || <Empty title="Nothing here" hint="Try another division or filter." />)}
      </div>
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="fm-empty">
      <b>{title}</b>
      {hint}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="fm-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Modal({ title, sub, onClose, children, footer, width }: { title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fm-modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fm-modal" style={width ? { width: "min(" + width + "px,100%)" } : undefined} role="dialog" aria-modal="true">
        <div className="fm-modal-h">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.3px" }}>{title}</div>
            {sub && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>{sub}</div>}
          </div>
          <button className="fm-x" onClick={onClose} aria-label="Close"><Ico d="x" size={13} stroke={2.2} /></button>
        </div>
        <div className="fm-modal-b">{children}</div>
        {footer && <div className="fm-modal-f">{footer}</div>}
      </div>
    </div>
  );
}

/** Clickable link to any record; opens its drawer. */
export function RecLink({ to, children }: { to: Drawer; children: ReactNode }) {
  return (
    <button className="fm-link" onClick={(e) => { e.stopPropagation(); openDrawer(to); }}>
      {children}
    </button>
  );
}

export function Steps({ steps, running }: { steps: { label: string; detail: string }[]; running?: boolean }) {
  return (
    <div className="fm-steps">
      {steps.map((s, i) => (
        <div className="fm-step" key={i}>
          <i><Ico d="check" size={11} stroke={2.6} /></i>
          <div><b>{s.label}</b><span>{s.detail}</span></div>
        </div>
      ))}
      {running && <div className="fm-step"><span className="fm-spin" /><div className="fm-muted">Working…</div></div>}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="fm-seg">
      {options.map(([k, l]) => <button key={k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>{l}</button>)}
    </div>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  return <div className="fm-bar"><i style={{ width: Math.max(2, Math.min(100, (value / (max || 1)) * 100)) + "%", background: color }} /></div>;
}

export const photoBg = (hue: number) => "linear-gradient(135deg,hsl(" + hue + " 22% 34%),hsl(" + ((hue + 40) % 360) + " 18% 18%))";
