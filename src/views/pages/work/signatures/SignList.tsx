import { useRef, useState, type DragEvent } from "react";
import { usePersist } from "../../../../components/usePersist";
import { Ico } from "../Ico";
import { Modal } from "./AdoptModal";
import * as M from "./model";

const FILTERS: [M.Filter, string][] = [["all", "All"], ["waiting", "Waiting"], ["signed", "Signed"], ["drafts", "Drafts"]];
const EMPTY: Record<M.Filter, [string, string]> = {
  all: ["Nothing sent yet", "Drop a PDF above to send your first envelope."],
  waiting: ["Nothing waiting", "Envelopes sit here until everyone has signed."],
  signed: ["Nothing signed yet", "Completed envelopes are kept here and filed in Canvas."],
  drafts: ["No drafts", "Drop a PDF above to start one."],
};

export function StatusPill({ env }: { env: M.Envelope }) {
  const [cls, icon, label] = M.pillOf(env);
  return <span className={"ws-status " + cls}><Ico d={icon} size={13} />{label}</span>;
}

export function SignList({ v, list }: { v: any; list: M.Envelope[] }) {
  const [filter, setFilter] = usePersist<M.Filter>(M.K.filter, "all");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const count = (f: M.Filter) => list.filter((e) => match(e, f)).length;
  const shown = list.filter((e) => match(e, filter));
  const waiting = M.waitingCount(list);
  const mine = list.filter(M.isMyTurn).length;

  const take = async (file?: File | null) => {
    if (!file || busy) return;
    setBusy(true);
    const err = await M.fromFile(file);
    setBusy(false);
    if (err) M.toast(err);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files?.[0]);
  };
  const onOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!over) setOver(true);
  };
  const onLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
  };

  return (
    <>
      <div className="ws-head">
        <div className="ws-head-main">
          <div className="ws-eyebrow">Workspace</div>
          <h1 className="ws-h1">Signatures</h1>
          <div className="ws-sub">
            {waiting ? `${waiting} waiting for signatures` : "Nothing waiting for signatures"}
            {mine ? `, ${mine} on you` : ""}
            {" · Signed copies are filed in "}
            <button className="sg-link" onClick={() => M.openSignedFolder(v)}>Canvas</button>
            {" › Signed documents"}
          </div>
        </div>
      </div>

      <div className={"sg-drop" + (over ? " is-over" : "")} onDragOver={onOver} onDragEnter={onOver} onDragLeave={onLeave} onDrop={onDrop}>
        <span className="sg-drop-tile"><Ico d="signDoc" size={24} sw={1.6} /></span>
        <h2>{over ? "Drop it to start an envelope" : "Drop a PDF here to send it for signature"}</h2>
        <p>Contracts, proposals, NDAs, up to 40 MB. A photo of a page works too.</p>
        <div className="sg-drop-actions">
          <button className="ws-btn ws-btn-accent" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "Reading file" : "Choose a file"}<Ico d="upload" size={15} />
          </button>
          <span className="sg-or">or</span>
          <button className="ws-btn" onClick={() => setPicking(true)}><Ico d="folder" size={15} />From Canvas</button>
        </div>
        <input
          ref={input} type="file" accept=".pdf,application/pdf,image/*" hidden
          onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }}
        />
      </div>

      <div className="sg-sent-head">
        <h2>Sent</h2>
        <div className="ws-seg" role="group" aria-label="Filter envelopes">
          {FILTERS.map(([id, label]) => (
            <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}<span className="ws-count">{count(id)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ws-card sg-list">
        {shown.map((e) => (
          <button key={e.id} className="sg-row" onClick={() => M.openEnv(e.id)}>
            <span className="sg-tile"><Ico d={e.doc.kind === "image" ? "image" : "page"} size={18} /></span>
            <span className="sg-row-main">
              <span className="sg-row-title">{e.title}</span>
              <span className="sg-row-sub">{e.signers.length ? e.signers.map((s) => s.name).join(", ") : "No signers yet"}</span>
            </span>
            <span className="sg-row-meta">
              <StatusPill env={e} />
              <span className="sg-row-time">{M.rowTime(e)}</span>
            </span>
            <Ico d="chevronRight" size={16} className="sg-chev" />
          </button>
        ))}
        {!shown.length && <div className="ws-empty"><b>{EMPTY[filter][0]}</b><span>{EMPTY[filter][1]}</span></div>}
      </div>

      {picking && (
        <Modal title="Choose from Canvas" sub="Documents you can send for signature." onClose={() => setPicking(false)}>
          <div className="sg-picks">
            {M.PICKS.map((p) => (
              <button key={p.name} className="sg-pick" onClick={() => { setPicking(false); M.fromPick(p); }}>
                <span className="sg-tile"><Ico d="page" size={17} /></span>
                <span className="sg-row-main">
                  <span className="sg-row-title">{p.name}</span>
                  <span className="sg-row-sub">{p.where} · {p.meta}</span>
                </span>
                <Ico d="chevronRight" size={15} className="sg-chev" />
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

function match(e: M.Envelope, f: M.Filter) {
  if (f === "all") return true;
  if (f === "drafts") return e.status === "draft";
  return e.status === f;
}
