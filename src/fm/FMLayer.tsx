/* Global layer for the facilities modules: record drawers, modals, toasts and
   the public website. Mounted once in AppShell, above every page. */
import { useEffect } from "react";
import { useFM, closeDrawer, backDrawer } from "./store";
import { Ico } from "./ui";
import { JobDrawer, JobModals } from "./pages/Jobs";
import { EngineerDrawer } from "./pages/Engineers";
import { ContractDrawer, ServiceVisitDrawer, ServiceModals } from "./pages/Servicing";
import { ScheduleModals } from "./pages/Schedule";
import { CustomerDrawer, SiteDrawer } from "./pages/Customers";
import { QuoteDrawer, EnquiryDrawer, QuoteModals } from "./pages/Quotes";
import { InvoiceDrawer, FinanceModals } from "./pages/Finance";
import PublicSite from "./site/PublicSite";
import "./fm.css";

function DrawerBody() {
  const s = useFM();
  const d = s.ui.drawer;
  if (!d) return null;
  switch (d.kind) {
    case "job": return <JobDrawer id={d.id} />;
    case "customer": return <CustomerDrawer id={d.id} />;
    case "site": return <SiteDrawer id={d.id} />;
    case "invoice": return <InvoiceDrawer id={d.id} />;
    case "quote": return <QuoteDrawer id={d.id} />;
    case "engineer": return <EngineerDrawer id={d.id} />;
    case "contract": return <ContractDrawer id={d.id} />;
    case "serviceVisit": return <ServiceVisitDrawer id={d.id} />;
    case "enquiry": return <EnquiryDrawer id={d.id} />;
  }
  return null;
}

export default function FMLayer() {
  const s = useFM();
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !s.ui.modal && s.ui.drawer) closeDrawer();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [s.ui.modal, s.ui.drawer]);
  // #site opens the public website directly (for showing it in its own tab).
  useEffect(() => {
    const sync = () => {
      if (location.hash.startsWith("#site")) import("./store").then((m) => m.openSite(location.hash.split("/")[1] || "home"));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return (
    <>
      {s.ui.drawer && (
        <>
          <div className="fm-scrim" onClick={closeDrawer} />
          <aside className="fm-drawer" key={s.ui.drawer.kind + s.ui.drawer.id}>
            {s.ui.drawerStack.length > 0 && (
              <button className="fm-btn sm ghost" onClick={backDrawer} style={{ position: "absolute", top: 18, right: 62, zIndex: 2 }}>
                <Ico d="back" size={13} /> Back
              </button>
            )}
            <DrawerBody />
          </aside>
        </>
      )}
      <JobModals />
      <ServiceModals />
      <ScheduleModals />
      <QuoteModals />
      <FinanceModals />
      {s.ui.siteOpen && <PublicSite />}
      <div className="fm-toasts" aria-live="polite">
        {s.toasts.map((t) => (
          <div key={t.id} className={"fm-toast " + t.tone}>
            <i />
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}

/** Standard drawer header used by every record drawer. */
export function DrawerHead({ eyebrow, title, pills, sub }: { eyebrow: string; title: React.ReactNode; pills?: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="fm-drawer-h">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="fm-eyebrow">{eyebrow}</span>
          {pills}
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.5px", marginTop: 7, lineHeight: 1.25 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 5 }}>{sub}</div>}
      </div>
      <button className="fm-x" onClick={closeDrawer} aria-label="Close">
        <Ico d="x" size={13} stroke={2.2} />
      </button>
    </div>
  );
}
