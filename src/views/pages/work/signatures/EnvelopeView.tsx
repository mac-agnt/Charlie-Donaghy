import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { usePersist } from "../../../../components/usePersist";
import { CONTACTS } from "../../../../logic/data";
import { Ico, type IcoName } from "../Ico";
import { AdoptModal, Modal } from "./AdoptModal";
import { DocView } from "./Paper";
import { StatusPill } from "./SignList";
import * as M from "./model";

const TOOLS: [M.FieldType, IcoName][] = [
  ["signature", "pen"], ["initials", "text"], ["date", "calendar"], ["name", "user"], ["text", "text"], ["checkbox", "checkbox"],
];
const PEOPLE = CONTACTS as unknown as string[][];
const reduced = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const sc = (color?: string) => (color ? ({ "--sc": color, "--scs": M.soft(color, 0.14) } as CSSProperties) : undefined);

export function EnvelopeView({ env, v }: { env: M.Envelope; v: any }) {
  const [mySig, setMySig] = usePersist<M.MySig | null>(M.K.mySig, null);
  const [armed, setArmed] = useState<M.FieldType | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [adopt, setAdopt] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [ask, setAsk] = useState<null | "void" | "discard">(null);

  const draft = env.status === "draft";
  const me = env.signers.find((s) => s.me);
  const myTurn = M.isMyTurn(env);
  const required = me ? env.fields.filter((f) => f.signer === me.id && f.type !== "checkbox") : [];
  const done = required.filter((f) => f.value).length;
  const current = env.signers.find((s) => s.id === active) ?? env.signers[0];
  const reason = draft ? M.sendReason(env) : null;
  const pending = env.signers.filter((s) => s.state !== "signed");

  useEffect(() => { if (env.id === M.FIRST_ENV) M.armFirstEnvelope(); }, [env.id]);
  useEffect(() => { if (!myTurn) setSigning(false); }, [myTurn]);
  useEffect(() => {
    if (!armed) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setArmed(null); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [armed]);

  /* The next field of yours that still needs filling, read fresh from the store. */
  const nextOpen = () => {
    const e = M.findEnv(env.id), meId = e?.signers.find((s) => s.me)?.id;
    return e?.fields.find((f) => f.signer === meId && f.type !== "checkbox" && !f.value)?.id;
  };
  const jump = (fid?: string) => {
    if (!fid) return;
    setHot(fid);
    document.querySelector(`[data-fid="${fid}"]`)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
  };
  const later = (fn: () => void) => window.setTimeout(fn, 60);
  const start = () => { setSigning(true); later(() => jump(nextOpen())); };
  const finish = () => { M.finishMine(env.id); setSigning(false); setHot(null); setEditing(null); };
  const adopted = (sig: M.MySig) => { setMySig(sig); M.fillMine(env.id, sig); setAdopt(false); later(() => jump(nextOpen())); };
  const clickField = (f: M.Field) => {
    if (!signing || !me || f.signer !== me.id) return;
    setHot(f.id);
    if (f.type === "signature" || f.type === "initials") {
      if (mySig && !f.value) { M.fillMine(env.id, mySig); later(() => jump(nextOpen())); }
      else setAdopt(true);
      return;
    }
    if (f.type === "text") { setEditing(f.id); return; }
    const val = f.type === "date" ? M.fmtDate(Date.now()) : f.type === "name" ? me.name : "x";
    M.setFieldValue(env.id, f.id, f.value ? undefined : val);
  };
  const place = (page: number, x: number, y: number) => {
    if (!armed || !current) return;
    M.placeField(env.id, { id: M.uid("f"), signer: current.id, type: armed, page, x, y });
    setArmed(null);
  };

  const src = env.doc;
  const docLabel = src.kind === "seed" ? "2 pages" : src.kind === "pdf" ? `${src.file} · ${src.pages} ${src.pages === 1 ? "page" : "pages"}` : src.file;
  const when = draft ? `Edited ${M.ago(env.editedAt)}` : env.status === "waiting" ? `Sent ${M.ago(env.sentAt ?? env.editedAt)}`
    : env.status === "signed" ? `Completed ${M.fmtDay(env.doneAt ?? env.editedAt)}` : `Voided ${M.ago(env.editedAt)}`;
  const firstPending = pending.find((s) => !s.me);

  return (
    <>
      <button className="ws-btn ws-btn-ghost ws-btn-sm sg-back" onClick={() => M.openEnv(null)}><Ico d="back" size={14} />Signatures</button>
      <div className="sg-env-head">
        <div className="sg-env-title">
          <div className="ws-eyebrow">{draft ? "Draft envelope" : `Envelope ${env.code}`}</div>
          {draft ? (
            <input
              className="sg-title-input" value={env.title} aria-label="Envelope name"
              onChange={(e) => M.rename(env.id, e.target.value)}
              onBlur={(e) => { if (!e.target.value.trim()) M.rename(env.id, "Untitled envelope"); }}
            />
          ) : <h1>{env.title}</h1>}
          <div className="sg-env-meta"><StatusPill env={env} /><span>{docLabel}</span><span>{when}</span></div>
        </div>
        <div className="sg-env-actions">
          {draft && <>
            {reason && <span className="sg-reason" role="status">{reason}</span>}
            <button className="ws-btn ws-btn-ghost ws-btn-danger" onClick={() => setAsk("discard")}>Discard</button>
            <button className="ws-btn ws-btn-accent" disabled={!!reason} onClick={() => M.send(env.id)}><Ico d="send" size={14} />Send for signature</button>
          </>}
          {env.status === "waiting" && <>
            {firstPending && <button className="ws-btn" onClick={() => M.remind(env.id)}><Ico d="bell" size={14} />Remind</button>}
            <button className="ws-btn ws-btn-ghost ws-btn-danger" onClick={() => setAsk("void")}>Void</button>
          </>}
          {env.status === "signed" && <button className="ws-btn ws-btn-accent" onClick={() => M.download(env)}><Ico d="download" size={14} />Download</button>}
        </div>
      </div>

      {draft && (
        <div className={"sg-banner" + (armed ? " accent" : "")}>
          <Ico d={armed ? "plus" : "pen"} size={15} />
          <span className="sg-banner-text">
            {armed && current
              ? <>Click the page to place <b>{M.LABEL[armed]}</b> for <b>{current.name}</b>. Esc to cancel.</>
              : env.signers.length
                ? "Pick a field on the right, then click the page to place it. Drag a field to move it."
                : "Add who needs to sign, then place their fields on the page."}
          </span>
        </div>
      )}
      {myTurn && !signing && (
        <div className="sg-banner accent">
          <Ico d="pen" size={15} />
          <span className="sg-banner-text"><b>Your turn to sign.</b> {required.length} {required.length === 1 ? "field needs" : "fields need"} you.</span>
          <button className="ws-btn ws-btn-accent ws-btn-sm" onClick={start}>Start signing</button>
        </div>
      )}
      {myTurn && signing && (
        <div className="sg-banner accent is-sticky">
          <Ico d="pen" size={15} />
          <span className="sg-banner-text">
            <b>{done} of {required.length}</b> done.
            {mySig && <> <button className="sg-link" onClick={() => setAdopt(true)}>Change signature</button></>}
          </span>
          <button className="ws-btn ws-btn-sm ws-btn-ghost" onClick={() => { setSigning(false); setHot(null); }}>Stop</button>
          <button className="ws-btn ws-btn-sm" onClick={() => jump(nextOpen())} disabled={done === required.length}>Next</button>
          <button className="ws-btn ws-btn-accent ws-btn-sm" onClick={finish} disabled={done < required.length}><Ico d="check" size={13} />Finish</button>
        </div>
      )}
      {env.status === "waiting" && !myTurn && (
        <div className="sg-banner">
          <Ico d="hourglass" size={15} />
          <span className="sg-banner-text">
            Waiting on <b>{M.names(pending)}</b>.{" "}
            {firstPending?.viewedAt ? `${firstPending.name.split(" ")[0]} opened it ${M.ago(firstPending.viewedAt)}.` : "Not opened yet."}
          </span>
        </div>
      )}
      {env.status === "signed" && (
        <div className="sg-banner ok">
          <Ico d="check" size={15} />
          <span className="sg-banner-text">
            <b>Completed {M.fmtStamp(env.doneAt ?? env.editedAt)}.</b> The signed copy is filed in{" "}
            <button className="sg-link" onClick={() => M.openSignedFolder(v)}>Canvas › Signed documents</button>.
          </span>
        </div>
      )}
      {env.status === "voided" && (
        <div className="sg-banner bad"><Ico d="x" size={15} /><span className="sg-banner-text">Voided. Signers can no longer open this envelope.</span></div>
      )}

      <div className="sg-env">
        <div className="sg-docs">
          <DocView
            env={env} mode={draft ? "prepare" : signing ? "sign" : "view"} armed={draft ? armed : null} hot={hot} editing={editing}
            onPlace={place} onField={clickField}
            onMove={(fid, x, y) => M.moveField(env.id, fid, x, y)}
            onRemove={(fid) => M.removeField(env.id, fid)}
            onEdit={(fid, val) => { M.setFieldValue(env.id, fid, val || undefined); setEditing(null); }}
          />
        </div>

        <aside className="sg-panel">
          {draft ? (
            <>
              <section className="ws-card sg-sec">
                <div className="sg-sec-title">Signers<span className="ws-count">{env.signers.length}</span></div>
                {env.signers.map((s) => (
                  <div
                    key={s.id} role="button" tabIndex={0} style={sc(s.color)}
                    className={"sg-signer" + (s.id === current?.id ? " is-active" : "")}
                    onClick={() => setActive(s.id)} onKeyDown={(e) => { if (e.key === "Enter") setActive(s.id); }}
                  >
                    <span className="ws-avatar" style={{ background: s.color }}>{M.initialsOf(s.name)}</span>
                    <span className="sg-who"><b>{s.name}{s.me ? " (you)" : ""}</b><span>{s.email}</span></span>
                    <span className="sg-nfields">{env.fields.filter((f) => f.signer === s.id).length}</span>
                    <button className="ws-btn ws-btn-ghost ws-icon-btn ws-btn-sm" title={`Remove ${s.name}`} aria-label={`Remove ${s.name}`}
                      onClick={(e) => { e.stopPropagation(); M.removeSigner(env.id, s.id); }}>
                      <Ico d="x" size={12} />
                    </button>
                  </div>
                ))}
                <AddSigner env={env} onAdded={setActive} />
              </section>
              <section className="ws-card sg-sec">
                <div className="sg-sec-title">Fields</div>
                <div className="sg-hint">
                  {current ? <>Placing for <b style={{ color: current.color }}>{current.name}</b>. Pick a field, then click the page.</> : "Add a signer first."}
                </div>
                <div className="sg-palette" style={sc(current?.color)}>
                  {TOOLS.map(([t, icon]) => (
                    <button key={t} className="sg-tool" aria-pressed={armed === t} disabled={!current} onClick={() => setArmed(armed === t ? null : t)}>
                      <Ico d={icon} size={14} />{M.LABEL[t]}
                    </button>
                  ))}
                </div>
              </section>
              <section className="ws-card sg-sec">
                <label className="sg-sec-title" htmlFor="sg-msg">Message to signers</label>
                <textarea id="sg-msg" className="ws-field sg-msg" rows={4} value={env.message} onChange={(e) => M.setMessage(env.id, e.target.value)} />
              </section>
            </>
          ) : (
            <>
              <section className="ws-card sg-sec">
                <div className="sg-sec-title">Signers<span className="ws-count">{env.signers.length - pending.length} of {env.signers.length} signed</span></div>
                {env.signers.map((s) => (
                  <div key={s.id} className="sg-prog">
                    <span className="ws-avatar" style={{ background: s.color }}>{M.initialsOf(s.name)}</span>
                    <span className="sg-who">
                      <b>{s.name}{s.me ? " (you)" : ""}</b>
                      <span>{s.signedAt ? `Signed ${M.fmtDay(s.signedAt)}, ${M.fmtTime(s.signedAt)}` : s.viewedAt ? `Viewed ${M.ago(s.viewedAt)}` : env.status === "voided" ? "Did not sign" : "Not opened yet"}</span>
                    </span>
                    <span className={"ws-status " + (s.state === "signed" ? "ok" : s.state === "viewed" ? "accent" : "")}>
                      {s.state === "signed" ? "Signed" : s.state === "viewed" ? "Viewed" : "Waiting"}
                    </span>
                  </div>
                ))}
              </section>
              {env.message && (
                <section className="ws-card sg-sec">
                  <div className="sg-sec-title">Message</div>
                  <p className="sg-quote">{env.message}</p>
                </section>
              )}
              <section className="ws-card sg-sec">
                <div className="sg-sec-title">Activity</div>
                <ol className="sg-audit">
                  {[...env.audit].reverse().map((a, i) => (
                    <li key={`${a.at}-${i}`}>
                      <span>{a.text}<small>{M.fmtStamp(a.at)}{a.where ? ` · ${a.where}` : ""}</small></span>
                    </li>
                  ))}
                </ol>
              </section>
              {env.status === "signed" && (
                <section className="ws-card sg-sec sg-cert">
                  <div className="sg-sec-title"><Ico d="shield" size={15} />Certificate of completion</div>
                  <dl>
                    <dt>Envelope</dt><dd>{env.code}</dd>
                    <dt>Completed</dt><dd>{M.fmtStamp(env.doneAt ?? env.editedAt)}</dd>
                    {env.signers.map((s) => (
                      <Fragment key={s.id}>
                        <dt>{s.name}</dt>
                        <dd>{s.signedAt ? M.fmtStamp(s.signedAt) : ""}<br />{M.whereOf(s)}</dd>
                      </Fragment>
                    ))}
                    <dt>SHA-256</dt><dd className="sg-hash">{env.hash}</dd>
                  </dl>
                </section>
              )}
              <div className="sg-detail">Envelope {env.code} · {docLabel}</div>
            </>
          )}
        </aside>
      </div>

      {adopt && <AdoptModal onClose={() => setAdopt(false)} onAdopt={adopted} />}
      {ask && (
        <Modal
          narrow alert onClose={() => setAsk(null)}
          title={ask === "void" ? "Void this envelope?" : "Discard this draft?"}
          sub={ask === "void" ? "Signers can no longer open it, and anything already signed stays on the record. This can't be undone." : "The draft, its signers and fields are removed. This can't be undone."}
          foot={<>
            <button className="ws-btn" onClick={() => setAsk(null)} autoFocus>Cancel</button>
            <button className="ws-btn sg-btn-bad" onClick={() => { const which = ask; setAsk(null); if (which === "void") M.voidEnv(env.id); else M.discard(env.id); }}>
              {ask === "void" ? "Void envelope" : "Discard draft"}
            </button>
          </>}
        />
      )}
    </>
  );
}

function AddSigner({ env, onAdded }: { env: M.Envelope; onAdded: (id: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const hasMe = env.signers.some((s) => s.me);
  const pickName = (val: string) => {
    setName(val);
    const c = PEOPLE.find((x) => x[0] === val);
    if (c) setEmail(c[2]);
  };
  const add = (n: string, em: string) => {
    if (!n) return setErr("Add a name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setErr("Add a valid email address.");
    if (env.signers.some((s) => s.email.toLowerCase() === em.toLowerCase())) return setErr(`${n} is already on this envelope.`);
    onAdded(M.addSigner(env.id, n, em));
    setName("");
    setEmail("");
    setErr("");
  };
  return (
    <form className="sg-add" onSubmit={(e) => { e.preventDefault(); add(name.trim(), email.trim()); }}>
      <div>
        <label className="ws-label" htmlFor="sg-add-name">Name</label>
        <input id="sg-add-name" className="ws-field" list="sg-people" value={name} onChange={(e) => pickName(e.target.value)} autoComplete="off" />
      </div>
      <div>
        <label className="ws-label" htmlFor="sg-add-email">Email</label>
        <input id="sg-add-email" className="ws-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
      </div>
      {err && <div className="sg-err" role="alert">{err}</div>}
      <div className="sg-add-row">
        <button type="submit" className="ws-btn ws-btn-sm"><Ico d="plus" size={13} />Add signer</button>
        {!hasMe && <button type="button" className="ws-btn ws-btn-sm ws-btn-ghost" onClick={() => add(M.ME.name, M.ME.email)}>Add yourself</button>}
      </div>
      <datalist id="sg-people">{PEOPLE.map((c) => <option key={c[0]} value={c[0]}>{c[3]}</option>)}</datalist>
    </form>
  );
}
