import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Ico } from "../Ico";
import { COLS, ROWS, PEOPLE, type Sheet, type SheetTab } from "./model";
import { computeAll, display, keyOf, type Val } from "./formula";

type Props = {
  sheet: Sheet;
  update: (fn: (s: Sheet) => Sheet) => void;
  /** People other than me who have this sheet open; the first one gets a moving cursor. */
  live?: string[];
};

type Pos = { c: number; r: number };

const clamp = (p: Pos): Pos => ({ c: Math.max(0, Math.min(COLS.length - 1, p.c)), r: Math.max(1, Math.min(ROWS, p.r)) });

export default function CanvasSheet({ sheet, update, live }: Props) {
  const tab: SheetTab = sheet.tabs[sheet.active] || sheet.tabs[0];
  const values = useMemo(() => computeAll(tab.cells), [tab.cells]);
  const [sel, setSel] = useState<Pos>({ c: 0, r: 1 });
  const [anchor, setAnchor] = useState<Pos>({ c: 0, r: 1 });
  const [editing, setEditing] = useState<null | { value: string; bar?: boolean }>(null);
  const [renamingTab, setRenamingTab] = useState<number | null>(null);
  const dragging = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const selKey = keyOf(sel.c, sel.r);

  const range = {
    c1: Math.min(sel.c, anchor.c), c2: Math.max(sel.c, anchor.c),
    r1: Math.min(sel.r, anchor.r), r2: Math.max(sel.r, anchor.r),
  };
  const inRange = (c: number, r: number) => c >= range.c1 && c <= range.c2 && r >= range.r1 && r <= range.r2;
  const multi = range.c1 !== range.c2 || range.r1 !== range.r2;

  /* Someone else in the sheet: their cursor hops between filled cells every few seconds. */
  const ghostWho = (live || []).find((p) => p !== "me");
  const ghostPath = useMemo(() => Object.keys(tab.cells).filter((k) => tab.cells[k].startsWith("=") || /\d/.test(tab.cells[k])).slice(0, 8), [tab.cells]);
  const [ghostIdx, setGhostIdx] = useState(0);
  useEffect(() => {
    if (!ghostWho || ghostPath.length < 2) return;
    const t = window.setInterval(() => setGhostIdx((i) => (i + 1) % ghostPath.length), 3600);
    return () => window.clearInterval(t);
  }, [ghostWho, ghostPath.length]);
  const ghostKey = ghostWho ? ghostPath[ghostIdx % Math.max(1, ghostPath.length)] : undefined;
  const ghost = ghostWho ? PEOPLE[ghostWho] : undefined;

  useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const patchTab = (fn: (t: SheetTab) => SheetTab) =>
    update((s) => ({ ...s, tabs: s.tabs.map((t, i) => (i === s.active ? fn(t) : t)) }));

  const setCells = (entries: [string, string][]) =>
    patchTab((t) => {
      const cells = { ...t.cells };
      entries.forEach(([k, v]) => {
        if (v === "") delete cells[k];
        else cells[k] = v;
      });
      return { ...t, cells };
    });

  const focusGrid = () => requestAnimationFrame(() => gridRef.current?.focus({ preventScroll: true }));

  const move = (dc: number, dr: number, extend = false) => {
    const next = clamp({ c: sel.c + dc, r: sel.r + dr });
    setSel(next);
    if (!extend) setAnchor(next);
  };

  const commit = (dc = 0, dr = 0) => {
    if (editing) setCells([[selKey, editing.value]]);
    setEditing(null);
    if (dc || dr) move(dc, dr);
    focusGrid();
  };

  const startEdit = (value?: string) => setEditing({ value: value ?? tab.cells[selKey] ?? "" });

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editing) return;
    const k = e.key;
    if (k === "ArrowUp") { e.preventDefault(); move(0, -1, e.shiftKey); }
    else if (k === "ArrowDown") { e.preventDefault(); move(0, 1, e.shiftKey); }
    else if (k === "ArrowLeft") { e.preventDefault(); move(-1, 0, e.shiftKey); }
    else if (k === "ArrowRight") { e.preventDefault(); move(1, 0, e.shiftKey); }
    else if (k === "Tab") { e.preventDefault(); move(e.shiftKey ? -1 : 1, 0); }
    else if (k === "Enter" || k === "F2") { e.preventDefault(); startEdit(); }
    else if (k === "Backspace" || k === "Delete") {
      e.preventDefault();
      const out: [string, string][] = [];
      for (let c = range.c1; c <= range.c2; c++) for (let r = range.r1; r <= range.r2; r++) out.push([keyOf(c, r), ""]);
      setCells(out);
    } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      startEdit(k);
    }
  };

  const onEditKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); commit(0, e.shiftKey ? -1 : 1); }
    else if (e.key === "Tab") { e.preventDefault(); commit(e.shiftKey ? -1 : 1, 0); }
    else if (e.key === "Escape") { e.preventDefault(); setEditing(null); focusGrid(); }
  };

  /* Toolbar */
  const autoSum = () => {
    const isNum = (c: number, r: number) => typeof values[keyOf(c, r)] === "number";
    let target = selKey, formula = "";
    if (multi && range.c1 === range.c2) {
      target = keyOf(range.c1, range.r2 + 1);
      formula = "=SUM(" + keyOf(range.c1, range.r1) + ":" + keyOf(range.c1, range.r2) + ")";
    } else {
      let r = sel.r - 1;
      while (r >= 1 && !isNum(sel.c, r)) r--;
      const end = r;
      while (r >= 1 && isNum(sel.c, r)) r--;
      if (end >= 1) formula = "=SUM(" + keyOf(sel.c, r + 1) + ":" + keyOf(sel.c, end) + ")";
      else {
        let c = sel.c - 1;
        while (c >= 0 && !isNum(c, sel.r)) c--;
        const e2 = c;
        while (c >= 0 && isNum(c, sel.r)) c--;
        if (e2 >= 0) formula = "=SUM(" + keyOf(c + 1, sel.r) + ":" + keyOf(e2, sel.r) + ")";
      }
    }
    if (formula) setCells([[target, formula]]);
    focusGrid();
  };
  const col = COLS[sel.c];
  const toggleFmt = (f: "eur" | "pct") => {
    patchTab((t) => {
      const fmt = { ...t.fmt };
      for (let c = range.c1; c <= range.c2; c++) {
        if (fmt[COLS[c]] === f) delete fmt[COLS[c]];
        else fmt[COLS[c]] = f;
      }
      return { ...t, fmt };
    });
    focusGrid();
  };
  const toggleBold = () => {
    patchTab((t) => {
      const rows = new Set(t.bold);
      const on = rows.has(sel.r);
      for (let r = range.r1; r <= range.r2; r++) on ? rows.delete(r) : rows.add(r);
      return { ...t, bold: [...rows].sort((a, b) => a - b) };
    });
    focusGrid();
  };

  /* Footer stats for a range */
  const stats = useMemo(() => {
    if (!multi) return null;
    const nums: number[] = [];
    for (let c = range.c1; c <= range.c2; c++)
      for (let r = range.r1; r <= range.r2; r++) {
        const v = values[keyOf(c, r)];
        if (typeof v === "number") nums.push(v);
      }
    if (!nums.length) return null;
    const f = range.c1 === range.c2 ? tab.fmt[COLS[range.c1]] : undefined;
    const sum = nums.reduce((s, x) => s + x, 0);
    return { sum: display(sum, f), avg: display(sum / nums.length, f), count: nums.length };
  }, [multi, range.c1, range.c2, range.r1, range.r2, values, tab.fmt]);

  const addTab = () =>
    update((s) => ({ ...s, active: s.tabs.length, tabs: [...s.tabs, { name: "Sheet " + (s.tabs.length + 1), cells: {}, widths: { A: 180 }, fmt: {}, bold: [] }] }));

  const raw = tab.cells[selKey] ?? "";
  const width = (c: string) => tab.widths[c] ?? 112;

  return (
    <div className="ws-card cv-sheet">
      <div className="cv-sheet-bar">
        <span className="cv-cellname">{multi ? keyOf(range.c1, range.r1) + ":" + keyOf(range.c2, range.r2) : selKey}</span>
        <span className="cv-fx">fx</span>
        <input
          className="cv-formula"
          aria-label="Formula"
          value={editing ? editing.value : raw}
          onFocus={() => !editing && setEditing({ value: raw, bar: true })}
          onChange={(e) => setEditing({ value: e.target.value, bar: true })}
          onKeyDown={onEditKey}
          onBlur={() => editing?.bar && commit()}
          placeholder="Type a value or a formula like =SUM(D2:D6)"
        />
        <div className="cv-sheet-tools">
          <button className="ws-btn ws-btn-sm" onClick={autoSum} title="Sum the numbers above">
            <span style={{ fontSize: 15, lineHeight: 1 }}>Σ</span> Sum
          </button>
          <button className="ws-btn ws-btn-sm ws-icon-btn" aria-pressed={tab.fmt[col] === "eur"} data-on={tab.fmt[col] === "eur" ? "1" : undefined} onClick={() => toggleFmt("eur")} title="Format as euro">€</button>
          <button className="ws-btn ws-btn-sm ws-icon-btn" data-on={tab.fmt[col] === "pct" ? "1" : undefined} onClick={() => toggleFmt("pct")} title="Format as percent">%</button>
          <button className="ws-btn ws-btn-sm ws-icon-btn" data-on={tab.bold.includes(sel.r) ? "1" : undefined} onClick={toggleBold} title="Bold row" style={{ fontWeight: 700 }}>B</button>
        </div>
      </div>

      <div
        className="cv-grid-wrap"
        ref={gridRef}
        tabIndex={0}
        onKeyDown={onGridKey}
        aria-label="Sheet grid"
        onPaste={(e) => {
          if (editing) return;
          const text = e.clipboardData.getData("text/plain");
          if (!text) return;
          e.preventDefault();
          // Tab-separated rows from Excel or Sheets land as a block from the selected cell.
          const out: [string, string][] = [];
          text.replace(/\r/g, "").replace(/\n$/, "").split("\n").forEach((line, dr) =>
            line.split("\t").forEach((val, dc) => {
              const c = sel.c + dc, r = sel.r + dr;
              if (c < COLS.length && r <= ROWS) out.push([keyOf(c, r), val.trim()]);
            }),
          );
          setCells(out);
        }}
      >
        <table className="cv-grid" style={{ width: 44 + COLS.reduce((n, c) => n + width(c), 0) }}>
          <colgroup>
            <col style={{ width: 44 }} />
            {COLS.map((c) => <col key={c} style={{ width: width(c) }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="cv-corner" />
              {COLS.map((c, ci) => (
                <th key={c} data-hot={ci >= range.c1 && ci <= range.c2 ? "1" : undefined}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, ri) => {
              const r = ri + 1;
              const bold = tab.bold.includes(r);
              return (
                <tr key={r}>
                  <th data-hot={r >= range.r1 && r <= range.r2 ? "1" : undefined}>{r}</th>
                  {COLS.map((c, ci) => {
                    const k = c + r;
                    const v: Val | undefined = values[k];
                    const isSel = ci === sel.c && r === sel.r;
                    const isGhost = ghostKey === k && !isSel;
                    const shown = display(v, tab.fmt[c]);
                    return (
                      <td
                        key={k}
                        data-num={typeof v === "number" ? "1" : undefined}
                        data-bold={bold ? "1" : undefined}
                        data-sel={isSel ? "1" : undefined}
                        data-in={!isSel && multi && inRange(ci, r) ? "1" : undefined}
                        data-err={typeof v === "string" && v.startsWith("#") ? "1" : undefined}
                        className={isGhost ? "cv-ghost" : undefined}
                        style={isGhost && ghost ? ({ ["--g" as string]: ghost.tint } as CSSProperties) : undefined}
                        title={tab.cells[k]?.startsWith("=") ? tab.cells[k] : undefined}
                        onMouseDown={(e) => {
                          if (editing) commit();
                          dragging.current = true;
                          setSel({ c: ci, r });
                          if (!e.shiftKey) setAnchor({ c: ci, r });
                          gridRef.current?.focus({ preventScroll: true });
                        }}
                        onMouseEnter={() => dragging.current && setSel({ c: ci, r })}
                        onDoubleClick={() => startEdit()}
                      >
                        {isSel && editing && !editing.bar ? (
                          <input
                            className="cv-cell-input"
                            autoFocus
                            value={editing.value}
                            onChange={(e) => setEditing({ value: e.target.value })}
                            onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                            onKeyDown={onEditKey}
                            onBlur={() => commit()}
                          />
                        ) : (
                          shown
                        )}
                        {isGhost && ghost && <span className="cv-ghost-tag">{ghost.short.split(" ")[0]}</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="cv-sheet-foot">
        {sheet.tabs.map((t, i) =>
          renamingTab === i ? (
            <input
              key={i}
              className="cv-tab-input"
              autoFocus
              defaultValue={t.name}
              onBlur={(e) => {
                const name = e.target.value.trim() || t.name;
                update((s) => ({ ...s, tabs: s.tabs.map((x, j) => (j === i ? { ...x, name } : x)) }));
                setRenamingTab(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <button
              key={i}
              className="cv-tab"
              aria-pressed={i === sheet.active}
              onClick={() => update((s) => ({ ...s, active: i }))}
              onDoubleClick={() => setRenamingTab(i)}
              title="Double-click to rename"
            >
              {t.name}
            </button>
          ),
        )}
        <button className="cv-tab" onClick={addTab} title="Add a tab" aria-label="Add a tab">
          <Ico d="plus" size={13} />
        </button>
        <div className="cv-stats">
          {stats ? (
            <>
              <span>Sum <b>{stats.sum}</b></span>
              <span>Average <b>{stats.avg}</b></span>
              <span>Count <b>{stats.count}</b></span>
            </>
          ) : raw.startsWith("=") ? (
            <span className="cv-mono">{raw}</span>
          ) : (
            <span>Drag across cells to total them</span>
          )}
        </div>
      </div>
    </div>
  );
}
