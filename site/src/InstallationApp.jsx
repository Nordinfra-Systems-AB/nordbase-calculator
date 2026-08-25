import React from "react";
import { ArrowRight, Download, Zap, Bolt } from "lucide-react";
import { CALCULATOR_URL } from "./constants.js";
import { SiteHeader, SiteFooter } from "./components/SiteChrome.jsx";

// ---------------------------------------------------------------------------
// INSTALLATION GUIDE — a simplified, highly-visual walkthrough distinct from
// the full PDF manuals (Simon, 2026-08-25: "iblnad vill folk bara ta den
// enkla vägen" — sometimes people just want the easy path). Structure
// mirrors EV Blocks' numbered-step installation page, but as ONE page with
// two sections (AC/L2 vs. DC) rather than two separate pages behind a nav
// dropdown — confirmed with Simon. Photos are Nordinfra's own real jobsite /
// fabrication photography already vetted for the homepage gallery (not new
// or unverified imagery) — see site/public/photos/. Full step-by-step
// manuals remain the authoritative source; this page links out to them.
// ---------------------------------------------------------------------------

function StepCard({ n, title, children, image, caption }) {
  return (
    <div className="grid gap-6 rounded-xl border border-black/10 bg-white p-6 md:grid-cols-[auto_1fr_260px] md:items-start">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-extrabold text-dark">
        {n}
      </div>
      <div>
        <h3 className="text-lg font-bold text-dark">{title}</h3>
        <div className="mt-2 text-sm leading-relaxed text-steel">
          {children}
        </div>
      </div>
      {image && (
        <div>
          <div className="overflow-hidden rounded-lg border border-black/10">
            <img src={image} alt={caption || title} className="h-40 w-full object-cover" />
          </div>
          {caption && (
            <p className="mt-1.5 text-xs text-steel/70">{caption}</p>
          )}
        </div>
      )}
    </div>
  );
}

function GuideSection({ icon: Icon, eyebrow, title, intro, steps, manual, manualNote, tiers }) {
  return (
    <section className="border-b border-black/10 bg-bgSoft py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold">
          <Icon className="h-4 w-4" /> {eyebrow}
        </div>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight">{title}</h2>
        <p className="mt-3 max-w-2xl text-steel">{intro}</p>
        {tiers && (
          <p className="mt-2 max-w-2xl text-sm text-steel">
            Applies to: {tiers}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-4">
          {steps.map((s, i) => (
            <StepCard key={s.title} n={i + 1} title={s.title} image={s.image} caption={s.caption}>
              <ul className="flex flex-col gap-1.5">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </StepCard>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {manual ? (
            <a
              href={manual}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-dark hover:bg-goldSoft"
            >
              <Download className="h-4 w-4" /> Download the full manual (PDF)
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-md border border-black/15 px-5 py-2.5 text-sm font-semibold text-steel">
              Full manual for this size — coming soon
            </span>
          )}
          {manualNote && (
            <span className="text-xs text-steel">{manualNote}</span>
          )}
          <a
            href="/resources.html"
            className="text-sm font-bold text-dark hover:text-gold"
          >
            All documentation →
          </a>
        </div>
      </div>
    </section>
  );
}

const BOLLARD_STEPS = [
  {
    title: "Excavate",
    points: [
      "Standard excavation equipment — no forms, no rebar cage, no concrete truck.",
      "Dig to the foundation's specified depth — about 20\" for NordBase Bollard.",
      "No specialty crew required — this is the same excavation any utility or paving crew already runs.",
    ],
    image: "/photos/excavator-wide.jpg",
    caption: "Standard excavation equipment, no specialty crew required.",
  },
  {
    title: "Place & backfill",
    points: [
      "Laser-cut, hot-dip galvanized steel foundation drops straight into the pit — no cure time to wait out. At 16.3 lb, it's a one-person set.",
      "Backfill with engineered crushed stone (1/2\"–5/8\" is the calculator's default gradation); the passive-pressure rating is pre-engineered per material, so there's no separate friction-angle calculation on site.",
      "Compact per the manual's lift schedule.",
    ],
    image: "/photos/steel-fabrication.jpg",
    caption: "Laser-cut, hot-dip galvanized steel — no concrete cure time.",
  },
  {
    title: "Mount the bollard or accessories",
    points: [
      "Set your bollard or protective post — this foundation has no adapter plate or charger mount.",
      "Optional accessories bolt on the same day: bollard assembly, bollard cover, or the sensor pole collision-protection frame.",
      "Foundation is load-ready as soon as backfill compaction is complete — no waiting on a cure schedule.",
    ],
    image: "/photos/assembly-ac.png",
    caption: "AC & Bollard assembly, ready for a bollard or protective post.",
  },
];

const CHARGER_STEPS = [
  {
    title: "Excavate",
    points: [
      "Standard excavation, sized to the foundation footprint — up to about 47\" × 47\" at the base on NordBase Large.",
      "Depth is 25.8\" across Small, Medium, and Large.",
      "No forms, no rebar cage, no concrete truck.",
    ],
    image: "/photos/excavator-wide.jpg",
    caption: "Standard excavation equipment, no specialty crew required.",
  },
  {
    title: "Place & backfill",
    points: [
      "These foundations run roughly 33–99 lb — Small and Medium are a two-person lift, Large typically wants a small crane or excavator-assisted set.",
      "Backfill with engineered crushed stone (1/2\"–5/8\" default gradation) and compact per the manual's lift schedule.",
      "Every mounting hole is already cut to spec before it leaves the shop — no field drilling on the foundation itself.",
    ],
    image: "/photos/steel-detail.jpg",
    caption: "Every mounting hole cut to spec before it leaves the shop.",
  },
  {
    title: "Mount the charger",
    points: [
      "Adapter plate bolts to your charger's pedestal footprint — standard CC options on Small, custom-dimensioned via the calculator on Medium and Large today.",
      "Field-drillable plate accommodates essentially any pedestal charger's bolt pattern.",
      "Foundation is load-ready as soon as backfill compaction is complete.",
    ],
    image: "/photos/assembly-medium.png",
    caption: "DC Medium assembly, charger and site lighting mounted.",
  },
];

export default function InstallationApp() {
  return (
    <div className="min-h-screen bg-dark text-white">
      <SiteHeader />

      <section className="border-b border-white/10 bg-dark py-16">
        <div className="mx-auto max-w-5xl px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-goldSoft">
            Installation guide
          </span>
          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            The simple version — three steps, no concrete cure time.
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            This is the quick, visual walkthrough. For a project-specific,
            code-referenced procedure, download the full installation manual
            for your foundation size below, or run the calculator for an
            exportable submittal package.
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
              href="/#products"
              className="inline-flex items-center gap-2 rounded-md border border-white/20 px-6 py-3 text-sm font-bold text-white hover:bg-white/5"
            >
              View product line
            </a>
          </div>
        </div>
      </section>

      <div className="bg-bgSoft text-dark">
        <GuideSection
          icon={Bolt}
          eyebrow="Section 1"
          title="Bollard installation"
          intro="No charger, no adapter plate — the lightest, fastest install in the lineup."
          tiers="NordBase Bollard"
          steps={BOLLARD_STEPS}
          manual="/docs/manuals/NI_Manual_AC_001_US.pdf"
        />

        <GuideSection
          icon={Zap}
          eyebrow="Section 2"
          title="Charger foundation installation"
          intro="Level 2 pedestal through Level 4 high-power DC charging — same three-step process, sized up for heavier equipment."
          tiers="NordBase Small, Medium, Large"
          steps={CHARGER_STEPS}
          manual="/docs/manuals/NI_Manual_DCS_001_US.pdf"
          manualNote="Covers NordBase Small — Medium and Large manuals not yet published."
        />
      </div>

      <SiteFooter />
    </div>
  );
}
