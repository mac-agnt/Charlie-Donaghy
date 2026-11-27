/* The eight-agent workforce. Threads feed the Pulse Agents chat; the rest
   feeds the Workforce tab (responsibilities, data, approvals, pause). */
import type { AgentId } from "./types";

export type AgentMeta = {
  id: AgentId;
  name: string;
  shape: string;
  tint: string;
  role: string;
  schedule: string;
  responsibilities: string[];
  sources: string[];
  approvals: string;
  state: "working" | "thinking" | "waiting" | "complete" | "attention";
  when: string;
  preview: string;
  thread: any[];
};

export const AGENTS: AgentMeta[] = [
  {
    id: "briefing", name: "Daily Briefing", shape: "crown-pebble", tint: "#191c1f", state: "complete", when: "07:00",
    role: "Reads the whole business at 07:00 and tells Charlie what matters today",
    schedule: "Every weekday at 07:00",
    responsibilities: ["Summarise today's jobs and who is where", "Flag outstanding work and unallocated jobs", "Engineer availability and leave", "Unpaid and overdue invoices", "Upcoming servicing"],
    sources: ["Jobs", "Schedule", "Engineers", "Invoices", "Service contracts"],
    approvals: "Read only. Never changes a record.",
    preview: "3 unallocated jobs, 4 not invoiced, 2 overdue.",
    thread: [
      { kind: "stamp", text: "Today 07:00" },
      { kind: "routine", text: "Ran routine", routine: "Morning briefing" },
      { kind: "agent", text: "morning briefing for Friday:", lines: [{ k: "Jobs", v: "5 new (3 unallocated), 8 in progress" }, { k: "Billing", v: "4 completed jobs not invoiced, Phoenix House is 9 days old" }, { k: "Cash", v: "2 invoices overdue, Brady's and St. Brigid's" }, { k: "People", v: "Niall double-booked Monday, Paddy on leave Monday" }] },
      { kind: "agent", text: "two things need you today: approve the Phoenix House invoice, and decide who covers the Dunboyne intercom on Monday." },
      { kind: "user", text: "give dunboyne to shane" },
      { kind: "agent", text: "Shane is on the Celbridge install Monday too. Niall can do Dunboyne first thing and join Celbridge by 10:30. want me to propose that?" },
    ],
  },
  {
    id: "watchdog", name: "Operations Watchdog", shape: "shield", tint: "#241b2e", state: "attention", when: "07:05",
    role: "Flags stalled jobs, unbilled work and missed deadlines",
    schedule: "Every hour, 07:00 to 19:00",
    responsibilities: ["Jobs in progress past the threshold with no return booked", "Completed work not invoiced after 3 days", "Missed scheduled visits", "Booking clashes and leave conflicts"],
    sources: ["Jobs", "Visits", "Invoices", "Schedule"],
    approvals: "Raises alerts only. Hands unbilled work to the Invoice Agent.",
    preview: "J-4558 completed 9 days ago, no invoice.",
    thread: [
      { kind: "stamp", text: "Today 07:05" },
      { kind: "agent", text: "J-4558 at Phoenix House was completed on 18 November and still has no invoice. that's €658 sitting there. i've passed it to the Invoice Agent." },
      { kind: "agent", text: "J-4571 at Boyne Valley Foods has been in progress 7 days with no return visit booked. Ciarán's notes say it probably needs IP-rated devices in the wash-down area." },
    ],
  },
  {
    id: "intake", name: "Job Intake", shape: "offset-pebble", tint: "#10282a", state: "working", when: "07:16",
    role: "Turns calls, emails and website forms into clean draft jobs and opportunities",
    schedule: "On every new request",
    responsibilities: ["Structure customer requests into draft jobs", "Match the customer and site", "Detect possible duplicate jobs", "Create website opportunities in the pipeline"],
    sources: ["Website enquiries", "Email", "Customers", "Sites", "Open jobs"],
    approvals: "Drafts only. Creating a job from Charlie AI waits for a yes.",
    preview: "Kinsealy Dental enquiry added, no duplicate.",
    thread: [
      { kind: "stamp", text: "Today 07:16" },
      { kind: "agent", text: "new website enquiry from Kinsealy Dental: CCTV at the front entrance and car park plus a door intercom. no existing customer or open job, so it's a new opportunity in the pipeline." },
      { kind: "agent", text: "Harbourview emailed about an emergency light outside room 214. J-4575 is in the job box. no duplicate: the last emergency lighting job there was closed in October." },
    ],
  },
  {
    id: "scheduling", name: "Scheduling", shape: "control-cube", tint: "#16241f", state: "thinking", when: "Yesterday",
    role: "Matches work to engineer skills and availability and finds slots for big installs",
    schedule: "On request and every afternoon at 16:30",
    responsibilities: ["Match jobs to skills and free time", "Find windows for multi-week installations", "Spot clashes with service visits, installs and leave", "Propose resolutions"],
    sources: ["Engineers", "Schedule", "Installations", "Service visits", "Leave"],
    approvals: "Bookings that move other work wait for Charlie's approval.",
    preview: "Niall is double-booked Monday.",
    thread: [
      { kind: "stamp", text: "Yesterday 16:40" },
      { kind: "agent", text: "Niall is down for the Celbridge access control install all Monday and the Dunboyne intercom callout. one of them has to move." },
      { kind: "user", text: "any room for the boyne valley fire alarm job in december?" },
      { kind: "agent", text: "tight but yes: Declan and Ciarán from Tue 1 Dec to Mon 21 Dec. Ciarán is on leave the 21st, Niall can cover that day. the clean option is Mon 4 Jan to Fri 22 Jan. it's in the installation planner." },
    ],
  },
  {
    id: "service", name: "Service Planning", shape: "low-dome", tint: "#2b1b1e", state: "waiting", when: "Wed",
    role: "Prepares each month's PPM schedule from the service contracts",
    schedule: "7 days before month end",
    responsibilities: ["Review active contracts and asset frequencies", "Generate proposed service visits", "Match engineers and group nearby sites", "Prevent duplicate visits and charges"],
    sources: ["Service contracts", "Asset register", "Engineers", "Schedule"],
    approvals: "The monthly plan is booked only when Charlie approves it.",
    preview: "December: 12 visits due, ready to plan.",
    thread: [
      { kind: "stamp", text: "Wednesday 18:00" },
      { kind: "agent", text: "December has 12 visits due across 12 contracts: 8 fire and lighting, 2 surveillance and 2 grounds. Allendale Court has both fire and CCTV due the same week." },
      { kind: "agent", text: "three November visits were carried over and still have nobody on them: Brady's CCTV, Boyne Valley extinguishers and Castleknock Gate fire alarm." },
    ],
  },
  {
    id: "invoice", name: "Invoice", shape: "executive-capsule", tint: "#2a2118", state: "waiting", when: "07:10",
    role: "Builds invoices from completed work and finds any historical invoice in seconds",
    schedule: "When a job is completed, and at 07:10 daily",
    responsibilities: ["Consolidate every visit, hour and material into one invoice", "Use the right division series (LFL, M, LPM)", "Prepare recurring contract invoices", "Retrieve historical invoices", "Flag billing delays"],
    sources: ["Jobs", "Time entries", "Materials", "Service contracts", "Invoice register"],
    approvals: "Every invoice waits for Charlie's approval before it is numbered or sent.",
    preview: "Draft for J-4558 ready, €658 net.",
    thread: [
      { kind: "stamp", text: "Today 07:10" },
      { kind: "agent", text: "drafted the Phoenix House invoice from J-4558: 3.5 hours at €80 and two dome cameras, €658 net. it'll take the next Surveillance Systems number when you approve it." },
      { kind: "user", text: "what did we bill allendale last november" },
      { kind: "agent", text: "nothing contract-billed at Allendale in November: their fire contract bills quarterly, next on 1 December. the last Allendale invoice is in the register under Customers › Allendale." },
    ],
  },
  {
    id: "quoting", name: "Quoting", shape: "glass-visor", tint: "#1b2430", state: "complete", when: "Tue",
    role: "Writes detailed proposals from the approved catalogue and survey notes",
    schedule: "On request",
    responsibilities: ["Build quotes from approved products and prices", "Write 10-section proposals", "Never invent specifications or certifications", "Convert accepted quotes into jobs"],
    sources: ["Products and services", "Quote templates", "Survey notes", "Customers and sites"],
    approvals: "Sending a quote to a customer waits for Charlie.",
    preview: "Q-2606 proposal for Boyne Valley written.",
    thread: [
      { kind: "stamp", text: "Tuesday 14:20" },
      { kind: "agent", text: "the Boyne Valley Foods proposal (Q-2606) is written: 10 sections, 9 catalogue lines, 15 working days with two engineers. i only used products from the approved catalogue and Ciarán's survey notes." },
    ],
  },
  {
    id: "comms", name: "Customer Communication", shape: "wide-eyed", tint: "#1f2a10", state: "waiting", when: "Thu",
    role: "Drafts completion notices, appointment reminders and payment follow-ups",
    schedule: "Daily at 09:00, and after each completion",
    responsibilities: ["Completion confirmations before invoices", "Appointment reminders the day before", "Service visit confirmations", "Polite payment reminders"],
    sources: ["Jobs", "Contacts", "Invoices", "Schedule"],
    approvals: "Nothing reaches a customer without Charlie's yes. Access codes are never included.",
    preview: "Reminder for Brady's drafted, not sent.",
    thread: [
      { kind: "stamp", text: "Thursday 09:00" },
      { kind: "agent", text: "drafted a first, polite reminder to Brady's Foodmarket for their overdue invoice. it's in Approvals, nothing has been sent." },
    ],
  },
];

export const agentMeta = (id: string) => AGENTS.find((a) => a.id === id);
