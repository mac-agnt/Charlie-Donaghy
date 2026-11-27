import { Ico } from "../Ico";
import * as M from "./model";

/* The small month in the side panel. The visible range is drawn as a band. */
export function MiniMonth({
  month, today, from, to, onMonth, onPick,
}: {
  month: Date;
  today: Date;
  from: Date;
  to: Date;
  onMonth: (delta: number) => void;
  onPick: (d: Date) => void;
}) {
  const days = M.monthGrid(month);
  const t = M.ymd(today);
  return (
    <div className="cl-mini">
      <div className="cl-mini-head">
        <b>{M.MONTH[month.getMonth()]} {month.getFullYear()}</b>
        <button className="cl-round" onClick={() => onMonth(-1)} aria-label="Previous month"><Ico d="chevronLeft" size={14} sw={2} /></button>
        <button className="cl-round" onClick={() => onMonth(1)} aria-label="Next month"><Ico d="chevronRight" size={14} sw={2} /></button>
      </div>
      <div className="cl-mini-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="cl-mini-dow">{d}</span>
        ))}
        {days.map((d) => {
          const k = M.ymd(d);
          return (
            <button
              key={k}
              className="cl-mini-day"
              data-out={d.getMonth() !== month.getMonth() ? "1" : undefined}
              data-range={d >= from && d <= to ? "1" : undefined}
              data-today={k === t ? "1" : undefined}
              onClick={() => onPick(d)}
              aria-label={M.longDay(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Month view: six weeks, three events a day, then a count. */
export function MonthView({
  anchor, today, events, onDay, onEvent,
}: {
  anchor: Date;
  today: Date;
  events: M.Ev[];
  onDay: (d: Date) => void;
  onEvent: (e: M.Ev, r: DOMRect) => void;
}) {
  const days = M.monthGrid(anchor);
  const t = M.ymd(today);
  const byDay: Record<string, M.Ev[]> = {};
  events.forEach((e) => (byDay[e.date] = byDay[e.date] || []).push(e));
  Object.values(byDay).forEach((l) => l.sort((a, b) => a.start - b.start));
  return (
    <div className="cl-month">
      <div className="cl-month-head">
        {M.DOW.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="cl-month-grid">
        {days.map((d) => {
          const k = M.ymd(d);
          const list = byDay[k] || [];
          return (
            <div
              key={k}
              className="cl-mcell"
              role="button"
              tabIndex={0}
              data-out={d.getMonth() !== anchor.getMonth() ? "1" : undefined}
              data-today={k === t ? "1" : undefined}
              data-weekend={M.dow(d) > 4 ? "1" : undefined}
              onClick={() => onDay(d)}
              onKeyDown={(e) => e.key === "Enter" && onDay(d)}
            >
              <span className="cl-mnum">{d.getDate()}</span>
              {list.slice(0, 3).map((e) => (
                <button
                  key={e.id}
                  className="cl-mev"
                  data-kind={e.kind}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onEvent(e, ev.currentTarget.getBoundingClientRect());
                  }}
                >
                  <i />
                  <span className="cl-mtime">{M.hm(e.start)}</span>
                  <span className="cl-mtitle">{e.title}</span>
                </button>
              ))}
              {list.length > 3 && <span className="cl-mmore">+{list.length - 3} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
