/* Quotes & Products: pipeline, quote builder, proposal documents and the
   product catalogue. Proposal text comes only from selected catalogue items,
   the scope entered and approved templates. */
import { useState } from "react";
import { COMPANY, DIVISIONS, divisionById, type DivisionId } from "../config";
import { TODAY, fmtDate, fmtDay } from "../dates";
import {
  useFM, getState, sel, go, setFilter, openDrawer, closeDrawer, openModal, closeModal, toast, mutate, newId, nowStamp,
  createQuote, updateQuote, addQuoteLine, setQuoteStage, generateProposal, convertQuoteToJob, quoteFromEnquiry, quoteNet, quoteGross, euro, euro2,
} from "../store";
import { PIPELINE, type FMState, type PipelineStage, type Product, type ProductCategory, type Quote, type QuoteLine } from "../types";
import { DrawerHead } from "../FMLayer";
import { Page, Card, Stat, Table, Btn, Pill, StagePill, JobStatusPill, Money, Modal, Field, RecLink, Seg, Ico, DivTag, Empty } from "../ui";
import "./commercial/commercial.css";

const kindFor = (c: ProductCategory): QuoteLine["kind"] =>
  c === "Labour" ? "Labour" : c === "Installation" ? "Installation" : c === "Material" ? "Material" : c === "Maintenance plan" ? "Maintenance" : "Equipment";
const visibleQ = (s: FMState, q: Quote) => s.division === "ALL" || s.division === q.division;
const lineTotal = (l: QuoteLine) => l.qty * l.unitPrice;

/* ── Templates ──────────────────────────────────────────────────────────── */
const TEMPLATES = [
  { id: "short", name: "Short quotation", format: "short" as const, use: "Repairs, small additions and callouts", terms: "30 days from invoice", days: 1,
    sections: ["Customer and site", "Description of works", "Itemised price", "Total including VAT", "Validity and acceptance"] },
  { id: "install", name: "Detailed installation proposal", format: "detailed" as const, use: "New systems and upgrades over a few days", terms: "30% on acceptance, 60% on completion, 10% on handover", days: 5,
    sections: ["Executive summary", "Customer requirements", "Proposed solution", "Equipment specification", "Scope of installation", "Work methodology", "Project timeline", "Testing and handover", "Investment breakdown", "Terms and acceptance"] },
  { id: "maint", name: "Maintenance contract proposal", format: "detailed" as const, use: "PPM contracts for fire, security and grounds", terms: "Billed monthly in advance, 30 day terms", days: 1,
    sections: ["Executive summary", "Assets covered", "Service frequency per asset", "What each visit includes", "Reactive callout terms", "Annual investment", "Terms and acceptance"] },
  { id: "remedial", name: "Remedial works quotation", format: "short" as const, use: "Defects found on a service visit", terms: "30 days from invoice", days: 1,
    sections: ["Defect found and where", "Recommended remedy", "Itemised price", "Total including VAT", "Validity and acceptance"] },
];

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function QuotesPage({ tab }: { tab: string }) {
  if (tab === "pipeline") return <PipelineTab />;
  if (tab === "builder") return <BuilderTab />;
  if (tab === "products") return <ProductsTab />;
  if (tab === "templates") return <TemplatesTab />;
  return <QuotesTab />;
}

function QuotesTab() {
  const s = useFM();
  const [stage, setStage] = useState<"All" | PipelineStage>("All");
  const all = s.quotes.filter((q) => visibleQ(s, q));
  const rows = all.filter((q) => stage === "All" || q.stage === stage).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const open = all.filter((q) => q.stage === "Quote Sent" || q.stage === "Awaiting Decision");
  const won = all.filter((q) => q.stage === "Accepted");
  const lost = all.filter((q) => q.stage === "Lost");
  const enq = s.enquiries.filter((e) => e.status === "new" && (s.division === "ALL" || e.division === s.division));
  return (
    <Page eyebrow="Commercial" title="Quotes" sub="Every quote from first enquiry to accepted job. Open one to see its lines, history and proposal."
      actions={<Btn kind="primary" icon="plus" onClick={() => go("Quotes", "builder", { "quotes.builder": "new" })}>New quote</Btn>}>
      <div className="fm-grid fm-g4">
        <Stat label="Awaiting the customer" value={<Money v={open.reduce((a, q) => a + quoteNet(q), 0)} />} sub={open.length + " quotes sent or awaiting a decision"} icon="quote" onClick={() => setStage("Awaiting Decision")} />
        <Stat label="Conversion" value={won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) + "%" : "None yet"} sub={won.length + " won, " + lost.length + " lost"} icon="check" tone="ok" onClick={() => setStage("Accepted")} />
        <Stat label="Accepted value" value={<Money v={won.reduce((a, q) => a + quoteNet(q), 0)} />} sub={won.filter((q) => q.jobId).length + " already converted to jobs"} icon="jobs" onClick={() => setStage("Accepted")} />
        <Stat label="New enquiries" value={enq.length} sub="From the website and phone" icon="website" tone={enq.length ? "warn" : undefined} onClick={() => go("Quotes", "pipeline")} />
      </div>
      <Card flush title="All quotes" sub={rows.length + " shown"} action={
        <div className="fm-chips">
          {(["All", ...PIPELINE.filter((p) => p !== "New Enquiry")] as ("All" | PipelineStage)[]).map((p) => (
            <button key={p} className={"fm-chip" + (stage === p ? " on" : "")} onClick={() => setStage(p)}>{p}</button>
          ))}
        </div>}>
        <Table
          minWidth={920}
          rows={rows}
          onRow={(q) => openDrawer({ kind: "quote", id: q.id })}
          cols={[
            { h: "Quote", w: ".7fr", cls: "mono", r: (q) => q.number },
            { h: "Title", w: "2.2fr", cls: "main", r: (q) => q.title },
            { h: "Customer", w: "1.6fr", r: (q) => sel.customer(s, q.customerId)?.name },
            { h: "Division", w: "1fr", r: (q) => <DivTag id={q.division} /> },
            { h: "Stage", w: "1.2fr", r: (q) => <StagePill s={q.stage} /> },
            { h: "Valid to", w: ".9fr", r: (q) => (q.stage === "Accepted" || q.stage === "Lost" ? <span className="fm-faint">Closed</span> : <span style={{ color: q.validUntil < TODAY ? "var(--bad)" : undefined }}>{fmtDate(q.validUntil)}</span>) },
            { h: "Net value", w: "1fr", num: true, r: (q) => (q.lines.length ? <Money v={quoteNet(q)} /> : <span className="fm-faint">Not priced</span>) },
          ]}
          empty={<Empty title="No quotes at this stage" hint="Pick another stage or switch division." />}
        />
      </Card>
    </Page>
  );
}

/* ── Pipeline ───────────────────────────────────────────────────────────── */
function PipelineTab() {
  const s = useFM();
  const [over, setOver] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const quotes = s.quotes.filter((q) => visibleQ(s, q));
  const enquiries = s.enquiries.filter((e) => e.status === "new" && (s.division === "ALL" || e.division === s.division));
  const drop = (stage: PipelineStage) => {
    setOver(null);
    const id = drag;
    setDrag(null);
    if (!id) return;
    const q = sel.quote(s, id);
    if (!q || q.stage === stage) return;
    if (stage === "New Enquiry") return toast("Enquiries come in from the website or phone. Quotes can't move back to New Enquiry.", "warn");
    if (stage === "Lost") return openModal({ kind: "quote-lost", quoteId: id });
    if (stage === "Accepted" && !q.lines.length) return toast("Price the quote before marking it accepted.", "warn");
    setQuoteStage(id, stage);
    toast(q.number + " moved to " + stage);
  };
  return (
    <Page eyebrow="Commercial" title="Sales pipeline" sub="Drag a quote to move it on. Website enquiries land in New Enquiry automatically. Accepted quotes become installation jobs without re-typing.">
      <div className="cm-pipe">
        {PIPELINE.map((stage) => {
          const list = quotes.filter((q) => q.stage === stage);
          const total = list.reduce((a, q) => a + quoteNet(q), 0);
          return (
            <div key={stage} className={"fm-col" + (over === stage ? " over" : "")}
              onDragOver={(e) => { e.preventDefault(); if (over !== stage) setOver(stage); }}
              onDragLeave={() => setOver((o) => (o === stage ? null : o))}
              onDrop={(e) => { e.preventDefault(); drop(stage); }}>
              <div className="fm-col-h"><b>{stage}</b><span>{list.length + (stage === "New Enquiry" ? enquiries.length : 0)}</span></div>
              {stage !== "New Enquiry" && <div className="cm-col-tot"><Money v={total} /></div>}
              {stage === "New Enquiry" && enquiries.map((e) => (
                <button key={e.id} className="fm-jc cm-enq" onClick={() => openDrawer({ kind: "enquiry", id: e.id })} style={{ cursor: "pointer" }}>
                  <span className="n"><Ico d="website" size={11} /> {e.source} · {e.receivedAt.slice(5, 10).split("-").reverse().join("/")} {e.receivedAt.slice(11)}</span>
                  <span className="t">{e.company || e.name}</span>
                  <span className="s">{e.service} · {e.location}</span>
                  <span className="f"><DivTag id={e.division} /><Pill tone="accent">New</Pill></span>
                </button>
              ))}
              {list.map((q) => (
                <button key={q.id} className={"fm-jc" + (drag === q.id ? " dragging" : "")} draggable
                  onDragStart={(e) => { setDrag(q.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", q.id); }}
                  onDragEnd={() => { setDrag(null); setOver(null); }}
                  onClick={() => openDrawer({ kind: "quote", id: q.id })}>
                  <span className="n">{q.number}<span className="fm-spacer" />{q.format === "detailed" ? "Proposal" : "Quotation"}</span>
                  <span className="t">{q.title}</span>
                  <span className="s">{sel.customer(s, q.customerId)?.name}</span>
                  <span className="f"><DivTag id={q.division} /><b className="fm-ink" style={{ fontSize: 12.5 }}>{q.lines.length ? <Money v={quoteNet(q)} /> : "Not priced"}</b></span>
                  {q.lostReason && <span className="s" style={{ fontStyle: "italic" }}>{q.lostReason}</span>}
                  {q.jobId && <span className="s">Job {sel.job(s, q.jobId)?.number}</span>}
                </button>
              ))}
              {!list.length && (stage !== "New Enquiry" || !enquiries.length) && <div className="fm-faint" style={{ fontSize: 12, padding: "14px 6px", textAlign: "center" }}>Nothing here</div>}
            </div>
          );
        })}
      </div>
    </Page>
  );
}

/* ── Quote builder ──────────────────────────────────────────────────────── */
function BuilderTab() {
  const s = useFM();
  const f = s.ui.filters;
  const id = f["quotes.builder"] && f["quotes.builder"] !== "new" ? f["quotes.builder"] : "";
  const q = id ? sel.quote(s, id) : undefined;
  const choices = s.quotes.filter((x) => visibleQ(s, x)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return (
    <Page eyebrow="Commercial" title="Quote builder" sub="Pick products and labour from the approved catalogue. Charlie AI writes the proposal from what you select, nothing invented."
      actions={
        <>
          <select className="fm-select" style={{ width: 250 }} aria-label="Quote" value={id || "new"} onChange={(e) => setFilter("quotes.builder", e.target.value)}>
            <option value="new">Start a new quote</option>
            {choices.map((x) => <option key={x.id} value={x.id}>{x.number} · {x.title}</option>)}
          </select>
        </>
      }>
      {q ? <Builder key={q.id} q={q} /> : <NewQuoteForm key={(f.quoteBuilderCustomer || "") + (f.quoteBuilderTemplate || "")} />}
    </Page>
  );
}

function NewQuoteForm() {
  const s = useFM();
  const f = s.ui.filters;
  const tpl = TEMPLATES.find((t) => t.id === f.quoteBuilderTemplate);
  const custs = s.customers.filter((c) => s.division === "ALL" || c.divisions.includes(s.division as DivisionId));
  const [customerId, setCustomer] = useState(f.quoteBuilderCustomer || "");
  const sites = s.sites.filter((x) => x.customerId === customerId);
  const [siteId, setSite] = useState(f.quoteBuilderSite || "");
  const [division, setDivision] = useState<DivisionId>((f.quoteBuilderDivision as DivisionId) || (s.division !== "ALL" ? s.division : "SS"));
  const [title, setTitle] = useState("");
  const [req, setReq] = useState("");
  const [format, setFormat] = useState<"short" | "detailed">(tpl?.format || "detailed");
  const site = siteId && sites.some((x) => x.id === siteId) ? siteId : sites[0]?.id || "";
  const create = () => {
    if (!customerId || !site) return toast("Choose a customer and site first.", "warn");
    if (!title.trim()) return toast("Give the quote a title.", "warn");
    const q = createQuote({ customerId, siteId: site, division, title: title.trim(), requirements: req.trim(), format });
    if (tpl) updateQuote(q.id, { paymentTerms: tpl.terms, estDays: tpl.days }, "Started from the " + tpl.name.toLowerCase() + " template");
    setFilter("quotes.builder", q.id);
    setFilter("quoteBuilderTemplate", "");
    toast(q.number + " created. Add products and labour next.");
  };
  return (
    <div className="cm-builder">
      <Card title="Who is it for" sub={tpl ? "Using the " + tpl.name.toLowerCase() + " template" : "Customer, site and trading division"}>
        <div className="fm-grid fm-g2">
          <Field label="Customer">
            <select className="fm-select" value={customerId} onChange={(e) => { setCustomer(e.target.value); setSite(""); const c = sel.customer(s, e.target.value); if (c && !c.divisions.includes(division)) setDivision(c.divisions[0]); }}>
              <option value="">Choose a customer</option>
              {custs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Site">
            <select className="fm-select" value={site} onChange={(e) => setSite(e.target.value)} disabled={!customerId}>
              {!customerId && <option value="">Choose a customer first</option>}
              {sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Trading division" hint="Sets the branding and the products on offer">
            <select className="fm-select" value={division} onChange={(e) => setDivision(e.target.value as DivisionId)}>
              {DIVISIONS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Format">
            <Seg value={format} options={[["short", "Short quotation"], ["detailed", "Detailed proposal"]]} onChange={setFormat} />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Title"><input className="fm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: CCTV installation, front car park" /></Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Customer requirements" hint="Written into the proposal as the customer's requirements"><textarea className="fm-textarea" value={req} onChange={(e) => setReq(e.target.value)} placeholder="What the customer asked for and anything found on survey" /></Field>
        </div>
        <div className="fm-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <Btn kind="primary" icon="plus" onClick={create}>Create quote</Btn>
        </div>
      </Card>
      <Card title="Templates" sub="Approved structures for each kind of quote">
        <div className="fm-col-flex">
          {TEMPLATES.map((t) => (
            <button key={t.id} className={"cm-prod" + (tpl?.id === t.id ? " on" : "")} onClick={() => { setFilter("quoteBuilderTemplate", t.id); setFormat(t.format); }}>
              <Ico d="quote" size={14} />
              <span style={{ flex: 1 }}><b>{t.name}</b>{t.use}</span>
              {tpl?.id === t.id && <Pill tone="accent">Selected</Pill>}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

const CATS: ProductCategory[] = ["Equipment", "Labour", "Installation", "Material", "Maintenance plan"];

function Builder({ q }: { q: Quote }) {
  const s = useFM();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<"All" | ProductCategory>("All");
  const [showDoc, setShowDoc] = useState(!!q.proposal || q.format === "short");
  const c = sel.customer(s, q.customerId);
  const site = sel.site(s, q.siteId);
  const prods = s.products.filter((p) => p.division === q.division && (cat === "All" || p.category === cat) && (!search || (p.name + " " + p.sku + " " + p.description).toLowerCase().includes(search.toLowerCase())));
  const closed = q.stage === "Accepted" || q.stage === "Lost";
  const setLine = (lid: string, patch: Partial<QuoteLine>) => updateQuote(q.id, { lines: q.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) });
  const add = (p: Product) => {
    const existing = q.lines.find((l) => l.productId === p.id);
    if (existing) setLine(existing.id, { qty: existing.qty + 1 });
    else addQuoteLine(q.id, { productId: p.id, description: p.name, qty: p.category === "Labour" ? 8 : 1, unitPrice: p.price, kind: kindFor(p.category) });
  };
  const sub = q.lines.reduce((a, l) => a + lineTotal(l), 0);
  const net = quoteNet(q), gross = quoteGross(q);
  const steps: [string, boolean, boolean][] = [
    ["Lines priced", q.lines.length > 0, !q.lines.length],
    [q.format === "detailed" ? "Proposal written" : "Quotation ready", q.format === "short" ? q.lines.length > 0 : !!q.proposal, q.lines.length > 0 && q.format === "detailed" && !q.proposal],
    ["Sent", !!q.sentAt || ["Quote Sent", "Awaiting Decision", "Accepted"].includes(q.stage), !q.sentAt && (q.format === "short" ? q.lines.length > 0 : !!q.proposal)],
    ["Accepted", q.stage === "Accepted", !!q.sentAt && q.stage !== "Accepted"],
    ["Job created", !!q.jobId, q.stage === "Accepted" && !q.jobId],
  ];
  const gen = () => {
    if (!q.lines.length) return toast("Add at least one product or labour line first.", "warn");
    generateProposal(q.id);
    setShowDoc(true);
    toast("Proposal written from " + q.lines.length + " catalogue lines and your scope");
  };
  return (
    <>
      <Card>
        <div className="fm-row" style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="fm-row" style={{ gap: 8 }}><span className="fm-mono fm-faint">{q.number}</span><StagePill s={q.stage} /><DivTag id={q.division} long /></div>
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 6, letterSpacing: "-.3px" }}>{q.title}</div>
            <div className="fm-muted" style={{ fontSize: 12.5, marginTop: 3 }}>
              {c && <RecLink to={{ kind: "customer", id: c.id }}>{c.name}</RecLink>} · {site?.name}
            </div>
          </div>
          <div className="cm-flow">
            {steps.map(([l, done, now]) => <span key={l} className={"st" + (done ? " done" : now ? " now" : "")}>{done && <Ico d="check" size={11} stroke={2.6} />}{l}</span>)}
          </div>
        </div>
      </Card>

      <div className="cm-builder">
        <div className="fm-col-flex" style={{ gap: 14 }}>
          <Card title="Lines" sub={q.lines.length + " lines from the " + divisionById(q.division).name + " catalogue"} flush>
            <div className="cm-lines">
              <Table
                minWidth={620}
                rows={q.lines}
                cols={[
                  { h: "Item", w: "2.4fr", r: (l) => <span><span className="fm-ink">{l.description}</span><span className="fm-faint" style={{ display: "block", fontSize: 11 }}>{l.kind}</span></span> },
                  { h: "Qty", w: ".8fr", r: (l) => <input className="fm-input cm-qty" type="number" min={0} step={l.kind === "Labour" ? 0.5 : 1} value={l.qty} disabled={closed} onChange={(e) => setLine(l.id, { qty: Math.max(0, Number(e.target.value)) })} /> },
                  { h: "Unit", w: "1fr", r: (l) => <input className="fm-input cm-price" type="number" min={0} step={1} value={l.unitPrice} disabled={closed} onChange={(e) => setLine(l.id, { unitPrice: Math.max(0, Number(e.target.value)) })} /> },
                  { h: "Total", w: "1fr", num: true, r: (l) => euro2(lineTotal(l)) },
                  { h: "", w: ".4fr", r: (l) => !closed && <button className="fm-x" style={{ width: 26, height: 26 }} title="Remove line" onClick={() => updateQuote(q.id, { lines: q.lines.filter((x) => x.id !== l.id) })}><Ico d="x" size={11} stroke={2.2} /></button> },
                ]}
                empty={<Empty title="No lines yet" hint="Pick products and labour from the catalogue on the right." />}
              />
            </div>
          </Card>

          <Card title="Terms">
            <div className="fm-grid fm-g2">
              <Field label="Discount %"><input className="fm-input" type="number" min={0} max={50} value={q.discountPct} disabled={closed} onChange={(e) => updateQuote(q.id, { discountPct: Math.min(50, Math.max(0, Number(e.target.value))) })} /></Field>
              <Field label="Estimated days on site"><input className="fm-input" type="number" min={0} value={q.estDays} disabled={closed} onChange={(e) => updateQuote(q.id, { estDays: Math.max(0, Number(e.target.value)) })} /></Field>
              <Field label="Payment terms">
                <select className="fm-select" value={q.paymentTerms} disabled={closed} onChange={(e) => updateQuote(q.id, { paymentTerms: e.target.value })}>
                  {Array.from(new Set([q.paymentTerms, "30 days from invoice", "30% on acceptance, 60% on completion, 10% on handover", "50% on acceptance, 50% on completion", "Billed monthly in advance, 30 day terms"])).map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Valid until"><input className="fm-input" type="date" value={q.validUntil} disabled={closed} onChange={(e) => updateQuote(q.id, { validUntil: e.target.value })} /></Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Customer requirements"><textarea className="fm-textarea" value={q.requirements} disabled={closed} onChange={(e) => updateQuote(q.id, { requirements: e.target.value })} /></Field>
            </div>
            <div className="fm-row" style={{ marginTop: 14, flexWrap: "wrap" }}>
              <span className="fm-muted" style={{ fontSize: 12.5 }}>Format</span>
              <Seg value={q.format} options={[["short", "Short quotation"], ["detailed", "Detailed proposal"]]} onChange={(v) => updateQuote(q.id, { format: v })} />
            </div>
          </Card>
        </div>

        <div className="fm-col-flex" style={{ gap: 14 }}>
          <Card title="Total" sub={"VAT at " + Math.round(s.vatRate * 1000) / 10 + "%"}>
            <div className="cm-totals">
              <div><span className="fm-muted">Subtotal</span><span>{euro2(sub)}</span></div>
              {q.discountPct > 0 && <div><span className="fm-muted">Discount {q.discountPct}%</span><span>-{euro2(sub - net)}</span></div>}
              <div><span className="fm-muted">Net</span><span>{euro2(net)}</span></div>
              <div><span className="fm-muted">VAT</span><span>{euro2(gross - net)}</span></div>
              <div className="big"><span>Total</span><span>{euro2(gross)}</span></div>
            </div>
            <div className="fm-col-flex" style={{ marginTop: 14, gap: 8 }}>
              {q.format === "detailed" && (
                <Btn kind={q.proposal ? undefined : "primary"} icon="spark" onClick={gen} disabled={closed}>{q.proposal ? "Rewrite proposal from current lines" : "Generate detailed proposal"}</Btn>
              )}
              <Btn icon="note" kind="ghost" onClick={() => setShowDoc(!showDoc)}>{showDoc ? "Hide document" : "Preview document"}</Btn>
              {(q.stage === "Quote Preparation" || q.stage === "Assessment") && (
                <Btn kind={q.format === "short" || q.proposal ? "primary" : undefined} icon="mail" onClick={() => markSent(q)} disabled={!q.lines.length}>Mark as sent to customer</Btn>
              )}
              {(q.stage === "Quote Sent" || q.stage === "Awaiting Decision") && (
                <div className="fm-row">
                  <Btn kind="primary" icon="check" onClick={() => { setQuoteStage(q.id, "Accepted"); toast(q.number + " accepted. Ready to convert into a job"); }} style={{ flex: 1 }}>Mark accepted</Btn>
                  <Btn kind="danger" onClick={() => openModal({ kind: "quote-lost", quoteId: q.id })}>Lost</Btn>
                </div>
              )}
              {q.stage === "Accepted" && !q.jobId && <Btn kind="primary" icon="jobs" onClick={() => convertQuoteToJob(q.id)}>Convert to installation job</Btn>}
              {q.jobId && (
                <div className="fm-note ok">
                  Converted to <RecLink to={{ kind: "job", id: q.jobId }}>{sel.job(s, q.jobId)?.number}</RecLink>. {sel.job(s, q.jobId)?.scheduled ? "Booked from " + fmtDate(sel.job(s, q.jobId)?.scheduled) + "." : "No dates yet."}
                  <div style={{ marginTop: 8 }}><Btn size="sm" icon="calendar" onClick={() => go("Schedule", "installs", { installQuote: q.id })}>Find dates in the installation planner</Btn></div>
                </div>
              )}
            </div>
          </Card>

          {!closed && (
            <Card title="Catalogue" sub={divisionById(q.division).name + " · click to add"}>
              <input className="fm-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products and services" />
              <div className="fm-chips" style={{ margin: "10px 0" }}>
                {(["All", ...CATS] as ("All" | ProductCategory)[]).map((k) => <button key={k} className={"fm-chip" + (cat === k ? " on" : "")} onClick={() => setCat(k)}>{k}</button>)}
              </div>
              <div className="cm-cat">
                {prods.map((p) => (
                  <button key={p.id} className="cm-prod" onClick={() => add(p)}>
                    <span style={{ flex: 1, minWidth: 0 }}><b>{p.name}</b><span className="fm-faint">{p.sku} · {p.category} · per {p.unit}</span></span>
                    <span className="fm-ink">{euro(p.price)}</span>
                    <Ico d="plus" size={13} />
                  </button>
                ))}
                {!prods.length && <div className="fm-faint" style={{ fontSize: 12.5 }}>Nothing matches.</div>}
              </div>
            </Card>
          )}
        </div>
      </div>

      {showDoc && (
        <div className="cm-docwrap">
          <div className="fm-row fm-print-hide" style={{ maxWidth: 760, margin: "0 auto 14px" }}>
            <span className="fm-muted" style={{ fontSize: 12.5 }}>{q.format === "detailed" ? (q.proposal ? "Detailed proposal, " + q.proposal.length + " sections" : "Generate the proposal to fill in the sections") : "One-page quotation"}</span>
            <span className="fm-spacer" />
            <Btn size="sm" icon="print" onClick={() => window.print()}>Print or save as PDF</Btn>
          </div>
          <QuoteDocument q={q} />
        </div>
      )}
    </>
  );
}

function markSent(q: Quote) {
  const s = getState();
  const contact = sel.primaryContact(s, q.customerId);
  setQuoteStage(q.id, "Quote Sent");
  mutate((st) => ({
    comms: [{ id: newId("cm"), kind: "Quote", customerId: q.customerId, quoteId: q.id, to: contact?.email || "", subject: q.number + ": " + q.title, body: "Please find our " + (q.format === "detailed" ? "proposal" : "quotation") + " attached.", at: nowStamp(), status: "sent (simulated)" }, ...st.comms],
    documents: [{ id: newId("d"), name: q.number + " " + (q.format === "detailed" ? "proposal" : "quotation") + ".pdf", kind: "Quote PDF", customerId: q.customerId, siteId: q.siteId, date: TODAY }, ...st.documents],
  }), q.number + " sent to " + (contact?.email || "customer") + " (simulated)", "quote");
  toast(q.number + " emailed to " + (contact?.email || "the customer") + " (simulated)");
}

/* ── The printable document ─────────────────────────────────────────────── */
export function QuoteDocument({ q }: { q: Quote }) {
  const s = useFM();
  const c = sel.customer(s, q.customerId);
  const site = sel.site(s, q.siteId);
  const contact = c ? sel.primaryContact(s, c.id) : undefined;
  const d = divisionById(q.division);
  const net = quoteNet(q), gross = quoteGross(q), sub = q.lines.reduce((a, l) => a + lineTotal(l), 0);
  const detailed = q.format === "detailed";
  const Investment = () => (
    <>
      <table>
        <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Unit</th><th className="r">Amount</th></tr></thead>
        <tbody>
          {q.lines.map((l) => <tr key={l.id}><td>{l.description}</td><td className="r">{l.qty}</td><td className="r">{euro2(l.unitPrice)}</td><td className="r">{euro2(lineTotal(l))}</td></tr>)}
        </tbody>
      </table>
      <div className="tot">
        <table>
          <tbody>
            <tr><td>Subtotal</td><td className="r">{euro2(sub)}</td></tr>
            {q.discountPct > 0 && <tr><td>Discount {q.discountPct}%</td><td className="r">-{euro2(sub - net)}</td></tr>}
            <tr><td>Net</td><td className="r">{euro2(net)}</td></tr>
            <tr><td>VAT {Math.round(s.vatRate * 1000) / 10}%</td><td className="r">{euro2(gross - net)}</td></tr>
            <tr><td><b>Total</b></td><td className="r"><b>{euro2(gross)}</b></td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
  return (
    <div className="fm-doc cm-print">
      <div className="brand">
        <div className="mark" style={{ background: d.color }}>{d.prefix}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
          <div className="muted" style={{ fontSize: 11 }}>A {COMPANY.umbrellaName} company · {COMPANY.address} · {COMPANY.phone} · {COMPANY.email}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 600 }}>{detailed ? "Proposal" : "Quotation"} {q.number}</div>
          <div className="muted" style={{ fontSize: 11 }}>{fmtDay(q.sentAt || q.createdAt)}</div>
        </div>
      </div>
      <h1 style={{ marginTop: 26 }}>{q.title}</h1>
      <div className="muted" style={{ marginTop: 4 }}>Prepared for {contact ? contact.name + ", " : ""}{c?.name}, {site?.name}, {site?.town}</div>
      <div className="hero-total">
        <div>
          <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" }}>Total investment including VAT</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{euro2(net)} net plus VAT · valid until {fmtDay(q.validUntil)}</div>
        </div>
        <b>{euro2(gross)}</b>
      </div>
      {detailed && q.proposal ? (
        q.proposal.map((sec, i) => (
          <div key={sec.id}>
            <h2><span className="sec-n">{i + 1}.</span>{sec.title}</h2>
            {sec.id === "investment" ? <Investment /> : <pre>{sec.body}</pre>}
          </div>
        ))
      ) : detailed ? (
        <div className="muted" style={{ marginTop: 22 }}>The ten proposal sections appear here once the proposal is generated from the selected lines.<Investment /></div>
      ) : (
        <>
          <h2>Description of works</h2>
          <pre>{q.requirements || q.title}</pre>
          <h2>Price</h2>
          <Investment />
          <h2>Terms</h2>
          <pre>{"Payment terms: " + q.paymentTerms + ". Estimated " + q.estDays + " day" + (q.estDays === 1 ? "" : "s") + " on site. Prices exclude any item not listed above."}</pre>
        </>
      )}
      <div className="sig">
        <div>Accepted for {c?.name}: signature, name and date</div>
        <div>For {d.name}: {COMPANY.owner}</div>
      </div>
      <div className="foot">
        <span>{d.name}, trading under {COMPANY.umbrellaName}</span>
        <span>{q.number} · page 1</span>
      </div>
    </div>
  );
}

/* ── Products ───────────────────────────────────────────────────────────── */
function ProductsTab() {
  const s = useFM();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"All" | ProductCategory>("All");
  const divs = DIVISIONS.filter((d) => s.division === "ALL" || s.division === d.id);
  const match = (p: Product) => (cat === "All" || p.category === cat) && (!q || (p.name + " " + p.sku + " " + p.description).toLowerCase().includes(q.toLowerCase()));
  return (
    <Page eyebrow="Commercial" title="Products and services" sub={s.products.length + " approved items with list prices. Quotes and proposals only use items from this list."}
      actions={<Btn kind="primary" icon="plus" onClick={() => openModal({ kind: "add-product" })}>Add product</Btn>}>
      <Card>
        <div className="fm-row" style={{ flexWrap: "wrap", gap: 12 }}>
          <input className="fm-input" style={{ width: 280 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU or description" />
          <div className="fm-chips">
            {(["All", ...CATS] as ("All" | ProductCategory)[]).map((k) => <button key={k} className={"fm-chip" + (cat === k ? " on" : "")} onClick={() => setCat(k)}>{k}</button>)}
          </div>
        </div>
      </Card>
      {divs.map((d) => {
        const list = s.products.filter((p) => p.division === d.id && match(p));
        return (
          <Card key={d.id} title={<span className="fm-row" style={{ gap: 8 }}><DivTag id={d.id} long /></span>} sub={list.length + " items"} flush>
            <Table
              minWidth={780}
              rows={list}
              cols={[
                { h: "SKU", w: ".9fr", cls: "mono", r: (p) => p.sku },
                { h: "Name", w: "2fr", cls: "main", r: (p) => p.name },
                { h: "Category", w: "1.1fr", r: (p) => <Pill>{p.category}</Pill> },
                { h: "Description", w: "2.4fr", r: (p) => <span className="fm-muted">{p.description}</span> },
                { h: "Price", w: "1fr", num: true, r: (p) => euro(p.price) + " / " + p.unit },
              ]}
              empty={<Empty title="Nothing matches" hint="Clear the search or pick another category." />}
            />
          </Card>
        );
      })}
    </Page>
  );
}

/* ── Templates ──────────────────────────────────────────────────────────── */
function TemplatesTab() {
  return (
    <Page eyebrow="Commercial" title="Quote templates" sub="Approved structures. Charlie AI fills them from the products you pick and the scope you write. It never adds specifications, certifications or guarantees of its own." noDivision>
      <div className="fm-grid fm-g2">
        {TEMPLATES.map((t) => (
          <Card key={t.id} title={t.name} sub={t.use} action={<Pill tone={t.format === "detailed" ? "accent" : ""}>{t.format === "detailed" ? "Multi-page" : "One page"}</Pill>}>
            <div className="cm-tpl">
              <ol>{t.sections.map((x) => <li key={x}>{x}</li>)}</ol>
              <div className="fm-faint">Default terms: {t.terms}</div>
              <div className="fm-row" style={{ justifyContent: "flex-end", marginTop: 6 }}>
                <Btn icon="arrow" onClick={() => go("Quotes", "builder", { "quotes.builder": "new", quoteBuilderTemplate: t.id })}>Use template</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

/* ── Drawers ────────────────────────────────────────────────────────────── */
export function QuoteDrawer({ id }: { id: string }) {
  const s = useFM();
  const q = sel.quote(s, id);
  const [doc, setDoc] = useState(false);
  if (!q) return <Empty title="Quote not found" />;
  const c = sel.customer(s, q.customerId);
  const site = sel.site(s, q.siteId);
  const job = q.jobId ? sel.job(s, q.jobId) : undefined;
  const enquiry = q.enquiryId ? s.enquiries.find((e) => e.id === q.enquiryId) : undefined;
  const openBuilder = () => go("Quotes", "builder", { "quotes.builder": q.id });
  return (
    <>
      <DrawerHead eyebrow={"Quote " + q.number} title={q.title} pills={<><StagePill s={q.stage} /><DivTag id={q.division} /></>} sub={<>{c && <RecLink to={{ kind: "customer", id: c.id }}>{c.name}</RecLink>} · {site && <RecLink to={{ kind: "site", id: site.id }}>{site.name}</RecLink>}</>} />
      <div className="fm-drawer-b">
        <div className="fm-kv">
          <div><div className="k">Net</div><div className="v"><Money v={quoteNet(q)} dp={2} /></div></div>
          <div><div className="k">Total inc VAT</div><div className="v"><Money v={quoteGross(q)} dp={2} /></div></div>
          <div><div className="k">Created</div><div className="v">{fmtDay(q.createdAt)}</div></div>
          <div><div className="k">Sent</div><div className="v">{q.sentAt ? fmtDay(q.sentAt) : "Not yet"}</div></div>
          <div><div className="k">Valid until</div><div className="v">{fmtDay(q.validUntil)}</div></div>
          <div><div className="k">Days on site</div><div className="v">{q.estDays}</div></div>
        </div>
        {q.requirements && <div className="fm-note">{q.requirements}</div>}
        {q.lostReason && <div className="fm-note bad">Lost: {q.lostReason}</div>}
        {enquiry && <div className="fm-note accent">Started from a {enquiry.source.toLowerCase()} enquiry by {enquiry.name} on {fmtDay(enquiry.receivedAt.slice(0, 10))}.</div>}
        {job && (
          <div className="fm-note ok fm-row">
            <span style={{ flex: 1 }}>Converted to <RecLink to={{ kind: "job", id: job.id }}>{job.number}</RecLink>{job.scheduled ? ", booked " + fmtDate(job.scheduled) + (job.scheduledEnd ? " to " + fmtDate(job.scheduledEnd) : "") : ", dates not set"}.</span>
            <JobStatusPill s={job.status} />
          </div>
        )}

        <div className="fm-sec">Stage</div>
        <div className="fm-chips">
          {PIPELINE.filter((p) => p !== "New Enquiry").map((p) => (
            <button key={p} className={"fm-chip" + (q.stage === p ? " on" : "")} onClick={() => {
              if (p === q.stage) return;
              if (p === "Lost") return openModal({ kind: "quote-lost", quoteId: q.id });
              if (p === "Accepted" && !q.lines.length) return toast("Price the quote before marking it accepted.", "warn");
              setQuoteStage(q.id, p);
              toast(q.number + " moved to " + p);
            }}>{p}</button>
          ))}
        </div>

        <div className="fm-sec">Lines · {q.lines.length}</div>
        <Table
          rows={q.lines}
          cols={[
            { h: "Item", w: "2.4fr", cls: "main", r: (l) => l.description },
            { h: "Qty", w: ".6fr", num: true, r: (l) => l.qty },
            { h: "Unit", w: "1fr", num: true, r: (l) => <Money v={l.unitPrice} dp={2} /> },
            { h: "Total", w: "1fr", num: true, r: (l) => <Money v={lineTotal(l)} dp={2} /> },
          ]}
          empty={<Empty title="Not priced yet" hint="Open it in the builder to add products and labour." action={<Btn size="sm" onClick={openBuilder}>Open in builder</Btn>} />}
        />

        <div className="fm-sec">History</div>
        <div className="fm-timeline">
          {q.history.slice().reverse().map((h, i) => (
            <div className="fm-tl" key={i}><i /><div><div className="t">{h.text}</div><div className="m">{h.who} · {h.at}</div></div></div>
          ))}
        </div>

        {doc && <div className="cm-docwrap"><QuoteDocument q={q} /></div>}
      </div>
      <div className="fm-drawer-f">
        <Btn icon="quote" onClick={openBuilder}>Open in builder</Btn>
        <Btn kind="ghost" icon="note" onClick={() => setDoc(!doc)}>{doc ? "Hide document" : "Preview document"}</Btn>
        <span className="fm-spacer" />
        {q.stage === "Accepted" && !q.jobId && <Btn kind="primary" icon="jobs" onClick={() => convertQuoteToJob(q.id)}>Convert to job</Btn>}
        {job && <Btn kind="primary" icon="calendar" onClick={() => go("Schedule", "installs", { installQuote: q.id })}>Plan dates</Btn>}
        {(q.stage === "Quote Sent" || q.stage === "Awaiting Decision") && <Btn kind="primary" icon="check" onClick={() => { setQuoteStage(q.id, "Accepted"); toast(q.number + " accepted"); }}>Mark accepted</Btn>}
      </div>
    </>
  );
}

export function EnquiryDrawer({ id }: { id: string }) {
  const s = useFM();
  const e = s.enquiries.find((x) => x.id === id);
  if (!e) return <Empty title="Enquiry not found" />;
  const matched = e.customerId ? sel.customer(s, e.customerId) : undefined;
  const quote = e.quoteId ? sel.quote(s, e.quoteId) : undefined;
  const prepare = () => {
    const q = quoteFromEnquiry(e.id);
    closeDrawer();
    go("Quotes", "builder", { "quotes.builder": q.id });
    toast(q.number + " started with starter lines from the catalogue. Adjust and send.");
  };
  const closeEnq = () => {
    mutate((st) => ({ enquiries: st.enquiries.map((x) => (x.id === e.id ? { ...x, status: "closed" } : x)) }), "Enquiry from " + (e.company || e.name) + " closed", "web");
    closeDrawer();
    toast("Enquiry closed", "info");
  };
  const contacted = () => {
    mutate((st) => ({ enquiries: st.enquiries.map((x) => (x.id === e.id ? { ...x, status: "contacted" } : x)) }), "Contacted " + (e.company || e.name) + " about their enquiry", "web");
    toast("Marked as contacted. It stays in the pipeline until quoted or closed.", "info");
  };
  return (
    <>
      <DrawerHead eyebrow={e.source + " enquiry"} title={e.company || e.name} pills={<><Pill tone={e.status === "new" ? "accent" : e.status === "quoted" ? "ok" : ""}>{e.status}</Pill><DivTag id={e.division} /></>} sub={"Received " + fmtDay(e.receivedAt.slice(0, 10)) + " at " + e.receivedAt.slice(11)} />
      <div className="fm-drawer-b">
        <div className="fm-kv">
          <div><div className="k">Name</div><div className="v">{e.name}</div></div>
          <div><div className="k">Company</div><div className="v">{e.company || "Not given"}</div></div>
          <div><div className="k">Email</div><div className="v fm-mono" style={{ fontSize: 12 }}>{e.email}</div></div>
          <div><div className="k">Telephone</div><div className="v fm-mono" style={{ fontSize: 12 }}>{e.phone}</div></div>
          <div><div className="k">Service</div><div className="v">{e.service}</div></div>
          <div><div className="k">Site location</div><div className="v">{e.location}</div></div>
        </div>
        <div className="fm-sec">Requirements</div>
        <div className="fm-note">{e.description}</div>
        <div className="fm-sec">Job Intake Agent</div>
        <div className="fm-note accent">
          Routed to {divisionById(e.division).name} from the service requested. {matched ? <>Matched an existing customer: <RecLink to={{ kind: "customer", id: matched.id }}>{matched.name}</RecLink>.</> : "No existing customer or open job matches, so this is a new customer."}
        </div>
        {quote && <div className="fm-note ok">Quote started: <RecLink to={{ kind: "quote", id: quote.id }}>{quote.number}</RecLink> ({quote.stage}).</div>}
      </div>
      <div className="fm-drawer-f">
        {e.status === "new" && <Btn kind="ghost" onClick={contacted}>Mark contacted</Btn>}
        {e.status !== "closed" && !quote && <Btn kind="ghost" onClick={closeEnq}>Close enquiry</Btn>}
        <span className="fm-spacer" />
        {quote ? <Btn kind="primary" icon="quote" onClick={() => go("Quotes", "builder", { "quotes.builder": quote.id })}>Open quote</Btn> : <Btn kind="primary" icon="quote" onClick={prepare}>Prepare quote</Btn>}
      </div>
    </>
  );
}

/* ── Modals ─────────────────────────────────────────────────────────────── */
export function QuoteModals() {
  const s = useFM();
  const m = s.ui.modal;
  return (
    <>
      {m?.kind === "quote-lost" && <LostModal quoteId={m.quoteId} />}
      {m?.kind === "add-product" && <AddProductModal />}
    </>
  );
}

function LostModal({ quoteId }: { quoteId: string }) {
  const s = useFM();
  const q = sel.quote(s, quoteId);
  const [reason, setReason] = useState("Went with another supplier on price");
  if (!q) return null;
  const save = () => {
    setQuoteStage(q.id, "Lost");
    updateQuote(q.id, { lostReason: reason }, "Lost: " + reason);
    closeModal();
    toast(q.number + " marked lost", "info");
  };
  return (
    <Modal title={"Mark " + q.number + " as lost"} sub="The reason is kept on the quote and helps the conversion figures make sense." onClose={closeModal}
      footer={<><Btn kind="ghost" onClick={closeModal}>Cancel</Btn><Btn kind="danger" onClick={save}>Mark lost</Btn></>}>
      <div className="fm-chips">
        {["Went with another supplier on price", "Budget deferred", "Customer did the work in-house", "No response after follow-up"].map((r) => (
          <button key={r} className={"fm-chip" + (reason === r ? " on" : "")} onClick={() => setReason(r)}>{r}</button>
        ))}
      </div>
      <Field label="Reason"><input className="fm-input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  );
}

function AddProductModal() {
  const [division, setDivision] = useState<DivisionId>("LFL");
  const [category, setCategory] = useState<ProductCategory>("Equipment");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("each");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const save = () => {
    const p = Number(price);
    if (!name.trim() || !(p > 0)) return toast("A name and a price are needed.", "warn");
    mutate((st) => ({ products: [...st.products, { id: newId("pr"), sku: sku.trim().toUpperCase() || "NEW-" + (st.products.length + 1), name: name.trim(), division, category, unit, price: p, description: description.trim() || name.trim() }] }), "Product added to the catalogue: " + name.trim(), "quote");
    closeModal();
    toast(name.trim() + " added to the catalogue");
  };
  return (
    <Modal title="Add a product or service" sub="Available to every new quote in its division." onClose={closeModal}
      footer={<><Btn kind="ghost" onClick={closeModal}>Cancel</Btn><Btn kind="primary" onClick={save}>Add to catalogue</Btn></>}>
      <div className="fm-grid fm-g2">
        <Field label="Division">
          <select className="fm-select" value={division} onChange={(e) => setDivision(e.target.value as DivisionId)}>
            {DIVISIONS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select className="fm-select" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Name"><input className="fm-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="SKU"><input className="fm-input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" /></Field>
        <Field label="Unit"><input className="fm-input" value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
        <Field label="List price (€, ex VAT)"><input className="fm-input" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
      </div>
      <Field label="Description" hint="Shown in the equipment specification of proposals"><textarea className="fm-textarea" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
    </Modal>
  );
}

