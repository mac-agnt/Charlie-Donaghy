/* Business configuration, roles and the integration directory. */
import { useFM, setPrefix, setVat, setRole, euro } from "../store";
import { COMPANY, DIVISIONS, ROLES, ROLE_PAGES, type RoleId } from "../config";
import { Card, Pill, Ico, Field, Table } from "../ui";

const INTEGRATIONS: [string, string, string, string][] = [
  ["Email", "mail", "Completion notices, invoices, reminders and quotes sent from the office mailbox", "Proposed · simulated in demo"],
  ["WhatsApp Business", "whatsapp", "Charlie AI on WhatsApp for status questions and approvals", "Proposed · simulated in demo"],
  ["Calendar", "calendar", "Engineer schedules and installations synced to shared calendars", "Proposed"],
  ["Existing spreadsheets", "grid", "One-off import of the job box, service schedule and customer lists", "Proposed · import on go-live"],
  ["Historical invoice documents", "quote", "Past invoices indexed so Charlie AI can find any of them", "Proposed · import on go-live"],
  ["Website enquiry forms", "website", "Public website form posts straight into the sales pipeline", "Working in this demo"],
  ["Accounting exports", "download", "Monthly CSV export of sales, purchases and payments for the accountant. No accounting package assumed.", "Working in this demo (CSV)"],
  ["Vehicle tracking", "route", "Stays in Charlie's existing tracking system. Not duplicated here.", "External, by choice"],
];

export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const s = useFM();
  return (
    <select className="fm-select" value={s.role} onChange={(e) => setRole(e.target.value as RoleId)} style={{ height: compact ? 30 : 36, fontSize: 12.5 }} aria-label="View as role">
      {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}: {r.person}</option>)}
    </select>
  );
}

export default function SettingsFM() {
  const s = useFM();
  return (
    <div className="fm-page" style={{ paddingBottom: 6 }}>
      <div className="fm-head">
        <div className="fm-head-l">
          <div className="fm-eyebrow">Business configuration</div>
          <h1 className="fm-title">{COMPANY.umbrellaName}</h1>
          <div className="fm-sub">Names, invoice series, tax and roles are configured in one place and apply everywhere: documents, the public website and Charlie AI.</div>
        </div>
      </div>
      {!COMPANY.umbrellaConfirmed && (
        <div className="fm-note warn"><Ico d="alert" size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />The umbrella company name and legal trading names are working placeholders until Charlie confirms them. They live in <span className="fm-mono">src/fm/config.ts</span>.</div>
      )}
      <div className="fm-grid fm-g2">
        <Card title="Trading divisions and invoice series" sub="Each division keeps its own branding and number sequence">
          <Table
            cols={[
              { h: "Division", w: "1.6fr", r: (d: (typeof DIVISIONS)[number]) => <span className="fm-row"><i style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flex: "none" }} /><span className="main">{d.name}</span></span> },
              { h: "Prefix", w: ".8fr", r: (d) => s.role === "owner" ? <input className="fm-input" style={{ height: 28, width: 70 }} value={s.prefixes[d.id]} onChange={(e) => setPrefix(d.id, e.target.value)} /> : s.prefixes[d.id] },
              { h: "Next number", w: "1fr", cls: "mono", r: (d) => s.prefixes[d.id] + "-" + String(s.counters.invoice[d.id]).padStart(4, "0") },
              { h: "Labour rate", w: ".8fr", num: true, r: (d) => euro(COMPANY.labourRates[d.id]) + "/h" },
            ]}
            rows={DIVISIONS}
          />
          <div className="fm-faint" style={{ fontSize: 11.5, marginTop: 10 }}>Labour rates are illustrative for the demo, not Charlie's actual rates.</div>
        </Card>
        <Card title="Tax and thresholds">
          <div className="fm-grid fm-g2">
            <Field label="Default VAT rate" hint="Each invoice can override it">
              <select className="fm-select" value={String(s.vatRate)} onChange={(e) => setVat(Number(e.target.value))} disabled={s.role !== "owner"}>
                {COMPANY.vatOptions.map((o) => <option key={o.id} value={String(o.rate)}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Payment terms" hint="Per customer, default shown"><input className="fm-input" value={COMPANY.paymentTermsDays + " days"} readOnly /></Field>
            <Field label="Stalled job alert" hint="In progress with no return booked"><input className="fm-input" value={"After " + COMPANY.stallDays + " days"} readOnly /></Field>
            <Field label="Unbilled work alert" hint="Completed, no invoice"><input className="fm-input" value={"After " + COMPANY.unbilledDays + " days"} readOnly /></Field>
          </div>
        </Card>
      </div>
      <Card title="Roles" sub="Switch to see exactly what each person sees">
        <div className="fm-grid fm-g4">
          {ROLES.map((r) => (
            <button key={r.id} className="fm-stat" onClick={() => setRole(r.id)} style={{ borderColor: s.role === r.id ? "var(--accent-line)" : undefined, background: s.role === r.id ? "var(--accent-faint)" : undefined }}>
              <span className="k">{r.label}{s.role === r.id && <Pill tone="accent">Viewing</Pill>}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{r.person}</span>
              <span className="s" style={{ whiteSpace: "normal", lineHeight: 1.45 }}>{r.blurb}</span>
              <span className="s">{ROLE_PAGES[r.id].length} areas · {r.id === "engineer" || r.id === "ops" ? "no financial totals" : r.id === "accountant" ? "no site access codes" : "everything"}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Integration directory" sub="Clearly marked: nothing here claims to be live unless it works in this demo" flush>
        {INTEGRATIONS.map(([name, ic, d, st]) => (
          <div key={name} className="fm-row" style={{ padding: "12px 18px", borderTop: "1px solid var(--border)" }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)", flex: "none" }}><Ico d={ic} size={15} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{name}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{d}</span>
            </span>
            <Pill tone={st.startsWith("Working") ? "ok" : st.startsWith("External") ? "" : "info"}>{st}</Pill>
          </div>
        ))}
      </Card>
      <div className="fm-faint" style={{ fontSize: 11.5 }}>All customers, engineers, prices, contracts and invoices in this demo are invented demonstration data, not business records.</div>
    </div>
  );
}
