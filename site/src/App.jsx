import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Zap,
  Leaf,
  ShieldCheck,
  Clock,
  Factory,
  Layers,
  Ruler,
  FileCheck2,
  MapPin,
  FileDown,
} from "lucide-react";
import { CALCULATOR_URL } from "./constants.js";
import { SiteHeader, SiteFooter } from "./components/SiteChrome.jsx";

// ---------------------------------------------------------------------------
// CONTENT — pulled from Nordinfra_Projektsummering_Juni2026.docx (project
// facts), NordBaseCalculator.jsx (product blurbs + PARTNERS array), and the
// existing nord-infra.com site (tone/positioning only — that site is generic
// infrastructure-consulting copy with no foundation/EV content, so nothing
// is reproduced verbatim; the "Practical. Proven. Progressive." line comes
// from Nordinfra's own logo lockup). Internal costs, supplier names, and
// prospect lists from the project doc are intentionally NOT reproduced here.
// This is a working draft for review — swap any copy that doesn't match how
// Nordinfra wants to sound in market.
// ---------------------------------------------------------------------------

// CALCULATOR SHOWCASE — a prominent homepage section for the foundation
// calculator, not just a small nav/hero button (Simon, 2026-08-26, comparing
// to a competitor's homepage: "dom har en stor sida som visar att dom har
// ett beräkningsprogram - vi har bara små diskreta knappar - kanske göra
// samma?"). Screenshot below is the calculator's own live Report step
// (NordBase Small + Postlane 7ft Steel), captured 2026-08-26 — not a mockup.
const CALC_HIGHLIGHTS = [
  {
    icon: FileCheck2,
    text: "Wind & seismic overturning check per ASCE 7-22 / IBC 2021, with a pass/fail DCR shown instantly.",
  },
  {
    icon: MapPin,
    // 2026-09-17 textgenomgång fix: "nearest" implied a choice of several
    // nearby partners — there's currently one, in one state.
    text: "Points you to our authorized distribution partner for that exact configuration.",
  },
  {
    icon: FileDown,
    text: "Downloadable submittal package — bill of materials, install manual, warranty, and spec sheet.",
  },
];

const PRODUCTS = [
  {
    slug: "bollard",
    name: "NordBase Bollard",
    level: "Bollard",
    desc: "Standalone protective foundation for a bollard or post. The smallest, lightest model in the lineup.",
    image: "/photos/product-bollard.png",
  },
  {
    slug: "small",
    name: "NordBase Small",
    level: "Level 2",
    desc: "For Level 2 pedestal chargers. Square adapter plate, standard CC options.",
    image: "/photos/product-small.png",
  },
  {
    slug: "medium",
    name: "NordBase Medium",
    level: "Level 3",
    desc: "For Level 3 DC fast chargers. Rectangular base for a larger stabilizing footprint.",
    image: "/photos/product-medium.png",
  },
  {
    slug: "large",
    name: "NordBase Large",
    level: "Level 4",
    desc: "For Level 4 / high-power DC charging. Widened plate, reinforced shell.",
    image: "/photos/product-large.png",
  },
  {
    slug: "powerblock",
    name: "NordBase Power Block",
    level: "Power Block",
    desc: "For grouped Power Units — multiple DC fast charging power cabinets sharing one modular steel base.",
    image: "/photos/powerblock-bare-foundation.png",
  },
];

// ASSEMBLY — real 3D renders showing each foundation with a representative
// charger/hardware mounted, so a visitor can see the full picture (not just
// the bare steel part) without reading a paragraph. Source: Nordinfra's own
// CAD renders, uploaded 2026-08-25.
const ASSEMBLIES = [
  {
    name: "AC & Bollard",
    image: "/photos/assembly-ac.png",
    desc: "Pedestal-mount Level 2 charger, or a standalone protective bollard on the same base.",
  },
  {
    name: "DC Small",
    image: "/photos/assembly-small.png",
    desc: "Level 2/3 pedestal charger with bollard protection built into the same footprint.",
  },
  {
    name: "DC Medium",
    image: "/photos/assembly-medium.png",
    desc: "Level 3 DC fast charger, with room for site lighting and bollards on one foundation.",
  },
];

const CO2_STATS = [
  { product: "AC Level 1/2", saving: "38%" },
  { product: "DC Level 2/3", saving: "52%" },
  { product: "DC Level 3/4", saving: "60%" },
  { product: "Charger Island", saving: "42%" },
];

// HOW IT WORKS — the 3-step visual explainer. This exists specifically so a
// visitor understands what Nordinfra does in five seconds without reading a
// paragraph, per direct founder feedback.
const HOW_IT_WORKS = [
  {
    icon: Layers,
    step: "01",
    title: "Dig the pit",
    desc: "Standard excavation, no forms, no cure time.",
  },
  {
    icon: Ruler,
    step: "02",
    title: "Set the foundation",
    desc: "Laser-cut steel unit drops in and backfills same day.",
  },
  {
    icon: Zap,
    step: "03",
    title: "Mount the charger",
    desc: "Bolt-ready adapter plate matched to your charger model.",
  },
];

// DISTRIBUTION PARTNERS — mirrors the PARTNERS array in NordBaseCalculator.jsx
// (Nordinfra sells only through distributors, not direct). Only confirmed
// partners belong here — this is a real distributor list, not a logo wall.
// HOW TO ADD A PARTNER: drop a logo file in site/public/partners/<slug>.png
// (transparent PNG or SVG, ~200px tall) and add one entry below.
const PARTNERS = [{ name: "Postlane", location: "New York, NY" }];

// Real jobsite / fabrication photography — see site/public/photos/. Sourced
// from Nordinfra's own project files, not stock imagery.
const GALLERY = [
  {
    src: "/photos/excavator-wide.jpg",
    caption: "Standard excavation equipment, no specialty crew required.",
  },
  {
    src: "/photos/steel-fabrication.jpg",
    caption: "Laser-cut, hot-dip galvanized steel — no concrete cure time.",
  },
  {
    src: "/photos/steel-detail.jpg",
    caption: "Every mounting hole cut to spec before it leaves the shop.",
  },
];

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-goldSoft">
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mt-0.5 rounded-lg bg-gold/15 p-2">
        <Icon className="h-5 w-5 text-gold" />
      </div>
      <div>
        <div className="text-lg font-bold text-white">{value}</div>
        <div className="text-sm text-white/60">{label}</div>
      </div>
    </div>
  );
}

// Reveal — a small, deliberately restrained scroll-in effect: a short
// fade + 16px rise, once, per element. No horizontal movement, no bounce,
// no repeated re-triggering, and it's inert entirely for anyone with
// prefers-reduced-motion set. This is the full extent of the site's motion.
function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
      }}
    >
      {children}
    </div>
  );
}

function PartnerMarquee() {
  // 2026-09-17 textgenomgång fix: this used to loop a single confirmed
  // partner (Postlane, NY) 8x to fill the track width, which read as an
  // established multi-state distribution network rather than what it
  // actually is — one partner, one state. Replaced the looping marquee
  // with a plain static row. Once PARTNERS has more than a couple of
  // entries, a real marquee (or just a wider static row) makes sense
  // again — this is a stopgap for the current one-partner reality, not a
  // permanent design decision.
  return (
    <div className="border-y border-white/10 bg-dark py-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-6 text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-white/40">
          Our first confirmed US distribution partner
        </span>
        {PARTNERS.map((p, i) => (
          <span
            key={i}
            className="flex items-center gap-2 whitespace-nowrap text-lg font-bold tracking-tight text-white/70"
          >
            {p.name}
            <span className="text-xs font-medium text-white/40">
              {p.location}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const productsScrollRef = useRef(null);
  const scrollProducts = (direction) => {
    const el = productsScrollRef.current;
    if (!el) return;
    const card = el.querySelector(":scope > div");
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      {/* NAV */}
      <SiteHeader />

      {/* HERO — full-bleed render of a multi-unit NordBase install (2026-08-27,
          per Simon: background image behind the text/stat-card column,
          replacing the old two-column layout). Dark scrim gradient keeps the
          text legible over the render; scrim is heavier on mobile since
          there's no room for it to fade into clear image on a narrow
          viewport the way it can on desktop. Swap for a real jobsite photo
          gallery per the design-review discussion once those exist. */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <img
            src="/photos/hero-site-array.jpg"
            alt="Row of NordBase DC Medium foundations with Kempower chargers and site lighting installed in a parking lot"
            className="h-full w-full object-cover"
          />
          {/* Mobile gets a flat, stronger tint — the left-to-right fade only
              makes sense once there's a wide viewport for it to resolve
              into visible image on the right; on a narrow screen it just
              leaves a bright patch behind the text. */}
          <div className="absolute inset-0 bg-dark/75 md:bg-dark/55" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-dark via-dark/75 to-dark/5 md:block" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="max-w-xl">
            {/* 2026-09-17 textgenomgång fix: "Proven" here sat right above
                the footer's own "Nordinfra USA LLC ... in formation"
                disclosure — a maturity claim the US entity can't back up
                yet. (Note: the full Nordinfra logo lockup elsewhere on the
                site also reads "Practical. Proven. Progressive." — that's
                baked into the actual logo artwork as the company's real,
                established tagline, so it's left untouched; this Badge is
                separate rendered text specific to this hero section.) */}
            <Badge>Steel foundations for EV charging</Badge>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Foundations installed in days,{" "}
              <span className="text-gold">not weeks.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-white/70">
              NordBase replaces cast-concrete EV charger foundations with
              laser-cut, hot-dip galvanized steel — engineered for US wind
              and seismic code.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={CALCULATOR_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-bold text-dark hover:bg-goldSoft"
              >
                Run a preliminary calculation <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#products"
                className="inline-flex items-center gap-2 rounded-md border border-white/20 px-6 py-3 text-sm font-bold text-white hover:bg-white/5"
              >
                View product line
              </a>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-3">
              {/* 2026-09-17 textgenomgång fix: "Typical" implied a track
                  record of completed US installs this new market entrant
                  doesn't have yet — kept the concrete "Same-day" value,
                  dropped the implied-history word from the label. */}
              <StatCard icon={Clock} value="Same-day" label="Install time" />
              <StatCard icon={Leaf} value="Up to 60%" label="Lower CO2e vs. concrete" />
              <StatCard icon={ShieldCheck} value="ASCE 7-22" label="Wind & seismic method" />
              <StatCard icon={Factory} value="5" label="Foundation sizes" />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — three-step visual, the entire point being that a
          visitor understands the product from this strip alone. */}
      <section className="border-b border-white/10 bg-dark py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-gold/15 p-3">
                    <s.icon className="h-6 w-6 text-gold" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gold">{s.step}</div>
                    <div className="mt-0.5 font-bold text-white">{s.title}</div>
                    <p className="mt-1 text-sm text-white/60">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={240}>
            <a
              href="/installation.html"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-bold text-gold hover:text-goldSoft"
            >
              See the full installation guide <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </Reveal>
        </div>
      </section>

      {/* CALCULATOR SHOWCASE — prominent, not a discreet nav button. */}
      <section className="border-b border-white/10 bg-dark py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-goldSoft">
                Free engineering tool
              </span>
              {/* 2026-09-17 textgenomgång fix: "engineered foundation spec"
                  contradicted the footer's own disclaimer that calculator
                  output is preliminary/not PE-stamped — and the other CTA
                  further down this page already says "preliminary" here.
                  Matched that wording. */}
              <h2 className="mt-6 text-3xl font-extrabold tracking-tight md:text-4xl">
                Get a preliminary foundation spec in under 5 minutes
              </h2>
              <p className="mt-4 max-w-lg text-white/70">
                The NordBase Foundation Selector runs a real preliminary wind
                and seismic check on your project, right in the browser — no
                account, no waiting on a quote request.
              </p>
              <div className="mt-8 flex flex-col gap-4">
                {CALC_HIGHLIGHTS.map((h) => (
                  <div key={h.text} className="flex items-start gap-3">
                    <h.icon className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                    <span className="text-sm text-white/70">{h.text}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={CALCULATOR_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-bold text-dark hover:bg-goldSoft"
                >
                  Open the calculator <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="relative">
                <div className="absolute -inset-6 -z-10 rounded-3xl bg-gold/10 blur-2xl" />
                <img
                  src="/photos/calculator-showcase.png"
                  alt="NordBase Foundation Selector — live calculation report screen"
                  className="w-full rounded-2xl border border-white/10 shadow-2xl"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* DISTRIBUTION PARTNERS */}
      <PartnerMarquee />

      {/* PRODUCTS — horizontally scrollable carousel (arrow buttons +
          drag/touch scroll via native overflow-x) so a 5th card (Power
          Block) doesn't force the grid to an awkward 5-up/wrap layout.
          Card markup/content for the original 4 products is unchanged. */}
      <section id="products" className="border-t border-white/10 bg-bgSoft py-24 text-dark">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">
                  Our Product Line
                </h2>
                <p className="mt-2 max-w-xl text-steel">
                  One modular steel system, sized for every charger level —
                  from protective bollards to grouped DC power blocks.
                </p>
              </div>
              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => scrollProducts(-1)}
                  aria-label="Scroll product line left"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-dark shadow-sm hover:bg-gold/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollProducts(1)}
                  aria-label="Scroll product line right"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-dark shadow-sm hover:bg-gold/10"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Reveal>

          <div className="relative mt-10">
            <div
              ref={productsScrollRef}
              className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {PRODUCTS.map((p, i) => (
                <div
                  key={p.name}
                  className="w-[78%] shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(25%-15px)]"
                >
                  <Reveal delay={i * 70} className="h-full">
                    <div className="flex h-full flex-col rounded-xl border border-black/10 bg-white shadow-sm overflow-hidden">
                      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-white p-3">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-center text-xs font-semibold uppercase tracking-wide text-steel/50">
                            Render coming soon
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5 pt-0">
                        <span className="w-fit rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-dark">
                          {p.level}
                        </span>
                        <h3 className="mt-3 text-lg font-bold text-dark">{p.name}</h3>
                        <p className="mt-2 flex-1 text-sm text-steel">{p.desc}</p>
                        <div className="mt-4 flex items-center gap-4">
                          <a
                            href={`/product.html?f=${p.slug}`}
                            className="inline-flex items-center gap-1 text-sm font-bold text-dark hover:text-gold"
                          >
                            View product <ArrowRight className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={CALCULATOR_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium text-steel hover:text-dark"
                          >
                            Configure
                          </a>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile arrow controls — the desktop pair lives next to the
              heading above; small screens get them below the carousel
              instead so they don't crowd the title. */}
          <div className="mt-4 flex items-center justify-center gap-3 sm:hidden">
            <button
              type="button"
              onClick={() => scrollProducts(-1)}
              aria-label="Scroll product line left"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-dark shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollProducts(1)}
              aria-label="Scroll product line right"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-dark shadow-sm"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ASSEMBLIES — "one system, every charger level" at a glance. Real CAD
          renders showing each foundation with representative hardware
          mounted, so the product line reads instantly without more text. */}
      <section className="border-t border-white/10 bg-dark py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-tight">
              One system. Every charger level.
            </h2>
            <p className="mt-2 max-w-xl text-white/60">
              Same steel platform, same install method — sized and adapted to
              whatever's going on top.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {ASSEMBLIES.map((a, i) => (
              <Reveal key={a.name} delay={i * 80}>
                <div className="flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                  <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-white p-4">
                    <img
                      src={a.image}
                      alt={a.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-white">{a.name}</h3>
                    <p className="mt-1.5 text-sm text-white/60">{a.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          {/* Links out to /foundations.html (added 2026-09-18) rather than
              replacing these static renders in place — this grid's job is a
              fast, at-a-glance product-line overview (see comment above),
              while the dedicated page hosts one shared, lazy-loaded 3D
              viewer with a family switcher. Keeps this section's load light
              and avoids running three live WebGL scenes on page load. */}
          <Reveal delay={ASSEMBLIES.length * 80}>
            <a
              href="/foundations.html"
              className="mt-8 inline-flex items-center gap-2.5 text-[28px] font-bold text-gold hover:text-goldSoft"
            >
              Explore every foundation in 3D <ArrowRight className="h-8 w-8" />
            </a>
          </Reveal>
        </div>
      </section>

      {/* SHIPPING & FREIGHT — was nested inside a since-removed "Why steel,
          not concrete" section (2026-08-26: that copy was redundant with
          the hero stats + the CO2 numbers section below, and Simon wanted
          a light-background break here instead of three dark sections in a
          row). Restyled for bg-bgSoft (was styled for a dark parent). */}
      <section className="border-t border-white/10 bg-bgSoft py-24 text-dark">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Ships palletized and nested
            </h2>
            <p className="mt-2 max-w-xl text-steel">
              Tapered shells nest inside each other — up to 15+ units per
              pallet, so a full site order moves in one truck instead of
              several.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-10 rounded-xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap justify-center gap-3 sm:justify-start sm:gap-4">
                <img
                  src="/photos/packaging-ac.png"
                  alt="NordBase AC/Bollard foundations nested and palletized for shipping"
                  className="h-20 w-auto rounded-lg bg-white object-contain p-2 sm:h-40"
                />
                <img
                  src="/photos/packaging-small.png"
                  alt="NordBase Small foundations nested and palletized for shipping"
                  className="h-20 w-auto rounded-lg bg-white object-contain p-2 sm:h-40"
                />
                <img
                  src="/photos/packaging-medium.png"
                  alt="NordBase Medium foundations nested and palletized for shipping"
                  className="h-20 w-auto rounded-lg bg-white object-contain p-2 sm:h-40"
                />
              </div>

              {/* Full-truck density comparison. Basis: 26 standard 48"x40"
                  pallets per floor layer of a 53' dry van, 42,000-45,000 lb
                  typical legal payload. Precast unit weights/sizes (175 lb /
                  668 lb / 1,750 lb for small/standard/large blocks) are
                  published US specs from a representative precast supplier,
                  supplied by Nordinfra — not attributed to a specific brand
                  on the public page. */}
              <div className="mt-8 border-t border-black/10 pt-8">
                <h3 className="font-bold text-dark">
                  One truck, hundreds of foundations
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-steel">
                  A standard 53' trailer holds 26 pallets in a single floor
                  layer. At Nordinfra's per-pallet nesting counts, that's:
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="text-steel">
                        <th className="pb-2 font-semibold">Tier</th>
                        <th className="pb-2 font-semibold">Per pallet</th>
                        <th className="pb-2 font-semibold">Per truck (26 pallets)</th>
                      </tr>
                    </thead>
                    <tbody className="text-dark">
                      <tr className="border-t border-black/10">
                        <td className="py-2">AC / Bollard</td>
                        <td className="py-2">100</td>
                        <td className="py-2 font-semibold text-gold">2,600</td>
                      </tr>
                      <tr className="border-t border-black/10">
                        <td className="py-2">DC Small</td>
                        <td className="py-2">40</td>
                        <td className="py-2 font-semibold text-gold">1,040</td>
                      </tr>
                      <tr className="border-t border-black/10">
                        <td className="py-2">DC Medium</td>
                        <td className="py-2">5</td>
                        <td className="py-2 font-semibold text-gold">130</td>
                      </tr>
                      <tr className="border-t border-black/10">
                        <td className="py-2">DC Large</td>
                        <td className="py-2">5</td>
                        <td className="py-2 font-semibold text-gold">130</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* 2026-09-17 textgenomgång fix: this used to be two dense
                    paragraphs of unit-weight and mile-by-mile CO2 math on
                    top of a table that already makes the point — trimmed to
                    one line, full math moved into the footnote below for
                    anyone who wants it. */}
                <p className="mt-4 max-w-2xl text-sm text-steel">
                  Because NordBase nests on pallets, one truck carries what
                  takes precast concrete{" "}
                  <strong className="text-dark">2–5 trucks</strong> to
                  deliver — fewer shipments, less freight carbon.
                </p>
                <p className="mt-4 text-xs text-steel">
                  Assumes 26 standard pallets/trailer and a 42,000–45,000 lb
                  legal payload; precast figures (175 lb / 668 lb / 1,750 lb
                  for small/standard/large blocks) per typical published US
                  spec sheets for comparable blocks — matching Nordinfra's
                  Small/Medium/Large truckload counts takes about 4×, 2×, and
                  5× as many precast trucks, each avoided trip saving on the
                  order of 600 kg (1,300 lb) CO2 over a typical 300-mile
                  delivery at the 0.062 kg CO2/tonne-km factor cited below.
                  Estimates, not a guaranteed freight plan.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* GALLERY — real jobsite documentation, not stock photography. */}
      <section className="border-t border-white/10 bg-dark pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {GALLERY.map((g, i) => (
              <Reveal key={g.src} delay={i * 80}>
                <figure className="overflow-hidden rounded-xl border border-white/10">
                  <img
                    src={g.src}
                    alt={g.caption}
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <figcaption className="bg-white/[0.03] p-3 text-xs text-white/50">
                    {g.caption}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SUSTAINABILITY */}
      <section id="sustainability" className="border-t border-white/10 bg-bgSoft py-24 text-dark">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Lower embodied carbon, by the numbers
            </h2>
            <p className="mt-2 max-w-xl text-steel">
              Compared to cast-concrete foundations of equivalent size, per
              unit.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CO2_STATS.map((s, i) => (
              <Reveal key={s.product} delay={i * 70}>
                <div className="rounded-xl border border-black/10 bg-white p-6">
                  <div className="text-3xl font-extrabold text-gold">
                    -{s.saving}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-dark">
                    {s.product}
                  </div>
                  <div className="text-xs text-steel">CO2e vs. cast concrete</div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-xs text-steel">
            Sources: U.S. EPA Cement Carbon Intensities Fact Sheet, Nucor EPD
            (EAF steel), freight factor 0.062 kg CO₂/tonne-km. Figures are
            estimates pending third-party verification.
          </p>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="border-t border-white/10 bg-gold py-16 text-dark">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div>
            <h2 className="text-2xl font-extrabold">
              Get a preliminary foundation calc in minutes
            </h2>
            <p className="mt-1 text-dark/70">
              Free tool — pick your foundation, enter your site's wind/seismic
              data, download a report.
            </p>
          </div>
          <a
            href={CALCULATOR_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-dark px-6 py-3 text-sm font-bold text-white hover:bg-dark/90"
          >
            Open the calculator <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  );
}
