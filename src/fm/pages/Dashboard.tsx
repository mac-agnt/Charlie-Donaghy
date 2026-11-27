/* Operational command centre. Every figure is computed from the shared
   records and every card opens the records behind it. */
import { useFM, metrics, alerts, engineerDay, jobTotals, openDrawer, go, draftInvoiceForJob, euro, sel, quoteNet, setFilter } from "../store";
import { TODAY, diffDays, fmtDate, fmtDay, monthShort } from "../dates";
import { canSeeMoney, DIVISIONS } from "../config";
import { PIPELINE } from "../types";
import { defaultKpis } from "../kpis";
import { Page, Card, Stat, Btn, Ico, Avatar, Avatars, Pill, Empty, Table, DivTag, Bar } from "../ui";

export default function FMDashboard() {
  const s = useFM();
  const m = metrics(s);
  const al = alerts(s);
  const money = canSeeMoney(s.role);
  const bookingsAhead = s.installBookings
    .filter((b) => b.to >= TODAY && (s.division === "ALL" || sel.job(s, b.jobId)?.division === s.division))
    .reduce((acc, b) => {
      const k = b.jobId;
      if (!acc[k]) acc[k] = { jobId: k, from: b.from, to: b.to, eng: new Set<string>() };
      acc[k].from = b.from < acc[k].from ? b.from : acc[k].from;
      acc[k].to = b.to > acc[k].to ? b.to : acc[k].to;
      b.engineerIds.forEach((e) => acc[k].eng.add(e));
      return acc;
    }, {} as Record<string, { jobId: string; from: string; to: string; eng: Set<string> }>);
  const installs = Object.values(bookingsAhead).sort((a, b) => (a.from < b.from ? -1 : 1));
  const maxMonth = Math.max(1, ...m.months.map((x) => x.value));
  const maxDiv = Math.max(1, ...m.revenueByDivision.map((x) => x.value));
  const quotes = s.quotes.filter((q) => s.division === "ALL" || q.division === s.division);
  const stageVal = PIPELINE.filter((p) => p !== "New Enquiry").map((p) => ({ p, n: quotes.filter((q) => q.stage === p).length, v: quotes.filter((q) => q.stage === p).reduce((a, q) => a + quoteNet(q), 0) }));
  const decPlanned = s.serviceVisits.filter((v) => v.period === "2026-12").length;
  const band = defaultKpis(s.role);
  type Tile = { key: string; icon: string; label: string; value: string | number; sub: string; tone?: "ok" | "warn" | "bad"; onClick: () => void };
  const tiles: Tile[] = [
    { key: "unallocated", icon: "jobs", label: "New jobs awaiting allocation", value: m.unallocated.length, sub: m.newJobs.length + " new in total", tone: m.unallocated.length ? "warn" : undefined, onClick: () => go("Jobs", "board") },
    { key: "progress", icon: "clock", label: "Jobs in progress", value: m.inProgress.length, sub: m.inProgress.filter((j) => j.returnRequired).length + " waiting on a return visit", onClick: () => go("Jobs", "board") },
    { key: "unbilled", icon: "flag", label: "Completed, awaiting invoice", value: m.completed.length, sub: money ? euro(m.unbilledValue) + " unbilled" : "Ready for invoicing", tone: m.completed.length ? "warn" : undefined, onClick: () => (money ? go("Finance", "ready") : go("Jobs", "completed")) },
    { key: "service", icon: "calendar", label: "Upcoming service visits", value: m.upcoming.length + m.decDue.filter((d) => !d.existing).length, sub: m.unallocatedService.length + " need allocation" + (decPlanned ? "" : ", December not planned"), onClick: () => go("Servicing", "due") },
    ...(money ? [
      { key: "outstanding", icon: "finance", label: "Outstanding invoices", value: euro(m.outstandingValue), sub: m.outstanding.length + " invoices issued, not paid", onClick: () => { setFilter("finance.status", "outstanding"); go("Finance", "invoices"); } },
      { key: "overdue", icon: "alert", label: "Overdue payments", value: euro(m.overdueValue), sub: m.overdue.length + " invoices past due", tone: (m.overdue.length ? "bad" : "ok") as "bad" | "ok", onClick: () => { setFilter("finance.status", "overdue"); go("Finance", "invoices"); } },
      { key: "quotes", icon: "quote", label: "Outstanding quote value", value: euro(m.openQuoteValue), sub: m.openQuotes.length + " quotes sent or awaiting decision", onClick: () => go("Quotes", "pipeline") },
    ] : []),
    { key: "available", icon: "engineer", label: "Engineers available today", value: m.available.length + " / " + s.engineers.length, sub: m.available.map((x) => x.e.name.split(" ")[0]).join(", ") || "Everyone is booked", onClick: () => go("Schedule", "availability") },
  ];

  return (
    <Page eyebrow={"Friday " + fmtDay(TODAY)} title="Where everything stands" sub="Every number is calculated from the job, invoice, quote and schedule records, and every card opens the records behind it.">
      <div className="fm-grid fm-g4">
        {tiles.filter((t) => !band.includes(t.key)).map((t) => <Stat key={t.key} icon={t.icon} label={t.label} value={t.value} sub={t.sub} tone={t.tone} onClick={t.onClick} />)}
      </div>

      <div className="fm-grid fm-g-main">
        <Card title="Requires attention" sub={al.length + " items, most urgent first"} action={<Pill tone={al.some((a) => a.tone === "bad") ? "bad" : al.length ? "warn" : "ok"} dot>{al.length ? al.length + " open" : "All clear"}</Pill>} flush>
          {al.length === 0 && <Empty title="Nothing needs you" hint="Every job, invoice and booking is on track." />}
          {al.map((a) => (
            <button key={a.id} className={"fm-alert " + a.tone} onClick={() => (a.drawer ? openDrawer(a.drawer) : a.page && go(a.page, a.tab))}>
              <span className="ic"><Ico d={a.tone === "bad" ? "alert" : a.tone === "warn" ? "flag" : "bolt"} size={14} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="t" style={{ display: "block" }}>{a.title}</span>
                <span className="d" style={{ display: "block" }}>{a.detail}</span>
              </span>
              <Ico d="arrow" size={13} style={{ color: "var(--faint)", marginTop: 7 }} />
            </button>
          ))}
        </Card>
        <Card title="Live job activity" sub="Every update from the field and the agents" flush>
          {s.log.slice(0, 9).map((e) => (
            <button key={e.id} className="fm-alert info" style={{ padding: "9px 16px" }} onClick={() => e.ref && openDrawer({ kind: "job", id: e.ref })}>
              <span style={{ width: 7, height: 7, borderRadius: 2, marginTop: 6, flex: "none", background: e.kind === "finance" ? "var(--ok)" : e.kind === "agent" ? "var(--warn)" : "var(--accent)" }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="t" style={{ display: "block", fontWeight: 400 }}>{e.text}</span>
                <span className="d" style={{ display: "block" }}>{e.who} · {e.at.slice(5, 10) === TODAY.slice(5) ? "Today " + e.at.slice(11) : fmtDate(e.at.slice(0, 10)) + " " + e.at.slice(11)}</span>
              </span>
            </button>
          ))}
        </Card>
      </div>

      <div className="fm-grid fm-g-main">
        <Card title="Today's schedule" sub={fmtDate(TODAY, true)} action={<Btn size="sm" kind="ghost" onClick={() => go("Schedule", "company")}>Calendar</Btn>} flush>
          <Table
            cols={[
              { h: "Engineer", w: "1.1fr", r: (x: (typeof m.engToday)[number]) => <span className="fm-row"><Avatar e={x.e} size={22} /><span className="main">{x.e.name}</span></span> },
              { h: "Booked", w: "2fr", r: (x) => x.day.items.length ? x.day.items.map((i) => (i.ref ? i.ref + " " : "") + i.label.split(":")[0]).join(" · ") : <span className="fm-faint">Nothing booked</span> },
              { h: "Hours", w: ".5fr", num: true, r: (x) => x.day.hours + " h" },
              { h: "Status", w: ".8fr", r: (x) => (x.day.onLeave ? <Pill>On leave</Pill> : x.day.hours > 8 ? <Pill tone="bad">Overbooked</Pill> : x.day.free >= 3 ? <Pill tone="ok">{x.day.free} h free</Pill> : <Pill tone="warn">Busy</Pill>) },
            ]}
            rows={m.engToday}
            onRow={(x) => openDrawer({ kind: "engineer", id: x.e.id })}
          />
        </Card>
        <Card title="Upcoming installations" sub="Multi-day bookings" action={<Btn size="sm" kind="ghost" onClick={() => go("Schedule", "installs")}>Planner</Btn>} flush>
          {installs.length === 0 && <Empty title="No installations booked" />}
          {installs.map((b) => {
            const j = sel.job(s, b.jobId)!;
            return (
              <button key={b.jobId} className="fm-alert info" style={{ padding: "10px 16px" }} onClick={() => openDrawer({ kind: "job", id: j.id })}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="t" style={{ display: "block" }}>{j.number} · {sel.site(s, j.siteId)?.name}</span>
                  <span className="d" style={{ display: "block" }}>{fmtDate(b.from)} → {fmtDate(b.to)} · {j.description.split(".")[0]}</span>
                </span>
                <Avatars ids={Array.from(b.eng)} size={22} />
              </button>
            );
          })}
        </Card>
      </div>

      {(money || s.role === "ops") && (
        <Card title="Completed but unbilled work" sub={money ? euro(m.unbilledValue) + " net across " + m.completed.length + " jobs. Labour and materials already consolidated." : m.completed.length + " jobs waiting for invoicing"} flush>
          <Table
            cols={[
              { h: "Job", w: ".7fr", cls: "mono", r: (j: (typeof m.completed)[number]) => j.number },
              { h: "Site", w: "1.6fr", r: (j) => <span className="main">{sel.site(s, j.siteId)?.name}</span> },
              { h: "Division", w: "1fr", r: (j) => <DivTag id={j.division} /> },
              { h: "Completed", w: "1fr", r: (j) => { const d = diffDays(TODAY, j.completedAt!); return <span style={{ color: d >= 7 ? "var(--bad)" : d >= 3 ? "var(--warn)" : undefined }}>{d} days ago</span>; } },
              { h: "Labour", w: ".6fr", num: true, r: (j) => jobTotals(s, j).billableHours + " h" },
              ...(money ? [{ h: "Value", w: ".8fr", num: true, r: (j: (typeof m.completed)[number]) => euro(jobTotals(s, j).value) }] : []),
              { h: "", w: "1fr", r: (j) => (money ? <Btn size="sm" onClick={(e) => { e.stopPropagation(); const inv = draftInvoiceForJob(j.id); openDrawer({ kind: "invoice", id: inv.id }); }}>{j.invoiceId ? "Review invoice" : "Prepare invoice"}</Btn> : null) },
            ]}
            rows={m.completed}
            onRow={(j) => openDrawer({ kind: "job", id: j.id })}
            empty={<Empty title="Nothing unbilled" hint="Every completed job has an invoice." />}
            minWidth={720}
          />
        </Card>
      )}

      {money && (
        <div className="fm-grid fm-g3">
          <Card title="Monthly revenue" sub="Invoiced, net of VAT" action={<Btn size="sm" kind="ghost" onClick={() => go("Finance", "overview")}>Finance</Btn>}>
            <div className="fm-cols">
              {m.months.map((x, i) => (
                <div key={x.period} title={euro(x.value)}>
                  <span className="fm-mono" style={{ fontSize: 10, color: "var(--faint)" }}>{x.value ? "€" + Math.round(x.value / 100) / 10 + "k" : "€0"}</span>
                  <div className={"c" + (i === m.months.length - 1 ? " on" : "")} style={{ height: Math.max(4, (x.value / maxMonth) * 86) }} />
                  <span className="l">{monthShort(x.period)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Revenue by division" sub="November, invoiced">
            <div className="fm-col-flex" style={{ gap: 14 }}>
              {m.revenueByDivision.map((d) => (
                <div key={d.id}>
                  <div className="fm-row" style={{ fontSize: 12.5, marginBottom: 6 }}><DivTag id={d.id as any} /><span className="fm-spacer" /><span className="fm-ink fm-mono">{euro(d.value)}</span></div>
                  <Bar value={d.value} max={maxDiv} color={d.color} />
                </div>
              ))}
              <div className="fm-faint" style={{ fontSize: 11.5 }}>{DIVISIONS.map((d) => d.prefix).join(", ")} invoice series kept separate.</div>
            </div>
          </Card>
          <Card title="Quote conversion" sub={m.won + " won, " + m.lost + " lost this year"} action={<Btn size="sm" kind="ghost" onClick={() => go("Quotes", "pipeline")}>Pipeline</Btn>}>
            <div className="fm-row" style={{ alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px" }}>{m.conversion}%</span><span className="fm-muted" style={{ fontSize: 12.5 }}>of decided quotes won</span></div>
            <div className="fm-col-flex" style={{ gap: 8, marginTop: 12 }}>
              {stageVal.map((x) => (
                <div key={x.p} className="fm-row" style={{ fontSize: 12 }}>
                  <span style={{ width: 120 }} className="fm-muted">{x.p}</span>
                  <span style={{ flex: 1 }}><Bar value={x.v} max={Math.max(...stageVal.map((y) => y.v), 1)} color={x.p === "Lost" ? "var(--bad)" : x.p === "Accepted" ? "var(--ok)" : undefined} /></span>
                  <span className="fm-mono fm-ink" style={{ width: 70, textAlign: "right" }}>{euro(x.v)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <Card title="Service contract performance" sub={m.contracts.length + " active contracts" + (money ? ", " + euro(m.contractValue) + " a year" : "")} action={<Btn size="sm" kind="ghost" onClick={() => go("Servicing", "overview")}>Servicing</Btn>}>
        <div className="fm-grid fm-g4">
          <Stat label="Visits completed in November" value={m.svDone.filter((v) => v.period === "2026-11").length} sub={m.svOnTimePct + "% in the month they were due"} onClick={() => go("Servicing", "reports")} />
          <Stat label="December visits due" value={m.decDue.length} sub={decPlanned ? decPlanned + " planned" : "Plan not generated yet"} tone={decPlanned ? "ok" : "warn"} onClick={() => go("Servicing", "planner")} />
          <Stat label="Carried over, unallocated" value={m.unallocatedService.length} sub="Need an engineer" tone={m.unallocatedService.length ? "warn" : "ok"} onClick={() => go("Servicing", "due")} />
          <Stat label="Renewals due" value={m.contracts.filter((c) => c.status === "renewal due").length} sub="Before 31 January" onClick={() => go("Servicing", "contracts")} />
        </div>
      </Card>
    </Page>
  );
}
