import React from "react";
import { ArrowLeft, Globe2, Phone, Mail, MapPin } from "lucide-react";

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
  { country: "Sweden", states: [] },
  { country: "United Kingdom", states: [] },
  { country: "Canada", states: [] },
  { country: "Australia", states: [] },
];

function PartnerCard({ p }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <div>
          <div className="font-bold text-dark">{p.name}</div>
          <div className="text-steel">{p.city}</div>
          {p.addressNote && (
            <div className="mt-0.5 text-xs text-steel/70">{p.addressNote}</div>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5 border-t border-black/5 pt-3 text-xs">
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
            href="https://nordbase-calculator.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-dark underline"
          >
            foundation calculator
          </a>{" "}
          to get pointed to one for a specific project.
        </p>

        <div className="mt-10 flex flex-col gap-10">
          {REGIONS.map((region) => (
            <div key={region.country}>
              <h2 className="text-lg font-bold text-dark">{region.country}</h2>
              {region.states.length === 0 ? (
                <p className="mt-2 text-sm text-steel">
                  No distribution partner confirmed yet — Nordinfra is
                  expanding into this market. Contact{" "}
                  <a
                    href="mailto:simon@nord-infra.com"
                    className="font-semibold text-dark underline"
                  >
                    simon@nord-infra.com
                  </a>{" "}
                  directly in the meantime.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-6">
                  {region.states.map((s) => (
                    <div key={s.state}>
                      <div className="text-xs font-bold uppercase tracking-wide text-steel">
                        {s.state}
                      </div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {s.partners.map((p) => (
                          <PartnerCard key={p.name + p.city} p={p} />
                        ))}
                      </div>
                    </div>
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
