/* Signatures (Work › Signatures): seed data for the e-sign tab.
   Re-skin per client like data.js: people, documents and wording all live here.
   Times are minutes before the page loads, so the demo always reads as recent. */

const D = 1440, H = 60;

/* Who is signed in. Envelopes with this email show "Your turn to sign". */
export const SIGN_ME = { name: "Martin Kilbride", email: "martin@kilbridegroup.ie" };

/* One colour per signer, in the order they are added. Muted enough to read on dark and light. */
export const SIGN_COLORS = ["#5b8def", "#d98a3a", "#a07ad6", "#2fa39a"];

/* Shown in the audit trail next to each signer's IP. */
export const SIGN_WHERE = "Cork, IE";

/* Closing clauses every seeded document shares. */
export const SIGN_COMMON_CLAUSES = [
  ["Notices", "Notices under this agreement are given in writing to the addresses above, or by email to the named contacts, and take effect on the next working day."],
  ["Entire agreement", "This document is the whole agreement between the parties on its subject. It replaces any earlier understanding, written or spoken."],
  ["Governing law", "This agreement is governed by the laws of Ireland. The parties submit to the jurisdiction of the Irish courts."]
];

/* Documents render as real pages. `sides` label the two signature columns; `org`/`addr` set the letterhead. */
export const SIGN_DOCS = {
  "trade-terms": {
    title: "Trade Terms Agreement 2027", ref: "KB-TT-2027-014",
    intro: "This agreement is made between Kilbride Group Ltd of Little Island, Cork (“Kilbride Group”) and Casey Builders Ltd of Carrigaline, Cork (“the Customer”). It sets the terms the Customer trades on for 2027.",
    sides: ["For Kilbride Group Ltd", "For Casey Builders Ltd"],
    clauses: [
      ["Trade account", "Kilbride Group will hold a trade account for the Customer with a credit limit of €40,000. Orders that take the balance over the limit are held until payment clears or the limit is raised in writing."],
      ["Discount tiers", "Tier two pricing applies from €40,000 of annual spend and tier three from €90,000. Spend is measured on paid invoices in the calendar year and reviewed each quarter."],
      ["Payment", "Invoices are due thirty days from the end of the month of delivery. Kilbride Group may place the account on stop if any invoice is more than thirty days past due."],
      ["Delivery", "Orders placed before 14:00 on a working day are delivered the next day anywhere in Cork city and county. Site deliveries need a named contact and safe access for a 7.5 tonne vehicle."],
      ["Returns", "Unused stock in its original packaging can be returned within thirty days for credit, less a 10% handling charge. Special-order items cannot be returned."]
    ]
  },
  "lease": {
    title: "Lease Renewal, Unit 4 Ballincollig Business Park", ref: "HP-L-0447", org: "HEGARTY PROPERTY", addr: "South Mall, Cork",
    intro: "This renewal is made between Hegarty Property Ltd of South Mall, Cork (“the Landlord”) and Kilbride Group Ltd of Little Island, Cork (“the Tenant”). It renews the lease of 1 February 2022 on the terms below.",
    sides: ["For Hegarty Property Ltd", "For Kilbride Group Ltd"],
    clauses: [
      ["Premises", "Unit 4, Ballincollig Business Park: a 1,850 sq m warehouse with trade counter, yard and twelve parking spaces, as outlined in red on the attached plan."],
      ["Term", "Five years from 1 February 2027. The Tenant may end the lease at the end of year three by giving six months' written notice."],
      ["Rent", "€148,000 a year plus VAT, paid quarterly in advance. Rent is reviewed to open market rent at the start of year four."],
      ["Service charge", "The estate service charge is capped at €9,600 a year for the first three years and then follows actual cost."],
      ["Repairs", "The Tenant keeps the interior in good repair. The Landlord stays responsible for the roof, the structure and the yard surface."]
    ]
  },
  "supply": {
    title: "Supply Agreement 2027", ref: "MPS-SA-2027-031", org: "MUNSTER PLUMBING SUPPLIES", addr: "Kinsale Road, Cork",
    intro: "This agreement is made between Munster Plumbing Supplies Ltd of Kinsale Road, Cork (“the Supplier”) and Kilbride Group Ltd of Little Island, Cork (“the Customer”).",
    sides: ["For Munster Plumbing Supplies Ltd", "For Kilbride Group Ltd"],
    clauses: [
      ["Products", "Boilers, cylinders, pipe and fittings listed in Schedule 1, delivered to the Customer's sites at Little Island, Ballincollig and Mallow."],
      ["Pricing", "Schedule 1 prices are fixed for twelve months from 1 January 2027. Copper lines move monthly with the LME copper price."],
      ["Volume rebate", "A 2.5% rebate applies to annual purchases above €600,000, paid as a credit note in February of the following year."],
      ["Lead times", "Stock lines arrive within 48 hours of order. Non-stock lines arrive within ten working days unless the Supplier confirms otherwise in writing."],
      ["Faulty goods", "Products meet the relevant IS EN standards. Faulty goods are replaced or credited within fourteen days of notice."]
    ]
  },
  "credit": {
    title: "Trade Credit Application", ref: "KB-CA-2026-118",
    intro: "This application is made by Fitzgerald Heating Ltd, company number 584213, of Mallow Road, Cork (“the Applicant”) to Kilbride Group Ltd for a trade account.",
    sides: ["Approved for Kilbride Group Ltd", "For the Applicant"],
    clauses: [
      ["Credit requested", "A limit of €15,000 on thirty-day terms, for plumbing and heating supplies collected from the trade counter or delivered to site."],
      ["References", "Bank: AIB, Patrick Street, Cork. Trade: Munster Plumbing Supplies and Cork Electrical Wholesale, both trading with the Applicant since 2019."],
      ["Retention of title", "Goods remain the property of Kilbride Group until they are paid for in full, even where they have been fitted."],
      ["Late payment", "Overdue balances carry interest under the European Communities (Late Payment in Commercial Transactions) Regulations 2012."],
      ["Credit checks", "The Applicant agrees to Kilbride Group running credit checks and sharing payment history with credit reference agencies."]
    ]
  },
  "variation": {
    title: "Contract Variation, Senior Installer", ref: "KB-HR-2026-022",
    intro: "This letter varies the contract of employment between Kilbride Group Ltd (“the Company”) and Séamus Byrne (“the Employee”) dated 4 April 2016. All other terms stay the same.",
    sides: ["For Kilbride Group Ltd", "Employee"],
    clauses: [
      ["Role", "Senior installer, based at the Ballincollig depot, effective 1 December 2026."],
      ["Pay", "Annual salary rises to €58,500, paid monthly. On-call weeks are paid at €180 each, on a rota of one week in four."],
      ["Hours", "Thirty-nine hours a week across five days. Call-outs during an on-call week count toward overtime at time and a half."],
      ["Vehicle", "A company van and fuel card for business use. Private use is limited to travel between home and the depot."],
      ["Training", "The Company pays for RGII renewal and heat pump certification. Fees are repayable on a sliding scale if the Employee leaves within twelve months."]
    ]
  },
  "site-access": {
    title: "Site Access Agreement, Riverside Quarter", ref: "RD-SA-0912", org: "RIVERSIDE DEVELOPMENTS", addr: "Lapps Quay, Cork",
    intro: "This agreement is made between Riverside Developments Ltd (“the Developer”) and Kilbride Group Ltd (“the Supplier”) for deliveries to the Riverside Quarter site on Monahan Road, Cork.",
    sides: ["For Riverside Developments Ltd", "For Kilbride Group Ltd"],
    clauses: [
      ["Access", "Deliveries run Monday to Friday, 07:30 to 16:00, through Gate B. Vehicles over 7.5 tonnes need 24 hours' notice to the site office."],
      ["Safety", "Drivers hold a current Safe Pass, wear site PPE and complete the site induction before their first delivery."],
      ["Storage", "Materials may be stored in compound C2. They stay at the Supplier's risk until handed over to the Developer's foreman."],
      ["Insurance", "The Supplier holds public liability cover of at least €6.5 million and provides a certificate on request."]
    ]
  },
  "payment-plan": {
    title: "Payment Plan Agreement", ref: "KB-PP-2026-007",
    intro: "This agreement is made between Kilbride Group Ltd (“Kilbride Group”) and Dunne & Sons Ltd of Bishopstown, Cork (“the Customer”) to clear the overdue balance on the Customer's trade account.",
    sides: ["For Kilbride Group Ltd", "For Dunne & Sons Ltd"],
    clauses: [
      ["Balance", "€28,410 is overdue across nine invoices, the oldest being INV-10233. The Customer accepts the balance as correct."],
      ["Instalments", "Six monthly payments of €4,735 by direct debit, starting 15 December 2026."],
      ["Account status", "The account stays on stop until two instalments clear. It then reopens with a €10,000 limit, with orders above that paid on delivery."],
      ["Default", "If an instalment is more than seven days late, the full remaining balance falls due at once."],
      ["Guarantee", "The personal guarantee in section four of the 2011 credit application stays in force until the balance is cleared."]
    ]
  },
  "van-hire": {
    title: "Vehicle Hire Agreement", ref: "CVR-H-5530", org: "CORK VAN RENTALS", addr: "Tramore Road, Cork",
    intro: "This agreement is made between Cork Van Rentals Ltd (“the Owner”) and Kilbride Group Ltd (“the Hirer”) for the hire of the vehicles listed below.",
    sides: ["For Cork Van Rentals Ltd", "For Kilbride Group Ltd"],
    clauses: [
      ["Vehicles", "Four Ford Transit Custom vans on twelve month hire from 6 January 2027, replacing Vans 01 to 04."],
      ["Charges", "€1,140 per van per month including servicing and tyres. Fuel, tolls and fines are paid by the Hirer."],
      ["Mileage", "36,000 km per van per year. Extra mileage is charged at €0.12 per km at the end of the hire."],
      ["Insurance", "Fully comprehensive cover for named drivers aged 25 and over who have held a full licence for two years."]
    ]
  },
  "framework": {
    title: "Framework Agreement 2026", ref: "KB-FW-2026-003",
    intro: "This framework is made between Kilbride Group Ltd and Casey Builders Ltd of Carrigaline, Cork. It sets the discount tiers and payment terms for 2026.",
    sides: ["For Kilbride Group Ltd", "For Casey Builders Ltd"],
    clauses: [
      ["Discount tiers", "Tier two applies from €40,000 of annual spend. Casey Builders passed this threshold in August 2026."],
      ["Pricing", "Prices follow the June supplier agreement with Munster Plumbing Supplies. Changes there flow through without a separate negotiation."],
      ["Termination", "Either party may end the framework on sixty days' notice. Nothing here prevents the account being placed on stop for non-payment."]
    ]
  },
  "quote": {
    title: "Quote Acceptance, Q-2291", ref: "Q-2291",
    intro: "Quote Q-2291 from Kilbride Group Ltd to Ó Riain Builders, Glanmire, for the heating package at Ashgrove, units 1 to 6. Signing below accepts the quote.",
    sides: ["For Kilbride Group Ltd", "Accepted for the customer"],
    clauses: [
      ["Scope", "Six air-to-water heat pumps with cylinders, manifolds and underfloor pipework, delivered in two drops to suit the build programme."],
      ["Price", "€61,880 plus VAT at 23%, held for thirty days from the date of the quote."],
      ["Payment", "30% on acceptance. The balance is due thirty days after the final delivery."]
    ]
  },
  "licence": {
    title: "Licence Agreement, Mallow Yard", ref: "KB-LIC-2026-002",
    intro: "This licence is made between Blackwater Estates Ltd (“the Licensor”) and Kilbride Group Ltd (“the Licensee”) for use of the yard at Annabella, Mallow.",
    sides: ["For Blackwater Estates Ltd", "For Kilbride Group Ltd"],
    clauses: [
      ["Use", "Open storage of pipe, cylinders and building materials, and parking for up to six company vans."],
      ["Fee", "€2,350 a month plus VAT, paid monthly in advance. The licence runs from month to month."],
      ["Ending", "Either party may end the licence on one month's written notice. The yard is handed back clear of stock."]
    ]
  },
  "nda": {
    title: "Mutual Non-Disclosure Agreement", ref: "KB-NDA-2026-019",
    intro: "This agreement is made between Kilbride Group Ltd and Lee Valley Mechanical Ltd ahead of talks about a joint tender for the Mercy Hospital plant room upgrade.",
    sides: ["For Kilbride Group Ltd", "For Lee Valley Mechanical Ltd"],
    clauses: [
      ["Confidential information", "Pricing, supplier terms, drawings and anything marked confidential that either party shares during the talks."],
      ["Use", "Confidential information is used only to prepare the joint tender, and shared only with staff who need it for that purpose."],
      ["Duration", "These obligations last for two years from signing, whether or not the tender goes ahead."]
    ]
  }
};

/* What "From Canvas" offers. `doc` points at SIGN_DOCS. */
export const SIGN_CANVAS_PICKS = [
  { name: "Casey Builders framework 2026.pdf", where: "Clients / Casey Builders", meta: "2 pages", doc: "framework" },
  { name: "Quote template.pdf", where: "Templates", meta: "2 pages", doc: "quote" },
  { name: "Mallow yard licence.pdf", where: "Company OS / Property", meta: "2 pages", doc: "licence" },
  { name: "Lee Valley Mechanical NDA.pdf", where: "Clients / Lee Valley Mechanical", meta: "2 pages", doc: "nda" }
];

/* Envelopes in the Sent list, newest work first. `party` is the signature column (0 left, 1 right). */
export const SIGN_ENVELOPES = [
  { id: "env-casey", title: "Casey Builders trade terms 2027", doc: "trade-terms", status: "waiting", sentAgo: 3 * D + 2 * H,
    message: "Hi Dermot, here are the 2027 trade terms we went through on Tuesday. Sign where marked and they apply from 1 January. Martin",
    signers: [
      { name: "Martin Kilbride", email: "martin@kilbridegroup.ie", party: 0, me: true, state: "signed", signedAgo: 3 * D + 2 * H - 4 },
      { name: "Dermot Casey", email: "dermot@caseybuilders.ie", party: 1, state: "viewed", viewedAgo: D + 3 * H }
    ] },
  { id: "env-lease", title: "Ballincollig depot lease renewal", doc: "lease", status: "waiting", sentAgo: D + 5 * H,
    message: "Brian, the renewal as agreed between the solicitors. Sign first and I'll countersign. Martin",
    signers: [
      { name: "Brian Hegarty", email: "brian@hegartyproperty.ie", party: 0, state: "signed", viewedAgo: D + 2 * H, signedAgo: 20 * H },
      { name: "Martin Kilbride", email: "martin@kilbridegroup.ie", party: 1, me: true, state: "waiting" }
    ] },
  { id: "env-dunne", title: "Dunne & Sons payment plan", doc: "payment-plan", status: "draft", editedAgo: 7 * D + 2 * H, signers: [] },
  { id: "env-vans", title: "Van fleet hire, Cork Van Rentals", doc: "van-hire", status: "draft", editedAgo: 2 * D + 4 * H,
    message: "Declan, the hire agreement for the four Transits from January. Tom countersigns for us. Martin",
    signers: [
      { name: "Declan Murphy", email: "declan@corkvanrentals.ie", party: 0, state: "waiting" },
      { name: "Tom Walsh", email: "tom@kilbridegroup.ie", party: 1, state: "waiting" }
    ] },
  { id: "env-seamus", title: "Séamus Byrne contract variation", doc: "variation", status: "signed", sentAgo: 9 * D,
    message: "Séamus, your updated contract with the new rate and on-call terms. Martin",
    signers: [
      { name: "Martin Kilbride", email: "martin@kilbridegroup.ie", party: 0, me: true, state: "signed", signedAgo: 9 * D - 10 },
      { name: "Séamus Byrne", email: "seamus@kilbridegroup.ie", party: 1, state: "signed", viewedAgo: 8 * D + 6 * H, signedAgo: 8 * D }
    ] },
  { id: "env-munster", title: "Munster Plumbing supply agreement 2027", doc: "supply", status: "signed", sentAgo: 16 * D,
    message: "Cathal, the 2027 supply agreement with the copper clause as discussed. Martin",
    signers: [
      { name: "Cathal Moore", email: "cathal@munsterplumbing.ie", party: 0, state: "signed", viewedAgo: 15 * D + 4 * H, signedAgo: 13 * D + 2 * H },
      { name: "Martin Kilbride", email: "martin@kilbridegroup.ie", party: 1, me: true, state: "signed", signedAgo: 13 * D }
    ] },
  { id: "env-fitz", title: "Fitzgerald Heating credit application", doc: "credit", status: "signed", sentAgo: 22 * D,
    message: "Máire, the credit application for your new account. Aoife countersigns once the references are back. Martin",
    signers: [
      { name: "Máire Fitzgerald", email: "maire@fitzheating.ie", party: 1, state: "signed", viewedAgo: 22 * D - 50, signedAgo: 21 * D + 3 * H },
      { name: "Aoife Nolan", email: "aoife@kilbridegroup.ie", party: 0, state: "signed", signedAgo: 21 * D }
    ] },
  { id: "env-riverside", title: "Riverside Developments site access agreement", doc: "site-access", status: "signed", sentAgo: 30 * D,
    message: "Gráinne, the site access agreement for deliveries to Riverside Quarter. Martin",
    signers: [
      { name: "Gráinne Walsh", email: "grainne@riversidedev.ie", party: 0, state: "signed", viewedAgo: 30 * D - 40, signedAgo: 29 * D + H },
      { name: "Martin Kilbride", email: "martin@kilbridegroup.ie", party: 1, me: true, state: "signed", signedAgo: 29 * D }
    ] }
];
