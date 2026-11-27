import { useState, type DragEvent } from "react";
import { Ico } from "../Ico";
import { PEOPLE, uid, type Board, type Card, type Kind } from "./model";

type Props = {
  board: Board;
  kind: Kind;
  update: (fn: (b: Board) => Board) => void;
};

const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-IE");
const TAGS = ["High", "Medium", "Low"];
const tagTone = (t?: string) => (t === "High" ? "bad" : t === "Medium" ? "warn" : "");
const WHO = ["me", "sinead", "declan", "ciaran", "shane"];

export function Avatar({ who, size = 22 }: { who: string; size?: number }) {
  const p = PEOPLE[who];
  if (!p || !p.initials) return null;
  const isVar = p.tint.startsWith("var(");
  return (
    <span
      className="ws-avatar"
      title={p.name}
      style={{ width: size, height: size, fontSize: size < 24 ? 9 : 10, background: p.tint, color: isVar ? "var(--on-accent)" : "#0b0e10" }}
    >
      {p.initials}
    </span>
  );
}

export default function CanvasBoard({ board, kind, update }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ col: string; before?: string } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const pipeline = kind === "pipeline";
  const lastCol = board.columns[board.columns.length - 1]?.id;

  const patchCard = (id: string, patch: Partial<Card>) =>
    update((b) => ({ ...b, cards: b.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const removeCard = (id: string) => update((b) => ({ ...b, cards: b.cards.filter((c) => c.id !== id) }));

  const moveCard = (id: string, col: string, before?: string) =>
    update((b) => {
      const card = b.cards.find((c) => c.id === id);
      if (!card) return b;
      const rest = b.cards.filter((c) => c.id !== id);
      const moved = { ...card, col };
      const at = before ? rest.findIndex((c) => c.id === before) : -1;
      if (at < 0) rest.push(moved);
      else rest.splice(at, 0, moved);
      return { ...b, cards: rest };
    });

  const addCard = (col: string) => {
    const title = draft.trim();
    if (title) {
      update((b) => ({
        ...b,
        cards: [...b.cards, { id: uid("c"), title, col, who: "me", due: pipeline ? "Added just now" : "No date", tag: pipeline ? undefined : "Medium", value: pipeline ? 5000 : undefined }],
      }));
    }
    setDraft("");
    setAdding(null);
  };

  const onDragStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDragId(id);
  };
  const onDrop = (e: DragEvent, col: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (id) moveCard(id, col, over?.col === col ? over.before : undefined);
    setDragId(null);
    setOver(null);
  };

  const total = (col?: string) => board.cards.filter((c) => !col || c.col === col).reduce((n, c) => n + (c.value || 0), 0);
  const openValue = board.cards.filter((c) => c.col !== lastCol).reduce((n, c) => n + (c.value || 0), 0);

  return (
    <div className="cv-boardwrap">
      <div className="cv-board-bar">
        {!pipeline && (
          <div className="ws-seg" role="group" aria-label="View">
            <button aria-pressed={board.view === "board"} onClick={() => update((b) => ({ ...b, view: "board" }))}>
              <Ico d="pipeline" size={13} /> Board
            </button>
            <button aria-pressed={board.view === "table"} onClick={() => update((b) => ({ ...b, view: "table" }))}>
              <Ico d="list" size={13} /> Table
            </button>
          </div>
        )}
        {pipeline ? (
          <div className="cv-board-sum">
            <span>Open pipeline <b>{eur(openValue)}</b></span>
            <span>Won <b>{eur(total(lastCol))}</b></span>
            <span>{board.cards.length} deals</span>
          </div>
        ) : (
          <div className="cv-board-sum">
            <span><b>{board.cards.filter((c) => c.col === lastCol).length}</b> of {board.cards.length} done</span>
          </div>
        )}
        <span className="cv-board-hint">{board.view === "board" || pipeline ? "Drag cards between columns" : "Change status inline"}</span>
      </div>

      {board.view === "table" && !pipeline ? (
        <div className="ws-card cv-ttable">
          <div className="cv-trow cv-th">
            <span />
            <span>Task</span>
            <span>Owner</span>
            <span>Status</span>
            <span>Due</span>
            <span>Priority</span>
            <span />
          </div>
          {board.cards.map((c) => {
            const done = c.col === lastCol;
            return (
              <div key={c.id} className="cv-trow">
                <button className="cv-check" data-on={done ? "1" : undefined} aria-label={done ? "Mark not done" : "Mark done"} onClick={() => patchCard(c.id, { col: done ? board.columns[0].id : lastCol })}>
                  <Ico d="check" size={11} sw={3} style={{ opacity: done ? 1 : 0 }} />
                </button>
                <input className="cv-inline" value={c.title} data-done={done ? "1" : undefined} onChange={(e) => patchCard(c.id, { title: e.target.value })} aria-label="Task" />
                <div className="cv-owner-pick">
                  <Avatar who={c.who} />
                  <select className="cv-select cv-select-bare" value={c.who} onChange={(e) => patchCard(c.id, { who: e.target.value })} aria-label="Owner">
                    {WHO.map((w) => <option key={w} value={w}>{PEOPLE[w].short}</option>)}
                  </select>
                </div>
                <select className="cv-select" value={c.col} onChange={(e) => patchCard(c.id, { col: e.target.value })} aria-label="Status">
                  {board.columns.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
                </select>
                <input className="cv-inline cv-inline-sm" value={c.due || ""} placeholder="No date" onChange={(e) => patchCard(c.id, { due: e.target.value })} aria-label="Due" />
                <button className={"ws-status " + tagTone(c.tag)} onClick={() => patchCard(c.id, { tag: TAGS[(TAGS.indexOf(c.tag || "Low") + 1) % 3] })} title="Click to change">
                  {c.tag || "Low"}
                </button>
                <button className="ws-btn ws-btn-ghost ws-btn-sm ws-icon-btn" onClick={() => removeCard(c.id)} aria-label="Delete">
                  <Ico d="x" size={13} />
                </button>
              </div>
            );
          })}
          {adding === "__table" ? (
            <div className="cv-trow">
              <span />
              <input className="cv-inline" autoFocus placeholder="What needs doing?" value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCard(board.columns[0].id); if (e.key === "Escape") setAdding(null); }}
                onBlur={() => addCard(board.columns[0].id)} />
            </div>
          ) : (
            <button className="cv-addrow" onClick={() => setAdding("__table")}>
              <Ico d="plus" size={13} /> New task
            </button>
          )}
        </div>
      ) : (
        <div className="cv-board">
          {board.columns.map((col) => {
            const cards = board.cards.filter((c) => c.col === col.id);
            return (
              <div
                key={col.id}
                className="cv-col"
                data-over={over?.col === col.id ? "1" : undefined}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (over?.col !== col.id) setOver({ col: col.id });
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
                }}
                onDrop={(e) => onDrop(e, col.id)}
              >
                <div className="cv-col-head">
                  <b>{col.name}</b>
                  <span className="ws-count">{cards.length}</span>
                  {pipeline && <span className="cv-col-total">{eur(total(col.id))}</span>}
                </div>
                {cards.map((c) => (
                  <div
                    key={c.id}
                    className="cv-kcard"
                    draggable={editId !== c.id}
                    data-dragging={dragId === c.id ? "1" : undefined}
                    data-before={over?.before === c.id && dragId !== c.id ? "1" : undefined}
                    onDragStart={(e) => onDragStart(e, c.id)}
                    onDragEnd={() => { setDragId(null); setOver(null); }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (over?.before !== c.id) setOver({ col: col.id, before: c.id });
                    }}
                    onDrop={(e) => { e.stopPropagation(); onDrop(e, col.id); }}
                    onDoubleClick={() => setEditId(c.id)}
                  >
                    {editId === c.id ? (
                      <input className="cv-inline" autoFocus defaultValue={c.title}
                        onBlur={(e) => { patchCard(c.id, { title: e.target.value.trim() || c.title }); setEditId(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }} />
                    ) : (
                      <div className="cv-kcard-title">{c.title}</div>
                    )}
                    <div className="cv-kcard-meta">
                      <Avatar who={c.who} />
                      <span className="cv-kcard-due">{c.due}</span>
                      {pipeline ? (
                        <span className="cv-kcard-value">{eur(c.value || 0)}</span>
                      ) : (
                        c.tag && <span className={"cv-tag " + tagTone(c.tag)}>{c.tag}</span>
                      )}
                    </div>
                    <button className="cv-kcard-x" onClick={() => removeCard(c.id)} aria-label="Delete card" title="Delete">
                      <Ico d="x" size={11} sw={2.2} />
                    </button>
                  </div>
                ))}
                {adding === col.id ? (
                  <input className="cv-inline cv-addinput" autoFocus placeholder={pipeline ? "Company name" : "What needs doing?"} value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addCard(col.id); if (e.key === "Escape") { setDraft(""); setAdding(null); } }}
                    onBlur={() => addCard(col.id)} />
                ) : (
                  <button className="cv-addcard" onClick={() => { setDraft(""); setAdding(col.id); }}>
                    <Ico d="plus" size={13} /> {pipeline ? "Add deal" : "Add card"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
