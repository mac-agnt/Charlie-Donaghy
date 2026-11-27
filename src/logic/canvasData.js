/* Seed data for Work › Canvas (pages, sheets, trackers, pipelines and files).
   Re-skin per client like data.js: names, folders, people and contents.
   Charlie Donaghy facilities demo. All content is demonstration data. */

/* People who own or edit things. "me" is whoever is signed in. */
export const CANVAS_PEOPLE = {
  me:       {name:"Charlie Donaghy", short:"Me", initials:"CD", tint:"var(--accent)"},
  sinead:   {name:"Sinéad Kelly", short:"Sinéad Kelly", initials:"SK", tint:"#9fd6f0"},
  declan:   {name:"Declan Murphy", short:"Declan Murphy", initials:"DM", tint:"#f0a58c"},
  ciaran:   {name:"Ciarán Byrne", short:"Ciarán Byrne", initials:"CB", tint:"#e6c78a"},
  shane:    {name:"Shane Kavanagh", short:"Shane Kavanagh", initials:"SH", tint:"#c8b4f0"},
  uploaded: {name:"Uploaded", short:"Uploaded", initials:"", tint:""},
  signed:   {name:"Signatures", short:"Signatures", initials:"", tint:""}
};

export const CANVAS_FOLDERS = [
  {id:"clients", name:"Customers", parent:null},
  {id:"allendale", name:"Allendale Management CLG", parent:"clients"},
  {id:"ardmore", name:"Ardmore Property Management", parent:"clients"},
  {id:"boyne", name:"Boyne Valley Foods", parent:"clients"},
  {id:"harbourview", name:"Harbourview Hotel", parent:"clients"},
  {id:"os", name:"Company OS", parent:null},
  {id:"sales", name:"Sales and quotes", parent:"os"},
  {id:"accounts", name:"Accounts and finance", parent:"os"},
  {id:"hr", name:"People and HR", parent:"os"},
  {id:"ops", name:"Operations", parent:null},
  {id:"servicing", name:"Servicing and PPM", parent:"ops"},
  {id:"vans", name:"Vans and stock", parent:"ops"},
  {id:"compliance", name:"Certificates", parent:null},
  {id:"proposals", name:"Proposals", parent:null},
  {id:"signed", name:"Signed documents", parent:null},
  {id:"templates", name:"Templates", parent:null}
];

/* kind: page | sheet | tracker | pipeline | pdf | image | file
   access: me (only me) | people (n people) | company | public (link) | records
   ago: minutes since the last activity. live: who has it open right now. */
export const CANVAS_DOCS = [
  {id:"d-dec-plan", title:"December service plan", kind:"page", folder:"servicing", owner:"sinead", access:"people", people:3, ago:52, shared:true, live:["sinead"]},
  {id:"d-allendale", title:"Allendale zone 4 repair", kind:"tracker", folder:"allendale", owner:"declan", access:"people", people:4, ago:130, shared:true, live:["declan","sinead"]},
  {id:"d-ardmore-renewal", title:"Ardmore contract renewal notes", kind:"page", folder:"ardmore", owner:"me", access:"me", ago:240},
  {id:"d-pipeline", title:"Installation pipeline", kind:"pipeline", folder:"sales", owner:"me", access:"company", ago:60 * 20, starred:true},
  {id:"d-monthend", title:"Month-end checklist", kind:"tracker", folder:"accounts", owner:"sinead", access:"company", ago:60 * 26, shared:true, starred:true},
  {id:"d-prop-boyne", title:"Boyne Valley Foods fire alarm proposal notes", kind:"page", folder:"boyne", owner:"me", access:"people", people:2, ago:60 * 30},
  {id:"d-quote", title:"Quote calculator", kind:"sheet", folder:"sales", owner:"me", access:"company", ago:60 * 72, starred:true, live:["sinead"]},
  {id:"d-stock", title:"Engineer van stock", kind:"sheet", folder:"vans", owner:"declan", access:"company", ago:60 * 24 * 2, shared:true},
  {id:"d-playbook", title:"Unbilled work playbook", kind:"page", folder:"accounts", owner:"sinead", access:"company", ago:60 * 24 * 5, shared:true},
  {id:"d-vans", title:"Van fleet costs 2026", kind:"sheet", folder:"vans", owner:"sinead", access:"people", people:2, ago:60 * 24 * 6, shared:true},
  {id:"f-ashbourne-prop", title:"Ashbourne Retail Park LED emergency lighting.pdf", kind:"pdf", folder:"proposals", owner:"me", access:"public", ago:60 * 24 * 7, size:"640 KB", pages:4,
   body:["Proposal to replace the fluorescent emergency fittings across the landlord areas of Units 1 to 6 with self-contained LED bulkheads and exit signs.",
     "Price €9,880 plus VAT. Works take five days and the retail units stay open throughout.",
     "Valid for 60 days. Payment 30 days from invoice once the completion report is issued."]},
  {id:"d-prices", title:"Rate card 2027 (draft)", kind:"sheet", folder:"sales", owner:"me", access:"me", ago:60 * 24 * 8},
  {id:"d-onboarding", title:"Engineer onboarding", kind:"page", folder:"hr", owner:"sinead", access:"company", ago:60 * 24 * 13, shared:true},
  {id:"f-allendale-cert", title:"Allendale Court fire alarm certificate 2026.pdf", kind:"pdf", folder:"allendale", owner:"uploaded", access:"records", ago:60 * 24 * 21, size:"412 KB", pages:3,
   body:["Annual inspection and servicing certificate for the addressable fire alarm at Allendale Court, Clonsilla.",
     "Zone 4 covers the plant room and the basement car park. The open repair on that zone (J-4567) is recorded against this system.",
     "Access arrangements for the plant room are held on the site record and are not reproduced in customer documents."]},
  {id:"f-harbourview-report", title:"Harbourview Hotel service report 9 Nov.pdf", kind:"pdf", folder:"harbourview", owner:"uploaded", access:"records", ago:60 * 24 * 19, size:"1.2 MB", pages:2,
   body:["Monthly fire systems visit: panel, detectors on rotation, sounders and emergency lighting flick test all passed.",
     "Hotel log signed by the duty manager. Hose reels are due their annual test in December."]},
  {id:"f-yard", title:"Maynooth yard licence.pdf", kind:"pdf", folder:"vans", owner:"uploaded", access:"records", ago:60 * 24 * 40, size:"220 KB", pages:3,
   body:["Licence to occupy the yard at Maynooth Business Campus for van parking and stock storage. Term runs to 31 March 2028.",
     "Rent is €1,150 a month, reviewed every two years."]},
  {id:"f-certs", title:"Engineer qualifications 2026.pdf", kind:"pdf", folder:"compliance", owner:"uploaded", access:"records", ago:60 * 24 * 55, size:"2.4 MB", pages:9,
   body:["Training records and qualifications for all six engineers, filed by division.",
     "Niall Dempsey's fire alarm cross-training was completed in September, so he can cover fire work when Declan or Ciarán are on installations."]},
  {id:"f-signed-supplier", title:"Eastern Fire Supplies trade agreement 2027 (signed).pdf", kind:"pdf", folder:"signed", owner:"signed", access:"records", ago:60 * 24 * 13, size:"318 KB", pages:3,
   body:["Trade supply agreement between Eastern Fire Supplies and Donaghy FM for 2027. Signed by both parties.",
     "Prices hold to 31 March 2027, then move with the published list. Delivery to Maynooth within two working days."]},
  {id:"f-signed-lakeside", title:"Lakeside Credit Union camera quote acceptance (signed).pdf", kind:"pdf", folder:"signed", owner:"signed", access:"records", ago:60 * 24 * 16, size:"204 KB", pages:2,
   body:["Acceptance of Q-2604 for four additional cameras covering the rear car park. Signed by Joan Kinsella and Charlie Donaghy."]},
  {id:"f-signed-gavin", title:"Gavin Doyle flexible working agreement (signed).pdf", kind:"pdf", folder:"signed", owner:"signed", access:"records", ago:60 * 24 * 22, size:"96 KB", pages:2,
   body:["Agreed flexible working: Gavin finishes at 15:00 on Fridays. Signed by Gavin Doyle and Charlie Donaghy."]},
  {id:"f-signed-celbridge", title:"Celbridge Business Campus access control order (signed).pdf", kind:"pdf", folder:"signed", owner:"signed", access:"records", ago:60 * 24 * 29, size:"151 KB", pages:2,
   body:["Order for the Block B access control upgrade (Q-2603). Signed by Mark Fennelly and Charlie Donaghy."]},
  {id:"d-tpl-proposal", title:"Proposal template", kind:"page", folder:"templates", owner:"me", access:"company", ago:60 * 24 * 34},
  {id:"d-tpl-survey", title:"Site survey form", kind:"page", folder:"templates", owner:"declan", access:"company", ago:60 * 24 * 41, shared:true},
  {id:"d-tpl-costing", title:"Job costing sheet", kind:"sheet", folder:"templates", owner:"me", access:"company", ago:60 * 24 * 48},
  {id:"b-prices-25", title:"Rate card 2025", kind:"sheet", folder:"sales", owner:"me", access:"company", ago:60 * 24 * 9, binned:true},
  {id:"b-xmas", title:"Christmas shutdown rota, draft", kind:"page", folder:"", owner:"sinead", access:"company", ago:60 * 24 * 3, binned:true, shared:true}
];

/* Page contents. Each block: [type, text, checked]. Types: h1 h2 h3 p bullet number todo quote callout divider */
export const CANVAS_PAGES = {
  "d-dec-plan": [
    ["callout","12 visits are due in December across 12 contracts. Nothing is booked until Charlie approves the plan in Servicing."],
    ["h2","What's due"],
    ["bullet","Fire and lighting: Allendale Court, The Willows, Celbridge Block A, St. Brigid's, Hillview, Greystones Marina, Dunboyne, Harbourview"],
    ["bullet","Surveillance: Allendale Court CCTV, Maynooth Enterprise Centre"],
    ["bullet","Grounds: Riverbank Court, Ashbourne Retail Park"],
    ["h2","Things to watch"],
    ["todo","Niall is on leave 14 to 18 December. Keep his CCTV visit outside that week", true],
    ["todo","Ciarán is on leave 21 to 23 December", false],
    ["todo","Allocate the three visits carried over from November", false],
    ["todo","Leave room for the Boyne Valley install if it's accepted", false],
    ["quote","Group the north Kildare visits on the same day where we can. Sinéad, 24 Nov"]
  ],
  "d-ardmore-renewal": [
    ["callout","Ardmore is the largest management-company customer: five blocks across north Kildare."],
    ["h2","The renewal"],
    ["p","The Willows fire contract (SC-2203) bills monthly at €310. The grounds plan at Riverbank Court is €650 a month. Both renew in the new year."],
    ["h2","Next steps"],
    ["todo","Check last year's service history for any missed visits", true],
    ["todo","Call Orla Keegan before Friday", false],
    ["todo","Send the renewal through Signatures", false],
    ["p","Offer to add Millbrook and Ardmore Mews to the same contract with one monthly invoice."]
  ],
  "d-prop-boyne": [
    ["h2","Scope"],
    ["p","Replace the 2009 conventional system in the production hall with an addressable 4-loop system. IP-rated devices in the wash-down area."],
    ["bullet","Design, supply, install, commissioning and handover"],
    ["bullet","Phased so production keeps running"],
    ["bullet","Completion report and training for the plant team"],
    ["h2","Price"],
    ["p","Quote Q-2606. 30% on acceptance, 60% on completion, 10% on handover."],
    ["h2","Programme"],
    ["p","15 working days with two fire engineers. Earliest start 1 December, or 4 January for a clash-free window."]
  ],
  "d-playbook": [
    ["p","How we stop completed work sitting unbilled. The agents run the first three steps on their own and stop at the fourth for a person."],
    ["h2","The ladder"],
    ["number","Engineer confirms the job complete. The completion notice and invoice draft are prepared."],
    ["number","Day 3 with no invoice: the Operations Watchdog flags it."],
    ["number","Day 7: it goes to the top of Requires attention on the dashboard."],
    ["number","Charlie approves the invoice. It gets the next number in its division's series."],
    ["h2","Payment follow-up"],
    ["p","Overdue invoices get a polite reminder drafted by the Customer Communication Agent. Nothing is sent without approval."],
    ["divider"],
    ["p","Last reviewed by Sinéad Kelly, November 2026."]
  ],
  "d-onboarding": [
    ["p","What a new engineer needs in their first week, in the order they need it."],
    ["h2","Day one"],
    ["todo","Van keys, fuel card and the engineer app on their phone", false],
    ["todo","Qualifications copied into Certificates", false],
    ["todo","Shadow Declan on two jobs", false],
    ["h2","By Friday"],
    ["todo","First solo service visit, checked by a senior engineer", false],
    ["todo","Timesheet set up and first week approved", false]
  ],
  "d-tpl-proposal": [
    ["h2","Scope"],
    ["p","What we will do, system by system."],
    ["h2","Price"],
    ["p","The total price, VAT rate and stage payments."],
    ["h2","Programme"],
    ["p","Start date, time on site and what we need from the customer."],
    ["h2","Terms"],
    ["p","Valid for 60 days. Payment 30 days from invoice once the completion report is issued."]
  ],
  "d-tpl-survey": [
    ["p","Fill this in on site. Photos go on the job record."],
    ["h2","Site"],
    ["bullet","Address and general access notes (codes go on the site record only)"],
    ["bullet","Existing system, make and age"],
    ["h2","Findings"],
    ["bullet","Devices, zones and cable routes"],
    ["bullet","Defects found"],
    ["h2","Recommendation"],
    ["p","What we would install, and why."]
  ],
  "b-xmas": [
    ["p","Office closes at 13:00 on 24 December and reopens on 4 January. One fire engineer on call each day for emergencies."]
  ],
  "t-meeting": [
    ["p","Date, time and who was there."],
    ["h2","Decisions"],
    ["bullet",""],
    ["h2","Actions"],
    ["todo","", false]
  ]
};

/* Sheets. rows: first row first; strings starting with = are formulas.
   fmt: per-column number format (eur | pct). bold: 1-based rows drawn bold. */
export const CANVAS_SHEETS = {
  "d-quote": [
    {name:"Quote", widths:{A:230, E:170}, fmt:{C:"eur", D:"eur"}, bold:[1, 11],
     rows:[
       ["Item","Qty","Unit","Total","Notes"],
       ["4MP IP dome camera","6","189","=B2*C2","Vandal-resistant"],
       ["8-channel NVR","1","420","=B3*C3",""],
       ["Surveillance hard drive 4TB","1","135","=B4*C4",""],
       ["16-port PoE switch","1","310","=B5*C5",""],
       ["Installation and configuration, days","2","980","=B6*C6","Two engineers"],
       [],
       ["Subtotal","","","=SUM(D2:D6)",""],
       ["Discount 5%","","","=-D8*0.05",""],
       ["VAT 13.5%","","","=(D8+D9)*0.135",""],
       ["Total","","","=D8+D9+D10",""]
     ]},
    {name:"Margins", widths:{A:230}, fmt:{B:"eur", C:"eur", D:"pct"}, bold:[1],
     rows:[
       ["Item","Cost","Sell","Margin"],
       ["4MP IP dome camera","128","189","=1-B2/C2"],
       ["8-channel NVR","290","420","=1-B3/C3"],
       ["Surveillance hard drive 4TB","92","135","=1-B4/C4"],
       ["16-port PoE switch","215","310","=1-B5/C5"],
       [],
       ["Average","","","=AVERAGE(D2:D5)"]
     ]}
  ],
  "d-vans": [
    {name:"2026", widths:{A:180}, fmt:{B:"eur", C:"eur", D:"eur", E:"eur"}, bold:[1, 9],
     rows:[
       ["Van","Fuel","Tolls","Repairs","Total"],
       ["Van 01, Declan","4120","310","860","=SUM(B2:D2)"],
       ["Van 02, Ciarán","3890","295","240","=SUM(B3:D3)"],
       ["Van 03, Shane","4410","402","1180","=SUM(B4:D4)"],
       ["Van 04, Niall","3760","388","620","=SUM(B5:D5)"],
       ["Van 05, Paddy","3025","130","410","=SUM(B6:D6)"],
       ["Van 06, Gavin","2980","120","95","=SUM(B7:D7)"],
       [],
       ["All vans","=SUM(B2:B7)","=SUM(C2:C7)","=SUM(D2:D7)","=SUM(E2:E7)"]
     ]}
  ],
  "d-stock": [
    {name:"Van 01, Declan", widths:{A:240}, bold:[1], fmt:{},
     rows:[
       ["Item","Bin","Counted","Minimum","Short"],
       ["Optical smoke detector","A-01","8","6","=C2-D2"],
       ["Heat detector","A-02","3","4","=C3-D3"],
       ["Manual call point","A-03","5","4","=C4-D4"],
       ["Sounder beacon","A-04","2","3","=C5-D5"],
       ["LED emergency bulkhead, 3-hour","B-01","6","6","=C6-D6"],
       ["Panel standby batteries (pair)","B-02","2","2","=C7-D7"],
       ["Fire-rated cable, 100m","C-01","1","1","=C8-D8"]
     ]}
  ],
  "d-prices": [
    {name:"2027 draft", widths:{A:240}, fmt:{B:"eur", C:"eur", D:"pct"}, bold:[1],
     rows:[
       ["Item","2026","2027","Change"],
       ["Fire engineer labour, per hour","80","84","=C2/B2-1"],
       ["Security engineer labour, per hour","80","84","=C3/B3-1"],
       ["Maintenance technician, per hour","60","62","=C4/B4-1"],
       ["Installation day, two engineers","1150","1195","=C5/B5-1"],
       ["Monthly grounds plan","650","680","=C6/B6-1"]
     ]}
  ],
  "d-tpl-costing": [
    {name:"Costing", widths:{A:210}, fmt:{B:"eur", D:"eur"}, bold:[1, 7],
     rows:[
       ["Line","Unit cost","Qty","Total"],
       ["Equipment","0","1","=B2*C2"],
       ["Labour, hours","80","0","=B3*C3"],
       ["Access equipment hire","0","1","=B4*C4"],
       ["Materials and sundries","0","1","=B5*C5"],
       [],
       ["Job total","","","=SUM(D2:D5)"]
     ]}
  ],
  "b-prices-25": [
    {name:"2025", widths:{A:240}, fmt:{B:"eur"}, bold:[1],
     rows:[["Item","Rate"],["Fire engineer labour, per hour","76"],["Installation day, two engineers","1100"]]}
  ]
};

/* Trackers and pipelines. who: a key of CANVAS_PEOPLE. value: euro, pipelines only. */
export const CANVAS_BOARDS = {
  "d-allendale": {view:"board",
    columns:[{id:"todo", name:"Not started"},{id:"doing", name:"In progress"},{id:"done", name:"Done"}],
    cards:[
      {id:"c1", title:"Fit the zone interface module", col:"todo", who:"declan", due:"Mon 30 Nov", tag:"High"},
      {id:"c2", title:"Retest zone 4 and log on the panel", col:"todo", who:"declan", due:"Mon 30 Nov", tag:"High"},
      {id:"c3", title:"Tell the concierge the zone is back in service", col:"todo", who:"sinead", due:"Mon 30 Nov", tag:"Medium"},
      {id:"c4", title:"Confirm the part has arrived", col:"doing", who:"sinead", due:"Today", tag:"High"},
      {id:"c5", title:"Send the completion notice to Gráinne Healy", col:"todo", who:"me", due:"After the visit", tag:"Low"},
      {id:"c6", title:"Repair the damaged cable run", col:"done", who:"declan", due:"Done", tag:"Medium"},
      {id:"c7", title:"Isolate zone 4 and brief the concierge", col:"done", who:"declan", due:"Done", tag:"High"}
    ]},
  "d-monthend": {view:"table",
    columns:[{id:"todo", name:"Not started"},{id:"doing", name:"In progress"},{id:"done", name:"Done"}],
    cards:[
      {id:"m1", title:"Approve all November timesheets", col:"doing", who:"sinead", due:"30 Nov", tag:"High"},
      {id:"m2", title:"Invoice every completed job", col:"doing", who:"me", due:"30 Nov", tag:"High"},
      {id:"m3", title:"Match supplier invoices to jobs", col:"doing", who:"sinead", due:"1 Dec", tag:"Medium"},
      {id:"m4", title:"Issue December contract invoices", col:"todo", who:"me", due:"1 Dec", tag:"High"},
      {id:"m5", title:"Publish the November export for Fiona", col:"todo", who:"sinead", due:"3 Dec", tag:"Medium"}
    ]},
  "d-pipeline": {view:"board",
    columns:[{id:"new", name:"New"},{id:"quoted", name:"Quoted"},{id:"talks", name:"Awaiting decision"},{id:"won", name:"Won"}],
    cards:[
      {id:"p1", title:"Rathcoole Community Centre", col:"new", who:"me", due:"Website enquiry", value:1800},
      {id:"p2", title:"Kinsealy Dental", col:"new", who:"sinead", due:"Website enquiry", value:4200},
      {id:"p3", title:"Ashbourne Retail Park, LED emergency lighting", col:"quoted", who:"me", due:"Quote sent 15 Nov", value:9880},
      {id:"p4", title:"Dunboyne Medical Centre, access control", col:"quoted", who:"shane", due:"Quote sent 19 Nov", value:4150},
      {id:"p5", title:"Boyne Valley Foods, fire alarm replacement", col:"talks", who:"me", due:"Decision due Wed", value:38650},
      {id:"p6", title:"Celbridge Block B, access control", col:"won", who:"shane", due:"Installing now", value:11840}
    ]}
};

/* The template gallery. from: a seeded doc whose contents the template copies. */
export const CANVAS_TEMPLATES = [
  {id:"t-page", kind:"page", title:"Blank page", sub:"Write anything. Type / for blocks", blank:true},
  {id:"t-sheet", kind:"sheet", title:"Blank sheet", sub:"Formulas, totals, tabs", blank:true},
  {id:"t-tracker", kind:"tracker", title:"Blank tracker", sub:"Table and board views", blank:true},
  {id:"t-pipeline", kind:"pipeline", title:"Blank pipeline", sub:"Stages you drag cards through", blank:true},
  {id:"t-meeting", kind:"page", title:"Meeting notes", sub:"Who was there, decisions, actions", from:"t-meeting"},
  {id:"t-proposal", kind:"page", title:"Customer proposal", sub:"Scope, price, programme, terms", from:"d-tpl-proposal"},
  {id:"t-survey", kind:"page", title:"Site survey", sub:"Site, findings, recommendation", from:"d-tpl-survey"},
  {id:"t-costing", kind:"sheet", title:"Job costing", sub:"Equipment, labour and a job total", from:"d-tpl-costing"},
  {id:"t-stock", kind:"sheet", title:"Van stock count", sub:"Counted against minimum levels", from:"d-stock"},
  {id:"t-checklist", kind:"tracker", title:"Month-end checklist", sub:"Owners, due dates, status", from:"d-monthend"},
  {id:"t-sales", kind:"pipeline", title:"Installation pipeline", sub:"Enquiry to won, with values", from:"d-pipeline"},
  {id:"t-onboard", kind:"page", title:"Engineer onboarding", sub:"The first week, step by step", from:"d-onboarding"}
];
