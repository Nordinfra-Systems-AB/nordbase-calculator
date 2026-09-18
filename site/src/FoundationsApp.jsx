import React, { Suspense, lazy, useState } from "react";
import { SiteHeader, SiteFooter } from "./components/SiteChrome.jsx";

// ---------------------------------------------------------------------------
// FOUNDATIONS EXPLORER — one shared, dark-styled 3D viewer with a family
// switcher, added 2026-09-18 at Simon's request as a lighter alternative to
// embedding three separate live viewers in the homepage "One system, every
// charger level" section. Only one Three.js/WebGL instance is ever mounted
// (Configurator3D remounts on family change, same as it already does when
// ProductApp.jsx's ?f= query changes) so this costs no more at runtime than
// a single product page's viewer, not three.
//
// Family list and descriptions mirror the ASSEMBLIES data in App.jsx exactly
// (same three families that have converted CAD geometry: bollard/dcs/dcm —
// large and powerblock still have none, see Configurator3D.jsx's own note).
// ---------------------------------------------------------------------------

const Configurator3D = lazy(() => import("./components/Configurator3D.jsx"));

const FAMILIES = [
  {
    id: "bollard",
    label: "AC & Bollard",
    desc: "Pedestal-mount Level 2 charger, or a standalone protective bollard on the same base.",
  },
  {
    id: "dcs",
    label: "DC Small",
    desc: "Level 2/3 pedestal charger with bollard protection built into the same footprint.",
  },
  {
    id: "dcm",
    label: "DC Medium",
    desc: "Level 3 DC fast charger, with room for site lighting and bollards on one foundation.",
  },
];

export default function FoundationsApp() {
  const [familyId, setFamilyId] = useState(FAMILIES[0].id);
  const active = FAMILIES.find((f) => f.id === familyId) || FAMILIES[0];

  return (
    <div className="min-h-screen bg-dark text-white">
      <SiteHeader />

      <section className="border-b border-white/10 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Explore every foundation in 3D
          </h1>
          <p className="mt-3 max-w-2xl text-white/60">
            Same steel platform, same install method, sized and adapted to whatever's going on top. Switch between the family lines below —
            real STEP-derived CAD geometry, rotate and inspect freely.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {FAMILIES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFamilyId(f.id)}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                  f.id === familyId
                    ? "border-gold bg-gold/15 text-white"
                    : "border-white/15 text-white/60 hover:bg-white/[0.06]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-white/50">{active.desc}</p>

          <div className="mt-8">
            <Suspense
              fallback={
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm text-white/60 sm:aspect-[16/10]">
                  Loading 3D viewer…
                </div>
              }
            >
              <Configurator3D family={active.id} theme="dark" />
            </Suspense>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
