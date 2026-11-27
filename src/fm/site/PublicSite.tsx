/* The public website. A separate brand surface from the platform: it shares
   only the data layer, so a submitted enquiry lands in the sales pipeline. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { COMPANY, DIVISIONS, divisionById } from "../config";
import { useFM, closeSite, setSitePage, submitEnquiry, go } from "../store";
import { SERVICE_OPTIONS, SERVICE_PAGES, SITE_NAV, type SitePageId } from "./content";
import "./site.css";

const img = (seed: string, w = 1200, h = 900) => "https://picsum.photos/seed/" + seed + "/" + w + "/" + h + "?grayscale";

function Img({ seed, className, w, h, alt }: { seed: string; className?: string; w?: number; h?: number; alt: string }) {
  return (
    <div className={"ps-img " + (className || "")}>
      <img src={img(seed, w, h)} alt={alt} loading="lazy" />
    </div>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14 M13 6l6 6-6 6" />
    </svg>
  );
}

export default function PublicSite() {
  const s = useFM();
  const [menu, setMenu] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const [pageRaw, query] = (s.ui.sitePage || "home").split("?");
  const page = (pageRaw as SitePageId) || "home";
  const preset = new URLSearchParams(query || "").get("svc") || "";
  const nav = (p: string) => {
    setSitePage(p);
    setMenu(false);
    root.current?.scrollTo({ top: 0 });
  };
  const quote = (svc: string) => nav("quote?svc=" + encodeURIComponent(svc));
  const exit = () => {
    if (location.hash.startsWith("#site")) history.replaceState(null, "", location.pathname + location.search);
    closeSite();
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const svcPage = SERVICE_PAGES.find((p) => p.id === page);

  return (
    <div className="ps-root" ref={root} role="dialog" aria-label={COMPANY.umbrellaName + " website"}>
      <div className="ps-demo">
        <div className="ps-wrap">
          <b>Demonstration website</b>
          <span className="long">Enquiries submitted here go straight into the management platform.</span>
          <button onClick={exit}>Back to platform</button>
        </div>
      </div>
      <header className="ps-head">
        <div className="ps-wrap">
          <button className="ps-logo" onClick={() => nav("home")} aria-label="Home">
            <i>{COMPANY.umbrellaName.charAt(0)}</i>
            <span>{COMPANY.umbrellaName}<small>Fire, security and property maintenance across {COMPANY.region}</small></span>
          </button>
          <nav className="ps-nav" aria-label="Main">
            {SITE_NAV.map(([id, label]) => <button key={id} className={page === id ? "on" : ""} onClick={() => nav(id)}>{label}</button>)}
          </nav>
          <button className="ps-btn amber sm ps-cta-head" onClick={() => quote("")}>Request a quote</button>
          <button className="ps-burger" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={menu ? "M6 6l12 12 M18 6 6 18" : "M4 7h16 M4 12h16 M4 17h16"} /></svg>
          </button>
        </div>
        {menu && (
          <div className="ps-mnav">
            {SITE_NAV.map(([id, label]) => <button key={id} onClick={() => nav(id)}>{label}</button>)}
            <button onClick={() => quote("")} style={{ color: "#e3a33b", borderBottom: 0 }}>Request a quote</button>
          </div>
        )}
      </header>

      <main>
        {page === "home" && <Home nav={nav} quote={quote} />}
        {svcPage && <ServiceView p={svcPage} quote={quote} nav={nav} />}
        {page === "about" && <About quote={quote} />}
        {page === "quote" && <QuotePage preset={preset} />}
        {page === "contact" && <Contact quote={quote} />}
      </main>

      <footer className="ps-foot">
        <div className="ps-wrap">
          <div>
            <h5>{COMPANY.umbrellaName}</h5>
            <div>{COMPANY.address}</div>
            <div style={{ marginTop: 6 }}>{COMPANY.phone}</div>
            <div>{COMPANY.email}</div>
          </div>
          <div>
            <h5>Services</h5>
            {SERVICE_PAGES.map((p) => <button key={p.id} onClick={() => nav(p.id)}>{p.eyebrow === "Servicing and maintenance" ? "Servicing" : SITE_NAV.find((x) => x[0] === p.id)?.[1]}</button>)}
          </div>
          <div>
            <h5>Our divisions</h5>
            {DIVISIONS.map((d) => <div key={d.id} style={{ padding: "4px 0" }}>{d.name}</div>)}
            <button onClick={() => nav("contact")} style={{ marginTop: 10 }}>Contact us</button>
          </div>
          <div className="legal">{COMPANY.umbrellaName}. Trading as {DIVISIONS.map((d) => d.name).join(", ")}.</div>
        </div>
      </footer>
    </div>
  );
}

function CtaBand({ quote, title }: { quote: (s: string) => void; title?: string }) {
  return (
    <section className="ps-sec dark">
      <div className="ps-wrap ps-cta">
        <div>
          <div className="ps-kicker">Talk to us</div>
          <h2 className="ps-h2" style={{ marginTop: 14 }}>{title || "Tell us about your building."}</h2>
          <p className="ps-lead">Send a few details and we'll come back to you to arrange a visit or a price.</p>
        </div>
        <div className="ps-cta-btns">
          <button className="ps-btn amber" onClick={() => quote("")}>Request a quote <Arrow /></button>
          <button className="ps-btn line" onClick={() => quote("Planned servicing contract")}>Arrange a service <Arrow /></button>
          <button className="ps-btn line" onClick={() => quote("Site assessment")}>Book a site assessment <Arrow /></button>
        </div>
      </div>
    </section>
  );
}

function Home({ nav, quote }: { nav: (p: string) => void; quote: (s: string) => void }) {
  const divCopy: Record<string, [string, string, string]> = {
    LFL: ["fire", "fire-alarm-commercial-corridor", "Fire alarms, emergency lighting, extinguishers, hose reels and dry risers. Installed, serviced and repaired."],
    SS: ["security", "security-camera-building-exterior", "CCTV, access control and intercoms for apartment blocks, workplaces and retail."],
    LPM: ["maintenance", "apartment-building-grounds-garden", "Repairs, painting, grounds and gardening for the buildings we already look after, and more."],
  };
  return (
    <>
      <section className="ps-hero">
        <div className="ps-wrap">
          <div>
            <div className="ps-kicker">Facilities services across {COMPANY.region}</div>
            <h1>Keeping your buildings safe, secure and operational.</h1>
            <p>Fire safety, security systems and property maintenance from one team, with planned servicing that keeps everything working.</p>
            <div className="ps-ctas">
              <button className="ps-btn amber" onClick={() => quote("")}>Request a quote</button>
              <button className="ps-btn line" onClick={() => quote("Planned servicing contract")}>Arrange a service</button>
            </div>
          </div>
          <Img seed="commercial-building-facade-dusk" className="warm" w={900} h={1100} alt="Commercial building at dusk" />
        </div>
      </section>

      <section className="ps-sec">
        <div className="ps-wrap">
          <div className="ps-kicker" style={{ color: "#a7731c" }}>Three divisions, one team</div>
          <h2 className="ps-h2" style={{ marginTop: 14 }}>Everything a building needs to stay compliant and running.</h2>
          <p className="ps-lead">{COMPANY.umbrellaName} brings together three trading divisions. One call covers the fire alarm, the cameras and the gutters.</p>
          <div className="ps-divs">
            {DIVISIONS.map((d, i) => {
              const c = divCopy[d.id];
              return (
                <button key={d.id} className={"ps-div" + (i === 0 ? " big" : "")} onClick={() => nav(c[0])}>
                  <Img seed={c[1]} w={i === 0 ? 900 : 800} h={i === 0 ? 1100 : 600} alt="" />
                  <span className="tag">{d.short}</span>
                  <h3>{d.name}</h3>
                  <p>{c[2]}</p>
                  <span className="go">See what we do <Arrow /></span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="ps-sec paper">
        <div className="ps-wrap">
          <h2 className="ps-h2">What we look after</h2>
          <div className="ps-list">
            {[
              ["Fire alarm systems", "Installation, quarterly servicing, fault finding and replacement components."],
              ["Emergency lighting", "Monthly and annual testing, LED upgrades and failed fitting replacement."],
              ["Fire-fighting equipment", "Extinguishers, hose reels and dry risers, serviced on schedule."],
              ["CCTV", "IP cameras, recorders and remote viewing, designed around what you need to see."],
              ["Access control and intercoms", "Fob access, door hardware and video intercoms for every type of building."],
              ["Property maintenance", "Reactive repairs, painting, grounds and gardening by our own team."],
            ].map(([t, d]) => <div key={t}><h4>{t}</h4><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="ps-sec dark">
        <div className="ps-wrap">
          <div className="ps-kicker">How we work</div>
          <h2 className="ps-h2" style={{ marginTop: 14 }}>Clear from the first visit to the final report.</h2>
          <div className="ps-how">
            {[
              ["Survey", "We visit, look at how the building is used and listen to what you need."],
              ["Quote", "A detailed proposal with the total price up front and every item listed."],
              ["Deliver", "Our engineers do the work, keep you informed and confirm when it's complete."],
              ["Service", "Planned visits on the right frequency for each system, with a report every time."],
            ].map(([t, d]) => <div key={t}><h4>{t}</h4><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="ps-sec">
        <div className="ps-wrap ps-cta" style={{ alignItems: "stretch" }}>
          <Img seed="maintenance-engineer-plant-room" className="warm" w={900} h={700} alt="Engineer working in a plant room" />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div className="ps-kicker" style={{ color: "#a7731c" }}>Planned servicing</div>
            <h2 className="ps-h2" style={{ marginTop: 14 }}>One service plan for every system on your site.</h2>
            <p className="ps-lead">Fire alarms quarterly, CCTV twice a year, extinguishers annually. Each system on the frequency it needs, grouped into as few visits as possible.</p>
            <div className="ps-ctas"><button className="ps-btn navy" onClick={() => nav("servicing")}>About servicing <Arrow /></button></div>
          </div>
        </div>
      </section>

      <CtaBand quote={quote} />
    </>
  );
}

function ServiceView({ p, quote, nav }: { p: (typeof SERVICE_PAGES)[number]; quote: (s: string) => void; nav: (p: string) => void }) {
  const d = p.division === "ALL" ? null : divisionById(p.division);
  return (
    <>
      <section className="ps-phero">
        <div className="ps-wrap">
          <div>
            <div className="ps-kicker">{p.eyebrow}</div>
            <h1>{p.title}</h1>
            <p>{p.intro}</p>
            <div className="ps-ctas">
              <button className="ps-btn amber" onClick={() => quote(p.cta)}>Request a quote</button>
              <button className="ps-btn line" onClick={() => quote("Site assessment")}>Book a site assessment</button>
            </div>
          </div>
          <Img seed={p.image} className="warm" w={1000} h={700} alt="" />
        </div>
      </section>
      <section className="ps-sec">
        <div className="ps-wrap">
          <h2 className="ps-h2">What's included</h2>
          {d && <p className="ps-lead">Delivered by {d.name}, part of {COMPANY.umbrellaName}.</p>}
          <div className="ps-list">{p.offer.map((o) => <div key={o.t}><h4>{o.t}</h4><p>{o.d}</p></div>)}</div>
        </div>
      </section>
      <section className="ps-sec paper">
        <div className="ps-wrap">
          <h2 className="ps-h2">How it works</h2>
          <div className="ps-how">{p.how.map((h) => <div key={h.t}><h4>{h.t}</h4><p>{h.d}</p></div>)}</div>
          {p.id !== "servicing" && <div className="ps-ctas"><button className="ps-btn ghost" onClick={() => nav("servicing")}>Planned servicing <Arrow /></button></div>}
        </div>
      </section>
      <CtaBand quote={quote} />
    </>
  );
}

function About({ quote }: { quote: (s: string) => void }) {
  return (
    <>
      <section className="ps-phero">
        <div className="ps-wrap">
          <div>
            <div className="ps-kicker">About us</div>
            <h1>A facilities business built on recommendations.</h1>
            <p>Most of our work has come from customers telling other building owners about us. {COMPANY.umbrellaName} is how we bring fire safety, security and property maintenance together under one name.</p>
          </div>
          <Img seed="dublin-office-building-street" className="warm" w={1000} h={700} alt="" />
        </div>
      </section>
      <section className="ps-sec">
        <div className="ps-wrap">
          <h2 className="ps-h2">Three divisions, one point of contact.</h2>
          <div className="ps-list">
            {DIVISIONS.map((d) => <div key={d.id}><h4>{d.name}</h4><p>{d.tagline}.</p></div>)}
            <div><h4>Our own engineers</h4><p>The people who install your systems are the people who service them.</p></div>
          </div>
        </div>
      </section>
      <section className="ps-sec paper">
        <div className="ps-wrap">
          <h2 className="ps-h2">How we like to work</h2>
          <div className="ps-list">
            {[
              ["Straight answers", "You'll know what's being done, when, and what it costs before we start."],
              ["Completion before invoice", "We confirm the work is finished and tell you what was done before we bill for it."],
              ["Planned, not reactive", "Regular servicing finds faults before they become callouts."],
              ["Records you can find", "Service reports, completion notes and invoices kept against your site."],
            ].map(([t, x]) => <div key={t}><h4>{t}</h4><p>{x}</p></div>)}
          </div>
        </div>
      </section>
      <CtaBand quote={quote} title="Want to work with us?" />
    </>
  );
}

function Contact({ quote }: { quote: (s: string) => void }) {
  return (
    <>
      <section className="ps-sec">
        <div className="ps-wrap">
          <div className="ps-kicker" style={{ color: "#a7731c" }}>Contact</div>
          <h2 className="ps-h2" style={{ marginTop: 14 }}>Get in touch.</h2>
          <p className="ps-lead">For a fault on a system we already look after, call us. For a new quote, a service contract or a site assessment, send an enquiry.</p>
          <div className="ps-contact">
            <div><div className="k">Phone</div><div className="v">{COMPANY.phone}</div></div>
            <div><div className="k">Email</div><div className="v">{COMPANY.email}</div></div>
            <div><div className="k">Office</div><div className="v">{COMPANY.address}</div></div>
          </div>
          <div className="ps-ctas">
            <button className="ps-btn navy" onClick={() => quote("")}>Send an enquiry <Arrow /></button>
            <button className="ps-btn ghost" onClick={() => quote("Site assessment")}>Book a site assessment</button>
          </div>
        </div>
      </section>
      <section className="ps-sec paper">
        <div className="ps-wrap">
          <h2 className="ps-h2">Where we work</h2>
          <p className="ps-lead">Buildings across {COMPANY.region}, including Dublin, Kildare, Meath, Wicklow and Louth.</p>
        </div>
      </section>
    </>
  );
}

type Form = { name: string; company: string; email: string; phone: string; service: string; location: string; description: string };
function QuotePage({ preset }: { preset: string }) {
  const [f, setF] = useState<Form>({ name: "", company: "", email: "", phone: "", service: SERVICE_OPTIONS.includes(preset) ? preset : "", location: "", description: "" });
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<null | { ref: string; division: string }>(null);
  useEffect(() => {
    if (SERVICE_OPTIONS.includes(preset)) setF((x) => ({ ...x, service: preset }));
  }, [preset]);
  const errs: Partial<Record<keyof Form, string>> = {};
  if (!f.name.trim()) errs.name = "Please tell us your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errs.email = "Enter a valid email address";
  if (f.phone.replace(/\D/g, "").length < 7) errs.phone = "Enter a phone number we can reach you on";
  if (!f.service) errs.service = "Choose the service you need";
  if (!f.location.trim()) errs.location = "Where is the site?";
  if (f.description.trim().length < 10) errs.description = "A sentence or two helps us prepare";
  const up = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errs).length) return;
    const en = submitEnquiry({ name: f.name.trim(), company: f.company.trim(), email: f.email.trim(), phone: f.phone.trim(), service: f.service, location: f.location.trim(), description: f.description.trim() });
    setDone({ ref: en.id.toUpperCase(), division: divisionById(en.division).name });
  };
  const field = (k: keyof Form, label: string, el: ReactNode, full?: boolean, help?: string) => (
    <div className={"ps-field" + (full ? " full" : "") + (touched && errs[k] ? " bad" : "")}>
      <label htmlFor={"ps-" + k}>{label}</label>
      {el}
      {touched && errs[k] ? <span className="err">{errs[k]}</span> : help ? <span className="help">{help}</span> : null}
    </div>
  );
  return (
    <section className="ps-sec">
      <div className="ps-wrap">
        <div className="ps-kicker" style={{ color: "#a7731c" }}>Request a quote</div>
        <h2 className="ps-h2" style={{ marginTop: 14 }}>Tell us what you need.</h2>
        <p className="ps-lead">We'll come back to you to arrange a visit or a price.</p>
        <div className="ps-quote" style={{ marginTop: 44 }}>
          {done ? (
            <div className="ps-done" role="status">
              <h3>Thanks, {f.name.split(" ")[0]}. We have your request.</h3>
              <p>Your reference is <b>{done.ref}</b>. It has gone to {done.division} and we'll be in touch about your {f.service.toLowerCase()} at {f.location}.</p>
              <div className="ps-ctas">
                <button className="ps-btn navy" onClick={() => { if (location.hash.startsWith("#site")) history.replaceState(null, "", location.pathname + location.search); closeSite(); go("Quotes", "pipeline"); }}>See it in the platform <Arrow /></button>
                <button className="ps-btn ghost" onClick={() => { setDone(null); setTouched(false); setF({ name: "", company: "", email: "", phone: "", service: "", location: "", description: "" }); }}>Send another enquiry</button>
              </div>
              <p style={{ fontSize: 13, color: "#6f7d93", marginTop: 18 }}>Demonstration: the enquiry now sits in the sales pipeline under New Enquiry.</p>
            </div>
          ) : (
            <form className="ps-form" onSubmit={submit} noValidate>
              {field("name", "Name", <input id="ps-name" value={f.name} onChange={up("name")} autoComplete="name" />)}
              {field("company", "Company", <input id="ps-company" value={f.company} onChange={up("company")} autoComplete="organization" />, false, "Optional")}
              {field("email", "Email", <input id="ps-email" type="email" value={f.email} onChange={up("email")} autoComplete="email" />)}
              {field("phone", "Telephone", <input id="ps-phone" type="tel" value={f.phone} onChange={up("phone")} autoComplete="tel" />)}
              {field("service", "Service required", (
                <select id="ps-service" value={f.service} onChange={up("service")}>
                  <option value="">Choose a service</option>
                  {SERVICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
              {field("location", "Site location", <input id="ps-location" value={f.location} onChange={up("location")} placeholder="Town and county" />)}
              {field("description", "Description of requirements", <textarea id="ps-description" value={f.description} onChange={up("description")} placeholder="What's on the site, what's going wrong, or what you'd like installed" />, true)}
              <div className="ps-field full" style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <button type="submit" className="ps-btn amber">Send enquiry <Arrow /></button>
                {touched && Object.keys(errs).length > 0 && <span className="err" style={{ color: "#a23a1c", fontSize: 13 }}>Please check the highlighted fields.</span>}
              </div>
            </form>
          )}
          <aside className="ps-aside">
            <h4>What happens next</h4>
            <ul>
              <li>Your enquiry goes straight to the right division.</li>
              <li>We contact you to understand the site.</li>
              <li>Where needed we visit before pricing.</li>
              <li>You get a clear quote with the total up front.</li>
            </ul>
            <h4 style={{ marginTop: 22 }}>Prefer to call?</h4>
            <p>{COMPANY.phone}<br />{COMPANY.email}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
