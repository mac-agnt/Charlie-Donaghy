import type { DivisionId, RoleId } from "./config";

export type ISODate = string; // "2026-11-27"

export type AssetType =
  | "Fire alarm"
  | "Emergency lighting"
  | "CCTV"
  | "Access control"
  | "Fire extinguishers"
  | "Hose reels"
  | "Dry riser"
  | "Intercom"
  | "Grounds"
  | "Building fabric";

export type Skill = "Fire" | "Emergency lighting" | "Extinguishers" | "CCTV" | "Access control" | "Intercom" | "Maintenance" | "Gardening";

export type Engineer = {
  id: string;
  name: string;
  initials: string;
  title: string;
  skills: Skill[];
  divisions: DivisionId[];
  color: string;
  phone: string;
  holidays: ISODate[];
  /** Agreed flexible working, e.g. "Finishes 15:00 Fridays". */
  arrangement?: string;
};

export type Customer = {
  id: string;
  name: string;
  kind: "Management company" | "Commercial" | "Healthcare" | "Education" | "Retail" | "Hospitality" | "Industrial" | "Community";
  divisions: DivisionId[];
  accountsEmail: string;
  phone: string;
  paymentTerms: number;
  since: string;
  notes: string;
};

export type Contact = {
  id: string;
  customerId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  primary?: boolean;
};

export type Site = {
  id: string;
  customerId: string;
  name: string;
  address: string;
  town: string;
  county: string;
  eircode: string;
  /** Safe to show customers: parking, reception, hours. */
  accessNotes: string;
  /** Sensitive. Only authorised roles. Never on customer documents. */
  accessCode: string;
  keyholder: string;
};

export type Asset = {
  id: string;
  siteId: string;
  type: AssetType;
  description: string;
  location: string;
  installed: string;
  frequencyMonths: number;
  lastService: ISODate;
  contractId?: string;
};

export type ProductCategory = "Equipment" | "Labour" | "Installation" | "Material" | "Maintenance plan";
export type Product = {
  id: string;
  sku: string;
  name: string;
  division: DivisionId;
  category: ProductCategory;
  unit: string;
  price: number;
  description: string;
};

export type JobStatus = "new" | "progress" | "completed" | "invoiced";
export type JobType = "Reactive callout" | "Repair" | "Installation" | "PPM service" | "Maintenance" | "Inspection";
export type Priority = "Emergency" | "High" | "Normal" | "Low";

export type HistoryEntry = { at: string; who: string; text: string };

export type Photo = { id: string; caption: string; by: string; at: string; hue: number };

export type Job = {
  id: string;
  number: string;
  woRef: string;
  customerId: string;
  siteId: string;
  division: DivisionId;
  type: JobType;
  priority: Priority;
  status: JobStatus;
  engineerIds: string[];
  scheduled: ISODate | null;
  /** Multi-day installs. */
  scheduledEnd?: ISODate | null;
  description: string;
  assetIds: string[];
  internalNotes: string[];
  completionNotes: string;
  photos: Photo[];
  createdAt: ISODate;
  startedAt?: ISODate;
  completedAt?: ISODate;
  completionConfirmedBy?: string;
  completionNoticeId?: string;
  invoiceId?: string;
  /** Contract-billed service work is never invoiced per job. */
  billedVia: "job" | "contract";
  contractId?: string;
  serviceVisitId?: string;
  quoteId?: string;
  agreedPrice?: number;
  returnRequired?: boolean;
  returnNote?: string;
  estHours: number;
  source: "Phone" | "Email" | "Website" | "Engineer" | "Service plan" | "Quote" | "Charlie AI";
  history: HistoryEntry[];
};

export type Visit = {
  id: string;
  jobId: string;
  engineerId: string;
  date: ISODate;
  start: string;
  end: string;
  hours: number;
  summary: string;
  locationVerified?: "arrival" | "arrival+departure";
  returnRequired?: boolean;
};

export type TimeKind = "billable" | "non-billable" | "travel" | "overtime";
export type Correction = { at: string; who: string; from: string; to: string; reason: string };
export type TimeEntry = {
  id: string;
  engineerId: string;
  date: ISODate;
  hours: number;
  kind: TimeKind;
  jobId?: string;
  visitId?: string;
  note: string;
  approved: boolean;
  corrections: Correction[];
};

export type MaterialLine = {
  id: string;
  jobId: string;
  productId?: string;
  description: string;
  qty: number;
  unitPrice: number;
  addedBy: string;
  date: ISODate;
};

export type BillingCycle = "per-visit" | "monthly" | "quarterly" | "annual";

export type ServiceContract = {
  id: string;
  ref: string;
  customerId: string;
  siteId: string;
  division: DivisionId;
  title: string;
  /** Asset type → visits per year. Each line can have its own frequency. */
  schedule: { type: AssetType; everyMonths: number; hours: number; nextDue: ISODate }[];
  billing: BillingCycle;
  /** Amount billed each cycle (per visit if per-visit). */
  billingAmount: number;
  annualValue: number;
  startDate: ISODate;
  renewalDate: ISODate;
  nextBillingDate: ISODate;
  lastBilledPeriod: string; // "2026-11"
  status: "active" | "renewal due" | "paused";
  accessRequirements: string;
};

export type ServiceVisitStatus = "proposed" | "scheduled" | "in progress" | "completed";
export type ChecklistItem = { item: string; result: "pass" | "fail" | "n/a" | "pending" };
export type ServiceVisit = {
  id: string;
  contractId: string;
  siteId: string;
  period: string; // "2026-12"
  date: ISODate;
  engineerId: string | null;
  estHours: number;
  services: AssetType[];
  status: ServiceVisitStatus;
  jobId?: string;
  checklist: ChecklistItem[];
  defects: string[];
  remedial: string[];
  notes: string;
  groupedWith?: string;
};

export type PipelineStage = "New Enquiry" | "Assessment" | "Quote Preparation" | "Quote Sent" | "Awaiting Decision" | "Accepted" | "Lost";
export const PIPELINE: PipelineStage[] = ["New Enquiry", "Assessment", "Quote Preparation", "Quote Sent", "Awaiting Decision", "Accepted", "Lost"];

export type QuoteLine = {
  id: string;
  productId?: string;
  description: string;
  qty: number;
  unitPrice: number;
  kind: "Equipment" | "Labour" | "Installation" | "Material" | "Maintenance";
};

export type Quote = {
  id: string;
  number: string;
  customerId: string;
  siteId: string;
  division: DivisionId;
  title: string;
  stage: PipelineStage;
  lines: QuoteLine[];
  discountPct: number;
  paymentTerms: string;
  format: "short" | "detailed";
  requirements: string;
  createdAt: ISODate;
  sentAt?: ISODate;
  validUntil: ISODate;
  enquiryId?: string;
  jobId?: string;
  lostReason?: string;
  estDays: number;
  proposal?: ProposalSection[];
  history: HistoryEntry[];
};

export type ProposalSection = { id: string; title: string; body: string };

export type InvoiceStatus = "draft" | "issued" | "part-paid" | "paid" | "overdue" | "cancelled";
export type InvoiceLine = { description: string; qty: number; unitPrice: number; kind: "Labour" | "Material" | "Equipment" | "Service" | "Contract" };
export type Invoice = {
  id: string;
  number: string | null; // null while draft
  division: DivisionId;
  customerId: string;
  siteId: string;
  jobId?: string;
  contractId?: string;
  period?: string;
  woRef: string;
  lines: InvoiceLine[];
  vatRate: number;
  status: InvoiceStatus;
  issueDate: ISODate | null;
  dueDate: ISODate | null;
  paid: number;
  createdAt: ISODate;
  sentTo?: string;
  history: HistoryEntry[];
  historical?: boolean;
};

export type Payment = { id: string; invoiceId: string; date: ISODate; amount: number; method: "EFT" | "Cheque" | "Card" };

export type Purchase = {
  id: string;
  supplier: string;
  ref: string;
  date: ISODate;
  net: number;
  vat: number;
  division: DivisionId;
  category: string;
  jobId?: string;
  status: "matched" | "to review";
};

export type Enquiry = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  service: string;
  location: string;
  description: string;
  receivedAt: string;
  source: "Website" | "Phone" | "Email" | "WhatsApp";
  status: "new" | "contacted" | "quoted" | "converted" | "closed";
  customerId?: string;
  quoteId?: string;
  division: DivisionId;
};

export type CommKind = "Completion notice" | "Invoice" | "Payment reminder" | "Appointment reminder" | "Service confirmation" | "Quote" | "Enquiry reply";
export type Communication = {
  id: string;
  kind: CommKind;
  customerId: string;
  jobId?: string;
  invoiceId?: string;
  quoteId?: string;
  to: string;
  subject: string;
  body: string;
  at: string;
  status: "draft" | "awaiting approval" | "sent (simulated)";
};

export type DocumentRec = {
  id: string;
  name: string;
  kind: "Service report" | "Certificate" | "Completion report" | "Invoice PDF" | "Quote PDF" | "Site drawing" | "Contract";
  customerId: string;
  siteId?: string;
  jobId?: string;
  date: ISODate;
};

export type AgentId = "briefing" | "watchdog" | "intake" | "scheduling" | "service" | "invoice" | "quoting" | "comms";
export type AgentRunStep = { label: string; detail: string };
export type AgentRun = {
  id: string;
  agentId: AgentId;
  at: string;
  status: "queued" | "running" | "completed" | "needs approval" | "failed";
  summary: string;
  steps: AgentRunStep[];
  records: string[];
  proposalIds: string[];
};

export type ProposalKind =
  | "issue-invoice"
  | "send-comm"
  | "create-job"
  | "approve-service-plan"
  | "book-installation"
  | "send-reminder"
  | "recurring-invoices"
  | "convert-quote"
  | "allocate-job"
  | "accountant-export";

export type Proposal = {
  id: string;
  agentId: AgentId | "charlie-ai" | "automation";
  kind: ProposalKind;
  title: string;
  detail: string;
  value?: number;
  ref?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt?: string;
  payload: Record<string, any>;
  category: "Financial" | "External communication" | "Schedule" | "Operations";
};

export type AutomationRun = { at: string; outcome: string; status: "ok" | "skipped" | "awaiting approval" };
export type Automation = {
  id: string;
  no: string;
  name: string;
  trigger: string;
  conditions: string[];
  actions: string[];
  enabled: boolean;
  simulated: string;
  runs: AutomationRun[];
};

export type LogEvent = { id: string; at: string; who: string; text: string; kind: "job" | "finance" | "service" | "schedule" | "quote" | "agent" | "web" | "system"; ref?: string };

export type FMState = {
  role: RoleId;
  division: "ALL" | DivisionId;
  meEngineerId: string;
  engineers: Engineer[];
  customers: Customer[];
  contacts: Contact[];
  sites: Site[];
  assets: Asset[];
  products: Product[];
  jobs: Job[];
  visits: Visit[];
  time: TimeEntry[];
  materials: MaterialLine[];
  contracts: ServiceContract[];
  serviceVisits: ServiceVisit[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  purchases: Purchase[];
  enquiries: Enquiry[];
  comms: Communication[];
  documents: DocumentRec[];
  agentRuns: AgentRun[];
  agentPaused: Partial<Record<AgentId, boolean>>;
  proposals: Proposal[];
  automations: Automation[];
  log: LogEvent[];
  installBookings: InstallBooking[];
  holidays: { engineerId: string; from: ISODate; to: ISODate; note: string }[];
  counters: { job: number; quote: number; invoice: Record<DivisionId, number>; id: number };
  prefixes: Record<DivisionId, string>;
  vatRate: number;
  labourRate: number;
  ui: FMUi;
  toasts: { id: string; text: string; tone: "ok" | "warn" | "info" }[];
};

export type InstallBooking = {
  id: string;
  jobId: string;
  engineerIds: string[];
  from: ISODate;
  to: ISODate;
  label: string;
};

export type Drawer =
  | { kind: "job"; id: string }
  | { kind: "customer"; id: string }
  | { kind: "site"; id: string }
  | { kind: "invoice"; id: string }
  | { kind: "quote"; id: string }
  | { kind: "engineer"; id: string }
  | { kind: "contract"; id: string }
  | { kind: "serviceVisit"; id: string }
  | { kind: "enquiry"; id: string }
  | null;

export type FMUi = {
  tabs: Record<string, string>;
  drawer: Drawer;
  drawerStack: Drawer[];
  siteOpen: boolean;
  sitePage: string;
  /** Records filter passed when a dashboard card opens a module. */
  filters: Record<string, string>;
  modal: null | { kind: string; [k: string]: any };
};
