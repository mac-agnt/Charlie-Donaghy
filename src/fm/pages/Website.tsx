/* The website as seen from inside the platform: enquiries it has produced
   and a preview of each evergreen page. No invented traffic figures. */
import { COMPANY } from "../config";
import { useFM, openSite, openDrawer, go, inDivision, sel } from "../store";
import { Page, Card, Stat, Table, Btn, Pill, DivTag, Empty, Ico, type Col } from "../ui";
import { fmtDay } from "../dates";
import { SERVICE_PAGES } from "../site/content";
import type { Enquiry } from "../types";

const PAGES: [string, string, string][] = [
  ["home", "Home", "Headline, the three divisions, what we look after, how we work"],
  ["about", "About", "The umbrella brand and the three trading divisions"],
  ["fire", "Fire Safety", "Fire alarms, emergency lighting, extinguishers, hose reels, dry risers"],
  ["security", "Security & CCTV", "CCTV, recording, remote viewing, intercoms"],
  ["access", "Access Control", "Door access, fobs, integration, servicing"],
  ["maintenance", "Property Maintenance", "Repairs, painting, grounds and gardening"],
  ["servicing", "Servicing & Maintenance", "Planned servicing contracts across every system"],
  ["quote", "Request a Quote", "The enquiry form. Submissions go into the sales pipeline"],
  ["contact", "Contact", "Phone, email, office and the area we cover"],
];

const statusPill = (e: Enquiry) => e.status === "new" ? <Pill tone="accent" dot>New</Pill> : e.status === "quoted" ? <Pill tone="info" dot>Quoted</Pill> : e.status === "converted" ? <Pill tone="ok" dot>Converted</Pill> : <Pill>{e.status.charAt(0).toUpperCase() + e.status.slice(1)}</Pill>;

export default function WebsitePage({ tab }: { tab: string }) {
  const s = useFM();
  const enquiries = s.enquiries.filter((e) => inDivision(s, e.division)).sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  const web = enquiries.filter((e) => e.source === "Website");
  const cols: Col<Enquiry>[] = [
    { h: "Received", w: "140px", r: (e) => fmtDay(e.receivedAt.slice(0, 10)) + " " + e.receivedAt.slice(11, 16) },
    { h: "From", w: "1.3fr", cls: "main", r: (e) => e.company || e.name },
    { h: "Service", w: "1.2fr", r: (e) => e.service },
    { h: "Location", w: "1fr", r: (e) => e.location },
    { h: "Division", w: "130px", r: (e) => <DivTag id={e.division} /> },
    { h: "Source", w: "80px", r: (e) => e.source },
    { h: "Status", w: "100px", r: statusPill },
    { h: "", w: "90px", r: (e) => e.quoteId ? <span className="fm-mono fm-faint">{sel.quote(s, e.quoteId)?.number}</span> : null },
  ];
  const actions = (
    <>
      <Btn icon="website" onClick={() => openSite("home")}>Open public website</Btn>
      <Btn kind="primary" icon="arrow" onClick={() => go("Quotes", "pipeline")}>Sales pipeline</Btn>
    </>
  );

  if (tab === "enquiries") {
    return (
      <Page eyebrow="Website" title="Enquiries" sub="Every enquiry from the website form, matched to a customer where one already exists and added to the sales pipeline automatically." actions={actions}>
        <Card flush>
          <Table cols={cols} rows={enquiries} minWidth={980} onRow={(e) => openDrawer({ kind: "enquiry", id: e.id })} empty={<Empty title="No enquiries yet" hint="Submit the form on the public website to see one arrive." action={<Btn size="sm" onClick={() => openSite("quote")}>Open the enquiry form</Btn>} />} />
        </Card>
      </Page>
    );
  }

  if (tab === "pages") {
    return (
      <Page eyebrow="Website" title="Pages" noDivision sub="The site is evergreen: services, divisions and contact details, with nothing that needs updating every week." actions={actions}>
        <Card flush>
          <Table cols={[
            { h: "Page", w: "200px", cls: "main", r: (p) => p[1] },
            { h: "What it covers", w: "1fr", r: (p) => p[2] },
            { h: "Division", w: "160px", r: (p) => { const sp = SERVICE_PAGES.find((x) => x.id === p[0]); return sp && sp.division !== "ALL" ? <DivTag id={sp.division} /> : <span className="fm-faint">All</span>; } },
            { h: "", w: "110px", r: (p) => <Btn size="sm" icon="website" onClick={(e) => { e.stopPropagation(); openSite(p[0]); }}>Preview</Btn> },
          ] as Col<(typeof PAGES)[number]>[]} rows={PAGES} minWidth={700} onRow={(p) => openSite(p[0])} />
        </Card>
      </Page>
    );
  }

  const newCount = web.filter((e) => e.status === "new").length;
  const quoted = web.filter((e) => e.status === "quoted" || e.status === "converted").length;
  return (
    <Page eyebrow="Website" title="Public website" sub={"A separate, public site for " + COMPANY.umbrellaName + ". Enquiries submitted on it arrive here and in the sales pipeline with no re-typing."} actions={actions}>
      <div className="fm-grid fm-g3">
        <Stat icon="mail" label="Website enquiries" value={String(web.length)} sub="Received through the form" onClick={() => go("Website", "enquiries")} />
        <Stat icon="alert" label="Waiting for a reply" value={String(newCount)} sub="Still in New Enquiry" tone={newCount ? "warn" : "ok"} onClick={() => go("Quotes", "pipeline")} />
        <Stat icon="quote" label="Turned into quotes" value={String(quoted)} sub="From website enquiries" onClick={() => go("Quotes", "quotes")} />
      </div>
      <div className="fm-grid fm-g-main">
        <Card title="Latest enquiries" flush action={<Btn size="sm" kind="ghost" onClick={() => go("Website", "enquiries")}>All enquiries</Btn>}>
          <Table cols={cols.filter((c) => ["Received", "From", "Service", "Status"].includes(c.h))} rows={web.slice(0, 6)} onRow={(e) => openDrawer({ kind: "enquiry", id: e.id })} />
        </Card>
        <Card title="Try it" sub="The demonstration path for a new enquiry">
          <div className="fm-col-flex" style={{ fontSize: 13, lineHeight: 1.55 }}>
            {[
              "Open the public website and choose Request a quote.",
              "Fill in the form, for example a fire alarm service for a building in your area.",
              "Submit. The Job Intake Agent checks for an existing customer and creates the opportunity.",
              "Back in the platform, the enquiry is waiting in Sales pipeline, New Enquiry, ready to quote.",
            ].map((t, i) => (
              <div className="fm-row" key={i} style={{ alignItems: "flex-start" }}>
                <span className="fm-pill accent" style={{ width: 22, justifyContent: "center", padding: 0, flex: "none" }}>{i + 1}</span>
                <span className="fm-muted">{t}</span>
              </div>
            ))}
            <div className="fm-row" style={{ gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <Btn kind="primary" icon="website" onClick={() => openSite("quote?svc=" + encodeURIComponent("Fire alarm servicing"))}>Open the enquiry form</Btn>
              <Btn icon="link" onClick={() => window.open(location.pathname + "#site", "_blank")}>Open in a new tab</Btn>
            </div>
          </div>
        </Card>
      </div>
      <Card title="Pages" sub="Preview any page as a visitor sees it" flush>
        <div className="fm-grid fm-g3" style={{ padding: "6px 18px 18px" }}>
          {PAGES.map((p) => (
            <button key={p[0]} className="fm-stat" onClick={() => openSite(p[0])}>
              <span className="k"><Ico d="website" size={13} />{p[1]}</span>
              <span className="s" style={{ whiteSpace: "normal" }}>{p[2]}</span>
            </button>
          ))}
        </div>
      </Card>
    </Page>
  );
}
