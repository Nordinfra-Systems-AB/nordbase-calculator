import React from "react";
import {
  ArrowRight,
  Zap,
  Leaf,
  ShieldCheck,
  Clock,
  Factory,
  Globe2,
  Mail,
} from "lucide-react";

// ---------------------------------------------------------------------------
// CONTENT — pulled from Nordinfra_Projektsummering_Juni2026.docx (project
// facts) and NordBaseCalculator.jsx (product blurbs), filtered to what's
// safe for a public site. Internal costs, supplier names, and prospect
// lists from the project doc are intentionally NOT reproduced here.
// This is a first-draft homepage for review — swap any copy that doesn't
// match how Nordinfra wants to sound in market.
// ---------------------------------------------------------------------------

const CALCULATOR_URL = "https://nordbase-calculator.vercel.app/";

const PRODUCTS = [
  {
    name: "NordBase Bollard",
    level: "Bollard",
    desc: "Standalone protective foundation for a bollard/post. The smallest and lightest model in the lineup.",
  },
  {
    name: "NordBase Small",
    level: "Level 2",
    desc: "For Level 2 pedestal-mounted chargers. Square adapter plate with standard CC options.",
  },
  {
    name: "NordBase Medium",
    level: "Level 3",
    desc: "For Level 3 DC fast chargers. Rectangular base gives a larger stabilizing footprint for heavier equipment.",
  },
  {
    name: "NordBase Large",
    level: "Level 4",
    desc: "For Level 4 / high-power DC charging. Widened base plate and reinforced shell for larger equipment.",
  },
];

const CO2_STATS = [
  { product: "AC Level 1/2", saving: "38%" },
  { product: "DC Level 2/3", saving: "52%" },
  { product: "DC Level 3/4", saving: "60%" },
  { product: "Charger Island", saving: "42%" },
];

const MARKETS = ["United States", "Sweden", "United Kingdom", "Canada", "Australia"];

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

export default function App() {
  return (
    <div className="min-h-screen bg-dark text-white">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-dark/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-sm bg-gold" />
            <span className="text-lg font-bold tracking-tight">
              NORDINFRA
            </span>
          </div>
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
            className="inline-flex items-center gap-1.5 rounded-md bg-gold px-4 py-2 text-sm font-bold text-dark hover:bg-goldSoft"
          >
            Calculate your foundation <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <img
            src="/foundation-render.png"
            alt=""
            className="absolute right-0 top-0 h-full w-1/2 object-cover object-left"
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 py-24">
          <Badge>
            <Factory className="h-3.5 w-3.5" /> Modular Steel EV Infrastructure
          </Badge>
          <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            EV charging foundations that go in days,{" "}
            <span className="text-gold">not weeks.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/70">
            NordBase replaces cast-concrete and pre-cast EV charger
            foundations with laser-cut, hot-dip galvanized steel — engineered
            for US wind and seismic code, quicker to install, and
            significantly lower carbon.
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

          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Clock} value="Days" label="Typical install time" />
            <StatCard icon={Leaf} value="Up to 60%" label="Lower embodied CO2e vs. cast concrete" />
            <StatCard icon={ShieldCheck} value="ASCE 7-22" label="Wind & seismic methodology" />
            <StatCard icon={Factory} value="4" label="Foundation sizes, Level 1–4" />
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="border-t border-white/10 bg-bgSoft py-24 text-dark">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Our Product Line
          </h2>
          <p className="mt-2 max-w-xl text-steel">
            One modular steel system, sized for every charger level — from
            protective bollards to high-power DC fast chargers.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((p) => (
              <div
                key={p.name}
                className="flex flex-col rounded-xl border border-black/10 bg-white p-5 shadow-sm"
              >
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
            ))}
          </div>
        </div>
      </section>

      {/* WHY STEEL */}
      <section className="border-t border-white/10 bg-dark py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Why steel, not concrete
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <div>
              <Clock className="h-6 w-6 text-gold" />
              <h3 className="mt-3 font-bold">Fast to make, fast to ship</h3>
              <p className="mt-2 text-sm text-white/60">
                Our kerf-folding technique means the AC and DC foundations
                need no press-brake step — just laser cutting, hand folding,
                and riveting. No concrete cure time, no pre-cast lead times.
              </p>
            </div>
            <div>
              <Leaf className="h-6 w-6 text-gold" />
              <h3 className="mt-3 font-bold">Meaningfully lower carbon</h3>
              <p className="mt-2 text-sm text-white/60">
                Laser-cut recycled-content steel vs. cast concrete cuts
                embodied CO2e substantially across the whole product line —
                see the numbers below.
              </p>
            </div>
            <div>
              <ShieldCheck className="h-6 w-6 text-gold" />
              <h3 className="mt-3 font-bold">Engineered to US code</h3>
              <p className="mt-2 text-sm text-white/60">
                Wind and seismic stability calculated per ASCE 7-22 / IBC
                2021. Every configuration ships with a preliminary
                calculation report — verify against your project's engineer
                of record before construction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SUSTAINABILITY */}
      <section id="sustainability" className="border-t border-white/10 bg-bgSoft py-24 text-dark">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Lower embodied carbon, by the numbers
          </h2>
          <p className="mt-2 max-w-xl text-steel">
            Compared to cast-concrete foundations of equivalent size, per
            unit.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CO2_STATS.map((s) => (
              <div
                key={s.product}
                className="rounded-xl border border-black/10 bg-white p-6"
              >
                <div className="text-3xl font-extrabold text-gold">
                  -{s.saving}
                </div>
                <div className="mt-1 text-sm font-semibold text-dark">
                  {s.product}
                </div>
                <div className="text-xs text-steel">CO2e vs. cast concrete</div>
              </div>
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
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-sm bg-gold" />
                <span className="font-bold">NORDINFRA</span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-white/50">
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
            PREVIEW — this page is a first-draft rebuild, not yet the live
            nord-infra.com site. Content is a starting point for review, not
            final marketing copy. Preliminary calculations from the
            calculator are not a substitute for a PE-stamped package.
          </div>
        </div>
      </footer>
    </div>
  );
}
