import React from "react";
import { ArrowRight, Download, ListChecks } from "lucide-react";
import { CALCULATOR_URL } from "./constants.js";
import { SiteHeader, SiteFooter } from "./components/SiteChrome.jsx";

// ---------------------------------------------------------------------------
// INSTALLATION GUIDE — a simplified, highly-visual walkthrough distinct from
// the full PDF manuals (Simon, 2026-08-25: "iblnad vill folk bara ta den
// enkla vägen" — sometimes people just want the easy path). Structure
// mirrors EV Blocks' numbered-step installation page.
//
// UNIFIED 2026-08-26 (Simon): bollard and charger foundations go in the
// ground the same way — excavate, place & backfill, compact, mount — so
// this is now ONE four-step sequence instead of two separate 3-step
// sections that duplicated the same process. Step 1 keeps its original
// photo/copy ("bra som det är med bild"); steps 2-4 use Simon's own
// jobsite photos from 2026-08-26 (site/public/photos/install-*.jpg).
// Manuals still differ by product line, so the download CTA at the bottom
// offers both rather than picking one.
// ---------------------------------------------------------------------------

function StepCard({ n, title, children, image, images, caption }) {
  const imgs = images || (image ? [{ src: image, caption }] : []);
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
      {imgs.length > 0 && (
        <div className="flex flex-col gap-3">
          {imgs.map((img) => (
            <div key={img.src}>
              <div className="overflow-hidden rounded-lg border border-black/10">
                <img
                  src={img.src}
                  alt={img.caption || title}
                  className="h-40 w-full object-cover"
                />
              </div>
              {img.caption && (
                <p className="mt-1.5 text-xs text-steel/70">{img.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const INSTALL_STEPS = [
  {
    title: "Excavate",
    points: [
      "Standard excavation equipment — no forms, no rebar cage, no concrete truck.",
      "Dig to the foundation's specified depth: about 20\" for NordBase Bollard, 25.8\" across Small, Medium, and Large.",
      "No specialty crew required — this is the same excavation any utility or paving crew already runs.",
    ],
    image: "/photos/excavator-wide.jpg",
    caption: "Standard excavation equipment, no specialty crew required.",
  },
  {
    title: "Place the foundation & backfill",
    points: [
      "Laser-cut, hot-dip galvanized steel foundation drops straight into the pit — no cure time to wait out.",
      "Backfill with engineered crushed stone (1/2\"–5/8\" is the calculator's default gradation); the passive-pressure rating is pre-engineered per material.",
      "Every mounting hole is already cut to spec before it leaves the shop — no field drilling on the foundation itself.",
    ],
    image: "/photos/install-place-backfill.jpg",
    caption: "Backfilling around the foundations with engineered crushed stone.",
  },
  {
    title: "Compact the backfill",
    points: [
      "Compact in lifts per the manual's schedule — this is what the passive-pressure rating is engineered around.",
      "A standard plate compactor is all the equipment this step needs.",
      "Repeat after each backfill lift, not just once at the top.",
    ],
    images: [
      {
        src: "/photos/install-compact-overview.jpg",
        caption: "Backfill compacted in lifts around a set of foundations.",
      },
      {
        src: "/photos/install-compact-detail.jpg",
        caption: "A standard plate compactor is all this step needs.",
      },
    ],
  },
  {
    title: "Mount & you're ready",
    points: [
      "Set your bollard, protective post, or charger pedestal — foundation is load-ready as soon as backfill compaction is complete.",
      "No waiting on a concrete cure schedule — most installs finish in a single day.",
      "Adapter plate (charger foundations) or accessory mounts (bollard) bolt on the same day.",
    ],
    image: "/photos/install-complete.jpg",
    caption: "Installed and load-ready — no concrete cure time.",
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
            The simple version — four steps, no concrete cure time.
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

      <section className="border-b border-black/10 bg-bgSoft py-16 text-dark">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold">
            <ListChecks className="h-4 w-4" /> Installation steps
          </div>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
            Same process, every foundation
          </h2>
          <p className="mt-3 max-w-2xl text-steel">
            Bollard and charger foundations go in the ground the same way —
            only the equipment you bolt on at the end changes.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-steel">
            Applies to: NordBase Bollard, Small, Medium, Large
          </p>

          <div className="mt-8 flex flex-col gap-4">
            {INSTALL_STEPS.map((s, i) => (
              <StepCard
                key={s.title}
                n={i + 1}
                title={s.title}
                image={s.image}
                images={s.images}
                caption={s.caption}
              >
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
            <a
              href="/docs/manuals/NI_Manual_AC_001_US.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-dark hover:bg-goldSoft"
            >
              <Download className="h-4 w-4" /> Bollard manual (PDF)
            </a>
            <a
              href="/docs/manuals/NI_Manual_DCS_001_US.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-dark hover:bg-goldSoft"
            >
              <Download className="h-4 w-4" /> Charger manual (PDF)
            </a>
            <span className="text-xs text-steel">
              Charger manual covers NordBase Small — Medium and Large not yet
              published.
            </span>
            <a
              href="/resources.html"
              className="text-sm font-bold text-dark hover:text-gold"
            >
              All documentation →
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
