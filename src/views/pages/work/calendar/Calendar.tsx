import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as RPointerEvent } from "react";
import "../../../../styles/calendar.css";
import { usePersist } from "../../../../components/usePersist";
import { Ico, type IcoName } from "../Ico";
import * as M from "./model";
import { MiniMonth, MonthView } from "./parts";

type Show = Record<M.Kind | "weekends", boolean>;
type Pop = { id: string; x: number; y: number; fresh?: boolean };
type Menu = { type: "who" | "show"; x: number; y: number };
type Drag = {
  id: string; mode: "move" | "resize"; x0: number; y0: number; col0: number; colW: number;
  date0: string; start0: number; end0: number; moved: boolean; date: string; start: number; end: number;
};
type Draft = { date: string; a: number; b: number };
type Chip = { id: string; title: string; done: boolean; type: "check" | "task" };

const SHOW0: Show = { meeting: true, call: true, routine: true, focus: true, weekends: true };
const KINDS: M.Kind[] = ["meeting", "call", "routine", "focus"];
const KIND_ICON: Record<M.Kind, IcoName> = { meeting: "users", call: "video", routine: "sparkle", focus: "clock" };

function useNarrow(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

function Avatar({ who, size = 22 }: { who: string; size?: number }) {
  const p = M.PEOPLE[who];
  if (!p) return null;
  return (
    <span className="ws-avatar" title={p.name} style={{ width: size, height: size, fontSize: size < 24 ? 9 : 10, background: p.tint, color: p.tint.startsWith("var(") ? "var(--on-accent)" : "#0b0e10" }}>
      {p.initials}
    </span>
  );
}

/* Work › Calendar: meetings, agent routines and time blocked for tasks, with the
   task list beside it. Frontend only; state lasts for the session. */
export default function Calendar({ v }: { v: any }) {
  void v;
  const today = M.todayDate();
  const todayKey = M.ymd(today);

  const [view, setView] = usePersist<M.View>("cal:view", "week");
  const [anchorKey, setAnchorKey] = usePersist<string>("cal:anchor", todayKey);
  const [events, setEvents] = usePersist<M.Ev[]>("cal:events", []);
  const [checks, setChecks] = usePersist<M.Check[]>("cal:checks", []);
  const [filled, setFilled] = usePersist<string[]>("cal:filled", []);
  const [tasks, setTasks] = usePersist<M.Task[]>("cal:tasks", M.seedTasks);
  const [show, setShow] = usePersist<Show>("cal:show", SHOW0);
  const [who, setWho] = usePersist<"mine" | "everyone">("cal:who", "mine");
  const [sortBy, setSortBy] = usePersist<"leverage" | "due">("cal:sort", "leverage");
  const [openOnly, setOpenOnly] = usePersist<boolean>("cal:open", true);
  const [prioOnly, setPrioOnly] = usePersist<boolean>("cal:prio", false);

  const anchor = M.parse(anchorKey);
  const [query, setQuery] = useState("");
  const [mini, setMini] = useState(() => new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const [pop, setPop] = useState<Pop | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dragTask, setDragTask] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ date: string; start: number; mins: number } | null>(null);
  const [pinOver, setPinOver] = useState<string | null>(null);
  const [moreDay, setMoreDay] = useState<string | null>(null);
  const [justDone, setJustDone] = useState<Record<string, true>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const [now, setNow] = useState(M.nowMin());
  const [toast, setToast] = useState<null | { text: string; undo?: () => void; key: number }>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const draftRef = useRef<(Draft & { top: number; rect: DOMRect }) | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ---------- what is on screen ---------- */
  const narrow = useNarrow("(max-width: 720px)");
  const shown: M.View = narrow && view === "week" ? "day" : view;
  const ws = M.weekStart(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => M.addDays(ws, i));
  const gridDays = shown === "day" ? [anchor] : weekDays.filter((d) => show.weekends || M.dow(d) < 5);
  const monthDays = M.monthGrid(anchor);
  const from = shown === "month" ? monthDays[0] : shown === "day" ? anchor : ws;
  const to = shown === "month" ? monthDays[41] : shown === "day" ? anchor : M.addDays(ws, 6);

  /* Recurring routines and the week's one-offs are created the first time a week is shown. */
  const weeksKey = (() => {
    const out: string[] = [];
    for (let w = M.weekStart(from); w <= to; w = M.addDays(w, 7)) out.push(M.ymd(w));
    const tw = M.ymd(M.weekStart(today));
    if (!out.includes(tw)) out.push(tw);
    return out.join("|");
  })();
  useLayoutEffect(() => {
    const need = weeksKey.split("|").filter((w) => !filled.includes(w));
    if (!need.length) return;
    const add = need.map((w) => M.fillWeek(M.parse(w)));
    setEvents((prev) => {
      const ids = new Set(prev.map((e) => e.id));
      return [...prev, ...add.flatMap((a) => a.events).filter((e) => !ids.has(e.id))];
    });
    setChecks((prev) => {
      const ids = new Set(prev.map((c) => c.id));
      return [...prev, ...add.flatMap((a) => a.checks).filter((c) => !ids.has(c.id))];
    });
    setFilled((prev) => [...prev, ...need.filter((w) => !prev.includes(w))]);
  }, [weeksKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = window.setInterval(() => setNow(M.nowMin()), 30000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 1800);
    return () => window.clearTimeout(t);
  }, [flash]);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  useEffect(() => setMini(new Date(anchor.getFullYear(), anchor.getMonth(), 1)), [anchorKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Open on the working day: a little before now if today is in view, else the morning. */
  const todayInView = today >= from && today <= to;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = todayInView ? Math.max(6.75, Math.min(M.nowMin() / 60 - 5, 14)) : 6.75;
    el.scrollTop = h * M.HOUR;
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- helpers ---------- */
  const say = (text: string, undo?: () => void) => {
    setToast({ text, undo, key: Date.now() });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  };
  const q = query.trim().toLowerCase();
  const visible = (e: M.Ev) => show[e.kind] && (who === "everyone" || !e.who || e.who.includes("me"));
  const dim = (title: string) => !!q && !title.toLowerCase().includes(q);
  const past = (e: M.Ev) => e.date < todayKey || (e.date === todayKey && e.end <= now);
  const taskVisible = (t: M.Task) =>
    (!openOnly || !t.done || !!justDone[t.id]) && (!prioOnly || t.priority === "High") && (!q || t.title.toLowerCase().includes(q));

  const go = (d: Date) => {
    setAnchorKey(M.ymd(d));
    setPop(null);
  };
  const step = (dir: number) =>
    go(shown === "month" ? new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1) : M.addDays(anchor, dir * (shown === "day" ? 1 : 7)));

  const scrollTo = (min: number) => scrollRef.current?.scrollTo({ top: Math.max(0, min * M.PX - 90), behavior: "smooth" });

  const placePop = (r: { left: number; right: number; top: number }) => {
    const W = 330, H = 400;
    const x = r.right + 10 + W < window.innerWidth ? r.right + 10 : Math.max(12, r.left - W - 10);
    return { x, y: M.clamp(r.top - 10, 12, window.innerHeight - H - 12) };
  };
  const openPop = (id: string, r: { left: number; right: number; top: number }, fresh = false) => setPop({ id, fresh, ...placePop(r) });
  const popWhenRendered = (id: string, fresh = false) =>
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-ev="' + id + '"]');
      if (el) openPop(id, el.getBoundingClientRect(), fresh);
    });

  const patchEv = (id: string, patch: Partial<M.Ev>) => setEvents((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEv = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    setEvents((es) => es.filter((e) => e.id !== id));
    if (ev.task) setTasks((ts) => ts.map((t) => (t.id === ev.task ? { ...t, block: undefined } : t)));
    setPop(null);
    say("Deleted “" + ev.title + "”", () => {
      setEvents((es) => [...es, ev]);
      if (ev.task) setTasks((ts) => ts.map((t) => (t.id === ev.task ? { ...t, block: ev.id } : t)));
    });
  };

  const toggleTask = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
    if (!t.done) {
      setJustDone((j) => ({ ...j, [id]: true }));
      window.setTimeout(() => setJustDone((j) => {
        const n = { ...j };
        delete n[id];
        return n;
      }), 900);
      say("Done: " + t.title, () => setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, done: false } : x))));
    }
  };
  const toggleCheck = (id: string) => {
    const c = checks.find((x) => x.id === id);
    if (!c) return;
    setChecks((cs) => cs.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
    if (!c.done) {
      setJustDone((j) => ({ ...j, [id]: true }));
      window.setTimeout(() => setJustDone((j) => {
        const n = { ...j };
        delete n[id];
        return n;
      }), 900);
    }
  };

  const blockTask = (taskId: string, date: string, start: number, mins: number) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    const id = M.uid("ev");
    setEvents((es) => [...es.filter((e) => e.id !== t.block), { id, title: t.title, date, start, end: start + mins, kind: "focus", task: t.id, who: ["me"] }]);
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, block: id } : x)));
    setFlash(id);
    say("Blocked " + mins + " min for “" + t.title + "”");
  };

  const newEvent = () => {
    const date = shown === "day" ? anchorKey : gridDays.some((d) => M.ymd(d) === todayKey) && shown !== "month" ? todayKey : M.ymd(shown === "month" ? anchor : gridDays[0]);
    const base = date === todayKey ? Math.ceil((M.nowMin() + 20) / 30) * 30 : 10 * 60;
    const start = M.clamp(base, 7 * 60, 22 * 60);
    const ev: M.Ev = { id: M.uid("ev"), title: "New event", date, start, end: start + 60, kind: "meeting", who: ["me"] };
    setEvents((es) => [...es, ev]);
    if (shown === "month") setView("week");
    setAnchorKey(date);
    scrollTo(start);
    window.setTimeout(() => popWhenRendered(ev.id, true), 260);
  };

  /* Plan my day: the highest-leverage open tasks go into today's free gaps,
     or tomorrow's if today is nearly over. */
  const planMyDay = () => {
    const late = M.nowMin() > 16 * 60 + 30;
    const day = late ? M.addDays(today, 1) : today;
    const key = M.ymd(day);
    const startFrom = late ? 9 * 60 : Math.max(9 * 60, Math.ceil((M.nowMin() + 10) / 15) * 15);
    const busy = events.filter((e) => e.date === key && visible(e)).map((e) => [e.start, e.end] as [number, number]);
    const picks = tasks.filter((t) => !t.done && !t.block).sort(M.byLeverage).slice(0, 4);
    const placed: M.Ev[] = [];
    picks.forEach((t) => {
      const len = M.clamp(t.mins, 30, 90);
      let s = startFrom;
      for (let guard = 0; guard < 60 && s + len <= 18 * 60; guard++) {
        const clash = [...busy, ...placed.map((p) => [p.start, p.end] as [number, number])].find(([a, b]) => s < b && s + len > a);
        if (!clash) break;
        s = Math.ceil(clash[1] / 15) * 15;
      }
      if (s + len <= 18 * 60) placed.push({ id: M.uid("ev"), title: t.title, date: key, start: s, end: s + len, kind: "focus", task: t.id, who: ["me"] });
    });
    setView(view === "month" ? "week" : view);
    setAnchorKey(key);
    setPop(null);
    if (!placed.length) return say("No room left before 18:00. Nothing moved.");
    scrollTo(placed[0].start);
    placed.forEach((ev, i) =>
      window.setTimeout(() => {
        setEvents((es) => [...es, ev]);
        setTasks((ts) => ts.map((t) => (t.id === ev.task ? { ...t, block: ev.id } : t)));
        setFlash(ev.id);
      }, 300 + i * 420),
    );
    window.setTimeout(
      () => say("Charlie AI planned " + placed.length + " task" + (placed.length > 1 ? "s" : "") + " into " + (late ? "tomorrow's" : "today's") + " gaps"),
      300 + placed.length * 420,
    );
  };

  /* ---------- pointer: move, resize, create ---------- */
  const evDown = (e: RPointerEvent<HTMLElement>, ev: M.Ev, mode: "move" | "resize", col: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const colEl = (e.currentTarget as HTMLElement).closest(".cl-col") as HTMLElement | null;
    dragRef.current = {
      id: ev.id, mode, x0: e.clientX, y0: e.clientY, col0: col, colW: colEl?.getBoundingClientRect().width || 120,
      date0: ev.date, start0: ev.start, end0: ev.end, moved: false, date: ev.date, start: ev.start, end: ev.end,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const evMove = (e: RPointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
    d.moved = true;
    const dm = M.snap(dy / M.PX);
    if (d.mode === "move") {
      const len = d.end0 - d.start0;
      const ci = M.clamp(d.col0 + (shown === "day" ? 0 : Math.round(dx / d.colW)), 0, gridDays.length - 1);
      d.date = M.ymd(gridDays[ci]);
      d.start = M.clamp(d.start0 + dm, 0, 1440 - len);
      d.end = d.start + len;
    } else {
      d.end = M.clamp(d.end0 + dm, d.start0 + 15, 1440);
    }
    setDrag({ ...d });
  };
  const evUp = (e: RPointerEvent<HTMLElement>, ev: M.Ev) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d) return;
    if (d.moved) {
      if (d.date !== ev.date || d.start !== ev.start || d.end !== ev.end) {
        patchEv(ev.id, { date: d.date, start: d.start, end: d.end });
        setFlash(ev.id);
        say(d.mode === "move" ? "Moved to " + M.shortDay(M.parse(d.date)) + ", " + M.hm(d.start) : "Now ends at " + M.hm(d.end), () =>
          patchEv(ev.id, { date: d.date0, start: d.start0, end: d.end0 }),
        );
      }
      return;
    }
    const el = (e.currentTarget as HTMLElement).closest("[data-ev]") as HTMLElement | null;
    if (el) openPop(ev.id, el.getBoundingClientRect());
  };

  const colDown = (e: RPointerEvent<HTMLDivElement>, date: string) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const a = M.clamp(Math.floor((e.clientY - rect.top) / M.PX / 15) * 15, 0, 1410);
    draftRef.current = { date, a, b: a + 30, top: rect.top, rect };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraft({ date, a, b: a + 30 });
  };
  const colMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = draftRef.current;
    if (!d) return;
    const m = M.clamp(M.snap((e.clientY - d.top) / M.PX), 0, 1440);
    const lo = Math.min(d.a, m), hi = Math.max(d.a + 15, m);
    if (lo !== d.a || hi !== d.b) {
      d.b = hi;
      setDraft({ date: d.date, a: lo, b: hi });
    }
  };
  const colUp = () => {
    const d = draftRef.current;
    draftRef.current = null;
    if (!d || !draft) return;
    const ev: M.Ev = { id: M.uid("ev"), title: "New event", date: draft.date, start: draft.a, end: Math.max(draft.b, draft.a + 15), kind: "meeting", who: ["me"] };
    setEvents((es) => [...es, ev]);
    setDraft(null);
    openPop(ev.id, { left: d.rect.left, right: d.rect.right, top: d.top + ev.start * M.PX }, true);
  };

  /* ---------- drag a task onto the grid or into Pinned ---------- */
  const taskOver = (e: DragEvent<HTMLDivElement>, date: string) => {
    if (!dragTask) return;
    e.preventDefault();
    const t = tasks.find((x) => x.id === dragTask);
    const mins = M.clamp(t?.mins ?? 30, 30, 120);
    const rect = e.currentTarget.getBoundingClientRect();
    const start = M.clamp(M.snap((e.clientY - rect.top) / M.PX - 10), 0, 1440 - mins);
    if (!dropHint || dropHint.date !== date || dropHint.start !== start) setDropHint({ date, start, mins });
  };
  const taskDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!dragTask || !dropHint) return;
    e.preventDefault();
    blockTask(dragTask, dropHint.date, dropHint.start, dropHint.mins);
    setDragTask(null);
    setDropHint(null);
  };
  const pinDrop = (before?: string) => {
    if (!dragTask) return;
    const order = tasks.filter((t) => t.pinned != null && t.id !== dragTask).sort((a, b) => a.pinned! - b.pinned!).map((t) => t.id);
    const at = before ? order.indexOf(before) : -1;
    if (at < 0) order.push(dragTask);
    else order.splice(at, 0, dragTask);
    setTasks((ts) => ts.map((t) => (order.includes(t.id) ? { ...t, pinned: order.indexOf(t.id) } : t)));
    setDragTask(null);
    setPinOver(null);
  };

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        if (e.key === "Escape") (el as HTMLInputElement).blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") { setPop(null); setMenu(null); }
      else if (e.key === "t") go(today);
      else if (e.key === "d") setView("day");
      else if (e.key === "w") setView("week");
      else if (e.key === "m") setView("month");
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- side panel data ---------- */
  const pinned = tasks.filter((t) => t.pinned != null && taskVisible(t)).sort((a, b) => a.pinned! - b.pinned!);
  const listed = tasks.filter((t) => t.pinned == null && taskVisible(t)).sort(sortBy === "leverage" ? M.byLeverage : M.byDue);
  const openCount = tasks.filter((t) => !t.done).length;
  const status = (t: M.Task): [string, string] => {
    if (t.done) return ["Done", "ok"];
    const blk = t.block ? events.find((e) => e.id === t.block) : undefined;
    if (blk) return ["Blocked " + M.DOW[M.dow(M.parse(blk.date))] + " " + M.hm(blk.start), "accent"];
    if (t.due < todayKey) return ["Overdue", "bad"];
    if (t.due === todayKey) return ["Due today", "warn"];
    const n = M.daysBetween(today, M.parse(t.due));
    return [n === 1 ? "Tomorrow" : "In " + n + " days", ""];
  };

  const allDayFor = (key: string): Chip[] => [
    ...checks
      .filter((c) => c.date === key && (!openOnly || !c.done || !!justDone[c.id]) && (!q || c.title.toLowerCase().includes(q)))
      .map((c) => ({ id: c.id, title: c.title, done: !!c.done, type: "check" as const })),
    ...tasks.filter((t) => t.due === key && !t.block && taskVisible(t)).map((t) => ({ id: t.id, title: t.title, done: !!t.done, type: "task" as const })),
  ];

  const taskRow = (t: M.Task, inPin = false) => {
    const [label, tone] = status(t);
    return (
      <div
        key={t.id}
        className="cl-task"
        draggable
        data-done={t.done ? "1" : undefined}
        data-dragging={dragTask === t.id ? "1" : undefined}
        data-before={inPin && pinOver === t.id ? "1" : undefined}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", t.title);
          e.dataTransfer.effectAllowed = "copyMove";
          setDragTask(t.id);
        }}
        onDragEnd={() => {
          setDragTask(null);
          setDropHint(null);
          setPinOver(null);
        }}
        onDragOver={inPin ? (e) => { if (!dragTask) return; e.preventDefault(); e.stopPropagation(); setPinOver(t.id); } : undefined}
        onDrop={inPin ? (e) => { e.preventDefault(); e.stopPropagation(); pinDrop(t.id); } : undefined}
      >
        <button className="cl-tick" data-on={t.done ? "1" : undefined} onClick={() => toggleTask(t.id)} aria-label={t.done ? "Mark not done" : "Mark done"}>
          <Ico d="check" size={10} sw={3} />
        </button>
        <button
          className="cl-task-text"
          onClick={() => {
            const blk = t.block ? events.find((e) => e.id === t.block) : undefined;
            if (blk) {
              if (shown === "month") setView("week");
              setAnchorKey(blk.date);
              setFlash(blk.id);
              scrollTo(blk.start);
            } else go(M.parse(t.due));
          }}
          title={t.block ? "Show the time block" : "Show the day it is due"}
        >
          <b>{t.title} <span>· {M.shortDay(M.parse(t.due))}</span></b>
          <small data-tone={tone}>{label}{t.priority === "High" && !t.done ? <em> · High</em> : null}</small>
        </button>
        {inPin && (
          <button className="cl-unpin" onClick={() => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, pinned: undefined } : x)))} aria-label="Unpin">
            <Ico d="x" size={11} sw={2.2} />
          </button>
        )}
      </div>
    );
  };

  /* ---------- grid pieces ---------- */
  const evBody = (e: M.Ev, h: number) =>
    h < 34 ? (
      <div className="cl-ev-line">
        <b>{e.title}</b>
        <small>{M.hm(e.start)}</small>
      </div>
    ) : (
      <>
        <div className="cl-ev-title">
          <b>{e.title}</b>
          {e.series && <Ico d="repeat" size={11} sw={2} />}
        </div>
        <small>{M.hm(e.start)} to {M.hm(e.end)}</small>
        {h >= 74 && (e.meet ? (
          <small className="cl-ev-meta"><Ico d="video" size={12} /> Meet</small>
        ) : e.agent ? (
          <small className="cl-ev-meta"><Ico d="sparkle" size={11} /> {e.agent}</small>
        ) : e.place ? (
          <small className="cl-ev-meta"><Ico d="pin" size={11} /> {e.place}</small>
        ) : null)}
      </>
    );

  const visibleEvents = events.filter(visible);
  const popEv = pop ? events.find((e) => e.id === pop.id) : undefined;
  const isFiltered = !show.meeting || !show.call || !show.routine || !show.focus || !show.weekends;

  return (
    <div className="cl-root">
      {/* ---------------- side panel ---------------- */}
      <aside className="ws-card cl-side">
        <MiniMonth
          month={mini}
          today={today}
          from={shown === "month" ? anchor : from}
          to={shown === "month" ? anchor : to}
          onMonth={(d) => setMini((m) => new Date(m.getFullYear(), m.getMonth() + d, 1))}
          onPick={(d) => go(d)}
        />
        <div className="cl-up">
          <div className="cl-up-head">
            <h3>Up next</h3>
            <span>{openCount} open</span>
          </div>
          <div className="cl-label">Pinned</div>
          <div
            className="cl-pins"
            data-over={dragTask && pinOver === "__zone" ? "1" : undefined}
            onDragOver={(e) => {
              if (!dragTask) return;
              e.preventDefault();
              if (pinOver !== "__zone" && !pinned.some((p) => p.id === pinOver)) setPinOver("__zone");
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setPinOver(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              pinDrop();
            }}
          >
            {pinned.length ? pinned.map((t) => taskRow(t, true)) : <p>Drag tasks here to keep them on top, in your order.</p>}
          </div>
          <div className="cl-label">By {sortBy === "leverage" ? "leverage" : "due date"}</div>
          <div className="cl-tasks">
            {listed.map((t) => taskRow(t))}
            {!listed.length && <p className="cl-none">{q ? "No task matches that search." : "Nothing open. Good week."}</p>}
          </div>
        </div>
      </aside>

      {/* ---------------- calendar ---------------- */}
      <section className="ws-card cl-main">
        <div className="cl-bar">
          <button className="cl-btn" onClick={() => go(today)}>Today</button>
          <button className="cl-round" onClick={() => step(-1)} aria-label="Previous"><Ico d="chevronLeft" size={16} sw={2} /></button>
          <button className="cl-round" onClick={() => step(1)} aria-label="Next"><Ico d="chevronRight" size={16} sw={2} /></button>
          <h2 className="cl-range">{M.rangeLabel(shown, anchor)}</h2>
          <div className="cl-grow" />
          <button className="cl-btn" onClick={newEvent}><Ico d="plus" size={15} sw={2} /> New</button>
          <button className="cl-btn cl-btn-solid" onClick={planMyDay}><Ico d="sparkle" size={15} /> Plan my day</button>
          <div className="ws-seg cl-views" role="group" aria-label="View">
            {(["day", "week", "month"] as M.View[]).map((vw) => (
              <button key={vw} aria-pressed={shown === vw} onClick={() => setView(vw)}>{vw[0].toUpperCase() + vw.slice(1)}</button>
            ))}
          </div>
        </div>

        <div className="cl-filters">
          <label className="ws-input cl-search">
            <Ico d="search" size={15} />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks" aria-label="Search tasks and events" />
            {query && <button className="cl-clear" onClick={() => setQuery("")} aria-label="Clear search"><Ico d="x" size={11} sw={2.4} /></button>}
          </label>
          <button className="cl-chip" onClick={() => setSortBy(sortBy === "leverage" ? "due" : "leverage")} title="Change the task order">
            <Ico d="sort" size={14} /> {sortBy === "leverage" ? "Leverage" : "Due date"}
          </button>
          <button className="cl-chip" aria-pressed={openOnly} onClick={() => setOpenOnly(!openOnly)} title="Hide what is done">Open</button>
          <button className="cl-chip" aria-pressed={prioOnly} onClick={() => setPrioOnly(!prioOnly)} title="High priority only">
            <Ico d="flag" size={14} /> Priority
          </button>
          <button className="cl-chip" aria-expanded={menu?.type === "who"} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ type: "who", x: r.left, y: r.bottom + 6 }); }}>
            <Ico d="user" size={14} /> {who === "mine" ? "Mine" : "Everyone"} <Ico d="chevronDown" size={13} sw={2} />
          </button>
          <button className="cl-chip" aria-pressed={isFiltered} aria-expanded={menu?.type === "show"} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ type: "show", x: r.left, y: r.bottom + 6 }); }}>
            <Ico d="eye" size={14} /> Show <Ico d="chevronDown" size={13} sw={2} />
          </button>
        </div>

        {shown === "month" ? (
          <MonthView
            anchor={anchor}
            today={today}
            events={visibleEvents.filter((e) => !dim(e.title))}
            onDay={(d) => { setAnchorKey(M.ymd(d)); setView("day"); }}
            onEvent={(e, r) => openPop(e.id, r)}
          />
        ) : (
          <div className="cl-grid" style={{ ["--days" as string]: gridDays.length } as CSSProperties}>
            <div className="cl-row cl-head">
              <div className="cl-gutter" />
              {gridDays.map((d) => {
                const k = M.ymd(d);
                return (
                  <button
                    key={k}
                    className="cl-dayhead"
                    data-today={k === todayKey ? "1" : undefined}
                    data-weekend={M.dow(d) > 4 ? "1" : undefined}
                    onClick={() => { setAnchorKey(k); setView(shown === "day" ? "week" : "day"); }}
                    title={shown === "day" ? "Back to the week" : "Open this day"}
                  >
                    <span>{M.DOW[M.dow(d)]}</span>
                    <b>{d.getDate()}</b>
                  </button>
                );
              })}
            </div>

            <div className="cl-row cl-allday">
              <div className="cl-gutter cl-allday-label">all day</div>
              {gridDays.map((d) => {
                const k = M.ymd(d);
                const chips = allDayFor(k);
                const open = moreDay === k;
                const shownChips = open ? chips : chips.slice(0, 3);
                return (
                  <div key={k} className="cl-adcell" data-weekend={M.dow(d) > 4 ? "1" : undefined}>
                    {shownChips.map((c) => (
                      <div
                        key={c.id}
                        className="cl-adchip"
                        data-state={c.done ? "done" : k < todayKey ? "late" : k === todayKey ? "today" : "later"}
                        title={c.title}
                      >
                        <button className="cl-tick cl-tick-sm" data-on={c.done ? "1" : undefined} onClick={() => (c.type === "task" ? toggleTask(c.id) : toggleCheck(c.id))} aria-label={c.done ? "Mark not done" : "Mark done"}>
                          <Ico d="check" size={9} sw={3} />
                        </button>
                        <span>{c.title}</span>
                      </div>
                    ))}
                    {chips.length > 3 && (
                      <button className="cl-admore" onClick={() => setMoreDay(open ? null : k)}>
                        {open ? "Show less" : "+" + (chips.length - 3) + " more"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="cl-scroll" ref={scrollRef}>
              <div className="cl-body" style={{ height: 24 * M.HOUR }}>
                <div className="cl-times" aria-hidden="true">
                  {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
                    <span key={h} style={{ top: h * M.HOUR }}>{M.hm(h * 60)}</span>
                  ))}
                </div>
                {gridDays.map((d, ci) => {
                  const k = M.ymd(d);
                  const dayEvs = visibleEvents.filter((e) => e.date === k);
                  const lay = M.layoutDay(dayEvs);
                  return (
                    <div
                      key={k}
                      className="cl-col"
                      data-today={k === todayKey ? "1" : undefined}
                      data-weekend={M.dow(d) > 4 ? "1" : undefined}
                      data-drop={dropHint?.date === k ? "1" : undefined}
                      onPointerDown={(e) => colDown(e, k)}
                      onPointerMove={colMove}
                      onPointerUp={colUp}
                      onDragOver={(e) => taskOver(e, k)}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropHint((h) => (h?.date === k ? null : h));
                      }}
                      onDrop={taskDrop}
                    >
                      {dayEvs.map((e) => {
                        const L = lay[e.id] || { col: 0, cols: 1 };
                        const h = Math.max((e.end - e.start) * M.PX, 20);
                        const moving = drag?.id === e.id && drag.moved;
                        return (
                          <div
                            key={e.id}
                            data-ev={e.id}
                            className="cl-ev"
                            data-kind={e.kind}
                            data-dim={dim(e.title) ? "1" : undefined}
                            data-past={past(e) ? "1" : undefined}
                            data-flash={flash === e.id ? "1" : undefined}
                            data-moving={moving ? "1" : undefined}
                            data-open={pop?.id === e.id ? "1" : undefined}
                            style={{ top: e.start * M.PX, height: h, left: "calc(" + (L.col / L.cols) * 100 + "% + 2px)", width: "calc(" + 100 / L.cols + "% - 4px)" }}
                            onPointerDown={(ev) => evDown(ev, e, "move", ci)}
                            onPointerMove={evMove}
                            onPointerUp={(ev) => evUp(ev, e)}
                            onPointerCancel={() => { dragRef.current = null; setDrag(null); }}
                          >
                            {evBody(e, h)}
                            <span className="cl-resize" onPointerDown={(ev) => evDown(ev, e, "resize", ci)} aria-hidden="true" />
                          </div>
                        );
                      })}

                      {drag?.moved && drag.date === k && (() => {
                        const e = events.find((x) => x.id === drag.id);
                        if (!e) return null;
                        const h = Math.max((drag.end - drag.start) * M.PX, 20);
                        return (
                          <div className="cl-ev cl-ghost" data-kind={e.kind} style={{ top: drag.start * M.PX, height: h, left: 2, right: 2 }}>
                            <div className="cl-ev-title"><b>{e.title}</b></div>
                            <small>{M.hm(drag.start)} to {M.hm(drag.end)}</small>
                          </div>
                        );
                      })()}

                      {draft && draft.date === k && (
                        <div className="cl-ev cl-ghost cl-draft" data-kind="meeting" style={{ top: draft.a * M.PX, height: Math.max((draft.b - draft.a) * M.PX, 20), left: 2, right: 2 }}>
                          <div className="cl-ev-line"><b>New event</b><small>{M.hm(draft.a)} to {M.hm(draft.b)}</small></div>
                        </div>
                      )}

                      {dropHint && dropHint.date === k && (
                        <div className="cl-ev cl-ghost cl-drophint" data-kind="focus" style={{ top: dropHint.start * M.PX, height: dropHint.mins * M.PX, left: 2, right: 2 }}>
                          <div className="cl-ev-line"><b>{tasks.find((t) => t.id === dragTask)?.title}</b><small>{M.hm(dropHint.start)}</small></div>
                        </div>
                      )}

                      {k === todayKey && (
                        <div className="cl-now" style={{ top: now * M.PX }} aria-label={"Now, " + M.hm(now)}>
                          <i />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ---------------- floating ---------------- */}
      {(menu || pop) && <div className="cl-catch" onPointerDown={() => { setMenu(null); setPop(null); }} />}

      {menu && (
        <div className="ws-menu cl-menu" style={{ left: Math.min(menu.x, window.innerWidth - 240), top: menu.y }} role="menu">
          {menu.type === "who" ? (
            <>
              <div className="ws-menu-label">Whose calendar</div>
              {(["mine", "everyone"] as const).map((w) => (
                <button key={w} data-hot={who === w ? "1" : undefined} onClick={() => { setWho(w); setMenu(null); }}>
                  <Ico d={w === "mine" ? "user" : "users"} size={15} />
                  {w === "mine" ? "Mine" : "Everyone at Donaghy FM"}
                  {who === w && <Ico d="check" size={13} sw={2.4} style={{ marginLeft: "auto" }} />}
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="ws-menu-label">Show on the calendar</div>
              {KINDS.map((k) => (
                <button key={k} onClick={() => setShow({ ...show, [k]: !show[k] })}>
                  <span className="cl-swatch" data-kind={k} data-on={show[k] ? "1" : undefined} />
                  {M.KIND_LABEL[k] + "s"}
                  {show[k] && <Ico d="check" size={13} sw={2.4} style={{ marginLeft: "auto" }} />}
                </button>
              ))}
              <hr />
              <button onClick={() => setShow({ ...show, weekends: !show.weekends })}>
                <Ico d="calendar" size={15} /> Weekends
                {show.weekends && <Ico d="check" size={13} sw={2.4} style={{ marginLeft: "auto" }} />}
              </button>
            </>
          )}
        </div>
      )}

      {pop && popEv && (
        <div className="cl-pop" style={{ left: pop.x, top: pop.y }} role="dialog" aria-label={popEv.title}>
          <div className="cl-pop-head">
            <span className="cl-kindtag" data-kind={popEv.kind}><Ico d={KIND_ICON[popEv.kind]} size={12} /> {M.KIND_LABEL[popEv.kind]}</span>
            <button className="ws-btn ws-btn-ghost ws-btn-sm ws-icon-btn" onClick={() => setPop(null)} aria-label="Close"><Ico d="x" size={14} /></button>
          </div>
          <input
            className="cl-pop-title"
            value={popEv.title}
            autoFocus={pop.fresh}
            onFocus={(e) => pop.fresh && e.currentTarget.select()}
            onChange={(e) => patchEv(popEv.id, { title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && setPop(null)}
            aria-label="Title"
          />
          <div className="cl-pop-row"><Ico d="clock" size={14} /> {M.longDay(M.parse(popEv.date))} · {M.hm(popEv.start)} to {M.hm(popEv.end)}</div>
          {popEv.series && <div className="cl-pop-row"><Ico d="repeat" size={14} /> {M.repeatLabel(M.seriesDays(popEv.series) || [])}</div>}
          {popEv.place && <div className="cl-pop-row"><Ico d="pin" size={14} /> {popEv.place}</div>}
          {popEv.meet && <div className="cl-pop-row"><Ico d="video" size={14} /> Google Meet</div>}
          {popEv.agent && <div className="cl-pop-row"><Ico d="sparkle" size={14} /> Run by {popEv.agent}</div>}
          {popEv.task && <div className="cl-pop-row"><Ico d="checkbox" size={14} /> Time blocked for a task in Up next</div>}
          {popEv.note && <p className="cl-pop-note">{popEv.note}</p>}
          {popEv.who && popEv.who.length > 0 && (
            <div className="cl-pop-people">
              {popEv.who.map((p) => (
                <span key={p}><Avatar who={p} size={22} /> {p === "me" ? "You" : M.PEOPLE[p]?.name.split(" ")[0]}</span>
              ))}
            </div>
          )}
          {popEv.kind !== "routine" && (
            <div className="ws-seg cl-pop-kinds" role="group" aria-label="Type">
              {(["meeting", "call", "focus"] as M.Kind[]).map((k) => (
                <button key={k} aria-pressed={popEv.kind === k} onClick={() => patchEv(popEv.id, { kind: k, meet: k === "call" ? true : popEv.meet })}>
                  {M.KIND_LABEL[k]}
                </button>
              ))}
            </div>
          )}
          <div className="cl-pop-actions">
            {popEv.meet && (
              <button className="ws-btn ws-btn-sm ws-btn-accent" onClick={() => { setPop(null); say("Opening Meet for “" + popEv.title + "”"); }}>
                <Ico d="video" size={14} /> Join Meet
              </button>
            )}
            {popEv.kind === "routine" && (
              <button
                className="ws-btn ws-btn-sm ws-btn-accent"
                onClick={() => {
                  const ev = popEv;
                  setPop(null);
                  say((ev.agent || "The agent") + " is running “" + ev.title + "”");
                  window.setTimeout(() => say(ev.title + " finished. Posted to Home."), 2600);
                }}
              >
                <Ico d="sparkle" size={14} /> Run now
              </button>
            )}
            {popEv.task && (() => {
              const t = tasks.find((x) => x.id === popEv.task);
              return t ? (
                <button className="ws-btn ws-btn-sm" onClick={() => toggleTask(t.id)}>
                  <Ico d="check" size={13} sw={2.2} /> {t.done ? "Reopen task" : "Mark task done"}
                </button>
              ) : null;
            })()}
            <div className="cl-grow" />
            <button className="ws-btn ws-btn-sm ws-btn-ghost ws-icon-btn ws-btn-danger" onClick={() => removeEv(popEv.id)} aria-label="Delete" title="Delete">
              <Ico d="bin" size={14} />
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="ws-toast" key={toast.key} role="status">
          <span>{toast.text}</span>
          {toast.undo && <button onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>}
        </div>
      )}
    </div>
  );
}
