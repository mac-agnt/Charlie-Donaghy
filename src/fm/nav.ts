/* Top-bar tabs for each facilities page. PulseLogic renders these in the
   header pill; the page component receives the active tab id. */
import type { RoleId } from "./config";

export const FM_PAGES = ["Jobs", "Servicing", "Schedule", "Engineers", "Customers", "Quotes", "Finance", "Website"];

export const FM_TABS: Record<string, [string, string][]> = {
  Jobs: [["board", "Job Board"], ["all", "All Jobs"], ["mine", "My Jobs"], ["completed", "Completed"], ["reports", "Job Reports"]],
  Servicing: [["overview", "Overview"], ["planner", "Monthly Planner"], ["contracts", "Contracts"], ["assets", "Asset Register"], ["reports", "Service Reports"], ["due", "Upcoming & Overdue"]],
  Schedule: [["company", "Company Calendar"], ["engineer", "Engineer Schedule"], ["installs", "Installation Planner"], ["unallocated", "Unallocated"], ["availability", "Availability"]],
  Engineers: [["team", "Team"], ["app", "Engineer App"], ["timesheets", "Timesheets"]],
  Customers: [["customers", "Customers"], ["sites", "Sites"], ["contacts", "Contacts"], ["history", "Customer History"], ["assets", "Assets"]],
  Quotes: [["quotes", "Quotes"], ["pipeline", "Sales Pipeline"], ["builder", "Quote Builder"], ["products", "Products & Services"], ["templates", "Templates"]],
  Finance: [["overview", "Overview"], ["invoices", "Invoices"], ["ready", "Ready to Invoice"], ["payments", "Payments"], ["purchases", "Purchases"], ["recurring", "Recurring Billing"], ["accountant", "Accountant"]],
  Website: [["overview", "Website"], ["enquiries", "Enquiries"], ["pages", "Pages"]],
};

/** Tabs hidden for a role (the page itself is gated by ROLE_PAGES). */
export const ROLE_TAB_HIDE: Partial<Record<RoleId, Record<string, string[]>>> = {
  engineer: { Jobs: ["all", "completed", "reports"], Engineers: ["team"], Schedule: ["installs", "availability"] },
  ops: { Quotes: [], Customers: [] },
};

export const FM_LABELS: Record<string, string> = {
  Jobs: "Jobs", Servicing: "Servicing & PPM", Schedule: "Schedule", Engineers: "Engineers",
  Customers: "Customers & Sites", Quotes: "Quotes & Products", Finance: "Finance", Website: "Website",
};
