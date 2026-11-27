/* Records › All records: every record type, one search, and the data model. */
import { useState } from "react";
import { useFM, openDrawer, sel, euro, invoiceGross } from "../store";
import { canSeeMoney, DIVISIONS } from "../config";
import { fmtDate } from "../dates";
import { Card, Ico, Pill, Empty } from "../ui";
import type { Drawer } from "../types";

type Hit = { type: string; title: string; sub: string; open?: Drawer };

export default function RecordsFM() {
  const s = useFM();
  const [q, setQ] = useState("");
  const money = canSeeMoney(s.role);
  const counts: [string, number, string][] = [
    ["Trading Division", DIVISIONS.length, "Three brands, three invoice series"],
    ["Customer", s.customers.length, "Owns sites, jobs, quotes, invoices"],
    ["Contact", s.contacts.length, "People at each customer"],
    ["Site", s.sites.length, "Address, access, assets"],
    ["Asset", s.assets.length, "Serviceable equipment with frequencies"],
    ["Job", s.jobs.length, "Every piece of work"],
    ["Work Order", s.jobs.filter((j) => j.woRef).length, "Customer references on jobs"],
    ["Job Visit", s.visits.length, "Each day on site"],
    ["Engineer", s.engineers.length, "Skills, leave, bookings"],
    ["Time Entry", s.time.length, "Billable, non-billable, travel, overtime"],
    ["Material", s.materials.length, "Parts used on jobs"],
    ["Product", s.products.length, "Approved catalogue and prices"],
    ["Service Contract", s.contracts.length, "Recurring PPM and billing"],
    ["Service Visit", s.serviceVisits.length, "Planned and completed visits"],
    ["Quote", s.quotes.length, "Proposals and pipeline"],
    ["Quote Line", s.quotes.reduce((a, x) => a + x.lines.length, 0), "Catalogue lines on quotes"],
    ["Invoice", s.invoices.length, "Current and historical"],
    ["Invoice Line", s.invoices.reduce((a, x) => a + x.lines.length, 0), "Labour, materials, contract"],
    ["Payment", s.payments.length, "Receipts against invoices"],
    ["Purchase", s.purchases.length, "Supplier invoices"],
    ["Document", s.documents.length, "Reports, certificates, PDFs"],
    ["Communication", s.comms.length, "Notices, invoices, reminders"],
    ["Website Enquiry", s.enquiries.length, "From the public website"],
    ["Agent Run", s.agentRuns.length, "Every agent execution"],
  ];

  const t = q.trim().toLowerCase();
  const hits: Hit[] = !t ? [] : [
    ...s.customers.filter((c) => c.name.toLowerCase().includes(t)).map((c) => ({ type: "Customer", title: c.name, sub: c.kind + " · " + s.sites.filter((x) => x.customerId === c.id).length + " sites", open: { kind: "customer", id: c.id } as Drawer })),
    ...s.sites.filter((x) => (x.name + " " + x.town + " " + x.eircode).toLowerCase().includes(t)).map((x) => ({ type: "Site", title: x.name, sub: x.address + ", " + x.town, open: { kind: "site", id: x.id } as Drawer })),
    ...s.jobs.filter((j) => (j.number + " " + j.woRef + " " + j.description + " " + sel.site(s, j.siteId)?.name).toLowerCase().includes(t)).map((j) => ({ type: "Job", title: j.number + " · " + sel.site(s, j.siteId)?.name, sub: j.description.split(".")[0] + " · " + j.status, open: { kind: "job", id: j.id } as Drawer })),
    ...(money ? s.invoices.filter((i) => ((i.number || "draft") + " " + sel.customer(s, i.customerId)?.name + " " + (i.issueDate || "")).toLowerCase().includes(t)).map((i) => ({ type: "Invoice", title: (i.number || "Draft") + " · " + sel.customer(s, i.customerId)?.name, sub: fmtDate(i.issueDate, true) + " · " + euro(invoiceGross(i)) + " · " + i.status, open: { kind: "invoice", id: i.id } as Drawer })) : []),
    ...s.quotes.filter((x) => (x.number + " " + x.title + " " + sel.customer(s, x.customerId)?.name).toLowerCase().includes(t)).map((x) => ({ type: "Quote", title: x.number + " · " + x.title, sub: sel.customer(s, x.customerId)?.name + " · " + x.stage, open: { kind: "quote", id: x.id } as Drawer })),
    ...s.contracts.filter((c) => (c.ref + " " + c.title + " " + sel.customer(s, c.customerId)?.name).toLowerCase().includes(t)).map((c) => ({ type: "Service contract", title: c.ref + " · " + c.title, sub: sel.customer(s, c.customerId)?.name + " · " + c.billing, open: { kind: "contract", id: c.id } as Drawer })),
    ...s.engineers.filter((e) => (e.name + " " + e.skills.join(" ")).toLowerCase().includes(t)).map((e) => ({ type: "Engineer", title: e.name, sub: e.title, open: { kind: "engineer", id: e.id } as Drawer })),
    ...s.enquiries.filter((e) => (e.company + " " + e.name + " " + e.service).toLowerCase().includes(t)).map((e) => ({ type: "Website enquiry", title: e.company || e.name, sub: e.service + " · " + e.status, open: { kind: "enquiry", id: e.id } as Drawer })),
    ...s.assets.filter((a) => (a.type + " " + a.description + " " + sel.site(s, a.siteId)?.name).toLowerCase().includes(t)).slice(0, 12).map((a) => ({ type: "Asset", title: a.type + " · " + sel.site(s, a.siteId)?.name, sub: a.description, open: { kind: "site", id: a.siteId } as Drawer })),
    ...s.documents.filter((d) => d.name.toLowerCase().includes(t)).slice(0, 12).map((d) => ({ type: "Document", title: d.name, sub: d.kind + " · " + fmtDate(d.date, true), open: d.jobId ? ({ kind: "job", id: d.jobId } as Drawer) : ({ kind: "customer", id: d.customerId } as Drawer) })),
  ];

  return (
    <div className="fm-page">
      <div className="fm-head">
        <div className="fm-head-l">
          <div className="fm-eyebrow">Records</div>
          <h1 className="fm-title">All records</h1>
          <div className="fm-sub">One search across customers, sites, jobs, invoices, quotes, contracts, engineers, assets, enquiries and documents. Every result opens the live record.</div>
        </div>
      </div>
      <div className="fm-card" style={{ padding: 6, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ paddingLeft: 12, color: "var(--faint)" }}><Ico d="search" size={16} /></span>
        <input className="fm-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search anything: Allendale, J-4567, LFL-1077, dry riser, Declan…" style={{ border: 0, background: "none", height: 44, fontSize: 15, boxShadow: "none" }} />
        {q && <button className="fm-btn sm ghost" onClick={() => setQ("")}>Clear</button>}
      </div>
      {t && (
        <Card title={hits.length + " results"} flush>
          {hits.length === 0 && <Empty title="No records match" hint="Try a job number, customer, site, town or invoice number." />}
          {hits.slice(0, 60).map((h, i) => (
            <button key={i} className="fm-alert info" style={{ padding: "10px 18px" }} onClick={() => h.open && openDrawer(h.open)}>
              <span style={{ width: 120, flex: "none" }}><Pill>{h.type}</Pill></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="t" style={{ display: "block" }}>{h.title}</span>
                <span className="d" style={{ display: "block" }}>{h.sub}</span>
              </span>
              <Ico d="arrow" size={13} style={{ color: "var(--faint)", marginTop: 7 }} />
            </button>
          ))}
        </Card>
      )}
      <Card title="Data model" sub="24 connected record types. Change a job and its customer, engineer schedule, dashboard and invoice status all update.">
        <div className="fm-grid fm-g4">
          {counts.map(([name, n, d]) => (
            <div key={name} className="fm-note" style={{ padding: "11px 13px" }}>
              <div className="fm-row"><span className="fm-ink" style={{ fontWeight: 500, fontSize: 13 }}>{name}</span><span className="fm-spacer" /><span className="fm-mono fm-faint">{n}</span></div>
              <div className="fm-faint" style={{ fontSize: 11.5, marginTop: 3 }}>{d}</div>
            </div>
          ))}
        </div>
        <div className="fm-grid fm-g2" style={{ marginTop: 16 }}>
          <div>
            <div className="fm-sec">Operational chain</div>
            <div className="fm-note accent" style={{ marginTop: 10, lineHeight: 1.9 }}>Customer → Site → Asset → Service Contract → Job → Job Visit → Engineer → Labour and Materials → Completion Report → Invoice → Payment</div>
          </div>
          <div>
            <div className="fm-sec">Commercial chain</div>
            <div className="fm-note accent" style={{ marginTop: 10, lineHeight: 1.9 }}>Website Enquiry → Customer → Opportunity → Quote → Accepted Quote → Installation Job → Invoice</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
