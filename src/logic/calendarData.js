/* Seed data for Work › Calendar. Re-skin per client like data.js.
   Days are relative, so the demo always opens on a full week:
   - series: repeat on ISO weekdays (1 = Monday ... 7 = Sunday)
   - events: day = days from this week's Monday (negative = earlier weeks)
   - tasks: due = days from today */

export const CAL_PEOPLE = {
  me:      {name:"Charlie Donaghy", initials:"CD", tint:"var(--accent)"},
  sinead:  {name:"Sinéad Kelly", initials:"SK", tint:"#9fd6f0"},
  declan:  {name:"Declan Murphy", initials:"DM", tint:"#f0a58c"},
  ciaran:  {name:"Ciarán Byrne", initials:"CB", tint:"#e6c78a"},
  shane:   {name:"Shane Kavanagh", initials:"SH", tint:"#c8b4f0"},
  fiona:   {name:"Fiona Brennan", initials:"FB", tint:"#a8e0c0"},
  grainne: {name:"Gráinne Healy", initials:"GH", tint:"#f0c48a"}
};

/* kind: meeting | call | routine (an agent runs it) | focus (time blocked for work) */
export const CAL_SERIES = [
  {id:"s-brief", title:"Daily briefing", kind:"routine", days:[1,2,3,4,5], start:"07:00", end:"07:30",
   agent:"Daily Briefing Agent", note:"Reads jobs, schedules, invoices and servicing overnight and posts what matters today to Home."},
  {id:"s-invoice", title:"Invoice run", kind:"routine", days:[1,2,3,4,5], start:"07:10", end:"07:30",
   agent:"Invoice Agent", note:"Consolidates completed jobs into draft invoices and parks them for Charlie to approve."},
  {id:"s-watch", title:"Operations check", kind:"routine", days:[1,2,3,4,5], start:"10:00", end:"10:15",
   agent:"Operations Watchdog", note:"Runs hourly. Flags stalled jobs, unbilled work and booking clashes."},
  {id:"s-dispatch", title:"Engineer dispatch", kind:"meeting", days:[1,2,3,4,5], start:"07:45", end:"08:15",
   who:["sinead","declan","ciaran"], place:"Maynooth office"},
  {id:"s-jobbox", title:"Job box review", kind:"meeting", days:[1,3,5], start:"08:30", end:"09:00",
   who:["me","sinead"], place:"Maynooth office"},
  {id:"s-reminders", title:"Customer reminders", kind:"routine", days:[1,2,3,4,5], start:"09:00", end:"09:20",
   agent:"Customer Communication Agent", note:"Drafts appointment reminders and payment follow-ups. Nothing is sent without approval."},
  {id:"s-quotes", title:"Quotes and site surveys", kind:"call", days:[2], start:"14:00", end:"17:00",
   who:["me","sinead"], meet:true},
  {id:"s-accounts", title:"Accounts call with Fiona", kind:"call", days:[4], start:"11:00", end:"11:45",
   who:["me","fiona"], meet:true},
  {id:"s-timesheet", title:"Timesheet approval", kind:"routine", days:[5], start:"14:00", end:"14:20",
   agent:"Operations Watchdog", note:"Lists unapproved time entries for the week so Sinéad can approve them."},
  {id:"s-ppm", title:"Next month's service plan", kind:"routine", days:[3], start:"16:00", end:"16:30",
   agent:"Service Planning Agent", note:"Near month end, reviews contracts and prepares proposed PPM visits for approval."}
];

export const CAL_EVENTS = [
  {day:-5, title:"Boyne Valley Foods survey", kind:"meeting", start:"10:00", end:"12:00", who:["me","ciaran"], place:"Mell Industrial Estate, Drogheda"},
  {day:-3, title:"Allendale zone 4 fault, first visit", kind:"focus", start:"08:30", end:"13:30", who:["declan"], place:"Allendale Court, Clonsilla"},
  {day:-2, title:"Ardmore contract renewal call", kind:"call", start:"10:00", end:"10:45", who:["me","sinead"], meet:true},
  {day:0, title:"Allendale return visit, zone 4 repair", kind:"meeting", start:"08:30", end:"11:30", who:["declan"], place:"Allendale Court, Clonsilla"},
  {day:0, title:"Celbridge Block B access control", kind:"focus", start:"08:00", end:"16:30", who:["shane"], place:"Celbridge Business Campus"},
  {day:0, title:"Call Gráinne Healy about Allendale", kind:"call", start:"14:00", end:"14:20", who:["me","grainne"], meet:true},
  {day:1, title:"St. Brigid's extinguisher top-up", kind:"meeting", start:"09:30", end:"11:00", who:["declan"], place:"Kilcock"},
  {day:1, title:"Maynooth Enterprise intercom survey", kind:"meeting", start:"14:00", end:"15:00", who:["me","shane"], place:"Maynooth Enterprise Centre"},
  {day:2, title:"Celbridge access control handover", kind:"meeting", start:"15:00", end:"16:00", who:["me","shane"], place:"Celbridge Business Campus"},
  {day:2, title:"Boyne Valley decision call", kind:"call", start:"11:00", end:"11:30", who:["me"], meet:true},
  {day:3, title:"PPM: Willows fire alarm", kind:"meeting", start:"09:00", end:"11:30", who:["ciaran"], place:"The Willows, Lucan"},
  {day:4, title:"Month-end review with Fiona", kind:"call", start:"15:30", end:"17:00", who:["me","fiona"], meet:true},
  {day:5, title:"Van stock count", kind:"focus", start:"08:00", end:"10:00", who:["me","sinead"], place:"Maynooth yard"},
  {day:7, title:"PPM: Harbourview Hotel", kind:"meeting", start:"10:00", end:"13:00", who:["ciaran"], place:"Malahide"},
  {day:8, title:"PPM: Allendale Court fire and lighting", kind:"meeting", start:"09:00", end:"13:30", who:["declan"], place:"Clonsilla"},
  {day:9, title:"Ashbourne emergency lighting quote follow-up", kind:"call", start:"14:00", end:"14:30", who:["me"], meet:true},
  {day:11, title:"Christmas shutdown rota sign-off", kind:"call", start:"11:00", end:"11:30", who:["me","sinead"], meet:true}
];

/* All-day checklists on the given weekdays. The first one is already ticked on past days. */
export const CAL_CHECKLISTS = [
  {title:"Van safety checks", days:[1,3,5]},
  {title:"Job box cleared", days:[1,3,5]},
  {title:"Completed jobs invoiced", days:[1,3,5]}
];

/* Up next. leverage: 1 to 5, how much finishing it moves the business. mins: how long it takes. */
export const CAL_TASKS = [
  {title:"Approve invoice for J-4558, Phoenix House", due:-2, leverage:5, priority:"High", mins:10},
  {title:"Allocate the three unallocated jobs", due:0, leverage:5, priority:"High", mins:15},
  {title:"Approve the December service plan", due:0, leverage:5, priority:"High", mins:20},
  {title:"Decide on Boyne Valley install dates", due:1, leverage:5, priority:"High", mins:30},
  {title:"Book a return visit for J-4571, Boyne Valley", due:-1, leverage:4, priority:"High", mins:15},
  {title:"Move Niall's Monday clash", due:0, leverage:4, priority:"High", mins:15},
  {title:"Send December contract invoices", due:2, leverage:4, priority:"Medium", mins:20},
  {title:"Approve this week's timesheets", due:0, leverage:3, priority:"Medium", mins:20},
  {title:"Chase Brady's Foodmarket overdue invoice", due:0, leverage:3, priority:"Medium", mins:10},
  {title:"Review Ashbourne emergency lighting quote", due:2, leverage:3, priority:"Medium", mins:30},
  {title:"Renew Ardmore service contract", due:5, leverage:3, priority:"Medium", mins:30},
  {title:"Order winter grit for the grounds contracts", due:6, leverage:2, priority:"Low", mins:15},
  {title:"Update the engineer onboarding page", due:9, leverage:2, priority:"Low", mins:45}
];
