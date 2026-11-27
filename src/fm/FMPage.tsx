/* Routes a facilities page from the Pulse rail to its module. */
import JobsPage from "./pages/Jobs";
import EngineersPage from "./pages/Engineers";
import ServicingPage from "./pages/Servicing";
import SchedulePage from "./pages/Schedule";
import CustomersPage from "./pages/Customers";
import QuotesPage from "./pages/Quotes";
import FinancePage from "./pages/Finance";
import WebsitePage from "./pages/Website";
import { useFM } from "./store";
import { FM_TABS } from "./nav";

export default function FMPage({ page }: { page: string }) {
  const s = useFM();
  const tab = s.ui.tabs[page] || FM_TABS[page]?.[0]?.[0] || "";
  switch (page) {
    case "Jobs": return <JobsPage tab={tab} />;
    case "Engineers": return <EngineersPage tab={tab} />;
    case "Servicing": return <ServicingPage tab={tab} />;
    case "Schedule": return <SchedulePage tab={tab} />;
    case "Customers": return <CustomersPage tab={tab} />;
    case "Quotes": return <QuotesPage tab={tab} />;
    case "Finance": return <FinancePage tab={tab} />;
    case "Website": return <WebsitePage tab={tab} />;
  }
  return null;
}
