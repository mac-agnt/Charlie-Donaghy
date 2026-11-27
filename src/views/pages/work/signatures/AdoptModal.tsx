import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Ico } from "../Ico";
import * as M from "./model";

const INK = "#1d2b64";

/** Escape closes whatever modal is on top. */
export function useEscape(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const k = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") ref.current(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
}

/* Overlays render into the themed app root: .ws-page keeps filter:blur(0) after its
   entrance animation, which would otherwise trap position:fixed children. */
export function Overlay({ children }: { children: ReactNode }) {
  return createPortal(children, document.querySelector(".sc-host > [data-theme]") ?? document.body);
}

export function Modal({ title, sub, onClose, children, foot, narrow, alert }: {
  title: string; sub?: string; onClose: () => void; children?: ReactNode; foot?: ReactNode; narrow?: boolean; alert?: boolean;
}) {
  useEscape(onClose);
  return (
    <Overlay>
      <div className="ws-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={"ws-modal" + (narrow ? " sg-narrow" : "")} role={alert ? "alertdialog" : "dialog"} aria-modal="true" aria-label={title}>
          <div className="sg-modal-head">
            <div>
              <h2 className="ws-h2">{title}</h2>
              {sub && <p>{sub}</p>}
            </div>
            <button className="ws-btn ws-btn-ghost ws-icon-btn" onClick={onClose} aria-label="Close"><Ico d="x" size={14} /></button>
          </div>
          {children}
          {foot && <div className="sg-modal-foot">{foot}</div>}
        </div>
      </div>
    </Overlay>
  );
}

export function AdoptModal({ onClose, onAdopt }: { onClose: () => void; onAdopt: (s: M.MySig) => void }) {
  const [tab, setTab] = useState<"type" | "draw">("type");
  const [name, setName] = useState(M.ME.name);
  const [ink, setInk] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null);
  const st = useRef<{ last: { x: number; y: number } | null; box: number[] | null; dpr: number }>({ last: null, box: null, dpr: 1 });

  useEffect(() => {
    if (tab !== "draw") return;
    const c = cv.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    st.current = { last: null, box: null, dpr };
    setInk(false);
  }, [tab]);

  const at = (c: HTMLCanvasElement, x: number, y: number) => { const r = c.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; };
  const grow = (p: { x: number; y: number }) => {
    const b = st.current.box;
    st.current.box = b ? [Math.min(b[0], p.x), Math.min(b[1], p.y), Math.max(b[2], p.x), Math.max(b[3], p.y)] : [p.x, p.y, p.x, p.y];
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget, ctx = c.getContext("2d");
    if (!ctx) return;
    c.setPointerCapture(e.pointerId);
    const p = at(c, e.clientX, e.clientY);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
    ctx.fill();
    st.current.last = p;
    grow(p);
    setInk(true);
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget, ctx = c.getContext("2d");
    if (!ctx || !st.current.last) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const points = (events.length ? events : [e.nativeEvent]).map((ev) => at(c, ev.clientX, ev.clientY));
    ctx.beginPath();
    ctx.moveTo(st.current.last.x, st.current.last.y);
    points.forEach((p) => { ctx.lineTo(p.x, p.y); grow(p); });
    ctx.stroke();
    st.current.last = points[points.length - 1];
  };
  const up = () => { st.current.last = null; };
  const clear = () => {
    const c = cv.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    st.current.box = null;
    setInk(false);
  };
  /** The drawing cropped to its ink, so it fills the signature field. */
  const drawn = () => {
    const c = cv.current, b = st.current.box;
    if (!c || !b) return "";
    const d = st.current.dpr, pad = 8;
    const x = Math.max(0, (b[0] - pad) * d), y = Math.max(0, (b[1] - pad) * d);
    const w = Math.min(c.width - x, (b[2] - b[0] + pad * 2) * d), h = Math.min(c.height - y, (b[3] - b[1] + pad * 2) * d);
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(w));
    out.height = Math.max(1, Math.round(h));
    out.getContext("2d")?.drawImage(c, x, y, w, h, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  };

  const clean = name.trim();
  const initials = M.initialsOf(clean || M.ME.name);
  const ok = tab === "type" ? !!clean : ink;
  const adopt = () => {
    if (!ok) return;
    onAdopt(tab === "type" ? { kind: "type", value: clean, initials } : { kind: "draw", value: drawn(), initials });
  };

  return (
    <Modal
      title="Adopt your signature"
      sub="How your signature and initials appear on everything you sign in Pulse."
      onClose={onClose}
      foot={<>
        <button className="ws-btn" onClick={onClose}>Cancel</button>
        <button className="ws-btn ws-btn-accent" disabled={!ok} onClick={adopt}><Ico d="pen" size={14} />Adopt and sign</button>
      </>}
    >
      <div className="sg-modal-body">
        <div className="ws-seg" role="group" aria-label="Signature style">
          <button aria-pressed={tab === "type"} onClick={() => setTab("type")}><Ico d="text" size={13} />Type</button>
          <button aria-pressed={tab === "draw"} onClick={() => setTab("draw")}><Ico d="pen" size={13} />Draw</button>
        </div>
        {tab === "type" ? (
          <>
            <div>
              <label className="ws-label" htmlFor="sg-sig-name">Full name</label>
              <input id="sg-sig-name" className="ws-field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div className="sg-preview" aria-hidden="true">
              <span>{clean || " "}</span>
              <small>{initials}</small>
            </div>
          </>
        ) : (
          <div className="sg-pad">
            <canvas ref={cv} aria-label="Draw your signature" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
            <div className="sg-pad-line" />
            {!ink && <span className="sg-pad-hint">Draw your signature with a mouse, trackpad or finger</span>}
            <button className="sg-pad-clear" onClick={clear} disabled={!ink}>Clear</button>
          </div>
        )}
        <p className="sg-legal">By adopting, you agree this mark is your electronic signature and binds you the same way a handwritten one does, under the Electronic Commerce Act 2000.</p>
      </div>
    </Modal>
  );
}
