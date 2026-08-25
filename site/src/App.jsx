import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Zap,
  Leaf,
  ShieldCheck,
  Clock,
  Factory,
  Globe2,
  Mail,
  Layers,
  Wrench,
  Ruler,
} from "lucide-react";

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

const CALCULATOR_URL = "https://nordbase-calculator.vercel.app/";

const PRODUCTS = [
  {
    name: "NordBase Bollard",
    level: "Bollard",
    desc: "Standalone protective foundation for a bollard or post. The smallest, lightest model in the lineup.",
  },
  {
    name: "NordBase Small",
    level: "Level 2",
    desc: "For Level 2 pedestal chargers. Square adapter plate, standard CC options.",
  },
  {
    name: "NordBase Medium",
    level: "Level 3",
    desc: "For Level 3 DC fast chargers. Rectangular base for a larger stabilizing footprint.",
  },
  {
    name: "NordBase Large",
    level: "Level 4",
    desc: "For Level 4 / high-power DC charging. Widened plate, reinforced shell.",
  },
];

const CO2_STATS = [
  { product: "AC Level 1/2", saving: "38%" },
  { product: "DC Level 2/3", saving: "52%" },
  { product: "DC Level 3/4", saving: "60%" },
  { product: "Charger Island", saving: "42%" },
];

const MARKETS = ["United States", "Sweden", "United Kingdom", "Canada", "Australia"];

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
  // Duplicate the row so the CSS animation can loop seamlessly. Works fine
  // with one confirmed partner today and scales cleanly as more are added.
  const row = [...PARTNERS, ...PARTNERS, ...PARTNERS, ...PARTNERS];
  return (
    <div className="overflow-hidden border-y border-white/10 bg-dark py-6 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="partner-track flex w-max items-center gap-16">
        {row.map((p, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap text-lg font-bold tracking-tight text-white/40"
          >
            {p.name}
            <span className="text-xs font-medium text-white/25">
              {p.location}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-dark text-white">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-dark/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* shrink-0 is load-bearing: without it, on narrow screens the flex
              row squeezes this link below the logo image's natural width and
              the image overflows behind the CTA button instead of resizing
              (that's what "part of the logo gets covered" was). */}
          <a href="/" className="flex shrink-0 items-center">
            <img
              src="/logo/logo-nav-light.png"
              alt="Nordinfra"
              className="h-7 w-auto sm:h-8"
            />
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
            <a href="#products" className="hover:text-white">
              Products
            </a>
            <a href="#sustainability" className="hover:text-white">
              Sustainability
            </a>
            <a href="#markets" className="hover:text-white">
              Markets
            </a>
            <a href="/partners.html" className="hover:text-white">
              Partners
            </a>
            <a href="/resources.html" className="hover:text-white">
              Resources
            </a>
            <a href="#contact" className="hover:text-white">
              Contact
            </a>
          </nav>
          <a
            href={CALCULATOR_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-gold px-3 py-2 text-xs font-bold text-dark hover:bg-goldSoft sm:px-4 sm:text-sm"
          >
            Calculate<span className="hidden sm:inline"> your foundation</span>{" "}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* HERO — real jobsite photo, not a render, and no motion inside it. */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-2">
          <div className="relative z-10 px-6 py-20 md:py-28">
            <Badge>Practical. Proven. Progressive.</Badge>
            <h1 className="mt-6 max-w-xl text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Foundations that go in days,{" "}
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
              <StatCard icon={Clock} value="Days" label="Typical install time" />
              <StatCard icon={Leaf} value="Up to 60%" label="Lower CO2e vs. concrete" />
              <StatCard icon={ShieldCheck} value="ASCE 7-22" label="Wind & seismic method" />
              <StatCard icon={Factory} value="4" label="Foundation sizes" />
            </div>
          </div>
          <div className="relative min-h-[320px] md:min-h-full">
            <img
              src="/photos/hero-installation.jpg"
              alt="NordBase steel foundations being set on a US jobsite"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/10 to-transparent md:bg-gradient-to-r md:from-dark md:via-transparent md:to-transparent md:w-1/4" />
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
        </div>
      </section>

      {/* DISTRIBUTION PARTNERS */}
      <PartnerMarquee />

      {/* PRODUCTS */}
      <section id="products" className="border-t border-white/10 bg-bgSoft py-24 text-dark">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Our Product Line
            </h2>
            <p className="mt-2 max-w-xl text-steel">
              One modular steel system, sized for every charger level — from
              protective bollards to high-power DC fast chargers.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((p, i) => (
              <Reveal key={p.name} delay={i * 70}>
                <div className="flex h-full flex-col rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <span className="w-fit rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-dark">
                    {p.level}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-dark">{p.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-steel">{p.desc}</p>
                  <a
                    href={CALCULATOR_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-dark hover:text-gold"
                  >
                    Configure <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHY STEEL — paired with real fabrication photography instead of
          icon-only text, so the claim is visible, not just asserted. */}
      <section className="border-t border-white/10 bg-dark py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Why steel, not concrete
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-center">
            <Reveal>
              <img
                src="/photos/steel-fabrication.jpg"
                alt="Laser-cut galvanized steel foundation component"
                className="aspect-[4/5] w-full rounded-xl object-cover"
              />
            </Reveal>
            <div className="flex flex-col gap-8">
              <Reveal delay={80}>
                <div className="flex gap-4">
                  <Wrench className="h-6 w-6 shrink-0 text-gold" />
                  <div>
                    <h3 className="font-bold">Fast to make, fast to ship</h3>
                    <p className="mt-2 text-sm text-white/60">
                      Kerf-folding needs no press-brake step — just laser
                      cutting, hand folding, and riveting. No concrete cure
                      time, no pre-cast lead times.
                    </p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={160}>
                <div className="flex gap-4">
                  <Leaf className="h-6 w-6 shrink-0 text-gold" />
                  <div>
                    <h3 className="font-bold">Meaningfully lower carbon</h3>
                    <p className="mt-2 text-sm text-white/60">
                      Laser-cut recycled-content steel vs. cast concrete cuts
                      embodied CO2e substantially across the whole line — see
                      the numbers below.
                    </p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={240}>
                <div className="flex gap-4">
                  <ShieldCheck className="h-6 w-6 shrink-0 text-gold" />
                  <div>
                    <h3 className="font-bold">Engineered to US code</h3>
                    <p className="mt-2 text-sm text-white/60">
                      Wind and seismic stability calculated per ASCE 7-22 /
                      IBC 2021. Every configuration ships with a preliminary
                      calculation report.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
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

      {/* MARKETS */}
      <section id="markets" className="border-t border-white/10 bg-dark py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/50">
            <Globe2 className="h-4 w-4" /> Expanding across five markets
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {MARKETS.map((m) => (
              <span
                key={m}
                className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80"
              >
                {m}
              </span>
            ))}
          </div>
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
      <footer id="contact" className="border-t border-white/10 bg-dark py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div>
              <img
                src="/logo/logo-full-light.png"
                alt="Nordinfra — Practical. Proven. Progressive."
                className="h-14 w-auto"
              />
              <p className="mt-4 max-w-xs text-sm text-white/50">
                Nordinfra Systems AB, Varberg, Sweden. Nordinfra USA LLC
                (Delaware) — in formation.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Mail className="h-4 w-4" />
              <a href="mailto:simon@nord-infra.com" className="hover:text-white">
                simon@nord-infra.com
              </a>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/40">
            PREVIEW — this page is a working draft, not yet the live
            nord-infra.com site. Content is a starting point for review, not
            final marketing copy. Preliminary calculations from the
            calculator are not a substitute for a PE-stamped package.
          </div>
        </div>
      </footer>
    </div>
  );
}
