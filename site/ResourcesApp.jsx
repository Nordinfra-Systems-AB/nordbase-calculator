import React, { useState } from "react";
import { Download, FileText, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { CALCULATOR_URL } from "./constants.js";

// ---------------------------------------------------------------------------
// ADAPTER PLATE GALLERY — reference photos only, NOT the dimensioned PDF
// drawings. Deliberate (2026-09-07, per Simon Gullberg): the dimensioned
// drawings (bolt patterns / CC spacing) stay behind the consent checkbox in
// the calculator's own report — publishing them openly here would defeat
// that. These photos are just for browsing/credibility, mirrors
// shared/chargerData.js's partNo/refPhotoUrl fields in the calculator repo.
//
// HOW TO ADD ONE: drop the photo into site/public/adapter-plates/ and add a
// row below — { partNo, manufacturer, model, image }.
// ---------------------------------------------------------------------------
const ADAPTER_PLATE_PHOTOS = [
  { partNo: "200100", manufacturer: "ABB", model: "C50", image: "/adapter-plates/200100.png" },
  { partNo: "200101", manufacturer: "ABB", model: "A200/300/400", image: "/adapter-plates/200101.png" },
  { partNo: "200102", manufacturer: "ABB", model: "OM Solo/Duo", image: "/adapter-plates/200102.png" },
  { partNo: "200104", manufacturer: "Alpitronic", model: "HYC300/400", image: "/adapter-plates/200104.png" },
  { partNo: "200105", manufacturer: "Alpitronic", model: "HYC1000 - MCS-Dispenser", image: "/adapter-plates/200105.png" },
  { partNo: "200106", manufacturer: "Alpitronic", model: "HYC1000 - MCS", image: "/adapter-plates/200106.png" },
  { partNo: "200107", manufacturer: "Autel", model: "MaxiCharger DC Compact", image: "/adapter-plates/200107.png" },
  { partNo: "200108", manufacturer: "Autel", model: "DH480", image: "/adapter-plates/200108.png" },
  { partNo: "200109", manufacturer: "Autel", model: "MaxiCharger DC Fast DF240", image: "/adapter-plates/200109.png" },
  { partNo: "200110", manufacturer: "Blink Charging", model: "DCFC 60-300kW", image: "/adapter-plates/200110.png" },
  { partNo: "200111", manufacturer: "ChargePoint", model: "Express 250/280", image: "/adapter-plates/200111.png" },
  { partNo: "200112", manufacturer: "ChargePoint", model: "Express Plus - Power Link 2000", image: "/adapter-plates/200112.png" },
  { partNo: "200113", manufacturer: "Siemens", model: "SICHARGE D Dispenser", image: "/adapter-plates/200113.png" },
  { partNo: "200114", manufacturer: "Siemens", model: "SICHARGE D", image: "/adapter-plates/200114.png" },
  { partNo: "200115", manufacturer: "Siemens", model: "SICHARGE FLEX - Dispenser Big", image: "/adapter-plates/200115.png" },
  { partNo: "200116", manufacturer: "Siemens", model: "SICHARGE FLEX - Dispenser Small", image: "/adapter-plates/200116.png" },
];

const GALLERY_COLLAPSED_COUNT = 8;

function AdapterPlateGallery() {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded
    ? ADAPTER_PLATE_PHOTOS
    : ADAPTER_PLATE_PHOTOS.slice(0, GALLERY_COLLAPSED_COUNT);
  const hasMore = ADAPTER_PLATE_PHOTOS.length > GALLERY_COLLAPSED_COUNT;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {shown.map((p) => (
          <div
            key={p.partNo}
            className="flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white"
          >
            <div className="flex aspect-square items-center justify-center bg-bgSoft p-3">
              <img
                src={p.image}
                alt={`NordBase adapter plate — ${p.manufacturer} ${p.model}`}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="px-2.5 py-2">
              <div className="text-xs font-semibold text-dark">
                {p.manufacturer} {p.model}
              </div>
              <div className="text-[11px] text-steel">Part No. {p.partNo}</div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-dark hover:bg-bgSoft"
        >
          {expanded ? (
            <>
              Show fewer <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show all {ADAPTER_PLATE_PHOTOS.length} adapter plates{" "}
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
      <p className="mt-3 text-xs text-steel">
        Reference photos only. Dimensioned drawings (bolt patterns / mounting
        detail) are available per-project in the{" "}
        <a
          href={CALCULATOR_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-dark underline"
        >
          foundation calculator's
        </a>{" "}
        report, once you accept the data-use terms there.
      </p>
    </div>
  );
}

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
        note: "Dimensioned PDFs (bolt patterns / mounting detail) aren't published openly — see the adapter plate gallery below for reference photos, and the calculator's own report for the downloadable drawing once you accept its data-use terms.",
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
            href={CALCULATOR_URL}
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

          <div>
            <h2 className="text-lg font-bold text-dark">
              Adapter plate gallery
            </h2>
            <p className="mt-0.5 text-sm text-steel">
              Reference photos of NordBase adapter plates, by charger
              manufacturer and model.
            </p>
            <div className="mt-3">
              <AdapterPlateGallery />
            </div>
          </div>
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
