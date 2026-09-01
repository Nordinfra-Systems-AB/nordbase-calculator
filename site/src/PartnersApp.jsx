import React from "react";
import { ArrowLeft, Globe2, Phone, Mail, MapPin, ChevronRight } from "lucide-react";
import UsPartnersMap from "./components/UsPartnersMap.jsx";
import { CALCULATOR_URL } from "./constants.js";

// ---------------------------------------------------------------------------
// DISTRIBUTION PARTNERS — public directory, organized Country → State → list.
// Nordinfra sells only through distributors, not direct (same rule as the
// calculator's "Where to order" step). This mirrors the PARTNERS array in
// NordBaseCalculator.jsx — the two are kept in sync manually today, same as
// the shared document PDFs, since the calculator and site are separate
// deployments. HOW TO ADD A PARTNER: add one entry under the right
// country/state below, and the matching entry in NordBaseCalculator.jsx's
// PARTNERS array so the calculator's locator stays consistent.
// ---------------------------------------------------------------------------

const REGIONS = [
  {
    country: "United States",
    states: [
      {
        state: "New York",
        partners: [
          {
            name: "Postlane",
            city: "New York, NY",
            addressNote: "Exact branch address not yet on file",
            website: "https://www.postlaneusa.com/",
            phone: "718.355.1808",
            email: "Info@postlaneusa.com",
          },
        ],
      },
    ],
  },
];

// Feeds the map's pin set — US-only since Nordinfra is US-focused today
// (the "Markets" section was removed site-wide 2026-08-26 for the same
// reason). Add a state name here automatically once it appears in REGIONS.
const US_PARTNER_STATES = new Set(
  (REGIONS.find((r) => r.country === "United States")?.states || []).map((s) => s.state)
);

// "Block" styling below (dark navy header bar + light body, chevron rows)
// mirrors the state-directory layout Simon referenced from a competitor
// site (2026-08-26: "block enligt bild med info om partner") — one block
// per state, listing every partner in it.
function PartnerRow({ p }) {
  return (
    <div className="flex flex-col gap-2 border-b border-black/5 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <div>
          <div className="font-bold text-dark">{p.name}</div>
          <div className="text-sm text-steel">{p.city}</div>
          {p.addressNote && (
            <div className="mt-0.5 text-xs text-steel/70">{p.addressNote}</div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6 text-xs sm:pl-0 sm:text-right">
        {p.website && (
          <a
            href={p.website}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 font-semibold text-dark hover:underline"
          >
            <Globe2 className="h-3.5 w-3.5 text-gold" />
            {p.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        )}
        {p.phone && (
          <a
            href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}
            className="flex items-center gap-1.5 text-steel hover:text-dark"
          >
            <Phone className="h-3.5 w-3.5 text-gold" /> {p.phone}
          </a>
        )}
        {p.email && (
          <a
            href={`mailto:${p.email}`}
            className="flex items-center gap-1.5 text-steel hover:text-dark"
          >
            <Mail className="h-3.5 w-3.5 text-gold" /> {p.email}
          </a>
        )}
      </div>
    </div>
  );
}

function StateBlock({ state, partners }) {
  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-dark px-4 py-2.5">
        <span className="text-sm font-extrabold uppercase tracking-wide text-white">
          {state}
        </span>
        <ChevronRight className="h-4 w-4 text-gold" />
      </div>
      <div className="bg-bgSoft px-4 py-1">
        {partners.map((p) => (
          <PartnerRow key={p.name + p.city} p={p} />
        ))}
      </div>
    </div>
  );
}

export default function PartnersApp() {
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
          <Globe2 className="h-4 w-4" /> Distribution Partners
        </div>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
          Find a distributor
        </h1>
        <p className="mt-3 max-w-2xl text-steel">
          Nordinfra sells NordBase foundations through authorized
          distribution partners, not direct. Find your nearest partner below,
          or use the{" "}
          <a
            href={CALCULATOR_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-dark underline"
          >
            foundation calculator
          </a>{" "}
          to get pointed to one for a specific project.
        </p>

        <div className="mt-10">
          <UsPartnersMap partnerStates={US_PARTNER_STATES} />
        </div>

        <div className="mt-10 flex flex-col gap-10">
          {REGIONS.map((region) => (
            <div key={region.country}>
              <h2 className="text-lg font-bold text-dark">{region.country}</h2>
              {region.states.length === 0 ? (
                <p className="mt-2 text-sm text-steel">
                  No distribution partner confirmed yet — Nordinfra is
                  expanding into this market. Contact{" "}
                  <a
                    href="mailto:info@nord-infra.com"
                    className="font-semibold text-dark underline"
                  >
                    info@nord-infra.com
                  </a>{" "}
                  directly in the meantime.
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {region.states.map((s) => (
                    <StateBlock key={s.state} state={s.state} partners={s.partners} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-lg border border-black/10 bg-white p-4 text-xs text-steel">
          PREVIEW — this directory is a first-draft build. Branch addresses
          marked "not yet on file" are placeholders pending confirmation from
          the partner, not evidence that no address exists.
        </div>
      </section>
    </div>
  );
}
