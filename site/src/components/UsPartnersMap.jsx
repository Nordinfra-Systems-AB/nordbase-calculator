import React, { useState } from "react";
import { MapPin } from "lucide-react";
import { US_MAP_VIEWBOX, US_STATE_PATHS } from "../data/usStatesPaths.js";

// ---------------------------------------------------------------------------
// PARTNERS MAP — light-blue-ocean / white-landmass US map with a gold pin per
// state that has a confirmed distributor, matching the look of EV Blocks'
// partner map (Simon, 2026-08-26: "Jag vill ha karta i samma stil som EV
// blocks - ljusblått hav och vit landyta"). Geography is the real US Census
// TIGER/Line state outline (via us-atlas, public domain), pre-rendered to
// static SVG paths by scripts/gen-us-map.mjs — no runtime map dependency.
// Pins sit at each state's path centroid rather than a specific city, since
// REGIONS in PartnersApp.jsx is keyed by state, not by exact address — see
// scripts/gen-us-map.mjs for how to regenerate the underlying path data.
//
// HOW TO ADD A PIN: this component takes `partnerStates`, a Set of state
// names (must match the `name` field in usStatesPaths.js) — every state in
// PartnersApp.jsx's REGIONS with at least one partner should be passed in.
// ---------------------------------------------------------------------------

export default function UsPartnersMap({ partnerStates }) {
  const [hovered, setHovered] = useState(null);
  const pinStates = US_STATE_PATHS.filter((s) => partnerStates.has(s.name));

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-sky-100">
      <svg
        viewBox={US_MAP_VIEWBOX}
        className="h-auto w-full"
        role="img"
        aria-label="Map of Nordinfra distribution partners across the United States"
      >
        <g>
          {US_STATE_PATHS.map((s) => (
            <path
              key={s.id}
              d={s.d}
              className={
                partnerStates.has(s.name)
                  ? "fill-white stroke-gold/50"
                  : "fill-white stroke-black/10"
              }
              strokeWidth={1}
            />
          ))}
        </g>
        <g>
          {pinStates.map((s) => (
            <g
              key={s.id}
              transform={`translate(${s.cx}, ${s.cy})`}
              onMouseEnter={() => setHovered(s.name)}
              onMouseLeave={() => setHovered((h) => (h === s.name ? null : h))}
              className="cursor-pointer"
            >
              <circle r="14" className="fill-gold/25">
                <animate
                  attributeName="r"
                  values="10;16;10"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.5;0;0.5"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle r="6" className="fill-gold stroke-dark" strokeWidth={1.5} />
              {hovered === s.name && (
                <g transform="translate(10, -12)">
                  <rect
                    x={0}
                    y={-16}
                    width={Math.max(70, s.name.length * 7 + 16)}
                    height={24}
                    rx={4}
                    className="fill-dark"
                  />
                  <text x={8} y={0} className="fill-white text-[11px] font-semibold">
                    {s.name}
                  </text>
                </g>
              )}
            </g>
          ))}
        </g>
      </svg>
      {pinStates.length === 0 && (
        <div className="flex items-center gap-2 border-t border-black/10 bg-white px-4 py-3 text-sm text-steel">
          <MapPin className="h-4 w-4 text-gold" /> No confirmed partner
          locations yet — check back as the US distribution network grows.
        </div>
      )}
    </div>
  );
}
