/* Signatures (Work › Signatures): seed data for the e-sign tab.
   Re-skin per client like data.js: people, documents and wording all live here.
   Times are minutes before the page loads, so the demo always reads as recent.
   Signing happens inside the demo only; no external e-signature service is connected. */

const D = 1440, H = 60;

/* Who is signed in. Envelopes with this email show "Your turn to sign". */
export const SIGN_ME = { name: "Charlie Donaghy", email: "charlie@donaghyfm.ie" };

/* One colour per signer, in the order they are added. Muted enough to read on dark and light. */
export const SIGN_COLORS = ["#5b8def", "#d98a3a", "#a07ad6", "#2fa39a"];

/* Shown in the audit trail next to each signer's IP. */
export const SIGN_WHERE = "Kildare, IE";

/* Closing clauses every seeded document shares. */
export const SIGN_COMMON_CLAUSES = [
  ["Notices", "Notices under this agreement are given in writing to the addresses above, or by email to the named contacts, and take effect on the next working day."],
  ["Entire agreement", "This document is the whole agreement between the parties on its subject. It replaces any earlier understanding, written or spoken."],
  ["Governing law", "This agreement is governed by the laws of Ireland. The parties submit to the jurisdiction of the Irish courts."]
];

/* Documents render as real pages. `sides` label the two signature columns; `org`/`addr` set the letterhead.
   Our own side always includes "Donaghy" so new signers land in the right column. */
export const SIGN_DOCS = {
  "proposal-boyne": {
    title: "Proposal Acceptance, Q-2606", ref: "Q-2606",
    intro: "Quote Q-2606 from Leinster Fire and Lighting, a division of Donaghy FM, to Boyne Valley Foods Ltd, Mell Industrial Estate, Drogheda (“the Customer”), for the fire alarm system replacement in the production hall. Signing below accepts the proposal.",
    sides: ["For Donaghy FM", "Accepted for Boyne Valley Foods Ltd"],
    clauses: [
      ["Scope", "Design, supply, installation, commissioning and handover of an addressable 4-loop fire alarm system in the production hall, with IP-rated devices in the wash-down area, as set out in the proposal."],
      ["Programme", "Fifteen working days on site with two engineers, phased so production keeps running. Dates are agreed in writing before work starts."],
      ["Price", "As stated in Q-2606, plus VAT. Prices hold for sixty days from the date of the quote."],
      ["Payment", "30% on acceptance, 60% on completion and 10% on handover, each due thirty days from invoice."],
      ["Exclusions", "Builder's work, making good of decoration and anything not listed in the investment breakdown."]
    ]
  },
  "contract-ardmore": {
    title: "Service Contract Renewal 2027, The Willows", ref: "SC-2203-R27",
    intro: "This renewal is made between Donaghy FM, trading as Leinster Fire and Lighting, of Maynooth, Co. Kildare (“the Contractor”) and Ardmore Property Management Ltd of Main Street, Lucan (“the Client”). It renews service contract SC-2203 for The Willows Apartments.",
    sides: ["For Donaghy FM", "For Ardmore Property Management Ltd"],
    clauses: [
      ["Services", "Quarterly fire alarm servicing and six-monthly emergency lighting testing at The Willows Apartments, Esker Road, Lucan."],
      ["Term", "Twelve months from 1 January 2027, renewing yearly unless either party gives sixty days' written notice."],
      ["Charges", "A fixed monthly charge invoiced on the first working day of each month. Remedial work found on a visit is quoted separately and only done once approved."],
      ["Reports", "A service report is issued after every visit. Reports never include site access codes."],
      ["Response", "Reactive callouts for fire alarm faults are attended within four working hours, Monday to Friday."]
    ]
  },
  "subcontract": {
    title: "Subcontractor Agreement", ref: "DF-SUB-2026-004", org: "KAVANAGH SCAFFOLDING", addr: "Naas, Co. Kildare",
    intro: "This agreement is made between Kavanagh Scaffolding Ltd of Naas, Co. Kildare (“the Subcontractor”) and Donaghy FM of Maynooth, Co. Kildare (“the Contractor”) for access equipment on installation projects.",
    sides: ["For Kavanagh Scaffolding Ltd", "For Donaghy FM"],
    clauses: [
      ["Works", "Supply, erection and dismantling of access towers and scaffolding on sites nominated by the Contractor, on two working days' notice."],
      ["Safety", "All operatives hold current Safe Pass and scaffolding cards and follow each site's induction and permit rules."],
      ["Rates", "As set out in Schedule 1, fixed for the 2027 calendar year."],
      ["Insurance", "The Subcontractor holds public liability cover of at least €6.5 million and employer's liability cover, and provides certificates on request."],
      ["Tax", "Payments are made under the relevant contracts tax rules where they apply."]
    ]
  },
  "completion-phoenix": {
    title: "Completion Sign-off, J-4558", ref: "J-4558",
    intro: "Completion sign-off for job J-4558 at Phoenix House, North Circular Road, Dublin 7, carried out by Surveillance Systems, a division of Donaghy FM, for Phoenix House Offices (“the Customer”).",
    sides: ["For Donaghy FM", "For Phoenix House Offices"],
    clauses: [
      ["Work completed", "Two failed dome cameras replaced on the third floor landing and stairwell, re-aimed and added to the recorder."],
      ["Testing", "Both cameras confirmed recording and visible on the building manager's viewing app."],
      ["Defects", "None outstanding at completion."],
      ["Invoice", "The invoice follows separately and references this job number."]
    ]
  },
  "flexible": {
    title: "Flexible Working Agreement", ref: "DF-HR-2026-011",
    intro: "This letter records the flexible working arrangement agreed between Donaghy FM (“the Company”) and Gavin Doyle (“the Employee”). All other terms of employment stay the same.",
    sides: ["For Donaghy FM", "Employee"],
    clauses: [
      ["Arrangement", "The Employee finishes at 15:00 on Fridays. Weekly contracted hours are made up across Monday to Thursday."],
      ["Scheduling", "The schedule and engineer app show the earlier Friday finish, so no job is booked past 15:00 that day."],
      ["Review", "The arrangement is reviewed after six months, or earlier at either party's request."]
    ]
  },
  "order-celbridge": {
    title: "Order Acceptance, Q-2603", ref: "Q-2603",
    intro: "Quote Q-2603 from Surveillance Systems, a division of Donaghy FM, to Celbridge Business Campus Ltd for the access control upgrade on Block B. Signing below accepts the quote.",
    sides: ["For Donaghy FM", "Accepted for Celbridge Business Campus Ltd"],
    clauses: [
      ["Scope", "Networked access control on six doors with readers, maglocks and exit buttons, and fob issue to 80 staff."],
      ["Programme", "Installation from 23 November 2026, completing by 2 December 2026."],
      ["Payment", "30% on acceptance. The balance is due thirty days after handover."]
    ]
  },
  "supply": {
    title: "Trade Supply Agreement 2027", ref: "EFS-TA-2027-018", org: "EASTERN FIRE SUPPLIES", addr: "Ballymount, Dublin 12",
    intro: "This agreement is made between Eastern Fire Supplies Ltd of Ballymount, Dublin 12 (“the Supplier”) and Donaghy FM of Maynooth, Co. Kildare (“the Customer”).",
    sides: ["For Eastern Fire Supplies Ltd", "For Donaghy FM"],
    clauses: [
      ["Products", "Detectors, call points, sounders, panels, emergency lighting and extinguishers listed in Schedule 1, delivered to Maynooth or direct to site."],
      ["Pricing", "Schedule 1 prices are fixed until 31 March 2027, then move with the published list."],
      ["Lead times", "Stock lines arrive within two working days. Non-stock lines within ten working days unless confirmed otherwise in writing."],
      ["Faulty goods", "Faulty goods are replaced or credited within fourteen days of notice."]
    ]
  },
  "quote": {
    title: "Quote Acceptance", ref: "Q-template",
    intro: "Quotation from Donaghy FM to the customer named below. Signing below accepts the quote on the terms set out in it.",
    sides: ["For Donaghy FM", "Accepted for the customer"],
    clauses: [
      ["Scope", "As set out in the attached quotation."],
      ["Price", "As stated in the quotation, plus VAT, held for sixty days from the date of the quote."],
      ["Payment", "Thirty days from invoice unless the quotation states stage payments."]
    ]
  },
  "nda": {
    title: "Mutual Non-Disclosure Agreement", ref: "DF-NDA-2026-006",
    intro: "This agreement is made between Donaghy FM and Liffey Electrical Contractors Ltd ahead of talks about a joint tender for a school fire alarm upgrade programme.",
    sides: ["For Donaghy FM", "For Liffey Electrical Contractors Ltd"],
    clauses: [
      ["Confidential information", "Pricing, supplier terms, drawings and anything marked confidential that either party shares during the talks."],
      ["Use", "Confidential information is used only to prepare the joint tender, and shared only with staff who need it for that purpose."],
      ["Duration", "These obligations last for two years from signing, whether or not the tender goes ahead."]
    ]
  }
};

/* What "From Canvas" offers. `doc` points at SIGN_DOCS. */
export const SIGN_CANVAS_PICKS = [
  { name: "Celbridge Block B order.pdf", where: "Customers / Celbridge Business Campus", meta: "2 pages", doc: "order-celbridge" },
  { name: "Quote acceptance template.pdf", where: "Templates", meta: "2 pages", doc: "quote" },
  { name: "Eastern Fire Supplies trade agreement.pdf", where: "Company OS / Suppliers", meta: "2 pages", doc: "supply" },
  { name: "Liffey Electrical NDA.pdf", where: "Sales and quotes / Tenders", meta: "2 pages", doc: "nda" }
];

/* Envelopes in the Sent list, newest work first. `party` is the signature column (0 left, 1 right). */
export const SIGN_ENVELOPES = [
  { id: "env-boyne", title: "Boyne Valley Foods proposal acceptance, Q-2606", doc: "proposal-boyne", status: "waiting", sentAgo: 3 * D + 2 * H,
    message: "Hi Niamh, the fire alarm replacement proposal for the production hall as discussed with Alan. Sign where marked to accept. Charlie",
    signers: [
      { name: "Charlie Donaghy", email: "charlie@donaghyfm.ie", party: 0, me: true, state: "signed", signedAgo: 3 * D + 2 * H - 4 },
      { name: "Niamh Clarke", email: "niamh@boynevalleyfoods.ie", party: 1, state: "viewed", viewedAgo: D + 3 * H }
    ] },
  { id: "env-ardmore", title: "Ardmore service contract renewal 2027", doc: "contract-ardmore", status: "waiting", sentAgo: D + 5 * H,
    message: "Orla, the renewal for The Willows as agreed. Sign first and I'll countersign. Charlie",
    signers: [
      { name: "Charlie Donaghy", email: "charlie@donaghyfm.ie", party: 0, me: true, state: "waiting" },
      { name: "Orla Keegan", email: "orla@ardmorepropertymanagement.ie", party: 1, state: "signed", viewedAgo: D + 2 * H, signedAgo: 20 * H }
    ] },
  { id: "env-phoenix", title: "Phoenix House completion sign-off, J-4558", doc: "completion-phoenix", status: "draft", editedAgo: 2 * D + 2 * H, signers: [] },
  { id: "env-scaffold", title: "Kavanagh Scaffolding subcontractor agreement", doc: "subcontract", status: "draft", editedAgo: 2 * D + 4 * H,
    message: "Pat, the 2027 subcontractor agreement for access towers. Sinéad countersigns for us. Charlie",
    signers: [
      { name: "Pat Kavanagh", email: "pat@kavanaghscaffolding.ie", party: 0, state: "waiting" },
      { name: "Sinéad Kelly", email: "sinead@donaghyfm.ie", party: 1, state: "waiting" }
    ] },
  { id: "env-gavin", title: "Gavin Doyle flexible working agreement", doc: "flexible", status: "signed", sentAgo: 22 * D,
    message: "Gavin, the Friday finish we agreed, in writing. Charlie",
    signers: [
      { name: "Charlie Donaghy", email: "charlie@donaghyfm.ie", party: 0, me: true, state: "signed", signedAgo: 22 * D - 10 },
      { name: "Gavin Doyle", email: "gavin@donaghyfm.ie", party: 1, state: "signed", viewedAgo: 21 * D + 6 * H, signedAgo: 21 * D }
    ] },
  { id: "env-supply", title: "Eastern Fire Supplies trade agreement 2027", doc: "supply", status: "signed", sentAgo: 16 * D,
    message: "Thanks, the 2027 trade agreement as discussed. Charlie",
    signers: [
      { name: "Ger Lawlor", email: "ger@easternfiresupplies.ie", party: 0, state: "signed", viewedAgo: 15 * D + 4 * H, signedAgo: 13 * D + 2 * H },
      { name: "Charlie Donaghy", email: "charlie@donaghyfm.ie", party: 1, me: true, state: "signed", signedAgo: 13 * D }
    ] },
  { id: "env-celbridge", title: "Celbridge Block B access control order, Q-2603", doc: "order-celbridge", status: "signed", sentAgo: 30 * D,
    message: "Mark, the order for the Block B access control upgrade. Charlie",
    signers: [
      { name: "Charlie Donaghy", email: "charlie@donaghyfm.ie", party: 0, me: true, state: "signed", signedAgo: 30 * D - 30 },
      { name: "Mark Fennelly", email: "mark@celbridgebusinesscampus.ie", party: 1, state: "signed", viewedAgo: 30 * D - 40, signedAgo: 29 * D + H }
    ] }
];
