import React from "react";
import { Download, FileText, ArrowLeft } from "lucide-react";

// ---------------------------------------------------------------------------
// RESOURCE LIBRARY — every non-unique document (i.e. everything except a
// customer's own calculation report, which is generated per-project in the
// calculator itself). Mirrors the docs also linked from the calculator's
// Report step (public/docs/... in both projects — see that repo's
// FOUNDATION_MANUALS / BABA_CERTIFICATE_PDF / etc.).
//
// HOW TO ADD A DOCUMENT: drop the PDF into site/public/docs/<category>/ and
// add one entry to the relevant array below — { label, file, note? }. Set
// available:false (or omit `file`) for a "coming soon" row.
// ---------------------------------------------------------------------------

const CATEGORIES = [
  {
    title: "Manuals",
    desc: "Step-by-step installation manuals, per foundation.",
    items: [
      {
        label: "NordBase AC & Bollard Foundation — Installation Manual",
        file: "/docs/manuals/NI_Manual_AC_001_US.pdf",
      },
      {
        label: "NordBase Small — Installation Manual",
        file: "/docs/manuals/NI_Manual_DCS_001_US.pdf",
      },
      { label: "NordBase Medium — Installation Manual", available: false },
      { label: "NordBase Large — Installation Manual", available: false },
    ],
  },
  {
    title: "Foundation datasheets",
    desc: "Dimensions, materials, and load capacity summaries per foundation.",
    items: [
      { label: "NordBase Bollard — Datasheet", available: false },
      { label: "NordBase Small — Datasheet", available: false },
      { label: "NordBase Medium — Datasheet", available: false },
      { label: "NordBase Large — Datasheet", available: false },
    ],
  },
  {
    title: "Drawings",
    desc: "Dimensioned foundation and adapter-plate drawings.",
    items: [
      {
        label: "Adapter plate drawings (by charger manufacturer/model)",
        available: false,
        note: "~15 DC Medium drawings + Small universal plate in progress — see the calculator's Configuration step for drawings as they're added.",
      },
    ],
  },
  {
    title: "Technical properties",
    desc: "Material, coating (ZAM/ZM115), and lifecycle data.",
    items: [
      {
        label: "Technical Specifications, Durability & Lifecycle Analysis",
        file: "/docs/technical-specs/Nordinfra_Technical_Spec_US.pdf",
      },
    ],
  },
  {
    title: "Warranty & compliance",
    desc: "Product warranty and Buy America / BABA certification.",
    items: [
      {
        label: "US Product & Function Warranty",
        file: "/docs/warranty/NI_WAR_001_US_Product_Warranty.pdf",
      },
      {
        label: "Buy America / BABA Certificate of Compliance",
        file: "/docs/certificates/NI_BABA_001_US_Certificate.pdf",
        note: "Covers NordBase AC/Bollard, Small, and Medium — NordBase Large not yet covered.",
      },
    ],
  },
  {
    title: "Field documentation",
    desc: "Installed-project photos and site references.",
    items: [{ label: "Field documentation gallery", available: false }],
  },
  {
    title: "Pull-out testing",
    desc: "Independent pull-out / anchorage test results.",
    items: [{ label: "Pull-out test report", available: false }],
  },
];

function Row({ item }) {
  const available = item.file && item.available !== false;
  return (
    <div
      className="flex flex-col gap-1 rounded-lg border border-black/10 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div className="text-sm font-semibold text-dark">{item.label}</div>
        {item.note && (
          <div className="mt-0.5 text-xs text-steel">{item.note}</div>
        )}
      </div>
      {available ? (
        <a
          href={item.file}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-dark hover:bg-goldSoft sm:self-auto"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      ) : (
        <span className="shrink-0 self-start rounded-md border border-black/10 px-3 py-1.5 text-xs font-semibold text-steel sm:self-auto">
          Coming soon
        </span>
      )}
    </div>
  );
}

export default function ResourcesApp() {
  return (
    <div className="min-h-screen bg-bgSoft text-dark">
      <header className="border-b border-black/10 bg-dark text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <a href="/" className="flex shrink-0 items-center">
            <img
              src="/logo/logo-nav-light.png"
              alt="Nordinfra"
              className="h-7 w-auto"
            />
          </a>
          <a
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to site
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold">
          <FileText className="h-4 w-4" /> Resource Library
        </div>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
          Datasheets, manuals & drawings
        </h1>
        <p className="mt-3 max-w-2xl text-steel">
          Everything except your project's own calculation — that's
          generated per-project in the{" "}
          <a
            href="https://nordbase-calculator.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-dark underline"
          >
            foundation calculator
          </a>
          . This library grows as new documents come in — check back for
          updates. Looking to place an order?{" "}
          <a href="/partners.html" className="font-semibold text-dark underline">
            Find a distribution partner
          </a>
          .
        </p>

        <div className="mt-10 flex flex-col gap-10">
          {CATEGORIES.map((cat) => (
            <div key={cat.title}>
              <h2 className="text-lg font-bold text-dark">{cat.title}</h2>
              <p className="mt-0.5 text-sm text-steel">{cat.desc}</p>
              <div className="mt-3 flex flex-col gap-2">
                {cat.items.map((item) => (
                  <Row key={item.label} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-lg border border-black/10 bg-white p-4 text-xs text-steel">
          PREVIEW — this library is a first-draft build. "Coming soon" items
          are placeholders for documents Nordinfra hasn't supplied yet, not
          confirmation that a document exists.
        </div>
      </section>
    </div>
  );
}
