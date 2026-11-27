/* Demonstration data. Every customer, engineer, price and contract here is
   invented for the demo and is not a real business record. Reference date is
   Friday 27 November 2026. All figures on the dashboard are computed from
   these records, never typed in. */

import { COMPANY, DIVISIONS, type DivisionId } from "./config";
import { addDays, addMonths, isWorkingDay, workingDaysBetween } from "./dates";
import type {
  Asset, AssetType, Automation, Communication, Contact, Customer, DocumentRec, Engineer, Enquiry, FMState,
  InstallBooking, Invoice, InvoiceLine, Job, LogEvent, MaterialLine, Payment, Product, Proposal, Purchase,
  Quote, ServiceContract, ServiceVisit, Site, TimeEntry, Visit, AgentRun, QuoteLine, PipelineStage,
} from "./types";

const T = COMPANY.today;

/* ── Engineers ───────────────────────────────────────────────────────────── */
export const ENGINEERS: Engineer[] = [
  { id: "e1", name: "Declan Murphy", initials: "DM", title: "Senior fire engineer", skills: ["Fire", "Emergency lighting", "Extinguishers"], divisions: ["LFL"], color: "#f0a58c", phone: "087 214 5521", holidays: [] },
  { id: "e2", name: "Ciarán Byrne", initials: "CB", title: "Fire and lighting engineer", skills: ["Fire", "Emergency lighting"], divisions: ["LFL"], color: "#e6c78a", phone: "086 338 0914", holidays: ["2026-12-21", "2026-12-22", "2026-12-23"] },
  { id: "e3", name: "Shane Kavanagh", initials: "SK", title: "Security systems engineer", skills: ["CCTV", "Access control", "Intercom"], divisions: ["SS"], color: "#9fd6f0", phone: "085 771 2036", holidays: [] },
  { id: "e4", name: "Niall Dempsey", initials: "ND", title: "Security and fire engineer", skills: ["CCTV", "Intercom", "Access control", "Fire"], divisions: ["SS", "LFL"], color: "#c8b4f0", phone: "087 902 6648", holidays: ["2026-12-14", "2026-12-15", "2026-12-16", "2026-12-17", "2026-12-18"] },
  { id: "e5", name: "Paddy Farrell", initials: "PF", title: "Maintenance supervisor", skills: ["Maintenance", "Gardening"], divisions: ["LPM"], color: "#a8e0c0", phone: "083 450 1187", holidays: ["2026-11-30"] },
  { id: "e6", name: "Gavin Doyle", initials: "GD", title: "Maintenance technician", skills: ["Maintenance", "Gardening", "Extinguishers"], divisions: ["LPM", "LFL"], color: "#f0d48c", phone: "089 623 4470", holidays: [], arrangement: "Finishes 15:00 on Fridays (agreed flexible working)" },
];

/* ── Customers and sites ─────────────────────────────────────────────────── */
type SiteSeed = [string, string, string, string, string, string, string];
// [name, address, town, county, eircode, access notes, access code]
const CUST: [string, Customer["kind"], DivisionId[], string, SiteSeed[], [string, string][]][] = [
  ["Allendale Management CLG", "Management company", ["LFL", "SS", "LPM"], "Managed through Ardee Block Management. Fire and CCTV on contract since 2021.", [
    ["Allendale Court", "1-48 Allendale Court, Ongar Road", "Clonsilla", "Dublin 15", "D15 X2K7", "Plant room off the basement car park. Report to the concierge desk.", "Plant room 4417#, alarm fob in key safe C2"],
    ["Allendale Retail Centre", "Allendale Retail Centre, Clonsilla Road", "Clonsilla", "Dublin 15", "D15 R6P2", "Fire panel in the management office behind unit 3.", "Office key safe 2209"]],
    [["Gráinne Healy", "Property manager"], ["Tom Brophy", "Concierge"]]],
  ["Ardmore Property Management", "Management company", ["LFL", "SS", "LPM"], "Largest management-company client. Five blocks across north Kildare.", [
    ["Ardmore House", "Ardmore House, Main Street", "Lucan", "Dublin", "K78 F3D1", "Reception open 09:00-17:00.", "Comms room 1180"],
    ["The Willows Apartments", "The Willows, Esker Road", "Lucan", "Dublin", "K78 W9T5", "Use the visitor bays at the rear. Stairwell keys from the caretaker.", "Caretaker store 6031#"],
    ["Riverbank Court", "Riverbank Court, Captain's Hill", "Leixlip", "Kildare", "W23 K8N4", "Grounds access via the side gate on Mill Lane.", "Side gate padlock 4420"],
    ["Millbrook Apartments", "Millbrook, Maynooth Road", "Celbridge", "Kildare", "W23 P2C6", "Intercom panel at the main door. Caretaker on site mornings.", "Main door trade code 7741*"],
    ["Ardmore Mews", "Ardmore Mews, Straffan Road", "Maynooth", "Kildare", "W23 H5X8", "Small block. Ring the property manager before arriving.", "Meter room 3304"]],
    [["Orla Keegan", "Portfolio manager"], ["Brian Nolan", "Caretaker"]]],
  ["Celbridge Business Campus Ltd", "Commercial", ["LFL", "SS"], "Two office blocks. Access control upgrade in progress on Block B.", [
    ["Block A", "Block A, Celbridge Business Campus", "Celbridge", "Kildare", "W23 A1C4", "Sign in at Block A reception.", "Server room 5512"],
    ["Block B", "Block B, Celbridge Business Campus", "Celbridge", "Kildare", "W23 A1C5", "Sign in at Block A reception, then escorted.", "Riser cupboard 5513"]],
    [["Mark Fennelly", "Facilities manager"]]],
  ["St. Brigid's Nursing Home", "Healthcare", ["LFL", "LPM"], "Healthcare site. Fire testing must be arranged with the nurse in charge.", [
    ["St. Brigid's Nursing Home", "Church Road", "Kilcock", "Kildare", "W23 N7R2", "Call ahead. No testing during 12:00-14:00 meal service.", "Staff entrance 2580#"]],
    [["Siobhán Walsh", "Director of nursing"], ["Pat Geraghty", "Maintenance"]]],
  ["Maynooth Enterprise Centre", "Commercial", ["LFL", "SS", "LPM"], "Shared enterprise building with 22 tenants.", [
    ["Maynooth Enterprise Centre", "Dublin Road", "Maynooth", "Kildare", "W23 E4M9", "Centre manager's office on the ground floor.", "Plant room 9001"]],
    [["Deirdre Lynch", "Centre manager"]]],
  ["Brady's Foodmarket", "Retail", ["SS", "LFL"], "Independent supermarket. Long-standing CCTV customer.", [
    ["Brady's Foodmarket Navan", "Kennedy Road", "Navan", "Meath", "C15 B8R3", "Deliveries yard at the back. Ask for the duty manager.", "Cash office 1122 (manager present only)"]],
    [["Eamon Brady", "Owner"]]],
  ["Hillview National School", "Education", ["LFL", "LPM"], "Primary school. Work outside school hours where possible.", [
    ["Hillview National School", "Fairyhouse Road", "Ratoath", "Meath", "A85 H6V1", "School hours 08:40-14:40. Sign in at the office.", "Caretaker 3390"]],
    [["Ms. Aisling Daly", "Principal"]]],
  ["Greystones Marina Apartments OMC", "Management company", ["LFL", "SS"], "Two seafront blocks with dry risers.", [
    ["Marina Block A", "Block A, Marina Village", "Greystones", "Wicklow", "A63 M2K1", "Visitor parking on the marina side.", "Dry riser cabinet key 77, entrance 4545#"],
    ["Marina Block B", "Block B, Marina Village", "Greystones", "Wicklow", "A63 M2K2", "Same as Block A.", "Entrance 4546#"]],
    [["Peter Coakley", "OMC secretary"]]],
  ["Kilcullen Logistics Ltd", "Industrial", ["SS", "LFL"], "Two warehouses. 24/7 operation.", [
    ["Warehouse 1", "Unit 1, Kilcullen Business Park", "Kilcullen", "Kildare", "R56 K2L3", "Hi-vis required. Report to the transport office.", "Security office 8080"],
    ["Warehouse 2", "Unit 2, Kilcullen Business Park", "Kilcullen", "Kildare", "R56 K2L4", "Hi-vis required. Yard is live with forklifts.", "Security office 8080"]],
    [["Ronan Delaney", "Operations manager"]]],
  ["Dunboyne Medical Centre", "Healthcare", ["LFL", "SS"], "GP practice and pharmacy.", [
    ["Dunboyne Medical Centre", "Main Street", "Dunboyne", "Meath", "A86 D3F7", "Use the staff door at the side. Patients present in reception.", "Staff door 1972"]],
    [["Dr. Karen Moran", "Practice owner"], ["Lisa Carroll", "Practice manager"]]],
  ["Harbourview Hotel", "Hospitality", ["LFL", "SS", "LPM"], "62-bedroom hotel. Fire systems on a monthly contract.", [
    ["Harbourview Hotel", "The Harbour", "Malahide", "Dublin", "K36 H4P9", "Report to the duty manager at reception.", "Fire panel room 6262"]],
    [["Conor Whelan", "General manager"]]],
  ["Ashbourne Retail Park Management", "Retail", ["LFL", "SS", "LPM"], "Twelve-unit retail park. Grounds on a monthly plan.", [
    ["Ashbourne Retail Park, Units 1-6", "Units 1-6, Ashbourne Retail Park", "Ashbourne", "Meath", "A84 R5T1", "Management office at Unit 6.", "Landlord riser 4141"],
    ["Ashbourne Retail Park, Units 7-12", "Units 7-12, Ashbourne Retail Park", "Ashbourne", "Meath", "A84 R5T2", "Management office at Unit 6.", "Landlord riser 4142"]],
    [["Michelle Tierney", "Park manager"]]],
  ["Leixlip Industrial Estate OMC", "Industrial", ["SS", "LPM"], "Estate-wide CCTV and grounds.", [
    ["Leixlip Industrial Estate, Phase 1", "Phase 1, Leixlip Industrial Estate", "Leixlip", "Kildare", "W23 L9E1", "Estate office at the entrance barrier.", "Barrier 0909"],
    ["Leixlip Industrial Estate, Phase 2", "Phase 2, Leixlip Industrial Estate", "Leixlip", "Kildare", "W23 L9E2", "Estate office at the entrance barrier.", "Barrier 0909"],
    ["Leixlip Industrial Estate, Grounds", "Common areas, Leixlip Industrial Estate", "Leixlip", "Kildare", "W23 L9E3", "Grounds equipment store behind Phase 2.", "Store padlock 3131"]],
    [["Declan Hogan", "Estate manager"]]],
  ["Lakeside Credit Union", "Commercial", ["SS", "LFL"], "Branch office. Security-sensitive.", [
    ["Lakeside Credit Union Blessington", "Main Street", "Blessington", "Wicklow", "W91 L2C8", "Arrive before 09:30 or after 16:30 only.", "Released by branch manager in person"]],
    [["Joan Kinsella", "Branch manager"]]],
  ["Boyne Valley Foods Ltd", "Industrial", ["LFL", "SS"], "Food production plant. Fire alarm replacement under quotation.", [
    ["Boyne Valley Foods, Production", "Production Hall, Mell Industrial Estate", "Drogheda", "Louth", "A92 B4F2", "Food-safe PPE and hair nets required. Induction at security.", "Security gate 2468"],
    ["Boyne Valley Foods, Cold Store", "Cold Store, Mell Industrial Estate", "Drogheda", "Louth", "A92 B4F3", "Thermal PPE supplied on site.", "Security gate 2468"],
    ["Boyne Valley Foods, Offices", "Offices, Mell Industrial Estate", "Drogheda", "Louth", "A92 B4F4", "Reception on the ground floor.", "Security gate 2468"]],
    [["Niamh Clarke", "Health and safety manager"], ["Alan Reilly", "Plant manager"]]],
  ["Curragh Leisure Centre", "Community", ["LFL", "LPM"], "Community leisure centre with pool and gym.", [
    ["Curragh Leisure Centre", "Athgarvan Road", "Newbridge", "Kildare", "W12 C7L3", "Duty manager at the front desk.", "Plant room 7070"]],
    [["Karl Byrne", "Centre manager"]]],
  ["Phoenix House Offices", "Commercial", ["SS", "LFL"], "Multi-tenant office building.", [
    ["Phoenix House", "Phoenix House, North Circular Road", "Dublin 7", "Dublin", "D07 P8H3", "Loading bay entrance on the side street.", "Comms room 7007"]],
    [["Sarah Quinn", "Building manager"]]],
  ["Castleknock Gate OMC", "Management company", ["LPM", "LFL"], "Two apartment blocks. Maintenance and fire.", [
    ["Castleknock Gate, Block 1", "Block 1, Castleknock Gate", "Castleknock", "Dublin 15", "D15 C1G1", "Caretaker office in Block 1 lobby.", "Bin store 1515"],
    ["Castleknock Gate, Block 2", "Block 2, Castleknock Gate", "Castleknock", "Dublin 15", "D15 C1G2", "Caretaker office in Block 1 lobby.", "Bin store 1515"]],
    [["Fergal Ryan", "OMC director"]]],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 14);

export const CUSTOMERS: Customer[] = [];
export const SITES: Site[] = [];
export const CONTACTS: Contact[] = [];
let siteN = 0;
CUST.forEach((c, i) => {
  const id = "c" + (i + 1);
  const dom = slug(c[0]) + ".ie";
  CUSTOMERS.push({ id, name: c[0], kind: c[1], divisions: c[2], accountsEmail: "accounts@" + dom, phone: "01 6" + String(100000 + i * 3719).slice(-6), paymentTerms: c[1] === "Management company" ? 45 : 30, since: String(2014 + (i % 9)), notes: c[3] });
  c[4].forEach((s) => {
    siteN++;
    SITES.push({ id: "s" + siteN, customerId: id, name: s[0], address: s[1], town: s[2], county: s[3], eircode: s[4], accessNotes: s[5], accessCode: s[6], keyholder: c[5][c[5].length - 1][0] });
  });
  c[5].forEach((p, k) => {
    const first = p[0].replace(/^(Ms\.|Dr\.)\s/, "").split(" ")[0].toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
    CONTACTS.push({ id: "p" + (CONTACTS.length + 1), customerId: id, name: p[0], role: p[1], email: first + "@" + dom, phone: "08" + (5 + (k % 3)) + " " + String(200 + i * 37).slice(-3) + " " + String(1000 + i * 271 + k * 97).slice(-4), primary: k === 0 });
  });
});
const siteOf = (id: string) => SITES.find((s) => s.id === id)!;

/* ── Assets ──────────────────────────────────────────────────────────────── */
export const ASSETS: Asset[] = [];
const addAsset = (siteId: string, type: AssetType, description: string, location: string, installed: string, every: number, last: string) =>
  ASSETS.push({ id: "a" + (ASSETS.length + 1), siteId, type, description, location, installed, frequencyMonths: every, lastService: last });

SITES.forEach((s, i) => {
  const cust = CUSTOMERS.find((c) => c.id === s.customerId)!;
  const yr = String(2012 + (i % 11));
  if (cust.divisions.includes("LFL")) {
    addAsset(s.id, "Fire alarm", (i % 3 === 0 ? "Addressable 2-loop panel, " : "Addressable 4-loop panel, ") + (18 + (i * 7) % 60) + " devices", "Main entrance / plant room", yr, 3, addDays(T, -((i * 11) % 80) - 10));
    addAsset(s.id, "Emergency lighting", (12 + (i * 5) % 40) + " self-contained LED fittings", "Common areas and stairwells", yr, 6, addDays(T, -((i * 13) % 150) - 20));
    if (i % 2 === 0) addAsset(s.id, "Fire extinguishers", (6 + (i % 9)) + " extinguishers (foam and CO2)", "Throughout", yr, 12, addDays(T, -((i * 17) % 300) - 30));
  }
  if (cust.divisions.includes("SS")) {
    addAsset(s.id, "CCTV", (8 + (i * 3) % 24) + "-camera IP system with NVR", "Comms room", String(2016 + (i % 9)), 6, addDays(T, -((i * 19) % 170) - 15));
    if (cust.kind === "Management company" || cust.kind === "Commercial") addAsset(s.id, i % 2 ? "Access control" : "Intercom", i % 2 ? "Proximity access, " + (2 + i % 6) + " doors" : "Video intercom, entrance and " + (12 + i % 30) + " apartments", "Main entrance", String(2015 + (i % 10)), 12, addDays(T, -((i * 23) % 330) - 30));
  }
  if (cust.divisions.includes("LPM") && (cust.kind === "Management company" || cust.kind === "Retail" || cust.kind === "Industrial")) {
    addAsset(s.id, "Grounds", "Landscaped common areas and car park", "External", "Not applicable", 1, addDays(T, -((i * 7) % 28) - 3));
  }
});
// Specific assets used in the stories.
addAsset("s14", "Dry riser", "Dry riser, 6 landing valves", "Stairwell core A", "2009", 6, "2026-06-16");
addAsset("s15", "Dry riser", "Dry riser, 6 landing valves", "Stairwell core B", "2009", 6, "2026-06-16");
addAsset("s19", "Hose reels", "4 hose reels, kitchen and corridors", "Ground and first floor", "2011", 12, "2025-12-07");
const assetsAt = (siteId: string, type?: AssetType) => ASSETS.filter((a) => a.siteId === siteId && (!type || a.type === type)).map((a) => a.id);

/* ── Products and services (45) ─────────────────────────────────────────── */
type P = [string, DivisionId, Product["category"], string, string, number, string];
const PRODUCT_ROWS: P[] = [
  ["FA-OPT", "LFL", "Equipment", "Optical smoke detector (addressable)", "each", 38, "Addressable optical smoke detector with base"],
  ["FA-HEAT", "LFL", "Equipment", "Heat detector (addressable)", "each", 34, "Rate-of-rise heat detector with base"],
  ["FA-MULTI", "LFL", "Equipment", "Multi-sensor detector (addressable)", "each", 52, "Combined optical and heat detector"],
  ["FA-MCP", "LFL", "Equipment", "Manual call point", "each", 29, "Resettable addressable call point"],
  ["FA-SB", "LFL", "Equipment", "Sounder beacon", "each", 68, "Addressable sounder with visual beacon"],
  ["FA-ZIM", "LFL", "Equipment", "Zone interface module", "each", 120, "Loop-powered zone interface module"],
  ["FA-P2", "LFL", "Equipment", "Addressable fire panel, 2-loop", "each", 1850, "2-loop addressable control panel"],
  ["FA-P4", "LFL", "Equipment", "Addressable fire panel, 4-loop", "each", 2950, "4-loop addressable control panel with network card"],
  ["FA-BAT", "LFL", "Material", "Panel standby batteries 12V 7Ah (pair)", "pair", 48, "Sealed lead-acid standby batteries"],
  ["FA-CAB", "LFL", "Material", "Fire-rated cable and terminations", "lot", 35, "FP200 cable, glands, clips and terminations"],
  ["EL-BH", "LFL", "Equipment", "LED emergency bulkhead, 3-hour", "each", 54, "Self-contained maintained bulkhead"],
  ["EL-EXIT", "LFL", "Equipment", "LED exit sign", "each", 72, "Self-contained exit sign with legend"],
  ["EL-DL", "LFL", "Equipment", "Emergency downlight", "each", 61, "Non-maintained recessed emergency downlight"],
  ["EX-FOAM", "LFL", "Equipment", "6kg foam extinguisher", "each", 58, "6 litre AFFF foam extinguisher"],
  ["EX-CO2", "LFL", "Equipment", "2kg CO2 extinguisher", "each", 64, "2kg CO2 extinguisher with horn"],
  ["HR-KIT", "LFL", "Material", "Hose reel service kit", "each", 45, "Seals, nozzle and valve parts"],
  ["DR-VALVE", "LFL", "Equipment", "Dry riser inlet valve", "each", 165, "2-way inlet breeching valve"],
  ["LAB-FIRE", "LFL", "Labour", "Fire engineer labour", "hour", 80, "Qualified fire alarm and emergency lighting engineer"],
  ["INS-FIRE", "LFL", "Installation", "Installation day, two engineers", "day", 1150, "Two-person installation crew, per working day"],
  ["COM-FIRE", "LFL", "Installation", "Commissioning, testing and handover", "lot", 450, "Commissioning, cause-and-effect testing and handover pack"],
  ["DES-FIRE", "LFL", "Installation", "System design and drawings", "lot", 380, "Device layout drawings and zone plan"],
  ["CC-DOME", "SS", "Equipment", "4MP IP dome camera", "each", 189, "Vandal-resistant IR dome camera"],
  ["CC-BULLET", "SS", "Equipment", "8MP IP bullet camera", "each", 245, "Long-range IR bullet camera"],
  ["CC-PTZ", "SS", "Equipment", "PTZ camera", "each", 890, "Pan-tilt-zoom camera, 25x optical"],
  ["CC-NVR8", "SS", "Equipment", "8-channel NVR", "each", 420, "8-channel network video recorder"],
  ["CC-NVR16", "SS", "Equipment", "16-channel NVR", "each", 690, "16-channel network video recorder"],
  ["CC-HDD", "SS", "Material", "Surveillance hard drive 4TB", "each", 135, "Surveillance-grade 4TB drive"],
  ["CC-POE", "SS", "Equipment", "16-port PoE switch", "each", 310, "Managed PoE network switch"],
  ["AC-CTRL", "SS", "Equipment", "Access controller, 2-door", "each", 380, "Networked 2-door access controller"],
  ["AC-READ", "SS", "Equipment", "Proximity reader", "each", 95, "Weatherproof proximity reader"],
  ["AC-MAG", "SS", "Equipment", "Maglock 600lb", "each", 110, "Monitored magnetic lock with bracket"],
  ["AC-FOB", "SS", "Material", "Proximity fobs (pack of 10)", "pack", 45, "Programmed proximity fobs"],
  ["IC-DOOR", "SS", "Equipment", "Video intercom door station", "each", 520, "Vandal-resistant video door station"],
  ["IC-MON", "SS", "Equipment", "Apartment video monitor", "each", 165, "Indoor monitor with door release"],
  ["LAB-SEC", "SS", "Labour", "Security engineer labour", "hour", 80, "CCTV, access control and intercom engineer"],
  ["INS-SEC", "SS", "Installation", "Installation and configuration", "day", 980, "Two-person installation crew, per working day"],
  ["LAB-MAINT", "LPM", "Labour", "Maintenance technician labour", "hour", 60, "General maintenance technician"],
  ["GR-VISIT", "LPM", "Maintenance plan", "Grounds maintenance visit", "visit", 180, "Two-person gardening and grounds visit"],
  ["GR-GULLY", "LPM", "Maintenance plan", "Gully and drain cleaning", "site", 140, "Gully clearing and drain flush"],
  ["MT-PAINT", "LPM", "Material", "Trade emulsion 10L", "tin", 78, "Durable trade emulsion"],
  ["MT-CLOSER", "LPM", "Equipment", "Door closer, size 2-4", "each", 85, "Overhead door closer"],
  ["MT-TILE", "LPM", "Material", "Ceiling tiles (box of 8)", "box", 42, "600×600 mineral fibre tiles"],
  ["MT-GUTTER", "LPM", "Material", "Gutter section and fittings", "lot", 50, "PVC gutter, brackets and joints"],
  ["MT-LOCK", "LPM", "Equipment", "Euro lock cylinder", "each", 38, "Anti-snap euro cylinder"],
  ["PL-GROUNDS", "LPM", "Maintenance plan", "Monthly grounds plan", "month", 650, "Monthly grounds and landscaping plan"],
];
export const PRODUCTS: Product[] = PRODUCT_ROWS.map((r, i) => ({ id: "pr" + (i + 1), sku: r[0], division: r[1], category: r[2], name: r[3], unit: r[4], price: r[5], description: r[6] }));
const prod = (sku: string) => PRODUCTS.find((p) => p.sku === sku)!;

/* ── Service contracts (16) ─────────────────────────────────────────────── */
type CT = [string, string, DivisionId, string, [AssetType, number, number, string][], ServiceContract["billing"], number, string, string];
// [customerId, siteId, division, title, schedule[type, everyMonths, hours, nextDue], billing, amount, nextBilling, access]
const CT_ROWS: CT[] = [
  ["c1", "s1", "LFL", "Fire alarm and emergency lighting maintenance", [["Fire alarm", 3, 3, "2026-12-08"], ["Emergency lighting", 6, 1.5, "2026-12-08"]], "quarterly", 1140, "2026-12-01", "Concierge to release plant room. Notify residents 24h before sounder test."],
  ["c1", "s1", "SS", "CCTV maintenance", [["CCTV", 6, 2, "2026-12-10"]], "per-visit", 380, "2026-12-10", "Comms room in basement. Concierge escort."],
  ["c2", "s4", "LFL", "Fire safety maintenance, The Willows", [["Fire alarm", 3, 2.5, "2026-12-03"], ["Emergency lighting", 6, 1.5, "2026-12-03"]], "monthly", 310, "2026-12-01", "Caretaker holds stairwell keys."],
  ["c2", "s5", "LPM", "Grounds maintenance, Riverbank Court", [["Grounds", 1, 6, "2026-12-02"]], "monthly", 650, "2026-12-01", "Side gate on Mill Lane."],
  ["c3", "s8", "LFL", "Fire systems maintenance, Block A", [["Fire alarm", 3, 3, "2026-12-04"], ["Fire extinguishers", 12, 1.5, "2026-12-04"]], "quarterly", 980, "2026-12-01", "Sign in at Block A reception."],
  ["c4", "s10", "LFL", "Fire alarm and emergency lighting, healthcare", [["Fire alarm", 3, 3, "2026-12-09"], ["Emergency lighting", 3, 2, "2026-12-09"]], "monthly", 420, "2026-12-01", "Agree test time with nurse in charge. No testing 12:00-14:00."],
  ["c5", "s11", "SS", "CCTV and access control maintenance", [["CCTV", 6, 2, "2026-12-11"], ["Access control", 12, 1.5, "2026-12-11"]], "per-visit", 540, "2026-12-11", "Centre manager to notify tenants."],
  ["c6", "s12", "SS", "CCTV maintenance", [["CCTV", 6, 2, "2027-01-14"]], "per-visit", 340, "2027-01-14", "Before 09:00 preferred."],
  ["c7", "s13", "LFL", "Fire alarm and emergency lighting, school", [["Fire alarm", 3, 2, "2026-12-15"], ["Emergency lighting", 6, 1.5, "2026-12-15"]], "quarterly", 640, "2026-12-01", "Outside school hours or during lunch break by arrangement."],
  ["c8", "s14", "LFL", "Dry riser and fire alarm maintenance", [["Fire alarm", 3, 2, "2026-12-16"], ["Dry riser", 6, 2, "2026-12-16"]], "per-visit", 720, "2026-12-16", "Dry riser cabinet keys from OMC secretary."],
  ["c9", "s16", "SS", "CCTV maintenance, both warehouses", [["CCTV", 3, 3, "2027-02-03"]], "quarterly", 860, "2027-02-01", "Hi-vis required, live yard."],
  ["c10", "s18", "LFL", "Fire alarm maintenance", [["Fire alarm", 3, 2, "2026-12-17"]], "quarterly", 520, "2026-12-01", "Staff door at the side. Avoid surgery hours for sounder tests."],
  ["c11", "s19", "LFL", "Fire systems, hotel", [["Fire alarm", 3, 3, "2026-12-07"], ["Emergency lighting", 3, 2, "2026-12-07"], ["Hose reels", 12, 1.5, "2026-12-07"]], "monthly", 890, "2026-12-01", "Duty manager to warn guests. Sounder test 11:00 only."],
  ["c12", "s20", "LPM", "Grounds maintenance plan", [["Grounds", 1, 7, "2026-12-18"]], "monthly", 780, "2026-12-01", "Management office at Unit 6."],
  ["c15", "s26", "LFL", "Fire alarm and extinguisher maintenance", [["Fire alarm", 3, 3, "2027-01-20"], ["Fire extinguishers", 12, 2, "2027-01-20"]], "quarterly", 1180, "2027-01-01", "Food-safe PPE and induction."],
  ["c18", "s31", "LFL", "Fire alarm maintenance, Block 1", [["Fire alarm", 3, 2, "2027-03-02"]], "quarterly", 460, "2027-03-01", "Caretaker office in Block 1."],
];
const annual = (b: ServiceContract["billing"], amt: number, sched: CT[4]) =>
  b === "monthly" ? amt * 12 : b === "quarterly" ? amt * 4 : b === "annual" ? amt : Math.round(amt * (12 / Math.min(...sched.map((s) => s[1]))));
export const CONTRACTS: ServiceContract[] = CT_ROWS.map((r, i) => ({
  id: "ct" + (i + 1), ref: "SC-" + (2201 + i), customerId: r[0], siteId: r[1], division: r[2], title: r[3],
  schedule: r[4].map((s) => ({ type: s[0], everyMonths: s[1], hours: s[2], nextDue: s[3] })),
  billing: r[5], billingAmount: r[6], annualValue: annual(r[5], r[6], r[4]),
  startDate: (2021 + (i % 4)) + "-0" + (1 + (i % 9)) + "-01", renewalDate: (i === 9 || i === 13 ? "2027-01-31" : (2027 + (i % 2)) + "-0" + (1 + (i % 9)) + "-01"),
  nextBillingDate: r[7],
  lastBilledPeriod: r[5] === "monthly" ? "2026-11" : r[5] === "quarterly" ? "2026-09" : "2026-06",
  status: i === 9 || i === 13 ? "renewal due" : "active", accessRequirements: r[8],
}));
CONTRACTS.forEach((c) => ASSETS.filter((a) => a.siteId === c.siteId && c.schedule.some((s) => s.type === a.type)).forEach((a) => (a.contractId = c.id)));

/* ── Jobs (28) ──────────────────────────────────────────────────────────── */
export const JOBS: Job[] = [];
export const VISITS: Visit[] = [];
export const TIME: TimeEntry[] = [];
export const MATERIALS: MaterialLine[] = [];
export const BOOKINGS: InstallBooking[] = [];

const engName = (id: string) => ENGINEERS.find((e) => e.id === id)!.name;
type JobSeed = Partial<Job> & Pick<Job, "number" | "siteId" | "division" | "type" | "priority" | "status" | "engineerIds" | "scheduled" | "description" | "createdAt">;
function job(s: JobSeed): Job {
  const site = siteOf(s.siteId);
  const j: Job = {
    id: "j" + s.number.slice(2),
    woRef: s.woRef ?? (site.customerId === "c1" || site.customerId === "c2" ? "WO-" + (88000 + Number(s.number.slice(2)) * 3) : ""),
    customerId: site.customerId,
    assetIds: s.assetIds ?? [],
    internalNotes: [],
    completionNotes: "",
    photos: [],
    billedVia: "job",
    estHours: 3,
    source: "Phone",
    history: [{ at: s.createdAt + " 08:40", who: "Sinéad Kelly", text: "Job created from " + (s.source || "Phone").toLowerCase() + " request" }],
    ...s,
  } as Job;
  JOBS.push(j);
  return j;
}
let vN = 0, tN = 0, mN = 0;
function visit(jobId: string, engineerId: string, date: string, start: string, end: string, hours: number, summary: string, returnRequired = false) {
  const id = "v" + ++vN;
  VISITS.push({ id, jobId, engineerId, date, start, end, hours, summary, returnRequired, locationVerified: "arrival+departure" });
  TIME.push({ id: "t" + ++tN, engineerId, date, hours, kind: "billable", jobId, visitId: id, note: summary.split(".")[0], approved: date < "2026-11-23", corrections: [] });
  return id;
}
function mat(jobId: string, sku: string | null, description: string, qty: number, unitPrice: number, by: string, date: string) {
  MATERIALS.push({ id: "m" + ++mN, jobId, productId: sku ? prod(sku).id : undefined, description, qty, unitPrice, addedBy: by, date });
}
const hist = (j: Job, at: string, who: string, text: string) => j.history.push({ at, who, text });
const photo = (j: Job, caption: string, by: string, at: string, hue: number) => j.photos.push({ id: "ph" + (j.photos.length + 1) + j.id, caption, by, at, hue });

/* New jobs (5) */
job({ number: "J-4573", siteId: "s29", division: "LFL", type: "Inspection", priority: "Normal", status: "new", engineerIds: ["e6"], scheduled: "2026-12-01", description: "Replace and recommission fire extinguishers after a discharge in the gym. Two 6kg foam units used.", createdAt: "2026-11-25", estHours: 1.5, assetIds: assetsAt("s29", "Fire extinguishers") });
job({ number: "J-4574", siteId: "s21", division: "SS", type: "Reactive callout", priority: "High", status: "new", engineerIds: [], scheduled: null, description: "CCTV camera offline at the Unit 9 car park entrance. Park manager reports no image since Wednesday night.", createdAt: "2026-11-27", estHours: 2, source: "Phone", assetIds: assetsAt("s21", "CCTV") });
job({ number: "J-4575", siteId: "s19", division: "LFL", type: "Repair", priority: "Normal", status: "new", engineerIds: [], scheduled: null, description: "Emergency light fitting failed on the second floor corridor outside room 214. Flagged on the hotel's monthly flick test.", createdAt: "2026-11-27", estHours: 1, source: "Email", assetIds: assetsAt("s19", "Emergency lighting") });
job({ number: "J-4576", siteId: "s32", division: "LPM", type: "Maintenance", priority: "Normal", status: "new", engineerIds: [], scheduled: null, description: "Communal door closer broken on the Block 2 entrance door. Door not closing fully.", createdAt: "2026-11-26", estHours: 1.5, source: "Email" });
job({ number: "J-4577", siteId: "s18", division: "SS", type: "Reactive callout", priority: "High", status: "new", engineerIds: ["e4"], scheduled: "2026-11-30", description: "Reception intercom handset not ringing through to the back office. Patients waiting at the locked door.", createdAt: "2026-11-27", estHours: 1.5 });

/* In progress (8) */
{
  const j = job({ number: "J-4567", woRef: "WO-88231", siteId: "s1", division: "LFL", type: "Repair", priority: "High", status: "progress", engineerIds: ["e1"], scheduled: "2026-11-30", description: "Fire alarm fault on zone 4 (plant room and basement car park). Replace faulty components and retest the zone.", createdAt: "2026-11-19", startedAt: "2026-11-20", estHours: 8, assetIds: assetsAt("s1", "Fire alarm"), returnRequired: true, returnNote: "Zone interface module on order. Return Monday 30 Nov to fit and test." });
  visit(j.id, "e1", "2026-11-20", "08:30", "13:30", 5, "Fault investigation on zone 4. Traced to a failed zone interface module and a damaged cable run in the plant room. Cable run repaired, zone isolated and logged with the concierge.", true);
  mat(j.id, "FA-CAB", "Fire-rated cable and terminations", 1, 35, "Declan Murphy", "2026-11-20");
  photo(j, "Damaged cable run, plant room ceiling void", "Declan Murphy", "2026-11-20 11:02", 14);
  photo(j, "Zone 4 interface module showing fault LED", "Declan Murphy", "2026-11-20 12:15", 200);
  j.internalNotes.push("Zone 4 isolated on the panel. Concierge (Tom Brophy) knows and is doing hourly walk-rounds of the basement until we're back.");
  hist(j, "2026-11-19 09:05", "Sinéad Kelly", "Allocated to Declan Murphy for Friday");
  hist(j, "2026-11-20 08:31", "Declan Murphy", "Arrived on site (location verified)");
  hist(j, "2026-11-20 13:30", "Declan Murphy", "Left site, return required: zone interface module on order");
  hist(j, "2026-11-20 13:42", "Declan Murphy", "Return visit booked for Monday 30 Nov");
}
{
  const j = job({ number: "J-4571", woRef: "BV-PO-5531", siteId: "s26", division: "LFL", type: "Repair", priority: "High", status: "progress", engineerIds: ["e2"], scheduled: "2026-11-20", description: "Fire alarm panel showing an intermittent earth fault on loop 2 in the production hall.", createdAt: "2026-11-19", startedAt: "2026-11-20", estHours: 6, assetIds: assetsAt("s26", "Fire alarm") });
  visit(j.id, "e2", "2026-11-20", "13:00", "16:00", 3, "Intermittent earth fault confirmed on loop 2. Sectioned the loop and narrowed it to the wash-down area.", true);
  visit(j.id, "e2", "2026-11-24", "08:00", "10:00", 2, "Replaced two detector bases affected by moisture. Fault cleared then returned after wash-down.", true);
  mat(j.id, "FA-OPT", "Optical smoke detector (addressable)", 2, 38, "Ciarán Byrne", "2026-11-24");
  j.internalNotes.push("Likely needs IP-rated devices in the wash-down area. Worth a small quote rather than repeat visits.");
}
{
  const j = job({ number: "J-4569", siteId: "s9", division: "SS", type: "Installation", priority: "Normal", status: "progress", engineerIds: ["e3", "e4"], scheduled: "2026-11-23", scheduledEnd: "2026-12-02", description: "Access control upgrade on Block B. Six doors with readers, maglocks and exit buttons on a networked controller.", createdAt: "2026-11-02", startedAt: "2026-11-23", estHours: 64, source: "Quote", agreedPrice: 11840, assetIds: assetsAt("s9") });
  ["2026-11-23", "2026-11-24", "2026-11-25"].forEach((d) => visit(j.id, "e3", d, "08:00", "16:30", 8, "Door hardware, cabling and reader installation, doors " + (d === "2026-11-23" ? "1-2" : d === "2026-11-24" ? "3-4" : "5-6") + "."));
  ["2026-11-23", "2026-11-24", "2026-11-26", "2026-11-27"].forEach((d) => visit(j.id, "e4", d, "08:00", "16:30", 8, d < "2026-11-25" ? "Cable containment and controller mounting." : "Controller configuration and door commissioning."));
  visit(j.id, "e4", "2026-11-25", "13:00", "17:00", 4, "Controller configuration, first three doors live.");
  mat(j.id, "AC-CTRL", "Access controller, 2-door", 3, 380, "Shane Kavanagh", "2026-11-23");
  mat(j.id, "AC-READ", "Proximity reader", 6, 95, "Shane Kavanagh", "2026-11-23");
  mat(j.id, "AC-MAG", "Maglock 600lb", 6, 110, "Niall Dempsey", "2026-11-24");
  BOOKINGS.push({ id: "b1", jobId: j.id, engineerIds: ["e4"], from: "2026-11-23", to: "2026-12-02", label: "Celbridge Block B access control" });
  BOOKINGS.push({ id: "b2", jobId: j.id, engineerIds: ["e3"], from: "2026-11-23", to: "2026-11-25", label: "Celbridge Block B access control" });
  BOOKINGS.push({ id: "b3", jobId: j.id, engineerIds: ["e3"], from: "2026-11-30", to: "2026-12-02", label: "Celbridge Block B access control" });
}
{
  const j = job({ number: "J-4570", siteId: "s4", division: "LPM", type: "Maintenance", priority: "Normal", status: "progress", engineerIds: ["e5", "e6"], scheduled: "2026-11-24", scheduledEnd: "2026-12-01", description: "Repaint stairwell cores 1 and 2, including handrails and skirting.", createdAt: "2026-11-10", startedAt: "2026-11-24", estHours: 40, source: "Quote", agreedPrice: 4280 });
  ["2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27"].forEach((d) => visit(j.id, "e5", d, "08:00", "16:00", 7.5, "Prep and painting, core " + (d < "2026-11-26" ? "1" : "2") + "."));
  ["2026-11-24", "2026-11-25"].forEach((d) => visit(j.id, "e6", d, "08:00", "16:00", 7.5, "Sanding and undercoat, core 1."));
  mat(j.id, "MT-PAINT", "Trade emulsion 10L", 9, 78, "Paddy Farrell", "2026-11-24");
  BOOKINGS.push({ id: "b4", jobId: j.id, engineerIds: ["e5"], from: "2026-11-24", to: "2026-12-01", label: "The Willows stairwell repaint" });
  BOOKINGS.push({ id: "b5", jobId: j.id, engineerIds: ["e6"], from: "2026-11-24", to: "2026-11-25", label: "The Willows stairwell repaint" });
}
{
  const j = job({ number: "J-4565", siteId: "s17", division: "SS", type: "Repair", priority: "High", status: "progress", engineerIds: ["e4"], scheduled: "2026-11-25", description: "NVR not recording on Warehouse 2. Replace failed hard drives and restore recording.", createdAt: "2026-11-24", startedAt: "2026-11-25", estHours: 4, assetIds: assetsAt("s17", "CCTV"), returnRequired: true, returnNote: "Two 4TB drives ordered from Securetech. Due Monday." });
  visit(j.id, "e4", "2026-11-25", "08:30", "10:30", 2, "Two drives failed in the NVR. Recording moved to the remaining drive as a stopgap (3 days retention). Replacements ordered.", true);
}
{
  const j = job({ number: "J-4566", siteId: "s15", division: "LFL", type: "Repair", priority: "High", status: "progress", engineerIds: ["e1"], scheduled: "2026-11-27", description: "Dry riser inlet box damaged at Block B. Replace the inlet breeching valve and pressure test.", createdAt: "2026-11-25", startedAt: "2026-11-26", estHours: 5, assetIds: assetsAt("s15", "Dry riser"), returnRequired: true, returnNote: "Valve collected from supplier this morning. Fitting today." });
  visit(j.id, "e1", "2026-11-26", "14:00", "16:30", 2.5, "Inlet valve cracked and seized. Isolated and made safe, cabinet secured. Valve ordered.", true);
  photo(j, "Cracked inlet valve, Block B cabinet", "Declan Murphy", "2026-11-26 14:40", 30);
}
{
  const j = job({ number: "J-4572", siteId: "s24", division: "LPM", type: "Maintenance", priority: "Normal", status: "progress", engineerIds: ["e6"], scheduled: "2026-11-26", scheduledEnd: "2026-11-27", description: "Winter grounds clearance, leaf removal and gully cleaning across the estate.", createdAt: "2026-11-18", startedAt: "2026-11-26", estHours: 11 });
  visit(j.id, "e6", "2026-11-26", "08:00", "14:00", 6, "Leaf clearance Phase 1 and main avenue. Gullies 1-9 cleared.");
}
{
  const j = job({ number: "J-4568", siteId: "s25", division: "SS", type: "Installation", priority: "Normal", status: "progress", engineerIds: ["e3"], scheduled: "2026-11-26", scheduledEnd: "2026-11-27", description: "Install four additional cameras covering the rear car park and ATM approach.", createdAt: "2026-11-05", startedAt: "2026-11-26", estHours: 12, source: "Quote", agreedPrice: 2960, assetIds: assetsAt("s25", "CCTV") });
  visit(j.id, "e3", "2026-11-26", "08:00", "16:30", 8, "Cabling, brackets and two cameras installed.");
  mat(j.id, "CC-BULLET", "8MP IP bullet camera", 4, 245, "Shane Kavanagh", "2026-11-26");
  BOOKINGS.push({ id: "b6", jobId: j.id, engineerIds: ["e3"], from: "2026-11-26", to: "2026-11-27", label: "Lakeside rear car park cameras" });
}

/* Completed, awaiting invoicing (4) */
{
  const j = job({ number: "J-4558", siteId: "s30", division: "SS", type: "Repair", priority: "Normal", status: "completed", engineerIds: ["e4"], scheduled: "2026-11-18", description: "Replace two failed dome cameras on the third floor landing and stairwell.", createdAt: "2026-11-16", startedAt: "2026-11-18", completedAt: "2026-11-18", completionConfirmedBy: "Niall Dempsey", estHours: 3, assetIds: assetsAt("s30", "CCTV") });
  visit(j.id, "e4", "2026-11-18", "09:00", "12:30", 3.5, "Replaced two failed dome cameras, re-aimed, added to NVR and confirmed recording.");
  mat(j.id, "CC-DOME", "4MP IP dome camera", 2, 189, "Niall Dempsey", "2026-11-18");
  j.completionNotes = "Two failed dome cameras replaced on the third floor. Both cameras recording and visible on the building manager's app.";
  hist(j, "2026-11-18 12:34", "Niall Dempsey", "Marked complete and confirmed work finished");
}
{
  const j = job({ number: "J-4562", siteId: "s13", division: "LFL", type: "Repair", priority: "Normal", status: "completed", engineerIds: ["e2"], scheduled: "2026-11-24", description: "Sounder beacon in the main hall not operating. Replace and retest.", createdAt: "2026-11-20", startedAt: "2026-11-24", completedAt: "2026-11-24", completionConfirmedBy: "Ciarán Byrne", estHours: 2, assetIds: assetsAt("s13", "Fire alarm") });
  visit(j.id, "e2", "2026-11-24", "15:00", "17:00", 2, "Replaced the sounder beacon in the main hall, full sounder test after school hours.");
  mat(j.id, "FA-SB", "Sounder beacon", 1, 68, "Ciarán Byrne", "2026-11-24");
  j.completionNotes = "Sounder beacon replaced in the main hall and all sounders tested. System clear.";
  hist(j, "2026-11-24 17:04", "Ciarán Byrne", "Marked complete and confirmed work finished");
}
{
  const j = job({ number: "J-4563", siteId: "s11", division: "LPM", type: "Maintenance", priority: "Low", status: "completed", engineerIds: ["e5"], scheduled: "2026-11-23", description: "Replace three stained ceiling tiles in the first floor corridor and fix the leaking gutter above.", createdAt: "2026-11-17", startedAt: "2026-11-23", completedAt: "2026-11-23", completionConfirmedBy: "Paddy Farrell", estHours: 4 });
  visit(j.id, "e5", "2026-11-23", "08:00", "12:00", 4, "Gutter joint resealed and bracket replaced. Three ceiling tiles replaced.");
  mat(j.id, "MT-TILE", "Ceiling tiles (box of 8)", 1, 42, "Paddy Farrell", "2026-11-23");
  mat(j.id, "MT-GUTTER", "Gutter section and fittings", 1, 50, "Paddy Farrell", "2026-11-23");
  j.completionNotes = "Leaking gutter joint resealed with a new bracket. Three stained ceiling tiles replaced on the first floor.";
}
{
  const j = job({ number: "J-4564", siteId: "s10", division: "LFL", type: "Repair", priority: "High", status: "completed", engineerIds: ["e1"], scheduled: "2026-11-25", description: "Four emergency lighting fittings failed the monthly test. Replace and retest.", createdAt: "2026-11-23", startedAt: "2026-11-25", completedAt: "2026-11-25", completionConfirmedBy: "Declan Murphy", estHours: 3, assetIds: assetsAt("s10", "Emergency lighting") });
  visit(j.id, "e1", "2026-11-25", "09:30", "12:30", 3, "Four failed fittings replaced in corridors B and C. Full duration test on replaced units.");
  mat(j.id, "EL-BH", "LED emergency bulkhead, 3-hour", 4, 54, "Declan Murphy", "2026-11-25");
  j.completionNotes = "Four emergency light fittings replaced in corridors B and C and tested for full duration.";
}

/* Invoiced (11) */
type Done = [string, string, DivisionId, Job["type"], string, string, string, number, [string, string, number, number][]];
// [number, siteId, division, type, engineer, completedAt, description, hours, materials[sku, desc, qty, price]]
const INVOICED: Done[] = [
  ["J-4550", "s19", "LFL", "Repair", "e1", "2026-10-14", "Fire door holder magnets replaced on the first floor.", 3, [["FA-CAB", "Door holder magnets and fixings", 4, 46]]],
  ["J-4551", "s6", "SS", "Installation", "e3", "2026-10-23", "Video intercom upgrade for 24 apartments.", 0, []],
  ["J-4552", "s12", "SS", "Repair", "e3", "2026-10-08", "Replace PTZ camera at the loading bay.", 3, [["CC-PTZ", "PTZ camera", 1, 890]]],
  ["J-4553", "s20", "LPM", "Maintenance", "e5", "2026-10-20", "Car park line marking touch-up, 38 bays.", 6, [[null as any, "Line marking per bay", 38, 12]]],
  ["J-4554", "s2", "LFL", "Repair", "e2", "2026-10-29", "Fire panel standby batteries replaced.", 1.5, [["FA-BAT", "Panel standby batteries 12V 7Ah (pair)", 2, 48]]],
  ["J-4555", "s16", "SS", "Repair", "e4", "2026-11-04", "Re-aim six cameras after racking layout change.", 4, []],
  ["J-4556", "s10", "LPM", "Maintenance", "e5", "2026-10-02", "Garden pathway repairs and edging.", 7, [[null as any, "Paving slabs and sand", 1, 210]]],
  ["J-4557", "s8", "LFL", "Inspection", "e6", "2026-11-09", "Annual extinguisher service, Block A. Two units replaced.", 2.5, [["EX-CO2", "2kg CO2 extinguisher", 2, 64]]],
  ["J-4559", "s18", "LFL", "Repair", "e2", "2026-11-11", "Call point glass replaced at three locations.", 1.5, [["FA-MCP", "Manual call point", 3, 29]]],
  ["J-4560", "s31", "LPM", "Maintenance", "e6", "2026-11-13", "Bin store door rehung and new closer fitted.", 2.5, [["MT-CLOSER", "Door closer, size 2-4", 1, 85]]],
  ["J-4561", "s14", "SS", "Repair", "e3", "2026-11-16", "Access fob reader replaced at Block A entrance.", 2, [["AC-READ", "Proximity reader", 1, 95]]],
];
INVOICED.forEach((r) => {
  const j = job({ number: r[0], siteId: r[1], division: r[2], type: r[3], priority: "Normal", status: "invoiced", engineerIds: [r[4]], scheduled: r[5], description: r[6], createdAt: addDays(r[5], -4), startedAt: r[5], completedAt: r[5], completionConfirmedBy: engName(r[4]), estHours: r[7] || 8 });
  if (r[0] === "J-4551") {
    j.agreedPrice = 8960; j.source = "Quote"; j.scheduled = "2026-10-19"; j.scheduledEnd = "2026-10-23";
    ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"].forEach((d) => visit(j.id, "e3", d, "08:00", "16:30", 8, "Intercom installation."));
  } else {
    visit(j.id, r[4], r[5], "09:00", String(9 + Math.ceil(r[7])).padStart(2, "0") + ":00", r[7], r[6]);
  }
  r[8].forEach((m) => mat(j.id, m[0], m[1], m[2], m[3], engName(r[4]), r[5]));
  j.completionNotes = r[6];
});

/* ── Invoices: 11 current job invoices + 60 historical ─────────────────── */
export const INVOICES: Invoice[] = [];
export const PAYMENTS: Payment[] = [];
const rate = (d: DivisionId) => COMPANY.labourRates[d];
export function jobInvoiceLines(j: Job, visits: Visit[], time: TimeEntry[], materials: MaterialLine[]): InvoiceLine[] {
  if (j.agreedPrice) {
    return [{ description: "Agreed price: " + j.description, qty: 1, unitPrice: j.agreedPrice, kind: "Service" }];
  }
  const hrs = time.filter((t) => t.jobId === j.id && t.kind === "billable").reduce((s, t) => s + t.hours, 0);
  const nVisits = visits.filter((v) => v.jobId === j.id).length;
  const lines: InvoiceLine[] = [];
  if (hrs) lines.push({ description: "Labour, " + hrs + " hours" + (nVisits > 1 ? " across " + nVisits + " visits" : ""), qty: hrs, unitPrice: rate(j.division), kind: "Labour" });
  materials.filter((m) => m.jobId === j.id).forEach((m) => lines.push({ description: m.description, qty: m.qty, unitPrice: m.unitPrice, kind: "Material" }));
  return lines;
}
const STATUS_11: [Invoice["status"], number][] = [
  ["paid", 1], ["part-paid", 0.5], ["overdue", 0], ["paid", 1], ["paid", 1], ["issued", 0], ["overdue", 0], ["issued", 0], ["paid", 1], ["issued", 0], ["issued", 0],
];
INVOICED.forEach((r, i) => {
  const j = JOBS.find((x) => x.number === r[0])!;
  const issue = r[0] === "J-4552" ? "2026-10-09" : r[0] === "J-4556" ? "2026-10-05" : addDays(r[5], 2);
  const terms = CUSTOMERS.find((c) => c.id === j.customerId)!.paymentTerms;
  const inv: Invoice = {
    id: "inv-" + r[0].slice(2), number: null, division: r[2], customerId: j.customerId, siteId: j.siteId, jobId: j.id, woRef: j.woRef,
    lines: jobInvoiceLines(j, VISITS, TIME, MATERIALS), vatRate: COMPANY.vatRate, status: STATUS_11[i][0], issueDate: issue,
    dueDate: addDays(issue, terms), paid: 0, createdAt: issue, sentTo: CUSTOMERS.find((c) => c.id === j.customerId)!.accountsEmail,
    history: [{ at: issue + " 10:12", who: "Charlie Donaghy", text: "Approved and issued" }],
  };
  INVOICES.push(inv);
  j.invoiceId = inv.id;
});

/* Historical invoices (60): Jan 2025 to Nov 2026, deterministic. */
const HIST_DESC: Record<DivisionId, string[]> = {
  LFL: ["Quarterly fire alarm service", "Emergency lighting annual duration test", "Detector replacement and retest", "Extinguisher annual service", "Fire panel fault repair", "Call point replacement"],
  SS: ["CCTV six-monthly service", "Camera replacement", "NVR replacement and setup", "Access fob programming", "Intercom repair", "Additional camera installation"],
  LPM: ["Monthly grounds maintenance", "Gutter cleaning and repairs", "Door and lock repairs", "Painting and touch-up", "Winter gritting", "Gully cleaning"],
};
let seedN = 7;
const rnd = () => ((seedN = (seedN * 9301 + 49297) % 233280) / 233280);
const histCust = ["c1", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c2", "c1", "c11"];
for (let k = 0; k < 55; k++) {
  const month = Math.floor((k * 22) / 55); // 0..21 → Jan 2025..Oct 2026
  const y = 2025 + Math.floor(month / 12), m = (month % 12) + 1;
  const day = 3 + Math.floor(rnd() * 24);
  const issue = y + "-" + String(m).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  const custId = k < 6 ? "c1" : histCust[Math.floor(rnd() * histCust.length)];
  const cust = CUSTOMERS.find((c) => c.id === custId)!;
  const div = cust.divisions[Math.floor(rnd() * cust.divisions.length)];
  const sites = SITES.filter((s) => s.customerId === custId);
  const site = sites[Math.floor(rnd() * sites.length)];
  const desc = HIST_DESC[div][Math.floor(rnd() * 6)];
  const hrs = 3 + Math.floor(rnd() * 14);
  const matAmt = Math.round(60 + rnd() * 1400);
  const lines: InvoiceLine[] = [
    { description: desc + ", labour " + hrs + " hours", qty: hrs, unitPrice: rate(div), kind: "Labour" },
    { description: "Parts and materials", qty: 1, unitPrice: matAmt, kind: "Material" },
  ];
  const overdueOld = false;
  const recent = issue >= "2026-10-20";
  INVOICES.push({
    id: "hinv" + (k + 1), number: null, division: div, customerId: custId, siteId: site.id, woRef: custId === "c1" || custId === "c2" ? "WO-" + (81000 + k * 37) : "",
    lines, vatRate: COMPANY.vatRate, status: recent ? "issued" : overdueOld ? "overdue" : "paid", issueDate: issue, dueDate: addDays(issue, cust.paymentTerms),
    paid: 0, createdAt: issue, sentTo: cust.accountsEmail, history: [{ at: issue + " 10:00", who: "Charlie Donaghy", text: "Issued" }], historical: true,
  });
}
/* November 2026 contract invoices for the monthly contracts (5). Recurring billing creates December's. */
CONTRACTS.filter((c) => c.billing === "monthly").forEach((c, i) => {
  INVOICES.push({
    id: "cinv-" + c.id + "-2026-11", number: null, division: c.division, customerId: c.customerId, siteId: c.siteId, contractId: c.id, period: "2026-11", woRef: "",
    lines: [{ description: c.title + ", November 2026 (" + c.ref + ")", qty: 1, unitPrice: c.billingAmount, kind: "Contract" }],
    vatRate: COMPANY.vatRate, status: i < 2 ? "paid" : "issued", issueDate: "2026-11-02", dueDate: addDays("2026-11-02", CUSTOMERS.find((x) => x.id === c.customerId)!.paymentTerms), paid: 0,
    createdAt: "2026-11-02", sentTo: CUSTOMERS.find((x) => x.id === c.customerId)!.accountsEmail, history: [{ at: "2026-11-02 09:00", who: "Charlie Donaghy", text: "Recurring contract invoice issued" }], historical: true,
  });
});
/* Same contracts, November 2025: the invoices Charlie used to copy by hand. */
CONTRACTS.filter((c) => c.billing === "monthly").forEach((c) => {
  INVOICES.push({
    id: "cinv-" + c.id + "-2025-11", number: null, division: c.division, customerId: c.customerId, siteId: c.siteId, contractId: c.id, period: "2025-11", woRef: "",
    lines: [{ description: c.title + ", November 2025 (" + c.ref + ")", qty: 1, unitPrice: Math.round(c.billingAmount * 0.96), kind: "Contract" }],
    vatRate: COMPANY.vatRate, status: "paid", issueDate: "2025-11-03", dueDate: "2025-12-18", paid: 0, createdAt: "2025-11-03",
    sentTo: CUSTOMERS.find((x) => x.id === c.customerId)!.accountsEmail, history: [{ at: "2025-11-03 09:00", who: "Charlie Donaghy", text: "Issued" }], historical: true,
  });
});
// 55 + 5 + 5 = 65; trim the generated ones so historical totals exactly 60.
for (let k = 0; k < 5; k++) {
  const idx = INVOICES.findIndex((x) => x.id === "hinv" + (8 + k * 9));
  if (idx > -1) INVOICES.splice(idx, 1);
}

export const invoiceNet = (inv: Invoice) => inv.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
export const invoiceGross = (inv: Invoice) => Math.round(invoiceNet(inv) * (1 + inv.vatRate) * 100) / 100;

/* Number each series in issue order so the next number matches config. */
const COUNTERS: Record<DivisionId, number> = { LFL: 0, SS: 0, LPM: 0 };
DIVISIONS.forEach((d) => {
  const list = INVOICES.filter((i) => i.division === d.id && i.issueDate).sort((a, b) => (a.issueDate! < b.issueDate! ? -1 : 1));
  const start = d.nextInvoiceNo - list.length;
  list.forEach((inv, i) => (inv.number = d.prefix + "-" + String(start + i).padStart(4, "0")));
  COUNTERS[d.id] = d.nextInvoiceNo;
});
/* Payments for paid and part-paid invoices. */
INVOICES.forEach((inv, i) => {
  const gross = invoiceGross(inv);
  if (inv.status === "paid") {
    const d = addDays(inv.issueDate!, 14 + (i % 25));
    inv.paid = gross;
    PAYMENTS.push({ id: "pay" + (PAYMENTS.length + 1), invoiceId: inv.id, date: d > T ? T : d, amount: gross, method: i % 7 === 0 ? "Cheque" : "EFT" });
    inv.history.push({ at: (d > T ? T : d) + " 15:20", who: "Charlie Donaghy", text: "Payment recorded in full" });
  } else if (inv.status === "part-paid") {
    const amt = Math.round(gross * 0.5 * 100) / 100;
    inv.paid = amt;
    PAYMENTS.push({ id: "pay" + (PAYMENTS.length + 1), invoiceId: inv.id, date: "2026-11-12", amount: amt, method: "EFT" });
    inv.history.push({ at: "2026-11-12 11:05", who: "Charlie Donaghy", text: "Part payment recorded (50% stage payment)" });
  }
});

/* ── Service visits already on the books ───────────────────────────────── */
export const SERVICE_VISITS: ServiceVisit[] = [];
const checklistFor = (types: AssetType[], allPass = true) => {
  const items: Record<string, string[]> = {
    "Fire alarm": ["Panel indications and log reviewed", "Detectors tested (25% rotation)", "Call points tested", "Sounders and beacons tested", "Standby batteries load tested"],
    "Emergency lighting": ["Flick test all fittings", "Duration test sample", "Exit signage legible"],
    "CCTV": ["All cameras recording", "Image quality and focus checked", "NVR health and retention", "Time sync checked"],
    "Access control": ["Readers and locks operational", "Exit buttons and break glass tested", "Controller event log reviewed"],
    "Fire extinguishers": ["Extinguishers weighed and inspected", "Signage and brackets checked"],
    "Hose reels": ["Flow test", "Hose and nozzle inspected"],
    "Dry riser": ["Visual inspection of inlets and landing valves", "Cabinet security checked"],
    "Intercom": ["Door station call test", "Handsets tested"],
    "Grounds": ["Grass and beds maintained", "Litter and leaves cleared", "Paths and gullies cleared"],
    "Building fabric": ["Visual inspection"],
  };
  return types.flatMap((t) => (items[t] || []).map((item, i) => ({ item: t + ": " + item, result: (allPass || i !== 1 ? "pass" : "fail") as "pass" | "fail" })));
};
const sv = (contractId: string, periodStr: string, date: string, engineerId: string | null, status: ServiceVisit["status"], services: AssetType[], defects: string[] = [], notes = "") => {
  const c = CONTRACTS.find((x) => x.id === contractId)!;
  SERVICE_VISITS.push({
    id: "sv" + (SERVICE_VISITS.length + 1), contractId, siteId: c.siteId, period: periodStr, date, engineerId,
    estHours: c.schedule.filter((s) => services.includes(s.type)).reduce((a, s) => a + s.hours, 0) || 2,
    services, status, checklist: status === "completed" ? checklistFor(services, defects.length === 0) : services.length ? checklistFor(services).map((c2) => ({ ...c2, result: "pending" as const })) : [],
    defects, remedial: defects.length ? ["Quote remedial works"] : [], notes,
  });
};
sv("ct11", "2026-11", "2026-11-04", "e3", "completed", ["CCTV"], ["Camera 7 (yard west) IR failing at night"], "All other cameras recording, 31 days retention.");
sv("ct13", "2026-11", "2026-11-09", "e1", "completed", ["Fire alarm", "Emergency lighting"], [], "Monthly fire systems visit, all clear. Hotel log signed by duty manager.");
sv("ct4", "2026-11", "2026-11-03", "e5", "completed", ["Grounds"], [], "Leaf clearance and beds cut back for winter.");
sv("ct14", "2026-11", "2026-11-18", "e6", "completed", ["Grounds"], [], "Grounds visit complete. Two bins damaged, reported to park manager.");
sv("ct3", "2026-11", "2026-11-05", "e2", "completed", ["Fire alarm"], [], "Quarterly fire alarm service complete.");
sv("ct6", "2026-11", "2026-11-12", "e1", "completed", ["Fire alarm", "Emergency lighting"], ["Corridor B and C: 4 emergency fittings failed duration test"], "Remedial job J-4564 raised.");
// Carried over from November, not yet allocated (3).
sv("ct8", "2026-11", "2026-11-30", null, "proposed", ["CCTV"], [], "Rescheduled at customer request.");
sv("ct15", "2026-11", "2026-12-01", null, "proposed", ["Fire extinguishers"], [], "Extinguisher top-up visit carried over from November.");
sv("ct16", "2026-11", "2026-12-02", null, "proposed", ["Fire alarm"], [], "Quarterly visit moved after access issue.");

/* ── Quotes (14) and enquiries ─────────────────────────────────────────── */
export const QUOTES: Quote[] = [];
const ql = (sku: string, qty: number, desc?: string): QuoteLine => {
  const p = prod(sku);
  const kind: QuoteLine["kind"] = p.category === "Labour" ? "Labour" : p.category === "Installation" ? "Installation" : p.category === "Material" ? "Material" : p.category === "Maintenance plan" ? "Maintenance" : "Equipment";
  return { id: "ql" + Math.round(rnd() * 1e8), productId: p.id, description: desc || p.name, qty, unitPrice: p.price, kind };
};
type QS = [string, string, DivisionId, string, PipelineStage, QuoteLine[], string, string, number, Partial<Quote>?];
const Q_ROWS: QS[] = [
  ["c2", "s6", "SS", "Video intercom upgrade, 24 apartments", "Accepted", [ql("IC-DOOR", 2), ql("IC-MON", 24), ql("INS-SEC", 5), ql("AC-FOB", 6)], "Replace failing audio intercom with video door stations and apartment monitors.", "2026-08-30", 5, { jobId: "j4551" }],
  ["c6", "s12", "SS", "Shop floor CCTV refresh", "Lost", [ql("CC-DOME", 14), ql("CC-NVR16", 1), ql("INS-SEC", 3)], "Replace analogue cameras on the shop floor.", "2026-08-12", 3, { lostReason: "Went with their existing alarm installer on price." }],
  ["c3", "s9", "SS", "Access control, Block B (6 doors)", "Accepted", [ql("AC-CTRL", 3), ql("AC-READ", 6), ql("AC-MAG", 6), ql("INS-SEC", 8), ql("AC-FOB", 10)], "Networked access control for six doors on Block B with fob issue to 80 staff.", "2026-10-06", 8, { jobId: "j4569" }],
  ["c14", "s25", "SS", "Rear car park cameras", "Accepted", [ql("CC-BULLET", 4), ql("LAB-SEC", 12)], "Four cameras covering the rear car park and ATM approach.", "2026-10-21", 2, { jobId: "j4568" }],
  ["c11", "s19", "LPM", "Hotel gardens maintenance contract", "Lost", [ql("PL-GROUNDS", 12)], "Monthly gardens and grounds plan.", "2026-09-03", 0, { lostReason: "Budget deferred to 2027. Revisit in February." }],
  ["c15", "s26", "LFL", "Fire alarm system replacement, production hall", "Awaiting Decision", [ql("FA-P4", 1), ql("FA-MULTI", 64), ql("FA-HEAT", 22), ql("FA-MCP", 18), ql("FA-SB", 24), ql("FA-CAB", 30, "Fire-rated cable and containment (per 100m lot)"), ql("DES-FIRE", 1), ql("INS-FIRE", 15), ql("COM-FIRE", 1)], "Replace the 2009 conventional system in the production hall with an addressable 4-loop system. IP-rated devices in the wash-down area. Phased so production keeps running.", "2026-11-06", 15],
  ["c9", "s17", "SS", "CCTV coverage, Warehouse 2 yard", "Awaiting Decision", [ql("CC-BULLET", 8), ql("CC-NVR16", 1), ql("CC-POE", 1), ql("INS-SEC", 3)], "Eight cameras covering the yard, loading doors and perimeter fence.", "2026-11-10", 3],
  ["c12", "s20", "LFL", "LED emergency lighting upgrade, Units 1-6", "Quote Sent", [ql("EL-BH", 48), ql("EL-EXIT", 22), ql("LAB-FIRE", 40), ql("COM-FIRE", 1)], "Replace fluorescent emergency fittings with LED across the landlord areas of Units 1-6.", "2026-11-12", 5],
  ["c10", "s18", "SS", "Access control to consulting rooms", "Quote Sent", [ql("AC-CTRL", 2), ql("AC-READ", 4), ql("AC-MAG", 4), ql("LAB-SEC", 14)], "Fob access to four consulting rooms and the drug store.", "2026-11-16", 2],
  ["c8", "s14", "LPM", "Communal area repainting, Block A", "Quote Sent", [ql("LAB-MAINT", 96), ql("MT-PAINT", 14)], "Repaint corridors and stairwells in Block A.", "2026-11-18", 6],
  ["c16", "s29", "LFL", "Fire alarm extension to the new studio", "Quote Preparation", [ql("FA-OPT", 6), ql("FA-MCP", 2), ql("FA-SB", 3), ql("LAB-FIRE", 12)], "Extend the existing panel to cover the new fitness studio.", "2026-11-24", 2],
  ["c17", "s30", "SS", "CCTV upgrade to IP, 16 cameras", "Quote Preparation", [ql("CC-DOME", 12), ql("CC-BULLET", 4), ql("CC-NVR16", 1), ql("CC-POE", 1), ql("INS-SEC", 4)], "Replace the analogue system with IP cameras and remote viewing.", "2026-11-25", 4],
  ["c5", "s11", "SS", "Intercom replacement, main entrance", "Assessment", [], "Site survey booked for Tuesday 1 December.", "2026-11-26", 1],
  ["c18", "s31", "LPM", "Grounds maintenance contract 2027", "Assessment", [], "Walk the grounds with the OMC director and price a monthly plan.", "2026-11-26", 0],
];
Q_ROWS.forEach((r, i) => {
  const sent = ["Quote Sent", "Awaiting Decision", "Accepted", "Lost"].includes(r[4]);
  QUOTES.push({
    id: "q" + (i + 1), number: "Q-" + (2601 + i), customerId: r[0], siteId: r[1], division: r[2], title: r[3], stage: r[4], lines: r[5],
    discountPct: i === 5 ? 5 : 0, paymentTerms: r[8] >= 5 ? "30% on acceptance, 60% on completion, 10% on handover" : "30 days from invoice",
    format: r[8] >= 5 ? "detailed" : "short", requirements: r[6], createdAt: r[7], sentAt: sent ? addDays(r[7], 3) : undefined, validUntil: addDays(r[7], 60),
    estDays: r[8], history: [{ at: r[7] + " 10:00", who: "Charlie Donaghy", text: "Quote created" }].concat(sent ? [{ at: addDays(r[7], 3) + " 16:00", who: "Charlie Donaghy", text: "Quote sent (simulated email)" }] : []),
    ...(r[9] || {}),
  });
});
JOBS.forEach((j) => { const q = QUOTES.find((x) => x.jobId === j.id); if (q) j.quoteId = q.id; });

export const ENQUIRIES: Enquiry[] = [
  { id: "en1", name: "Majella Fox", company: "Rathcoole Community Centre", email: "majella@rathcoolecc.ie", phone: "087 554 2210", service: "Fire alarm servicing", location: "Rathcoole, Co. Dublin", description: "Our fire alarm service provider has retired. We need a quarterly service and an inspection of the emergency lighting.", receivedAt: "2026-11-26 19:42", source: "Website", status: "new", division: "LFL" },
  { id: "en2", name: "Dr. Paul Hennessy", company: "Kinsealy Dental", email: "reception@kinsealydental.ie", phone: "01 846 7712", service: "Security and CCTV", location: "Kinsealy, Co. Dublin", description: "Looking for CCTV at the front entrance and car park, plus an intercom for the door.", receivedAt: "2026-11-27 07:15", source: "Website", status: "new", division: "SS" },
];

/* ── Purchases ─────────────────────────────────────────────────────────── */
export const PURCHASES: Purchase[] = [
  ["Eastern Fire Supplies", "EFS-22871", "2026-11-03", 1284.4, "LFL", "Stock: detectors and sounders"],
  ["Securetech Distribution", "SD-118842", "2026-11-04", 2316, "SS", "Access control hardware, Celbridge", "j4569"],
  ["Kildare Builders Providers", "KBP-77310", "2026-11-06", 412.75, "LPM", "Paint and sundries", "j4570"],
  ["Fleet fuel card", "FUEL-NOV-1", "2026-11-08", 1640.2, "LFL", "Fuel, 6 vans (split by division at month end)"],
  ["Leinster Electrical Wholesale", "LEW-55102", "2026-11-11", 388.1, "LFL", "Cable, glands and terminations"],
  ["Securetech Distribution", "SD-119207", "2026-11-17", 1182, "SS", "Cameras, Lakeside job", "j4568"],
  ["Eastern Fire Supplies", "EFS-23090", "2026-11-19", 652, "LFL", "Emergency lighting fittings"],
  ["Toolhire Naas", "THN-4471", "2026-11-20", 186, "LPM", "Scaffold tower hire, 1 week", "j4570"],
  ["Securetech Distribution", "SD-119455", "2026-11-25", 270, "SS", "2 × 4TB surveillance drives", "j4565"],
  ["Eastern Fire Supplies", "EFS-23188", "2026-11-26", 132, "LFL", "Dry riser inlet valve", "j4566"],
  ["Mobile phones and data", "VOD-NOV", "2026-11-26", 312.4, "SS", "Engineer phones and tablets"],
  ["Eastern Fire Supplies", "EFS-22410", "2026-10-14", 2210.5, "LFL", "Stock replenishment"],
  ["Kildare Builders Providers", "KBP-76102", "2026-10-21", 298, "LPM", "Paving slabs and sand", "j4556"],
  ["Fleet fuel card", "FUEL-OCT-1", "2026-10-31", 1588.9, "LFL", "Fuel, 6 vans"],
].map((r, i) => ({ id: "pu" + (i + 1), supplier: r[0] as string, ref: r[1] as string, date: r[2] as string, net: r[3] as number, vat: Math.round((r[3] as number) * 0.23 * 100) / 100, division: r[4] as DivisionId, category: r[5] as string, jobId: r[6] as string | undefined, status: i === 8 || i === 10 ? "to review" : "matched" }));

/* ── Communications and documents ──────────────────────────────────────── */
export const COMMS: Communication[] = [];
export const DOCUMENTS: DocumentRec[] = [];
JOBS.filter((j) => j.status === "invoiced").forEach((j) => {
  const c = CUSTOMERS.find((x) => x.id === j.customerId)!;
  const contact = CONTACTS.find((x) => x.customerId === c.id && x.primary)!;
  COMMS.push({ id: "cm" + (COMMS.length + 1), kind: "Completion notice", customerId: c.id, jobId: j.id, to: contact.email, subject: "Work complete: " + j.number + ", " + siteOf(j.siteId).name, body: "Work completed. " + j.completionNotes, at: j.completedAt + " 17:10", status: "sent (simulated)" });
  j.completionNoticeId = COMMS[COMMS.length - 1].id;
  DOCUMENTS.push({ id: "d" + (DOCUMENTS.length + 1), name: "Completion report " + j.number + ".pdf", kind: "Completion report", customerId: c.id, siteId: j.siteId, jobId: j.id, date: j.completedAt! });
});
INVOICES.filter((i) => i.number && i.issueDate! >= "2026-09-01").forEach((inv) => DOCUMENTS.push({ id: "d" + (DOCUMENTS.length + 1), name: inv.number + ".pdf", kind: "Invoice PDF", customerId: inv.customerId, siteId: inv.siteId, jobId: inv.jobId, date: inv.issueDate! }));
SERVICE_VISITS.filter((s) => s.status === "completed").forEach((s) => {
  const c = CONTRACTS.find((x) => x.id === s.contractId)!;
  DOCUMENTS.push({ id: "d" + (DOCUMENTS.length + 1), name: "Service report " + c.ref + " " + s.date + ".pdf", kind: "Service report", customerId: c.customerId, siteId: s.siteId, date: s.date });
});
DOCUMENTS.push({ id: "d" + (DOCUMENTS.length + 1), name: "Fire alarm certificate, Allendale Court 2026.pdf", kind: "Certificate", customerId: "c1", siteId: "s1", date: "2026-03-14" });
DOCUMENTS.push({ id: "d" + (DOCUMENTS.length + 1), name: "Zone plan, Allendale Court.pdf", kind: "Site drawing", customerId: "c1", siteId: "s1", date: "2021-05-02" });
DOCUMENTS.push({ id: "d" + (DOCUMENTS.length + 1), name: "Service contract SC-2201.pdf", kind: "Contract", customerId: "c1", siteId: "s1", date: "2024-01-01" });

/* ── Extra time: non-billable, travel, overtime ────────────────────────── */
const extra: [string, string, number, TimeEntry["kind"], string, boolean][] = [
  ["e1", "2026-11-23", 6, "non-billable", "Van stock check and fire panel training (manufacturer course)", false],
  ["e1", "2026-11-24", 7, "non-billable", "Office: service reports and certificates", false],
  ["e1", "2026-11-20", 1.5, "overtime", "Stayed on at Allendale to make zone 4 safe", true],
  ["e2", "2026-11-23", 7.5, "non-billable", "Annual leave (half) and stock collection", false],
  ["e2", "2026-11-25", 7, "non-billable", "Survey for Curragh Leisure studio extension", false],
  ["e2", "2026-11-26", 7, "non-billable", "Survey for Boyne Valley quotation", false],
  ["e3", "2026-11-23", 0.75, "travel", "Travel Maynooth to Celbridge", false],
  ["e4", "2026-11-25", 1, "travel", "Kilcullen to Celbridge", false],
  ["e5", "2026-11-23", 3, "non-billable", "Yard and van maintenance", false],
  ["e6", "2026-11-23", 7, "non-billable", "Training: working at height refresher", false],
];
extra.forEach((x) => TIME.push({ id: "t" + ++tN, engineerId: x[0], date: x[1], hours: x[2], kind: x[3], note: x[4], approved: x[5], corrections: [] }));
// A corrected entry with a visible audit trail.
{
  const t = TIME.find((x) => x.engineerId === "e5" && x.date === "2026-11-23" && x.kind === "billable")!;
  t.corrections.push({ at: "2026-11-24 08:10", who: "Sinéad Kelly", from: "5 h", to: "4 h", reason: "Paddy logged travel inside the job. Moved 1 h to travel." });
  TIME.push({ id: "t" + ++tN, engineerId: "e5", date: "2026-11-23", hours: 1, kind: "travel", note: "Travel to Maynooth (moved from job time)", approved: false, corrections: [] });
}

/* ── Agents: run history and pending proposals ─────────────────────────── */
export const AGENT_RUNS: AgentRun[] = [
  { id: "r1", agentId: "briefing", at: "2026-11-27 07:00", status: "completed", summary: "Morning briefing: 3 unallocated jobs, 4 completed jobs not invoiced, 2 overdue invoices.", steps: [{ label: "Read jobs", detail: "28 active and recent jobs" }, { label: "Read invoices", detail: "Outstanding and overdue balances" }, { label: "Read schedule", detail: "Today's bookings for 6 engineers" }, { label: "Wrote briefing", detail: "Sent to Charlie AI on Home" }], records: ["J-4574", "J-4575", "J-4576", "J-4558"], proposalIds: [] },
  { id: "r2", agentId: "watchdog", at: "2026-11-27 07:05", status: "needs approval", summary: "J-4558 completed 9 days ago with no invoice. J-4571 in progress 7 days with no return booked.", steps: [{ label: "Scanned jobs in progress", detail: "8 jobs" }, { label: "Scanned completed jobs", detail: "4 not invoiced" }, { label: "Raised alerts", detail: "2 alerts to Charlie" }], records: ["J-4558", "J-4571"], proposalIds: ["pp1"] },
  { id: "r3", agentId: "invoice", at: "2026-11-27 07:10", status: "needs approval", summary: "Prepared a draft invoice for J-4558 (Phoenix House) from 3.5 h and 2 cameras.", steps: [{ label: "Consolidated labour", detail: "1 visit, 3.5 h billable" }, { label: "Consolidated materials", detail: "2 × 4MP dome camera" }, { label: "Drafted invoice", detail: "Surveillance Systems series, waiting for approval" }], records: ["J-4558"], proposalIds: ["pp1"] },
  { id: "r4", agentId: "comms", at: "2026-11-26 09:00", status: "needs approval", summary: "Drafted a payment reminder for an overdue Surveillance Systems invoice (Brady's Foodmarket).", steps: [{ label: "Found overdue invoices", detail: "2 overdue" }, { label: "Drafted reminder", detail: "Polite first reminder" }], records: ["Brady's Foodmarket"], proposalIds: ["pp2"] },
  { id: "r5", agentId: "intake", at: "2026-11-27 07:16", status: "completed", summary: "Website enquiry from Kinsealy Dental turned into a draft opportunity. No duplicate found.", steps: [{ label: "Parsed enquiry", detail: "CCTV and intercom, Kinsealy" }, { label: "Checked duplicates", detail: "No matching customer or open job" }, { label: "Created opportunity", detail: "New Enquiry column" }], records: ["Kinsealy Dental"], proposalIds: [] },
  { id: "r6", agentId: "service", at: "2026-11-25 18:00", status: "completed", summary: "December has 12 visits due across 12 contracts. Plan ready to generate.", steps: [{ label: "Reviewed contracts", detail: "16 active contracts" }, { label: "Found visits due", detail: "12 in December" }], records: [], proposalIds: [] },
  { id: "r7", agentId: "scheduling", at: "2026-11-26 16:40", status: "completed", summary: "Flagged Niall double-booked on Monday 30 Nov (Celbridge install and Dunboyne callout).", steps: [{ label: "Checked bookings", detail: "Next 10 working days" }, { label: "Found conflict", detail: "Niall Dempsey, Mon 30 Nov" }], records: ["J-4577", "J-4569"], proposalIds: [] },
  { id: "r8", agentId: "quoting", at: "2026-11-24 14:20", status: "completed", summary: "Built the detailed proposal for Boyne Valley Foods (Q-2606) from the product catalogue and the survey notes.", steps: [{ label: "Selected products", detail: "9 lines from the approved catalogue" }, { label: "Wrote proposal", detail: "10 sections, no invented certifications" }], records: ["Q-2606"], proposalIds: [] },
];
export const PROPOSALS: Proposal[] = [
  { id: "pp1", agentId: "invoice", kind: "issue-invoice", title: "Issue invoice for J-4558, Phoenix House", detail: "3.5 h labour at €80 and 2 × 4MP dome camera. Completed 18 Nov. Surveillance Systems series.", ref: "J-4558", status: "pending", createdAt: "2026-11-27 07:10", payload: { jobId: "j4558" }, category: "Financial" },
  { id: "pp2", agentId: "comms", kind: "send-reminder", title: "Send payment reminder to Brady's Foodmarket", detail: "First polite reminder for an overdue invoice issued 9 Oct.", ref: "Brady's Foodmarket", status: "pending", createdAt: "2026-11-26 09:00", payload: { invoiceId: "inv-4552" }, category: "External communication" },
];

/* ── Automations (12) ──────────────────────────────────────────────────── */
export const AUTOMATIONS: Automation[] = [
  ["01", "Notify available engineers", "Job created", ["Job is unallocated", "Priority is High or Emergency, or created before 15:00"], ["Notify engineers with the matching skill who are free today"], "Push notification to the engineer app (simulated)", [["2026-11-27 09:12", "J-4574: notified Shane and Niall", "ok"], ["2026-11-27 08:44", "J-4575: notified Declan and Ciarán", "ok"]]],
  ["02", "Update allocation and schedule", "Job accepted", ["An engineer accepts a job from the job box"], ["Assign the engineer", "Add the job to their schedule", "Remove it from the shared job box"], "Internal update", [["2026-11-25 07:58", "J-4573 accepted by Gavin, booked Tue 1 Dec", "ok"]]],
  ["03", "Stalled job alert", "Job in progress longer than threshold", ["In progress more than 5 days", "No return visit booked"], ["Notify Charlie", "Add to Requires attention"], "Internal alert", [["2026-11-27 07:05", "J-4571 Boyne Valley, 7 days, no return booked", "ok"]]],
  ["04", "Prepare completion notice", "Engineer confirms job complete", ["Completion explicitly confirmed by the engineer"], ["Draft completion notice to the site contact", "Wait for approval before sending"], "Email draft (simulated send)", [["2026-11-25 12:40", "J-4564: drafted for St. Brigid's", "awaiting approval"]]],
  ["05", "Prepare invoice draft", "Job completed", ["Job billed per job, not under a contract", "No invoice exists for the job"], ["Consolidate all visits, time and materials", "Create a draft in the division's series", "Wait for approval"], "Draft only, no number until approved", [["2026-11-27 07:10", "J-4558: draft prepared", "awaiting approval"]]],
  ["06", "Escalate unbilled work", "Completed job not invoiced", ["Completed more than 3 days", "No invoice issued"], ["Escalate to Charlie with the value at risk"], "Internal alert", [["2026-11-27 07:05", "J-4558 (9 days) escalated", "ok"]]],
  ["07", "Prepare next month's service plan", "New month approaching", ["7 days before month end"], ["Review contracts", "Generate proposed visits", "Match engineers", "Wait for approval"], "Draft schedule", [["2026-11-25 18:00", "December: 12 visits due, plan ready to generate", "ok"]]],
  ["08", "Prepare contract invoices", "Recurring billing date reached", ["Contract active", "Period not already billed"], ["Create contract invoice drafts", "Skip anything already billed"], "Draft only", [["2026-11-02 08:00", "November: 5 monthly contract invoices issued", "ok"]]],
  ["09", "Prepare payment reminder", "Invoice overdue", ["Past due date", "No reminder in the last 14 days"], ["Draft reminder to the accounts contact", "Wait for approval"], "Email draft (simulated send)", [["2026-11-26 09:00", "Brady's Foodmarket reminder drafted", "awaiting approval"]]],
  ["10", "Create sales opportunity", "Website enquiry received", ["Form submitted on the public website"], ["Check for an existing customer", "Create an opportunity in New Enquiry", "Notify Charlie"], "Internal update", [["2026-11-27 07:15", "Kinsealy Dental: opportunity created", "ok"], ["2026-11-26 19:42", "Rathcoole Community Centre: opportunity created", "ok"]]],
  ["11", "Prepare installation job", "Quote accepted", ["Quote marked accepted"], ["Create the installation job with every quote line", "Propose dates from engineer availability"], "Internal update", [["2026-11-05 10:20", "Q-2604 → J-4568 Lakeside", "ok"]]],
  ["12", "Prepare accountant export", "Month closed", ["Month marked closed by Charlie"], ["Bundle sales, purchases, payments and approved timesheets", "Publish to the accountant workspace"], "Export file (simulated)", [["2026-11-03 09:00", "October 2026 export published", "ok"]]],
].map((r) => ({ id: "au" + r[0], no: r[0] as string, name: r[1] as string, trigger: r[2] as string, conditions: r[3] as string[], actions: r[4] as string[], enabled: true, simulated: r[5] as string, runs: (r[6] as string[][]).map((x) => ({ at: x[0], outcome: x[1], status: x[2] as "ok" | "skipped" | "awaiting approval" })) }));

export const LOG: LogEvent[] = [
  { id: "l1", at: "2026-11-27 09:12", who: "Gráinne Healy (phone)", text: "Ashbourne Retail Park reported a camera offline, J-4574 created", kind: "job", ref: "j4574" },
  { id: "l2", at: "2026-11-27 08:44", who: "Harbourview Hotel (email)", text: "Emergency light failure reported, J-4575 created", kind: "job", ref: "j4575" },
  { id: "l3", at: "2026-11-27 08:31", who: "Declan Murphy", text: "Arrived at Marina Block B for J-4566 (location verified)", kind: "job", ref: "j4566" },
  { id: "l4", at: "2026-11-27 07:16", who: "Job Intake Agent", text: "Website enquiry from Kinsealy Dental added to the pipeline", kind: "web" },
  { id: "l5", at: "2026-11-27 07:10", who: "Invoice Agent", text: "Draft invoice prepared for J-4558, waiting for approval", kind: "finance", ref: "j4558" },
  { id: "l6", at: "2026-11-27 07:05", who: "Operations Watchdog", text: "J-4558 completed 9 days ago and not invoiced", kind: "agent", ref: "j4558" },
  { id: "l7", at: "2026-11-26 16:40", who: "Scheduling Agent", text: "Niall Dempsey double-booked on Mon 30 Nov", kind: "schedule", ref: "j4577" },
  { id: "l8", at: "2026-11-26 16:30", who: "Declan Murphy", text: "Left Marina Block B, return required (valve on order)", kind: "job", ref: "j4566" },
];

/* ── Assemble ──────────────────────────────────────────────────────────── */
export function seedState(): FMState {
  const holidays = ENGINEERS.flatMap((e) => {
    if (!e.holidays.length) return [];
    return [{ engineerId: e.id, from: e.holidays[0], to: e.holidays[e.holidays.length - 1], note: "Annual leave" }];
  });
  return {
    role: "owner",
    division: "ALL",
    meEngineerId: "e1",
    engineers: ENGINEERS,
    customers: CUSTOMERS,
    contacts: CONTACTS,
    sites: SITES,
    assets: ASSETS,
    products: PRODUCTS,
    jobs: JOBS,
    visits: VISITS,
    time: TIME,
    materials: MATERIALS,
    contracts: CONTRACTS,
    serviceVisits: SERVICE_VISITS,
    quotes: QUOTES,
    invoices: INVOICES,
    payments: PAYMENTS,
    purchases: PURCHASES,
    enquiries: ENQUIRIES,
    comms: COMMS,
    documents: DOCUMENTS,
    agentRuns: AGENT_RUNS,
    agentPaused: {},
    proposals: PROPOSALS,
    automations: AUTOMATIONS,
    log: LOG,
    installBookings: BOOKINGS,
    holidays,
    counters: { job: 4578, quote: 2615, invoice: { ...COUNTERS }, id: 1000 },
    prefixes: { LFL: DIVISIONS[0].prefix, SS: DIVISIONS[1].prefix, LPM: DIVISIONS[2].prefix },
    vatRate: COMPANY.vatRate,
    labourRate: COMPANY.labourRate,
    ui: { tabs: {}, drawer: null, drawerStack: [], siteOpen: false, sitePage: "home", filters: {}, modal: null },
    toasts: [],
  };
}

export { isWorkingDay, workingDaysBetween, addMonths };
