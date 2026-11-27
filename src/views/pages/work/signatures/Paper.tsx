import { Fragment, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { Ico, type IcoName } from "../Ico";
import * as M from "./model";

/* The document column: real pages (or the uploaded PDF / photo) with a field
   layer on top. Positions are % of the page, sizes are % of its width (cqw),
   so fields stay put at any width. */

export type Mode = "prepare" | "view" | "sign";
export type Ctl = {
  env: M.Envelope;
  mode: Mode;
  armed?: M.FieldType | null;
  hot?: string | null;
  editing?: string | null;
  onPlace?: (page: number, x: number, y: number) => void;
  onField?: (f: M.Field) => void;
  onMove?: (fid: string, x: number, y: number) => void;
  onRemove?: (fid: string) => void;
  onEdit?: (fid: string, value: string) => void;
};

const ICON: Record<M.FieldType, IcoName> = { signature: "pen", initials: "text", date: "calendar", name: "user", text: "text", checkbox: "checkbox" };
const ASK: Record<M.FieldType, string> = { signature: "Sign here", initials: "Initial", date: "Date", name: "Name", text: "Type here", checkbox: "" };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function DocView(c: Ctl) {
  const src = c.env.doc;
  if (src.kind === "pdf") {
    return (
      <Surface page={0} c={c} ratio={src.pages * 1.32} frame>
        <iframe className="sg-frame" src={`${src.url}#toolbar=0&navpanes=0&view=FitH`} title={src.file} tabIndex={-1} />
      </Surface>
    );
  }
  if (src.kind === "image") {
    return (
      <Surface page={0} c={c}>
        <img className="sg-img" src={src.url} alt={src.file} draggable={false} />
      </Surface>
    );
  }
  const doc = M.DOCS[src.key];
  if (!doc) return null;
  const pages = M.pagesOf(doc);
  return (
    <>
      {pages.map((clauses, i) => (
        <Surface key={i} page={i} c={c}>
          <Paper doc={doc} env={c.env} page={i} total={pages.length} clauses={clauses} start={i ? pages[0].length : 0} />
        </Surface>
      ))}
    </>
  );
}

function Surface({ page, c, ratio, frame, children }: { page: number; c: Ctl; ratio?: number; frame?: boolean; children: ReactNode }) {
  const layer = useRef<HTMLDivElement>(null);
  const place = (e: MouseEvent) => {
    const el = layer.current;
    if (!c.armed || !c.onPlace || !el) return;
    const r = el.getBoundingClientRect();
    const [w, h] = M.SIZE[c.armed];
    const hp = (h * r.width) / r.height; // field height as % of the surface height
    c.onPlace(
      page,
      clamp(((e.clientX - r.left) / r.width) * 100 - w / 2, 0, 100 - w),
      clamp(((e.clientY - r.top) / r.height) * 100 - hp / 2, 0, 100 - hp),
    );
  };
  return (
    <div className="sg-surface" style={ratio ? { aspectRatio: `1 / ${ratio}` } : undefined}>
      {children}
      <div ref={layer} className={"sg-layer" + (c.armed ? " is-armed" : "") + (frame ? " is-frame" : "")} onClick={place}>
        {c.env.fields.filter((f) => f.page === page).map((f) => <FieldBox key={f.id} f={f} c={c} />)}
      </div>
    </div>
  );
}

function Paper({ doc, env, page, total, clauses, start }: { doc: M.DocDef; env: M.Envelope; page: number; total: number; clauses: string[][]; start: number }) {
  return (
    <div className="sg-paper">
      {page === 0 ? (
        <>
          <div className="sg-lh">
            <div>
              <div className="sg-mark">{doc.org ?? "KILBRIDE GROUP"}</div>
              {!doc.org && <div className="sg-tag">Plumbing and heating supplies</div>}
            </div>
            <div className="sg-addr">{doc.addr ?? "Little Island, Cork"}<br />Ref {doc.ref}</div>
          </div>
          <h3 className="sg-title">{doc.title}</h3>
          <div className="sg-dated">Dated {M.fmtDate(env.sentAt ?? env.editedAt)}</div>
          <p className="sg-intro">{doc.intro}</p>
        </>
      ) : (
        <div className="sg-run"><span>{doc.title}</span><span>Ref {doc.ref}</span></div>
      )}
      {clauses.map((cl, i) => (
        <div className="sg-clause" key={i}><b>{start + i + 1}. {cl[0]}</b>{cl[1]}</div>
      ))}
      {page === total - 1 && <SigBlock doc={doc} env={env} />}
      <div className="sg-pno">Page {page + 1} of {total}</div>
    </div>
  );
}

function SigBlock({ doc, env }: { doc: M.DocDef; env: M.Envelope }) {
  return (
    <>
      {[0, 1].map((p) => {
        const s = env.signers.find((x) => x.party === p), x = M.COL[p];
        const at = (top: number, left = x, width?: string): CSSProperties => ({ left: `${left}%`, top: `${top}%`, width });
        return (
          <Fragment key={p}>
            <div className="sg-sb is-label" style={at(63)}>{doc.sides[p]}</div>
            <div className="sg-sb-line" style={at(72.4, x, "38%")} />
            <div className="sg-sb is-cap" style={at(73.2)}>Signature</div>
            <div className="sg-sb" style={at(77.4)}>Name</div>
            <div className="sg-sb is-strong" style={at(77.4, x + 7)}>{s?.name ?? ""}</div>
            <div className="sg-sb-line" style={at(79.8, x + 6, "32%")} />
            <div className="sg-sb" style={at(84.3)}>Date</div>
            <div className="sg-sb-line" style={at(86.9, x + 6, "24%")} />
          </Fragment>
        );
      })}
    </>
  );
}

function FieldBox({ f, c }: { f: M.Field; c: Ctl }) {
  const s = c.env.signers.find((x) => x.id === f.signer);
  const [w, h] = M.SIZE[f.type];
  const drag = useRef<{ x: number; y: number; rw: number; rh: number; dx: number; dy: number } | null>(null);
  const [off, setOff] = useState<[number, number] | null>(null);
  const prep = c.mode === "prepare";
  const mine = c.mode === "sign" && !!s?.me && s.state !== "signed";
  const filled = !!f.value;
  const color = s?.color ?? "#8a9097";
  const cls = prep ? "is-prep" : filled ? "is-filled" + (mine ? " is-click" : "") : mine ? "is-mine" : "is-pending";
  const style = {
    left: `${f.x}%`, top: `${f.y}%`, width: `${w}cqw`, height: `${h}cqw`,
    "--sc": color, "--scs": M.soft(color, 0.16),
    transform: off ? `translate(${off[0]}px, ${off[1]}px)` : undefined,
  } as CSSProperties;

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (!prep || (e.target as HTMLElement).closest("button")) return;
    e.stopPropagation();
    e.preventDefault();
    const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, rw: r.width, rh: r.height, dx: 0, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.dx = e.clientX - d.x;
    d.dy = e.clientY - d.y;
    setOff([d.dx, d.dy]);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    setOff(null);
    if (!d || Math.abs(d.dx) + Math.abs(d.dy) < 3) return;
    const hp = (h * d.rw) / d.rh;
    c.onMove?.(f.id, clamp(f.x + (d.dx / d.rw) * 100, 0, 100 - w), clamp(f.y + (d.dy / d.rh) * 100, 0, 100 - hp));
  };
  const click = (e: MouseEvent) => {
    e.stopPropagation();
    if (!prep) c.onField?.(f);
  };
  const key = (e: KeyboardEvent) => {
    if (mine && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); c.onField?.(f); }
  };

  let body: ReactNode;
  if (c.editing === f.id) {
    body = (
      <input
        autoFocus defaultValue={f.value ?? ""} placeholder="Type here" aria-label="Field text"
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => c.onEdit?.(f.id, e.target.value.trim())}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      />
    );
  } else if (filled && !prep) {
    body = <Filled f={f} code={c.env.code} />;
  } else if (f.type === "checkbox") {
    body = <Ico d="checkbox" />;
  } else {
    const who = !prep && !mine && f.type === "signature" && s ? ` · ${s.me ? "You" : s.name.split(" ")[0]}` : "";
    body = <><Ico d={ICON[f.type]} /><span>{mine ? ASK[f.type] : M.LABEL[f.type]}{who}</span></>;
  }

  return (
    <div
      className={`sg-f ${cls}${c.hot === f.id ? " is-hot" : ""}${off ? " is-dragging" : ""}${f.type === "checkbox" ? " is-box" : ""}`}
      style={style} data-fid={f.id} title={`${M.LABEL[f.type]}${s ? ` · ${s.name}` : ""}`}
      role={mine ? "button" : undefined} tabIndex={mine ? 0 : undefined}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={click} onKeyDown={key}
    >
      {body}
      {prep && (
        <button className="sg-f-x" title="Remove field" aria-label="Remove field" onClick={(e) => { e.stopPropagation(); c.onRemove?.(f.id); }}>
          <Ico d="x" sw={2.6} />
        </button>
      )}
    </div>
  );
}

function Filled({ f, code }: { f: M.Field; code: string }) {
  const v = f.value ?? "";
  if (f.type === "checkbox") return <span className="sg-f-box"><Ico d="check" sw={3} /></span>;
  if (f.type === "signature" || f.type === "initials") {
    return (
      <>
        {f.type === "signature" && <span className="sg-f-cap">Signed in Pulse · {code.slice(3)}</span>}
        {v.startsWith("data:")
          ? <img className="sg-f-img" src={v} alt="Signature" draggable={false} />
          : <span className={"sg-f-sig" + (f.type === "initials" ? " is-ini" : "")}>{v}</span>}
      </>
    );
  }
  return <span className="sg-f-val">{v}</span>;
}
