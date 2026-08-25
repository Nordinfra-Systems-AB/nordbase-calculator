import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Zap,
  Leaf,
  ShieldCheck,
  Clock,
  Factory,
  Globe2,
  Layers,
  Wrench,
  Ruler,
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
  // Duplicate the row so the CSS animation can loop seamlessly, and repeat
  // generously (8x) so the track is wide enough to fill the viewport with
  // no visible gap even with just one confirmed partner today — otherwise
  // the row reads as left-anchored/off-center instead of a continuous loop.
  // translateX(-50%) always shifts by exactly one full copy of PARTNERS
  // (half the track), so this stays seamless as more partners are added.
  const row = [
    ...PARTNERS,
    ...PARTNERS,
    ...PARTNERS,
    ...PARTNERS,
    ...PARTNERS,
    ...PARTNERS,
    ...PARTNERS,
    ...PARTNERS,
  ];
  return (
    <div className="overflow-hidden border-y border-white/10 bg-dark py-6 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="partner-track flex w-max items-center justify-center gap-16">
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
      <SiteHeader />

      {/* HERO — real jobsite photo, not a render, and no motion inside it. */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-2">
          <div className="relative z-10 px-6 py-20 md:py-28">
            <Badge>Practical. Proven. Progressive.</Badge>
            <h1 className="mt-6 max-w-xl text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
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
              <StatCard icon={Clock} value="Same-day" label="Typical install time" />
              <StatCard icon={Leaf} value="Up to 60%" label="Lower CO2e vs. concrete" />
              <StatCard icon={ShieldCheck} value="ASCE 7-22" label="Wind & seismic method" />
              <StatCard icon={Factory} value="4" label="Foundation sizes" />
            </div>
          </div>
          {/* Transparent-background product render, not a photo — object-contain
              keeps the whole assembly visible and lets the dark section
              background show through instead of a hard-edged photo crop. */}
          <div className="relative flex min-h-[320px] items-center justify-center px-6 py-10 md:min-h-full">
            <img
              src="/photos/hero-installation.png"
              alt="NordBase DC Medium foundation with charger and site lighting"
              className="h-full max-h-[560px] w-auto max-w-full object-contain md:max-h-[640px]"
            />
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
                <div className="flex h-full flex-col rounded-xl border border-black/10 bg-white shadow-sm overflow-hidden">
                  <div className="flex aspect-[4/5] items-center justify-center bg-white p-3">
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
            ))}
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
                  <div className="flex aspect-[4/5] items-center justify-center bg-white p-4">
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

          <Reveal delay={100}>
            <div className="mt-14 rounded-xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-white">
                    Ships palletized and nested
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-white/60">
                    Tapered shells nest inside each other — up to 15+ units
                    per pallet, so a full site order moves in one truck
                    instead of several.
                  </p>
                </div>
                <div className="flex gap-4">
                  <img
                    src="/photos/packaging-ac.png"
                    alt="NordBase AC/Bollard foundations nested and palletized for shipping"
                    className="h-40 w-auto rounded-lg bg-white object-contain p-2"
                  />
                  <img
                    src="/photos/packaging-small.png"
                    alt="NordBase Small foundations nested and palletized for shipping"
                    className="h-40 w-auto rounded-lg bg-white object-contain p-2"
                  />
                  <img
                    src="/photos/packaging-medium.png"
                    alt="NordBase Medium foundations nested and palletized for shipping"
                    className="h-40 w-auto rounded-lg bg-white object-contain p-2"
                  />
                </div>
              </div>

              {/* Full-truck density comparison. Basis: 26 standard 48"x40"
                  pallets per floor layer of a 53' dry van, 42,000-45,000 lb
                  typical legal payload. Precast unit weights/sizes (175 lb /
                  668 lb / 1,750 lb for small/standard/large blocks) are
                  published US specs from a representative precast supplier,
                  supplied by Nordinfra — not attributed to a specific brand
                  on the public page. */}
              <div className="mt-8 border-t border-white/10 pt-8">
                <h4 className="font-bold text-white">
                  One truck, hundreds of foundations
                </h4>
                <p className="mt-1 max-w-2xl text-sm text-white/60">
                  A standard 53' trailer holds 26 pallets in a single floor
                  layer. At Nordinfra's per-pallet nesting counts, that's:
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="text-white/50">
                        <th className="pb-2 font-semibold">Tier</th>
                        <th className="pb-2 font-semibold">Per pallet</th>
                        <th className="pb-2 font-semibold">Per truck (26 pallets)</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/80">
                      <tr className="border-t border-white/10">
                        <td className="py-2">AC / Bollard</td>
                        <td className="py-2">100</td>
                        <td className="py-2 font-semibold text-gold">2,600</td>
                      </tr>
                      <tr className="border-t border-white/10">
                        <td className="py-2">DC Small</td>
                        <td className="py-2">40</td>
                        <td className="py-2 font-semibold text-gold">1,040</td>
                      </tr>
                      <tr className="border-t border-white/10">
                        <td className="py-2">DC Medium</td>
                        <td className="py-2">5</td>
                        <td className="py-2 font-semibold text-gold">130</td>
                      </tr>
                      <tr className="border-t border-white/10">
                        <td className="py-2">DC Large</td>
                        <td className="py-2">5</td>
                        <td className="py-2 font-semibold text-gold">130</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 max-w-2xl text-sm text-white/60">
                  Precast concrete doesn't nest, so a comparable delivery is
                  bound by truck weight, not pallet count. Using typical
                  published US unit weights for precast blocks (175 lb / 668
                  lb / 1,750 lb for small, standard, and large sizes) against
                  the same 42,000–45,000 lb payload cap, one truck carries
                  roughly
                  240–255 / 63–67 / 24–26 units — meaning matching
                  Nordinfra's Small, Medium, and Large truckload counts takes
                  about <strong className="text-white">4×, 2×, and 5× as many
                  trucks</strong>.
                </p>
                <p className="mt-4 max-w-2xl text-sm text-white/60">
                  Fewer trucks also means less freight carbon: at the same
                  0.062 kg CO2/tonne-km factor cited below, each fully loaded
                  44,000 lb truck emits roughly{" "}
                  <strong className="text-white">2 kg CO2 per mile
                  driven</strong> — so every precast truck trip avoided saves
                  on the order of 600 kg (1,300 lb) CO2 over a typical
                  300-mile delivery, on top of the per-unit embodied-carbon
                  savings below.
                </p>
                <p className="mt-4 text-xs text-steel">
                  Assumes 26 standard pallets/trailer and a 42,000–45,000 lb
                  legal payload; precast figures per typical published US
                  spec sheets for comparable blocks. Estimates, not a
                  guaranteed freight plan.
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
      <SiteFooter />
    </div>
  );
}
