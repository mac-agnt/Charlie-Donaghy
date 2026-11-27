/* Seed data for Work › Calendar. Re-skin per client like data.js.
   Days are relative, so the demo always opens on a full week:
   - series: repeat on ISO weekdays (1 = Monday ... 7 = Sunday)
   - events: day = days from this week's Monday (negative = earlier weeks)
   - tasks: due = days from today */

export const CAL_PEOPLE = {
  me:     {name:"Martin Kilbride", initials:"MK", tint:"var(--accent)"},
  aoife:  {name:"Aoife Nolan", initials:"AN", tint:"#9fd6f0"},
  tom:    {name:"Tom Walsh", initials:"TW", tint:"#e6c78a"},
  niamh:  {name:"Niamh Cronin", initials:"NC", tint:"#c8b4f0"},
  seamus: {name:"Séamus Byrne", initials:"SB", tint:"#e2a08c"},
  dermot: {name:"Dermot Casey", initials:"DC", tint:"#a8e0c0"},
  brian:  {name:"Brian Hegarty", initials:"BH", tint:"#f0c48a"}
};

/* kind: meeting | call | routine (an agent runs it) | focus (time blocked for work) */
export const CAL_SERIES = [
  {id:"s-brief", title:"Morning briefing", kind:"routine", days:[1,2,3,4,5], start:"07:00", end:"07:30",
   agent:"Briefing Agent", note:"Reads the whole business overnight and posts the two things that need you to Home and WhatsApp."},
  {id:"s-report", title:"Weekly management report", kind:"routine", days:[1], start:"08:00", end:"08:30",
   agent:"Chief of Staff", note:"Pulls last week's numbers from every area and sends one page to the management team."},
  {id:"s-huddle", title:"Counter huddle", kind:"meeting", days:[1,2,3,4,5], start:"08:30", end:"09:00",
   who:["me","niamh","tom"], place:"Little Island trade counter"},
  {id:"s-dispatch", title:"Van dispatch", kind:"meeting", days:[1,2,3,4,5], start:"08:45", end:"09:20",
   who:["tom","seamus"], place:"Yard"},
  {id:"s-chase", title:"Chase unpaid invoices", kind:"routine", days:[1,2,3,4,5], start:"09:30", end:"10:00",
   agent:"Finance Agent", note:"Drafts reminders for invoices past 14 days and parks them for Aoife to approve."},
  {id:"s-stock", title:"Weekly stock check", kind:"routine", days:[4], start:"09:30", end:"10:15",
   agent:"Stock Watch", note:"Compares reorder points against the week's jobs and raises the purchase order lines."},
  {id:"s-supplier-tue", title:"Supplier calls", kind:"call", days:[2], start:"14:00", end:"17:30",
   who:["me","aoife"], meet:true},
  {id:"s-supplier-thu", title:"Supplier calls", kind:"call", days:[4], start:"10:30", end:"13:30",
   who:["me","aoife"], meet:true},
  {id:"s-timesheet", title:"Timesheet reminder", kind:"routine", days:[5], start:"15:00", end:"15:20",
   agent:"Operations", note:"Nudges anyone without a timesheet for the week."},
  {id:"s-oncall", title:"Weekend on-call handover", kind:"routine", days:[5], start:"16:30", end:"17:00",
   agent:"Chief of Staff", note:"Hands the weekend call-out rota to whoever is on."}
];

export const CAL_EVENTS = [
  {day:-5, title:"Casey Builders site walk", kind:"meeting", start:"11:00", end:"12:00", who:["me","dermot"], place:"Carrigaline phase two"},
  {day:-3, title:"Gas Safe audit prep", kind:"focus", start:"14:00", end:"16:00", who:["me","seamus"]},
  {day:-2, title:"Fitzgerald Heating credit review", kind:"call", start:"10:00", end:"10:45", who:["me","aoife"], meet:true},
  {day:0, title:"Gas Safe renewal, Séamus", kind:"meeting", start:"15:30", end:"16:30", who:["me","seamus"], place:"Head office"},
  {day:0, title:"Fitzgerald Heating quote", kind:"call", start:"18:00", end:"18:30", who:["me"], meet:true},
  {day:1, title:"Riverside block C handover", kind:"meeting", start:"11:00", end:"11:45", who:["me","tom"], place:"Riverside, Douglas"},
  {day:1, title:"Van 04 inspection", kind:"meeting", start:"12:15", end:"13:00", who:["tom"], place:"Ballincollig depot"},
  {day:2, title:"Casey Builders account review", kind:"call", start:"10:15", end:"11:15", who:["me","aoife","dermot"], meet:true},
  {day:2, title:"Lease call, Hegarty Property", kind:"call", start:"15:00", end:"15:45", who:["me","brian"], meet:true},
  {day:2, title:"Call Dermot about copper", kind:"call", start:"16:15", end:"16:30", who:["me","dermot"]},
  {day:3, title:"Ballincollig lease decision", kind:"meeting", start:"12:00", end:"12:45", who:["me","tom"], place:"Head office"},
  {day:4, title:"Month-end review with Aoife", kind:"call", start:"15:30", end:"17:45", who:["me","aoife"], meet:true},
  {day:5, title:"Mallow yard stock count", kind:"focus", start:"08:00", end:"10:15", who:["me","niamh"], place:"Mallow yard"},
  {day:7, title:"Q1 pricing review", kind:"meeting", start:"10:00", end:"11:30", who:["me","aoife","tom"], place:"Head office"},
  {day:8, title:"Depot move, removals", kind:"focus", start:"10:30", end:"13:00", who:["me","tom","niamh"], place:"Ballincollig depot"},
  {day:9, title:"Munster Plumbing account meeting", kind:"meeting", start:"14:00", end:"15:00", who:["me","aoife"]},
  {day:11, title:"Christmas opening hours sign-off", kind:"call", start:"11:00", end:"11:30", who:["me","niamh"], meet:true}
];

/* All-day checklists on the given weekdays. The first one is already ticked on past days. */
export const CAL_CHECKLISTS = [
  {title:"Van safety checks", days:[1,3,5]},
  {title:"Counter opening checklist", days:[1,3,5]},
  {title:"Credit control review", days:[1,3,5]}
];

/* Up next. leverage: 1 to 5, how much finishing it moves the business. mins: how long it takes. */
export const CAL_TASKS = [
  {title:"Chase INV-10428, Dunne & Sons", due:-2, leverage:5, priority:"High", mins:30},
  {title:"Send Dunne & Sons payment plan", due:0, leverage:5, priority:"High", mins:30},
  {title:"Approve purchase order PO-4471", due:0, leverage:5, priority:"High", mins:15},
  {title:"Ballincollig lease decision", due:1, leverage:5, priority:"High", mins:60},
  {title:"Fix the Xero sync", due:-6, leverage:4, priority:"High", mins:45},
  {title:"Reassign Van 04 jobs off Ballincollig", due:0, leverage:4, priority:"High", mins:45},
  {title:"Month-end accruals", due:2, leverage:4, priority:"Medium", mins:60},
  {title:"Sign off August counter stocktake", due:-5, leverage:3, priority:"Medium", mins:30},
  {title:"Call Casey Builders about Thursday", due:0, leverage:3, priority:"Medium", mins:15},
  {title:"Review the Q1 price list", due:2, leverage:3, priority:"Medium", mins:45},
  {title:"Renew Séamus's Gas Safe certificate", due:5, leverage:3, priority:"Medium", mins:30},
  {title:"Book removals for the depot move", due:6, leverage:2, priority:"Low", mins:30},
  {title:"Update the installer onboarding page", due:9, leverage:2, priority:"Low", mins:45}
];
