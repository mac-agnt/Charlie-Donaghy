/* Central business configuration for the Charlie Donaghy demo.
   Everything client-specific lives here so it can be changed in one place.

   NOTE: the umbrella company name and the legal trading names are working
   placeholders until Charlie confirms them. Change them here and they update
   across the platform, the documents and the public website. */

export type DivisionId = "LFL" | "SS" | "LPM";

export const COMPANY = {
  /** Umbrella brand. Placeholder, to be confirmed with Charlie. */
  umbrellaName: "Donaghy Facilities Group",
  umbrellaShort: "Donaghy FM",
  umbrellaConfirmed: false,
  owner: "Charlie Donaghy",
  ownerFirst: "Charlie",
  assistantName: "Charlie AI",
  region: "Leinster",
  phone: "01 555 0142",
  email: "office@donaghyfm.ie",
  address: "Unit 4, Maynooth Business Campus, Co. Kildare",
  currency: "EUR",
  /** Demo reference date. All "today" logic is relative to this. */
  today: "2026-11-27",
  /** Illustrative only, not Charlie's real rates. */
  labourRate: 80,
  labourRates: { LFL: 80, SS: 80, LPM: 60 } as Record<DivisionId, number>,
  /** Default VAT rate applied to invoices and quotes. Configurable per invoice. */
  vatRate: 0.135,
  vatOptions: [
    { id: "0.135", label: "13.5% (services)", rate: 0.135 },
    { id: "0.23", label: "23% (goods)", rate: 0.23 },
    { id: "0", label: "0% / reverse charge (RCT)", rate: 0 },
  ],
  paymentTermsDays: 30,
  /** Job left in progress longer than this raises an alert. */
  stallDays: 5,
  /** Completed job not invoiced after this many days raises an alert. */
  unbilledDays: 3,
  companyShutdown: { from: "2026-12-24", to: "2027-01-01" },
};

export type DivisionConfig = {
  id: DivisionId;
  name: string;
  short: string;
  /** Invoice prefix. Configurable. */
  prefix: string;
  nextInvoiceNo: number;
  color: string;
  tagline: string;
  services: string[];
};

export const DIVISIONS: DivisionConfig[] = [
  {
    id: "LFL",
    name: "Leinster Fire and Lighting",
    short: "Fire & Lighting",
    prefix: "LFL",
    nextInvoiceNo: 1088,
    color: "#e2705c",
    tagline: "Fire detection, emergency lighting and fire-fighting equipment",
    services: ["Fire alarms", "Emergency lighting", "Fire extinguishers", "Hose reels", "Dry risers"],
  },
  {
    id: "SS",
    name: "Surveillance Systems",
    short: "Surveillance",
    prefix: "M",
    nextInvoiceNo: 418,
    color: "#6ab8f0",
    tagline: "CCTV, access control and intercom systems",
    services: ["CCTV", "Access control", "Intercoms"],
  },
  {
    id: "LPM",
    name: "Leinster Property Maintenance",
    short: "Property Maintenance",
    prefix: "LPM",
    nextInvoiceNo: 263,
    color: "#7fd8a4",
    tagline: "Planned and reactive property maintenance, grounds and gardening",
    services: ["General maintenance", "Gardening", "Grounds"],
  },
];

export const divisionById = (id: string) => DIVISIONS.find((d) => d.id === id) || DIVISIONS[0];

export type RoleId = "owner" | "ops" | "engineer" | "accountant";
export const ROLES: { id: RoleId; label: string; person: string; initials: string; blurb: string }[] = [
  { id: "owner", label: "Owner", person: "Charlie Donaghy", initials: "CD", blurb: "Full operational, commercial and financial visibility" },
  { id: "ops", label: "Operations admin", person: "Sinéad Kelly", initials: "SK", blurb: "Jobs, servicing, scheduling, customers and communication" },
  { id: "engineer", label: "Engineer", person: "Declan Murphy", initials: "DM", blurb: "Assigned jobs, job box, schedule, timesheets and authorised site info" },
  { id: "accountant", label: "Accountant", person: "Fiona Brennan", initials: "FB", blurb: "Invoices, purchases, payments and approved timesheet exports" },
];

/** Which platform pages each role can open. */
export const ROLE_PAGES: Record<RoleId, string[]> = {
  owner: ["Home", "Agents", "Dashboard", "Jobs", "Servicing", "Schedule", "Engineers", "Customers", "Quotes", "Finance", "Website", "Work", "Records", "Activity", "Settings"],
  ops: ["Home", "Agents", "Dashboard", "Jobs", "Servicing", "Schedule", "Engineers", "Customers", "Quotes", "Website", "Work", "Records", "Activity", "Settings"],
  engineer: ["Home", "Agents", "Jobs", "Schedule", "Engineers", "Settings"],
  accountant: ["Home", "Agents", "Dashboard", "Finance", "Records", "Settings"],
};

export const canSeeMoney = (r: RoleId) => r === "owner" || r === "accountant";
/** Ops sees job values but not the finance module. */
export const canSeeJobValues = (r: RoleId) => r !== "engineer";
export const canSeeAccessCodes = (r: RoleId) => r === "owner" || r === "ops" || r === "engineer";
