/* Evergreen content for the public website. Built from what the business
   does; no testimonials, accreditations, client logos, guarantees or stats. */
import type { DivisionId } from "../config";

export type SitePageId = "home" | "about" | "fire" | "security" | "access" | "maintenance" | "servicing" | "quote" | "contact";

export const SITE_NAV: [SitePageId, string][] = [
  ["fire", "Fire safety"],
  ["security", "Security and CCTV"],
  ["access", "Access control"],
  ["maintenance", "Property maintenance"],
  ["servicing", "Servicing"],
  ["about", "About"],
  ["contact", "Contact"],
];

export const SERVICE_OPTIONS = [
  "Fire alarm installation",
  "Fire alarm servicing",
  "Emergency lighting",
  "Fire extinguishers, hose reels and dry risers",
  "CCTV",
  "Access control",
  "Intercoms",
  "Property maintenance",
  "Gardening and grounds",
  "Planned servicing contract",
  "Site assessment",
  "Something else",
];

export type ServicePage = {
  id: SitePageId;
  division: DivisionId | "ALL";
  eyebrow: string;
  title: string;
  intro: string;
  image: string;
  offer: { t: string; d: string }[];
  how: { t: string; d: string }[];
  cta: string;
};

export const SERVICE_PAGES: ServicePage[] = [
  {
    id: "fire", division: "LFL", eyebrow: "Leinster Fire and Lighting", title: "Fire safety systems that are ready when they're needed",
    intro: "Design, installation and maintenance of fire detection, emergency lighting and fire-fighting equipment for apartment blocks, workplaces, schools, healthcare and hospitality.",
    image: "fire-alarm-commercial-corridor",
    offer: [
      { t: "Fire alarm systems", d: "Addressable and conventional systems, from a single panel to multi-loop networks across several buildings." },
      { t: "Emergency lighting", d: "Self-contained and central systems, exit signage, monthly flick tests and annual duration tests." },
      { t: "Extinguishers and hose reels", d: "Supply, siting, annual service and replacement after discharge." },
      { t: "Dry risers", d: "Inspection of inlets and landing valves, repairs and cabinet security." },
    ],
    how: [
      { t: "Survey", d: "We walk the building with you and look at how it is used." },
      { t: "Quote", d: "A clear proposal with the equipment, scope and total price up front." },
      { t: "Install", d: "Phased around your occupants so the building keeps working." },
      { t: "Maintain", d: "Planned visits on the frequency each system needs, with a report after every visit." },
    ],
    cta: "Fire alarm servicing",
  },
  {
    id: "security", division: "SS", eyebrow: "Surveillance Systems", title: "CCTV and intercoms you can rely on",
    intro: "IP camera systems, recording and remote viewing, and video intercoms for apartment blocks, retail, industrial and commercial sites.",
    image: "security-camera-building-exterior",
    offer: [
      { t: "CCTV design and installation", d: "Camera positions planned around what you actually need to see, day and night." },
      { t: "Recording and remote viewing", d: "Network video recorders sized for the retention you need, viewable on your phone." },
      { t: "Video intercoms", d: "Door stations and apartment monitors for blocks of any size." },
      { t: "Repairs and upgrades", d: "Failed cameras and recorders replaced, analogue systems moved to IP." },
    ],
    how: [
      { t: "Survey", d: "We look at coverage, lighting and cabling routes on site." },
      { t: "Quote", d: "Every camera and line item listed, with the total price at the top." },
      { t: "Install", d: "Configured, tested and handed over with a walkthrough." },
      { t: "Maintain", d: "Scheduled checks on recording, image quality and storage health." },
    ],
    cta: "CCTV",
  },
  {
    id: "access", division: "SS", eyebrow: "Surveillance Systems", title: "Access control that fits how your building is used",
    intro: "Fob and card access, door hardware and controllers for offices, apartment blocks, clinics and industrial units.",
    image: "office-entrance-glass-door",
    offer: [
      { t: "Door access", d: "Readers, maglocks, exit buttons and break glass units on a networked controller." },
      { t: "Fob management", d: "Fobs programmed and issued, lost fobs cancelled quickly." },
      { t: "Integration", d: "Access linked to intercoms and fire alarm release where the design requires it." },
      { t: "Servicing", d: "Annual checks on readers, locks and the controller event log." },
    ],
    how: [
      { t: "Survey", d: "We confirm every door, who needs access and when." },
      { t: "Quote", d: "Per-door costs and a total price, before any work starts." },
      { t: "Install", d: "Doors brought live in stages so the building stays secure." },
      { t: "Maintain", d: "Planned servicing and quick response if a door won't open." },
    ],
    cta: "Access control",
  },
  {
    id: "maintenance", division: "LPM", eyebrow: "Leinster Property Maintenance", title: "Property maintenance, inside and out",
    intro: "Planned and reactive maintenance, grounds and gardening for management companies, retail parks, schools and commercial buildings.",
    image: "apartment-building-grounds-garden",
    offer: [
      { t: "Reactive repairs", d: "Doors, locks, closers, ceilings, gutters and general fabric repairs." },
      { t: "Painting", d: "Common areas, stairwells and corridors, planned around residents." },
      { t: "Grounds and gardening", d: "Monthly grounds plans, leaf clearance, gully cleaning and winter work." },
      { t: "Planned maintenance", d: "A schedule of recurring tasks so small problems don't become big ones." },
    ],
    how: [
      { t: "Visit", d: "We see the property and agree what needs doing." },
      { t: "Quote", d: "Fixed prices for project work, simple monthly plans for grounds." },
      { t: "Deliver", d: "Work carried out by our own team, with photos on completion." },
      { t: "Report", d: "A completion notice before the invoice, every time." },
    ],
    cta: "Property maintenance",
  },
  {
    id: "servicing", division: "ALL", eyebrow: "Servicing and maintenance", title: "Planned servicing for every system on your site",
    intro: "One service contract can cover fire alarms, emergency lighting, CCTV, access control, extinguishers, dry risers and grounds, each on the frequency it needs.",
    image: "maintenance-engineer-plant-room",
    offer: [
      { t: "One schedule per site", d: "Every system on the site planned together, so visits are grouped and disruption kept low." },
      { t: "The right frequency", d: "Quarterly, six-monthly or annual, set per system rather than one size for all." },
      { t: "A report after every visit", d: "Checklist results, defects found and remedial work recommended." },
      { t: "Predictable billing", d: "Contracts billed monthly, quarterly or per visit, never charged twice." },
    ],
    how: [
      { t: "Review", d: "We list every system on the site and its service history." },
      { t: "Agree", d: "A schedule and a price that suits the building." },
      { t: "Visit", d: "Engineers arrive with the checklist for each system." },
      { t: "Report", d: "You get the service report and any defects to sign off." },
    ],
    cta: "Planned servicing contract",
  },
];
