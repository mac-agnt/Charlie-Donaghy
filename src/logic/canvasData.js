/* Seed data for Work › Canvas (pages, sheets, trackers, pipelines and files).
   Re-skin per client like data.js: names, folders, people and contents. */

/* People who own or edit things. "me" is whoever is signed in. */
export const CANVAS_PEOPLE = {
  me:       {name:"Martin Kilbride", short:"Me", initials:"MK", tint:"var(--accent)"},
  aoife:    {name:"Aoife Nolan", short:"Aoife Nolan", initials:"AN", tint:"#9fd6f0"},
  tom:      {name:"Tom Walsh", short:"Tom Walsh", initials:"TW", tint:"#e6c78a"},
  niamh:    {name:"Niamh Cronin", short:"Niamh Cronin", initials:"NC", tint:"#c8b4f0"},
  seamus:   {name:"Séamus Byrne", short:"Séamus Byrne", initials:"SB", tint:"#e2a08c"},
  uploaded: {name:"Uploaded", short:"Uploaded", initials:"", tint:""},
  signed:   {name:"Signatures", short:"Signatures", initials:"", tint:""}
};

export const CANVAS_FOLDERS = [
  {id:"clients", name:"Clients", parent:null},
  {id:"casey", name:"Casey Builders", parent:"clients"},
  {id:"dunne", name:"Dunne & Sons Ltd", parent:"clients"},
  {id:"fitz", name:"Fitzgerald Heating", parent:"clients"},
  {id:"riverside", name:"Riverside Developments", parent:"clients"},
  {id:"os", name:"Company OS", parent:null},
  {id:"sales", name:"Sales", parent:"os"},
  {id:"accounts", name:"Accounts and finance", parent:"os"},
  {id:"hr", name:"People and HR", parent:"os"},
  {id:"depots", name:"Depots", parent:null},
  {id:"ballincollig", name:"Ballincollig", parent:"depots"},
  {id:"mallow", name:"Mallow yard", parent:"depots"},
  {id:"compliance", name:"Compliance", parent:null},
  {id:"proposals", name:"Proposals", parent:null},
  {id:"signed", name:"Signed documents", parent:null},
  {id:"templates", name:"Templates", parent:null}
];

/* kind: page | sheet | tracker | pipeline | pdf | image | file
   access: me (only me) | people (n people) | company | public (link) | records
   ago: minutes since the last activity. live: who has it open right now. */
export const CANVAS_DOCS = [
  {id:"d-casey-plan", title:"Casey Builders account plan 2027", kind:"page", folder:"casey", owner:"aoife", access:"people", people:3, ago:52, shared:true, live:["aoife"]},
  {id:"d-move", title:"Ballincollig depot move", kind:"tracker", folder:"ballincollig", owner:"tom", access:"people", people:4, ago:130, shared:true, live:["tom","niamh"]},
  {id:"d-dunne-plan", title:"Dunne & Sons recovery plan", kind:"page", folder:"dunne", owner:"me", access:"me", ago:240},
  {id:"d-pipeline", title:"Trade account pipeline", kind:"pipeline", folder:"sales", owner:"me", access:"company", ago:60 * 20, starred:true},
  {id:"d-monthend", title:"Month-end close checklist", kind:"tracker", folder:"accounts", owner:"aoife", access:"company", ago:60 * 26, shared:true, starred:true},
  {id:"d-prop-river", title:"Riverside block C heating proposal", kind:"page", folder:"proposals", owner:"me", access:"people", people:2, ago:60 * 30},
  {id:"d-quote", title:"Quote calculator", kind:"sheet", folder:"sales", owner:"me", access:"company", ago:60 * 72, starred:true, live:["aoife"]},
  {id:"d-stock", title:"Weekly stock check", kind:"sheet", folder:"mallow", owner:"niamh", access:"company", ago:60 * 24 * 2, shared:true},
  {id:"d-playbook", title:"Credit control playbook", kind:"page", folder:"accounts", owner:"aoife", access:"company", ago:60 * 24 * 5, shared:true},
  {id:"d-vans", title:"Van fleet costs 2026", kind:"sheet", folder:"accounts", owner:"tom", access:"people", people:2, ago:60 * 24 * 6, shared:true},
  {id:"f-fitz-prop", title:"Fitzgerald Heating boiler upgrade.pdf", kind:"pdf", folder:"proposals", owner:"me", access:"public", ago:60 * 24 * 7, size:"640 KB", pages:4,
   body:["Proposal to replace the oil boiler at the Fitzgerald Heating showroom with a 30kW condensing gas combi, including flue, controls and a system flush.",
     "Fixed price €6,840 plus VAT at 13.5%. Works take two days and the showroom stays open throughout.",
     "Valid for 30 days. Payment on 30-day trade terms once the commissioning certificate is issued."]},
  {id:"d-prices", title:"Price list Q1 2027", kind:"sheet", folder:"sales", owner:"me", access:"public", ago:60 * 24 * 8},
  {id:"d-onboarding", title:"Installer onboarding", kind:"page", folder:"hr", owner:"tom", access:"company", ago:60 * 24 * 13, shared:true},
  {id:"f-casey-fw", title:"Casey Builders framework 2026.pdf", kind:"pdf", folder:"casey", owner:"uploaded", access:"records", ago:60 * 24 * 21, size:"412 KB", pages:6,
   body:["The framework sets the discount tiers for 2026 and the payment terms Casey Builders trade on. Tier two applies from €40k of annual spend, which they passed in August.",
     "Pricing is fixed to the June supplier agreement, so a change on the Munster side flows through here rather than being renegotiated separately.",
     "Termination requires sixty days' notice on either side. Nothing in the document blocks putting the account on stop for non-payment."]},
  {id:"f-dunne-credit", title:"Dunne & Sons credit application.pdf", kind:"pdf", folder:"dunne", owner:"uploaded", access:"records", ago:60 * 24 * 19, size:"1.2 MB", pages:4,
   body:["The original 2011 application, signed by Liam Dunne, setting a €20,000 limit against thirty-day terms.",
     "Days-to-pay ran at twelve for most of that period and moved to seventy-four after May 2026, which is what put the account on stop.",
     "The personal guarantee in section four is still in force and has never been called on."]},
  {id:"f-mallow", title:"Mallow yard licence.pdf", kind:"pdf", folder:"mallow", owner:"uploaded", access:"records", ago:60 * 24 * 40, size:"220 KB", pages:3,
   body:["Licence to occupy the yard at Mallow Business Park for storage of plumbing and heating stock. Term runs to 31 March 2028.",
     "Rent is €1,450 a month, reviewed every two years. Hazardous materials need written consent from the landlord first."]},
  {id:"f-gas", title:"Gas Safe certificates 2026.pdf", kind:"pdf", folder:"compliance", owner:"uploaded", access:"records", ago:60 * 24 * 55, size:"2.4 MB", pages:9,
   body:["Current registration certificates for all nine installers. Séamus Byrne's renewal is due in January and has been booked.",
     "Each certificate lists the categories the installer is cleared for. Commercial catering is limited to two people."]},
  {id:"f-signed-munster", title:"Munster Plumbing supply agreement 2027 (signed).pdf", kind:"pdf", folder:"signed", owner:"signed", access:"records", ago:60 * 24 * 13, size:"318 KB", pages:3,
   body:["Supply agreement between Munster Plumbing Supplies and Kilbride Group for 2027. Signed by Cathal Moore and Martin Kilbride.",
     "Prices hold to 31 March 2027, then move with the published list. Delivery to Little Island within two working days."]},
  {id:"f-signed-fitz", title:"Fitzgerald Heating credit application (signed).pdf", kind:"pdf", folder:"signed", owner:"signed", access:"records", ago:60 * 24 * 16, size:"204 KB", pages:2,
   body:["Credit application from Fitzgerald Heating for a €15,000 limit on thirty-day terms. Signed by Máire Fitzgerald and Aoife Nolan."]},
  {id:"f-signed-seamus", title:"Séamus Byrne contract variation (signed).pdf", kind:"pdf", folder:"signed", owner:"signed", access:"records", ago:60 * 24 * 22, size:"96 KB", pages:2,
   body:["Variation to Séamus Byrne's employment contract moving his base to Ballincollig from 1 December 2026. Signed by Séamus Byrne and Martin Kilbride."]},
  {id:"f-signed-river", title:"Riverside Developments site access (signed).pdf", kind:"pdf", folder:"signed", owner:"signed", access:"records", ago:60 * 24 * 29, size:"151 KB", pages:2,
   body:["Site access agreement for block C at the Riverside scheme. Signed by Gráinne Walsh and Martin Kilbride."]},
  {id:"d-tpl-proposal", title:"Proposal template", kind:"page", folder:"templates", owner:"me", access:"company", ago:60 * 24 * 34},
  {id:"d-tpl-survey", title:"Site survey form", kind:"page", folder:"templates", owner:"seamus", access:"company", ago:60 * 24 * 41, shared:true},
  {id:"d-tpl-costing", title:"Job costing sheet", kind:"sheet", folder:"templates", owner:"me", access:"company", ago:60 * 24 * 48},
  {id:"b-prices-25", title:"Price list 2025", kind:"sheet", folder:"sales", owner:"me", access:"company", ago:60 * 24 * 9, binned:true},
  {id:"b-xmas", title:"Christmas opening hours, draft", kind:"page", folder:"", owner:"niamh", access:"company", ago:60 * 24 * 3, binned:true, shared:true}
];

/* Page contents. Each block: [type, text, checked]. Types: h1 h2 h3 p bullet number todo quote callout divider */
export const CANVAS_PAGES = {
  "d-casey-plan": [
    ["callout","Tier two pricing applies from €40k of annual spend. Casey passed it in August, so every 2027 quote starts from tier two."],
    ["h2","Where the account stands"],
    ["p","Casey Builders are the best payers on the book: twelve days on average, €6,120 open today and nothing overdue. Most of their spend is first fix for the Carrigaline and Ballincollig schemes."],
    ["h2","Goals for 2027"],
    ["todo","Get the 2027 trade terms signed. Sent through Signatures, waiting on Dermot.", false],
    ["todo","Quote Carrigaline phase two first fix", true],
    ["todo","Move them onto monthly statements", false],
    ["h2","Contacts"],
    ["bullet","Dermot Casey, buyer. Prefers WhatsApp for quotes and wants prices held to March."],
    ["bullet","Accounts go to accounts@caseybuilders.ie, not to Dermot."],
    ["quote","If you can hold the June copper price until March, the whole of phase two goes through you. Dermot, call on 14 Nov."]
  ],
  "d-dunne-plan": [
    ["callout","On stop since 11 Nov. €28,410 open across nine invoices, the oldest at 74 days."],
    ["h2","The offer"],
    ["p","A payment plan: €8,000 now, then €5,100 a month for four months. The stop lifts once the first payment clears, with new orders on pro-forma until the balance is under €10,000."],
    ["h2","Next steps"],
    ["todo","Check the personal guarantee in section four still holds", true],
    ["todo","Call Liam Dunne before Friday", false],
    ["todo","Send the payment plan for signature", false],
    ["p","If Liam says no, the guarantee is the fallback. Aoife has the paperwork."]
  ],
  "d-prop-river": [
    ["h2","Scope"],
    ["p","Heating and hot water for the 24 apartments in block C: air-to-water heat pumps, underfloor heating on every floor and a central plant room."],
    ["bullet","Design, supply and install, including commissioning"],
    ["bullet","BER-compliant controls in each apartment"],
    ["bullet","Two-year labour warranty, manufacturer warranty on plant"],
    ["h2","Price"],
    ["p","€186,400 plus VAT, in three stage payments: 30% on order, 50% at first fix, 20% on commissioning."],
    ["h2","Programme"],
    ["p","Eleven weeks on site from the start of February, working around the dry-lining crew."]
  ],
  "d-playbook": [
    ["p","How we chase, in order. Helios runs the first three steps on its own and stops at the fourth for a person."],
    ["h2","The ladder"],
    ["number","Day 1 past due: a friendly reminder with the invoice attached."],
    ["number","Day 7: a second reminder, copying the account owner."],
    ["number","Day 14: a phone call, logged against the account."],
    ["number","Day 30: the account goes on stop. Aoife or Martin approves."],
    ["h2","Accounts on watch"],
    ["p","Dunne & Sons Ltd is on stop at 74 days. Fitzgerald Heating and Riverside Developments are on watch past 60 days."],
    ["divider"],
    ["p","Last reviewed by Aoife Nolan, November 2026."]
  ],
  "d-onboarding": [
    ["p","What a new installer needs in their first week, in the order they need it."],
    ["h2","Day one"],
    ["todo","Van keys, fuel card and the stock app on their phone", false],
    ["todo","Gas Safe certificate copied into Compliance", false],
    ["todo","Shadow Séamus on two jobs", false],
    ["h2","By Friday"],
    ["todo","First solo service call, checked by a senior installer", false],
    ["todo","Timesheet and mileage set up with Accounts", false]
  ],
  "d-tpl-proposal": [
    ["h2","Scope"],
    ["p","What we will do, room by room or system by system."],
    ["h2","Price"],
    ["p","The fixed price, VAT rate and stage payments."],
    ["h2","Programme"],
    ["p","Start date, time on site and what we need from the client."],
    ["h2","Terms"],
    ["p","Valid for 30 days. Thirty-day trade terms once the commissioning certificate is issued."]
  ],
  "d-tpl-survey": [
    ["p","Fill this in on site. Photos go in the job folder."],
    ["h2","Property"],
    ["bullet","Address and access notes"],
    ["bullet","Existing system and age"],
    ["h2","Readings"],
    ["bullet","Gas pressure at the meter"],
    ["bullet","Flow rate and temperature at the furthest outlet"],
    ["h2","Recommendation"],
    ["p","What we would fit, and why."]
  ],
  "b-xmas": [
    ["p","Counters close at 1pm on 24 Dec and reopen on 29 Dec. Mallow yard stays closed until 2 Jan."]
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
    {name:"Quote", widths:{A:210, E:170}, fmt:{C:"eur", D:"eur"}, bold:[1, 11],
     rows:[
       ["Item","Qty","Unit","Total","Notes"],
       ["Combi boiler 30kW","1","1450","=B2*C2","Includes flue kit"],
       ["Radiator 600 x 1200","8","96.5","=B3*C3",""],
       ["Copper pipe 15mm, 3m","24","11.8","=B4*C4",""],
       ["Fittings pack","6","22","=B5*C5",""],
       ["Labour, hours","18","55","=B6*C6","Two installers"],
       [],
       ["Subtotal","","","=SUM(D2:D6)",""],
       ["Trade discount 8%","","","=-D8*0.08","Tier two"],
       ["VAT 13.5%","","","=(D8+D9)*0.135",""],
       ["Total","","","=D8+D9+D10",""]
     ]},
    {name:"Margins", widths:{A:210}, fmt:{B:"eur", C:"eur", D:"pct"}, bold:[1],
     rows:[
       ["Item","Cost","Sell","Margin"],
       ["Combi boiler 30kW","1180","1450","=1-B2/C2"],
       ["Radiator 600 x 1200","71","96.5","=1-B3/C3"],
       ["Copper pipe 15mm, 3m","8.4","11.8","=1-B4/C4"],
       ["Fittings pack","14.5","22","=1-B5/C5"],
       [],
       ["Average","","","=AVERAGE(D2:D5)"]
     ]}
  ],
  "d-vans": [
    {name:"2026", widths:{A:150}, fmt:{B:"eur", C:"eur", D:"eur", E:"eur"}, bold:[1, 9],
     rows:[
       ["Van","Fuel","Tolls","Repairs","Total"],
       ["Van 01","4120","310","860","=SUM(B2:D2)"],
       ["Van 02","3890","295","240","=SUM(B3:D3)"],
       ["Van 03","4410","402","1980","=SUM(B4:D4)"],
       ["Van 04","3760","188","3120","=SUM(B5:D5)"],
       ["Van 05","4025","330","410","=SUM(B6:D6)"],
       ["Van 06","2980","120","95","=SUM(B7:D7)"],
       [],
       ["All vans","=SUM(B2:B7)","=SUM(C2:C7)","=SUM(D2:D7)","=SUM(E2:E7)"]
     ]}
  ],
  "d-stock": [
    {name:"Mallow yard", widths:{A:220}, bold:[1], fmt:{},
     rows:[
       ["Item","Bin","Counted","System","Variance"],
       ["Copper pipe 15mm, 3m","A-04","212","220","=C2-D2"],
       ["Copper pipe 22mm, 3m","A-05","148","148","=C3-D3"],
       ["Push-fit elbow 15mm","B-11","640","655","=C4-D4"],
       ["Radiator valve pair","B-14","96","90","=C5-D5"],
       ["Expansion vessel 18L","C-02","14","15","=C6-D6"],
       ["Pressure relief valve","C-07","41","41","=C7-D7"]
     ]}
  ],
  "d-prices": [
    {name:"Q1 2027", widths:{A:220}, fmt:{B:"eur", C:"eur", D:"pct"}, bold:[1],
     rows:[
       ["Item","Trade","Retail","Margin"],
       ["Combi boiler 30kW","1450","1695","=1-B2/C2"],
       ["Heat pump 8kW","5200","6150","=1-B3/C3"],
       ["Radiator 600 x 1200","96.5","129","=1-B4/C4"],
       ["Thermostatic valve","18.9","26.5","=1-B5/C5"],
       ["Underfloor manifold, 6 port","310","389","=1-B6/C6"]
     ]}
  ],
  "d-tpl-costing": [
    {name:"Costing", widths:{A:210}, fmt:{B:"eur", D:"eur"}, bold:[1, 7],
     rows:[
       ["Line","Unit cost","Qty","Total"],
       ["Materials","0","1","=B2*C2"],
       ["Labour, hours","55","0","=B3*C3"],
       ["Hire","0","1","=B4*C4"],
       ["Waste","0","1","=B5*C5"],
       [],
       ["Job total","","","=SUM(D2:D5)"]
     ]}
  ],
  "b-prices-25": [
    {name:"2025", widths:{A:220}, fmt:{B:"eur"}, bold:[1],
     rows:[["Item","Trade"],["Combi boiler 30kW","1390"],["Radiator 600 x 1200","92"]]}
  ]
};

/* Trackers and pipelines. who: a key of CANVAS_PEOPLE. value: euro, pipelines only. */
export const CANVAS_BOARDS = {
  "d-move": {view:"board",
    columns:[{id:"todo", name:"Not started"},{id:"doing", name:"In progress"},{id:"done", name:"Done"}],
    cards:[
      {id:"c1", title:"Decide on the Ballincollig lease", col:"doing", who:"me", due:"Thu", tag:"High"},
      {id:"c2", title:"Reassign Van 04 jobs to Little Island", col:"doing", who:"tom", due:"Today", tag:"High"},
      {id:"c3", title:"Count and move counter stock", col:"todo", who:"niamh", due:"5 Dec", tag:"Medium"},
      {id:"c4", title:"Redirect supplier deliveries", col:"todo", who:"tom", due:"8 Dec", tag:"Medium"},
      {id:"c5", title:"Tell trade customers about the move", col:"todo", who:"aoife", due:"10 Dec", tag:"Low"},
      {id:"c6", title:"Back up the counter PC", col:"done", who:"niamh", due:"Done", tag:"Low"},
      {id:"c7", title:"Get three quotes for removals", col:"done", who:"tom", due:"Done", tag:"Medium"}
    ]},
  "d-monthend": {view:"table",
    columns:[{id:"todo", name:"Not started"},{id:"doing", name:"In progress"},{id:"done", name:"Done"}],
    cards:[
      {id:"m1", title:"Bank reconciliation, all accounts", col:"done", who:"aoife", due:"28 Nov", tag:"High"},
      {id:"m2", title:"Accruals for November", col:"doing", who:"aoife", due:"28 Nov", tag:"Medium"},
      {id:"m3", title:"Stock valuation from the Mallow count", col:"doing", who:"niamh", due:"29 Nov", tag:"Medium"},
      {id:"m4", title:"Xero sync errors cleared", col:"todo", who:"tom", due:"29 Nov", tag:"High"},
      {id:"m5", title:"Management pack to Martin", col:"todo", who:"aoife", due:"2 Dec", tag:"Medium"}
    ]},
  "d-pipeline": {view:"board",
    columns:[{id:"new", name:"New"},{id:"quoted", name:"Quoted"},{id:"talks", name:"Negotiating"},{id:"won", name:"Won"}],
    cards:[
      {id:"p1", title:"Carrigaline Homes", col:"new", who:"me", due:"Intro call Fri", value:18400},
      {id:"p2", title:"Bandon Heating Services", col:"new", who:"aoife", due:"Waiting on plans", value:9800},
      {id:"p3", title:"Kinsale Builders", col:"quoted", who:"me", due:"Quote sent 18 Nov", value:12250},
      {id:"p4", title:"O'Leary Mechanical", col:"quoted", who:"tom", due:"Quote sent 20 Nov", value:6900},
      {id:"p5", title:"Cobh Developments", col:"talks", who:"me", due:"Pricing call Mon", value:31000},
      {id:"p6", title:"Ó Riain, Glanmire", col:"won", who:"aoife", due:"Account opened", value:4300}
    ]}
};

/* The template gallery. from: a seeded doc whose contents the template copies. */
export const CANVAS_TEMPLATES = [
  {id:"t-page", kind:"page", title:"Blank page", sub:"Write anything. Type / for blocks", blank:true},
  {id:"t-sheet", kind:"sheet", title:"Blank sheet", sub:"Formulas, totals, tabs", blank:true},
  {id:"t-tracker", kind:"tracker", title:"Blank tracker", sub:"Table and board views", blank:true},
  {id:"t-pipeline", kind:"pipeline", title:"Blank pipeline", sub:"Stages you drag cards through", blank:true},
  {id:"t-meeting", kind:"page", title:"Meeting notes", sub:"Who was there, decisions, actions", from:"t-meeting"},
  {id:"t-proposal", kind:"page", title:"Client proposal", sub:"Scope, price, programme, terms", from:"d-tpl-proposal"},
  {id:"t-survey", kind:"page", title:"Site survey", sub:"Property, readings, recommendation", from:"d-tpl-survey"},
  {id:"t-costing", kind:"sheet", title:"Job costing", sub:"Materials, labour and a job total", from:"d-tpl-costing"},
  {id:"t-stock", kind:"sheet", title:"Stock count", sub:"Counted against the system", from:"d-stock"},
  {id:"t-checklist", kind:"tracker", title:"Month-end checklist", sub:"Owners, due dates, status", from:"d-monthend"},
  {id:"t-sales", kind:"pipeline", title:"Sales pipeline", sub:"New to won, with values", from:"d-pipeline"},
  {id:"t-onboard", kind:"page", title:"Staff onboarding", sub:"The first week, step by step", from:"d-onboarding"}
];
