import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Wind,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Download,
  ExternalLink,
  Package,
  RotateCcw,
  Mail,
  Info,
  Ruler,
  FileText,
  Settings2,
  ShieldCheck,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp,
  Phone,
  Globe,
  Link2,
  X,
} from "lucide-react";

// =====================================================================================
// NORDBASE FOUNDATION CALCULATOR — v2 PROTOTYPE
// -----------------------------------------------------------------------------------
// Calculation engine ported from "Nordinfra_Master_USA_ASCE7_v6.xlsx" (Sheets 2 & 3),
// generalised across NordBase Bollard / Small / Medium / Large.
// Geometry sourced from the confirmed 2026-07 production drawings (Simon Gullberg).
// This remains a SALES-FACING PRELIMINARY tool — not a substitute for a PE-stamped
// calculation package. Every assumption that has NOT been engineering-confirmed is
// flagged inline with an amber "unverified" marker.
// =====================================================================================

// ---------------------------------------------------------------------------
// UNIT HELPERS
// ---------------------------------------------------------------------------
const inToM = (inches) => inches * 0.0254;
const lbToKN = (lb) => (lb * 0.45359237 * 9.81) / 1000; // lbmass -> kN (weight force)
const mmToIn = (mm) => mm / 25.4;
const kgToLb = (kg) => kg * 2.2046226;

// ---------------------------------------------------------------------------
// SITE DATA LOOKUP — SDS auto-fill from address
// ---------------------------------------------------------------------------
// Same provider + same interaction pattern as the Site Planner tool
// (site/src/SitePlannerApp.jsx): Mapbox Geocoding v5 for the address
// autocomplete dropdown, so the two tools feel consistent and share one
// Mapbox account. Requires VITE_MAPBOX_TOKEN in THIS project's Vercel env
// vars — Site Planner is a separate Vercel project, so the token has to be
// added here too even though it already exists over there.
//
// Wind speed is deliberately NOT auto-filled yet (Simon: "inget annat tills
// dess jag fixat vindlast api") — only SDS. Wind stays a manual field with
// the ASCE Hazard Tool link, unchanged.
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

// Site Class D + Risk Category II match the assumption already documented
// on the "Approximate SDS reference values (Site Class D)" table below —
// keeping the live lookup consistent with what the tool already implied.
// If a customer's geotech report specifies a different site class, the
// fetched value is only a starting point — the field stays editable.
const SDS_LOOKUP_SITE_CLASS = "D";
const SDS_LOOKUP_RISK_CATEGORY = "II";

async function geocodeSuggest(query) {
  if (!MAPBOX_TOKEN) return [];
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query
  )}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&types=address,poi,place`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || []).map((f) => ({
    id: f.id,
    placeName: f.place_name,
    lon: f.center[0],
    lat: f.center[1],
  }));
}

// USGS's own ASCE 7-22 web service — free, no API key required. This is the
// same underlying data source ASCE's paid Hazard Tool re-packages, so it's
// authoritative, not an approximation, and it's live rather than a static
// table so it stays correct as USGS updates its hazard model.
async function fetchSdsFromUsgs(lat, lon) {
  const url = `https://earthquake.usgs.gov/ws/designmaps/asce7-22.json?latitude=${lat}&longitude=${lon}&riskCategory=${SDS_LOOKUP_RISK_CATEGORY}&siteClass=${SDS_LOOKUP_SITE_CLASS}&title=NordBase`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("usgs_lookup_failed");
  const data = await res.json();
  const sdsValue = data?.response?.data?.sds;
  if (typeof sdsValue !== "number") throw new Error("usgs_no_sds");
  return sdsValue;
}

// ---------------------------------------------------------------------------
// SAVE & RESUME — no backend, matches the rest of the site's "no server
// needed" approach. Two mechanisms, both storing the same shape of data:
//   1. Auto-save to localStorage as the customer progresses (silent —
//      recovers an accidentally-closed tab on the SAME browser/device).
//   2. An explicit "copy resume link" button that encodes the whole
//      configuration into a `?cfg=` URL parameter — works across devices,
//      can be emailed to a colleague or bookmarked, since the state lives
//      in the link itself rather than on a server.
// ---------------------------------------------------------------------------
const DRAFT_STORAGE_KEY = "nordbase_draft_v1";

function encodeConfig(obj) {
  try {
    const json = JSON.stringify(obj);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (e) {
    return null;
  }
}

function decodeConfig(str) {
  try {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

// Runs once at mount. A `?cfg=` link always wins (explicit intent — someone
// clicked a resume link); otherwise fall back to a silently auto-saved
// localStorage draft. Returns null if neither exists or both are corrupt.
function loadInitialConfig() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const cfgParam = params.get("cfg");
    if (cfgParam) {
      const decoded = decodeConfig(cfgParam);
      if (decoded) return { data: decoded, source: "link" };
    }
  } catch (e) {
    /* malformed link — fall through to the draft check below */
  }
  try {
    const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      const decoded = JSON.parse(saved);
      if (decoded) return { data: decoded, source: "draft" };
    }
  } catch (e) {
    /* storage unavailable */
  }
  return null;
}

// ---------------------------------------------------------------------------
// FOUNDATION CATALOGUE
// Dimensions confirmed by Simon Gullberg (2026-08-20) against the V4 body /
// adapter-plate drawings; Large geometry confirmed 2026-08-21 against its own
// Nordinfra_Master_USA_ASCE7_v6 workbook. Adapter-plate CC options for
// Medium/Large are still in development — see each foundation's adapterPlate.note.
// ---------------------------------------------------------------------------
const FOUNDATIONS = {
  BOLLARD: {
    key: "BOLLARD",
    name: "NordBase Bollard",
    subtitle: "AC foundation",
    levelLabel: "Bollard",
    levelDesc: "No charger foundation",
    top: { w: 7.6, d: 7.6 },
    bottom: { w: 14.2, d: 14.2 },
    depthIn: 19.8,
    weightLb: 16.3,
    photoUrl: "/nordbase-bollard.png",
    hasCharger: false,
    hasAccessories: true,
    // ---- Confirmed structural data (Nordinfra_Master_USA_ASCE7_v6 — AC Fundament, 2026-08-21) ----
    wallThicknessMm: 1.9, // ASTM A1011 SS Gr33 + ZM115, 14ga
    shellBottom: { w: 10.51, d: 10.51 }, // actual tapered shell/mantle bottom (267mm) — narrower than the base-plate foot below; used for passive-pressure width, NOT shown as the marketing "Base" dimension
    basePlateType: "Round",
    adapterPlateWeightLb: 0, // no adapter plate on Bollard
    blurb:
      "Standalone protective foundation for a bollard/post. No charger mounts on this foundation — the smallest and lightest model in the lineup.",
    // Reference photo for the Foundation-step card (added 2026-08-31) — an
    // installed bollard/post (not the bare foundation shell, which is
    // already shown via photoUrl above). No chargerFit here (hasCharger is
    // false for Bollard), so this is a plain top-level refPhotoUrl rather
    // than nested under chargerFit — see the Foundation-step card render.
    refPhotoUrl: "/bollard-sch10.png",
  },
  SMALL: {
    key: "SMALL",
    name: "NordBase Small",
    subtitle: "DC foundation",
    levelLabel: "Level 2",
    levelDesc: "Pedestal-mounted chargers",
    top: { w: 12, d: 12 },
    bottom: { w: 22.2, d: 22.2 },
    depthIn: 25.8,
    weightLb: 33.16,
    photoUrl: "/nordbase-small.png",
    hasCharger: true,
    hasAccessories: false,
    // ---- Confirmed structural data (Nordinfra_Master_USA_ASCE7_v6 — DC Small, 2026-08-21) ----
    wallThicknessMm: 1.9, // ASTM A1011 SS Gr33 + ZM115, 14ga
    shellBottom: { w: 15.87, d: 15.87 }, // actual tapered shell/mantle bottom (403mm) — narrower than the base-plate foot below; used for passive-pressure width, NOT shown as the marketing "Base" dimension
    basePlateType: "Round",
    adapterPlateWeightLb: 11.02, // 5 kg adapter plate
    adapterPlate: {
      size: { w: 13.39, d: 13.39 },
      thicknessIn: 0.25,
      material: '1/4" A36, hot-dip galvanized',
      // Full hole grid verified against the pedestal bolt-pattern survey
      // (Simon Gullberg, 2026-08-26) — pick any width x depth combination;
      // matching X and Y gives a square pattern, mismatched gives rectangular.
      ccOptionsX: [6, 8, 9, 10.6],
      ccOptionsY: [5, 6, 8, 9, 10.6],
      note: null,
    },
    blurb:
      "For Level 2 pedestals. Adapter plate with a grid of standard hole positions (square or rectangular bolt patterns) or a custom dimension.",
    // Reference charger size for the Foundation-step card (Simon Gullberg,
    // 2026-08-28) — a MAXIMUM footprint, not a hard structural limit (the
    // calc engine checks whatever charger W/D/H/weight is actually entered
    // in Configuration; this is a "does my charger look about like this"
    // sizing cue so a customer can self-select the right tier up front).
    // No minimum — Simon: "strunta i min mått".
    chargerFit: {
      maxWIn: 16,
      maxDIn: 16,
      maxHIn: 72,
      refPhotoUrl: "/charger-ref-small-pedestal.jpg",
      // Second reference photo (Simon, 2026-08-31) — an Ekoenergetyka Axon
      // Sat 400 pedestal, also within the Small tier's size envelope. The
      // chargerFit shape only had room for one photo, so this is a minimal
      // `refPhotoUrl2` addition rather than reworking refPhotoUrl into an
      // array — see the Foundation-step card render below for how both are
      // shown.
      refPhotoUrl2: "/charger-ref-sat400.webp",
    },
  },
  MEDIUM: {
    key: "MEDIUM",
    name: "NordBase Medium",
    subtitle: "DC foundation",
    levelLabel: "Level 3",
    levelDesc: "DC fast chargers",
    top: { w: 19.6, d: 25.6 },
    bottom: { w: 31.2, d: 39.4 },
    depthIn: 25.8,
    weightLb: 61.26,
    photoUrl: "/nordbase-medium.png",
    hasCharger: true,
    hasAccessories: false,
    // ---- Confirmed structural data (Nordinfra_Master_USA_ASCE7_v6 — DC Medium, 2026-08-21) ----
    wallThicknessMm: 1.9, // ASTM A1011 SS Gr33 + ZM115, 14ga
    shellBottom: { w: 23.62, d: 29.53 }, // actual tapered shell/mantle bottom (600×750mm) — narrower than the base-plate foot below; used for passive-pressure width, NOT shown as the marketing "Base" dimension
    basePlateType: "Oval",
    adapterPlateWeightLb: 44.09, // 20 kg adapter plate
    adapterPlate: {
      size: { w: 28.7, d: 24.8 },
      thicknessIn: 0.25,
      material: '1/4" A36, hot-dip galvanized',
      ccOptionsX: [],
      ccOptionsY: [],
      // Updated 2026-08-31 (Simon Gullberg) — CC is now confirmed model-by-
      // model above (see modelCcOnGrid); this general note now only needs to
      // cover the two remaining gaps: chargers without confirmed CC yet, and
      // downloadable drawings still being finalized even for confirmed models.
      note: "Bolt spacing (CC) is now confirmed for most listed chargers above. Downloadable adapter-plate drawings are still being finalized — contact Nordinfra if you need one sooner, or if your charger isn't listed yet.",
    },
    blurb:
      "For Level 3 DC fast chargers. Rectangular base gives a larger stabilizing footprint for heavier equipment.",
    // See SMALL's chargerFit comment — same sizing-cue purpose, no hard limit.
    chargerFit: {
      maxWIn: 27,
      maxDIn: 32,
      maxHIn: 82,
      refPhotoUrl: "/charger-ref-medium-alpitronic.png",
    },
  },
  LARGE: {
    key: "LARGE",
    name: "NordBase Large",
    subtitle: "DC foundation",
    levelLabel: "Level 4",
    levelDesc: "High-power DC",
    top: { w: 32, d: 32 },
    bottom: { w: 47, d: 47 }, // base plate (round), 1193.8mm
    depthIn: 25.8,
    weightLb: 99.21, // 45 kg
    hasCharger: true,
    hasAccessories: false,
    photoUrl: "/nordbase-large.png",
    // ---- Confirmed structural data (Nordinfra_Master_USA_ASCE7_v6 — DC Large, 2026-08-21) ----
    wallThicknessMm: 1.9, // ASTM A1011 SS Gr33 + ZM115, 14ga — same as Small/Medium
    shellBottom: { w: 36, d: 36 }, // actual tapered shell/mantle bottom (914.4mm) — narrower than the base-plate foot above
    basePlateType: "Round",
    adapterPlateWeightLb: 70.55, // 32 kg adapter plate
    adapterPlate: {
      size: null,
      thicknessIn: null,
      material: null,
      ccOptionsX: [],
      ccOptionsY: [],
      // Updated 2026-08-31 (Simon Gullberg) — same change as MEDIUM's note.
      // Plate size/thickness/material (above) are still genuinely
      // unconfirmed for Large, so that part of the note stays.
      note: "Bolt spacing (CC) is now confirmed for most listed chargers above. Plate dimensions/material and downloadable drawings are still being finalized — contact Nordinfra if you need these sooner, or if your charger isn't listed yet.",
    },
    // Stability (overturning/sliding), wall-plate bending, and bolt-tension are now
    // calculated the same way as Small/Medium, from the confirmed DC Large workbook.
    // NOT covered by any of these ASCE 7 checks — and still open — is local wall-panel
    // bending/buckling under lateral backfill compaction load, which is a different
    // failure mode from the global stability checks above. Flag this to the customer
    // until wall-panel-specific data/testing is available.
    structuralNote:
      "Global stability, wall-plate bending, and bolt tension are calculated per ASCE 7-22 / IBC 2021, same methodology as NordBase Small/Medium. Local wall-panel buckling under backfill compaction load is a separate failure mode not covered by these checks and has not yet been independently verified for this larger panel size.",
    blurb:
      "For Level 4 / high-power DC charging. Widened base plate and reinforced shell for larger equipment — adapter-plate CC options are still in development.",
    // See SMALL's chargerFit comment. Reference photo confirmed (Simon
    // Gullberg, 2026-08-28) but he hasn't given a max W×D×H for Large yet
    // (only Small 16×16×72 and Medium 27×32×82) — leave the numbers out
    // rather than guess; the card falls back to showing the photo alone.
    // Photo swapped 2026-08-31 (Simon): replaced the ABB Terra stock photo
    // with a real Nordinfra site photo of an Ekoenergetyka Axon Easy charger.
    chargerFit: {
      maxWIn: null,
      maxDIn: null,
      maxHIn: null,
      refPhotoUrl: "/charger-ref-axon-easy.webp",
    },
  },
  // ---------------------------------------------------------------------------
  // POWER BLOCK (added 2026-08-27, Simon Gullberg build authorization: "du
  // kan bygga med preliminär flagga"; restructured 2026-08-28 into a generic
  // manufacturer/model family per Simon's request). Multiple NordBase Medium
  // foundations tied together with a hat-profile plus one shared adapter
  // plate, sized for a specific DC fast-charger cabinet. The actual
  // unit count / geometry / hardware depends on which manufacturer + model
  // the customer picks in Configuration — see POWER_BLOCK_MODELS below and
  // runPowerBlockCheck() for the calc engine.
  // ---------------------------------------------------------------------------
  POWER_BLOCK: {
    key: "POWER_BLOCK",
    name: "NordBase Power Block",
    subtitle: "DC foundation group",
    levelLabel: "Level 3 group",
    levelDesc: "Multiple DC Medium + shared adapter plate",
    // Dimensions are model-dependent (see POWER_BLOCK_MODELS) — the product
    // card intentionally doesn't show a single top/bottom/depth here; the
    // Step-1 card rendering special-cases foundation.isPowerBlock to say so
    // instead of printing a number that would only be true for one model.
    top: null,
    bottom: null,
    depthIn: 25.8, // burial depth — same as NordBase Medium for every model (shared foundation geometry)
    weightLb: null,
    photoUrl: "/nordbase-powerblock.png",
    hasCharger: true,
    hasAccessories: false,
    isPowerBlock: true,
    preliminary: true,
    structuralNote:
      "Preliminary release. Group overturning/sliding resistance and adapter-plate bolt tension are calculated per ASCE 7-22 / IBC 2021 / AISC 360-22 / ACI 318-19, extending the same methodology validated for the single NordBase Medium foundation to the multi-unit array (group efficiency factor confirmed for the governing wind-on-cabinet-long-side load case). Adapter-plate BENDING itself has NOT been calculated — the plate rests on a multi-point support pattern that a simple 1D beam check would misrepresent; a 2-way plate check or FEA by the engineer is recommended before this is relied on. Not PE-stamped.",
    blurb:
      "Multiple NordBase Medium foundations joined by a hat-profile with one shared adapter plate, sized for a specific DC fast-charger cabinet. Pick a manufacturer and model in the next step.",
    // Reference photo for the Foundation-step card (added 2026-08-31) — a
    // real photo of a Kempower cabinet mounted on a Power Block foundation
    // (top/bottom are null above since Power Block geometry is model-
    // dependent, so this is a plain top-level refPhotoUrl, same pattern as
    // Bollard's — see the Foundation-step card render).
    refPhotoUrl: "/nordbase-powerblock-kempower-mounted-front.png",
  },
};

const FOUNDATION_ORDER = ["BOLLARD", "SMALL", "MEDIUM", "LARGE", "POWER_BLOCK"];

// ---------------------------------------------------------------------------
// POWER BLOCK MODELS — manufacturer/model family for the Power Block
// foundation group, selected via the same manufacturer→model dropdown
// pattern used for chargers elsewhere in this file (see
// chargerPresetsForFoundation). Each model carries its OWN geometry and
// hardware — nothing here is shared/derived across models, so adding a new
// model never silently reuses another model's confirmed numbers.
//
// Per model:
//   unitCount        — how many NordBase Medium foundations in the array
//   isStandardSingle — true only for C501: a 1-unit "array" is just the
//                       plain NordBase Medium foundation, no group hardware
//                       and no group calc. Selecting it in the UI redirects
//                       to the normal NordBase Medium configuration flow.
//   dataConfirmed    — false when foundation geometry is known but the
//                       hardware (hat-profile rivets, bolt pattern, adapter
//                       plate, charger cabinet dims/weight) is NOT yet
//                       confirmed. The structural check is withheld (not
//                       fabricated) until this is true.
//   top/bottom        — group foundation-shell footprint (Simon's assembly
//                       drawing, 2026-08-28), used for the product diagram.
//   configPending     — true for models added 2026-08-31 from
//                       powerblock_dataset.json (Simon Gullberg — ABB OM-M,
//                       ABB OM-X, Tesla Supercharger V3, Autel DC HiPower
//                       CPU, Siemens Singel/Dubbel/Trippel, Tritium TRI-FLEX
//                       HUB all sizes, plus new Kempower cabinets). Cabinet
//                       dimensions/weight ARE known (manufacturer datasheet,
//                       see chargerSpec) but — unlike C502 above, where the
//                       foundation COUNT is already fixed and only the
//                       hardware is pending — for these models we do not yet
//                       know whether the physical unit needs a single
//                       NordBase foundation (like C501) or a multi-foundation
//                       hat-profile GROUP (like C503). That is a structural
//                       engineering decision (foundation count, rivet/bolt
//                       group design, wind/seismic group-efficiency factor)
//                       only Nordinfra's PE can make — some model names hint
//                       at grouping ("trippel kraftkabinett", "SICHARGE FLEX
//                       - Trippel") but a name suggesting "triple" does NOT
//                       tell us whether that's 3 separate foundations bolted
//                       together (like C503) or one wider single cabinet on
//                       one foundation, so unitCount/top/bottom are
//                       deliberately left unset rather than guessed. No
//                       structural check runs for these (dataConfirmed is
//                       also left unset) — the Configuration step shows the
//                       known cabinet dimensions plus a "contact Nordinfra"
//                       banner instead. 3 of these 16
//                       (Tesla Supercharger V3, ABB OM X-Series, Autel DC
//                       HiPower CPU) are additionally flagged
//                       "unstyled-but-requested" in the source dataset —
//                       Nordinfra's internal tracker hasn't marked their
//                       dimension data reviewed yet, but they're included
//                       because Simon explicitly asked for them by name.
// ---------------------------------------------------------------------------
const POWER_BLOCK_MODELS = {
  Kempower: [
    {
      model: "C501",
      unitCount: 1,
      isStandardSingle: true,
    },
    {
      model: "C502",
      unitCount: 2,
      dataConfirmed: false,
      top: { w: mmToIn(1140), d: mmToIn(655) },
      bottom: { w: mmToIn(1422), d: mmToIn(1000) },
      // Cabinet dimensions/weight ARE confirmed (Kempower Power Unit C500
      // datasheet, Power Cabinet V4/Power Module V2, rev.1.50 03-2026) —
      // C502 = "double" cabinet, 5-8 Power Modules. Weight uses the 8-module
      // (full) figure; width×height feed the wind check once this model's
      // Nordinfra-side hardware (hat-profile rivets, bolt pattern, adapter
      // plate) is confirmed and dataConfirmed flips to true.
      chargerSpec: {
        manufacturer: "Kempower",
        model: "C502",
        widthIn: mmToIn(1387),
        depthIn: mmToIn(904),
        heightIn: mmToIn(2215),
        weightLb: kgToLb(1000), // 8 Power Modules (full), per datasheet weight table
      },
    },
    {
      model: "C503",
      unitCount: 3,
      dataConfirmed: true,
      top: { w: mmToIn(1770), d: mmToIn(655) },
      bottom: { w: mmToIn(2052), d: mmToIn(1000) },
      conceptPhotoUrl: "/nordbase-powerblock-kempower-c503.png",
      // ONE welded cabinet spans all 3 foundations — confirmed by Simon
      // 2026-08-27 (previously modeled, incorrectly, as 3 separate
      // cabinets — corrected before this was ever shipped).
      // Dimensions/weight per Kempower Power Unit C500 datasheet (Power
      // Cabinet V4/Power Module V2, rev.1.50 03-2026), 2026-08-28 — replaces
      // the earlier rough estimate (2000×857×2150mm/1500kg). C503 = "triple"
      // cabinet, 9-12 Power Modules; weight uses the 12-module (full, 600kW)
      // figure. If Simon specs a lower module count for the standard
      // offering, swap in the corresponding weight from the datasheet's
      // table (9=1336kg/10=1376kg/11=1416kg) — margins are wide enough
      // (governing check ~46% DCR) that this will not flip any result.
      chargerSpec: {
        manufacturer: "Kempower",
        model: "C503",
        widthIn: mmToIn(1987), // wind-face width, whole cabinet
        depthIn: mmToIn(904),
        heightIn: mmToIn(2215),
        weightLb: kgToLb(1456), // 12 Power Modules (full, 600kW)
      },
      // Shared adapter plate — fixed size for this configuration, not user-adjustable.
      groupPlate: {
        widthIn: mmToIn(1810), // bolt-pattern width — group tipping lever arm below
        heightIn: mmToIn(785),
        thicknessMm: 5,
        weightLb: kgToLb(55.77), // area x thickness x 7850 kg/m3 estimate — see xlsx note, direction of error uncertain
        material: "Solid steel plate, Gr50, bent edges 50mm down all around",
      },
      hatProfile: {
        rivetsPerSide: 18,
        sides: 2,
        totalRivets: 36,
        rivetSpec: "4.8mm SS304 blind rivet",
        rivetCapacityEachKn: 4, // ⚠ PLACEHOLDER — not yet a manufacturer-confirmed spec value
        phi: 0.75,
      },
      boltGroups: {
        // M12 class 8.8 — different spec from the M16 8.8 used on Small/Medium/
        // Large's own charger-plate connection (BOLT_SPEC_LABEL/BOLT_TENSION_*).
        plateToFoundation: { count: 14, pitchIn: mmToIn(612) },
        chargerToPlate: { count: 12, pitchIn: mmToIn(608) },
      },
    },
    // ---- New Kempower Power Block models below (2026-08-31, Simon Gullberg
    // request + powerblock_dataset.json, engineering-reviewed GREEN/BLUE) —
    // configPending: true, see the note on POWER_BLOCK_MODELS above. Cabinet
    // dims/weight/ccW/ccD are confirmed manufacturer datasheet data; the
    // single-vs-group foundation configuration is NOT. ----
    {
      model: "Station Charger C802",
      configPending: true,
      chargerSpec: {
        manufacturer: "Kempower",
        model: "Station Charger C802",
        widthIn: 49.21,
        depthIn: 33.11,
        heightIn: 94.29,
        weightLb: 2039.27,
        ccWIn: 23.94, // Fundamentplatta confirmed by Simon 2026-08-31 (1350x800mm, now larger than CC)
        ccDIn: 37.01,
      },
      partNumber: "NI-ADP-PB-Kempower-Station-Charger-C802-US",
      partName: "NordBase Power Block Adapter plate – Kempower Station Charger C802",
    },
    {
      model: "Power Unit C802",
      configPending: true,
      chargerSpec: {
        manufacturer: "Kempower",
        model: "Power Unit C802",
        widthIn: 49.21,
        depthIn: 33.11,
        heightIn: 86.42,
        weightLb: 1631.42,
        ccWIn: null,
        ccDIn: null,
      },
      partNumber: "NI-ADP-PB-Kempower-Power-Unit-C802-US",
      partName: "NordBase Power Block Adapter plate – Kempower Power Unit C802",
    },
    {
      model: "Power Unit C803",
      configPending: true,
      chargerSpec: {
        manufacturer: "Kempower",
        model: "Power Unit C803",
        widthIn: 72.83,
        depthIn: 33.11,
        heightIn: 86.42,
        weightLb: 2513.27,
        ccWIn: null,
        ccDIn: null,
      },
      partNumber: "NI-ADP-PB-Kempower-Power-Unit-C803-US",
      partName: "NordBase Power Block Adapter plate – Kempower Power Unit C803",
    },
    {
      model: "Mega Satellite",
      configPending: true,
      chargerSpec: {
        manufacturer: "Kempower",
        model: "Mega Satellite",
        widthIn: 47.24,
        depthIn: 31.5,
        heightIn: 92.52,
        weightLb: 970.03,
        ccWIn: 16.54,
        ccDIn: 24.84,
      },
      partNumber: "NI-ADP-PB-Kempower-Mega-Satellite-US",
      partName: "NordBase Power Block - Adapter plate – Kempower Mega Satellite",
    },
  ],
  // ---- New Power Block manufacturers below (2026-08-31, Simon Gullberg
  // request + powerblock_dataset.json) — every model here is configPending:
  // true (see the note on POWER_BLOCK_MODELS above). Cabinet dims/weight are
  // confirmed manufacturer datasheet data; whether the unit needs a single
  // NordBase foundation or a multi-foundation hat-profile group is NOT yet
  // confirmed by Nordinfra's PE — do not add unitCount/top/bottom/
  // dataConfirmed/groupPlate/hatProfile/boltGroups until that's decided. ----
  ABB: [
    {
      model: "OM M-Series",
      configPending: true,
      chargerSpec: {
        manufacturer: "ABB",
        model: "OM M-Series",
        widthIn: 31.89,
        depthIn: 31.14,
        heightIn: 85.08,
        weightLb: 1609.37,
        ccWIn: 22.05,
        ccDIn: 27.01,
      },
      partNumber: "NI-ADP-PB-ABB-OM-M-series-US",
      partName: "NordBase Power Block Adapter plate – ABB OM M-Series",
    },
    {
      // "unstyled-but-requested" in powerblock_dataset.json — Nordinfra's
      // internal tracker hasn't marked this one's dimension data reviewed
      // yet, but Simon explicitly asked for it by name, so it's included.
      model: "OM X-Series",
      configPending: true,
      chargerSpec: {
        manufacturer: "ABB",
        model: "OM X-Series",
        widthIn: 72.05,
        depthIn: 40.16,
        heightIn: 84.65,
        weightLb: 5511.55,
        ccWIn: 64.17,
        ccDIn: 36.06,
      },
      partNumber: "NI-ADP-PB-ABB-OM-X-series-US",
      partName: "NordBase Power Block Adapter plate – ABB OM X-Series",
    },
  ],
  "Power Electronics": [
    {
      model: "NBi 180",
      configPending: true,
      chargerSpec: {
        manufacturer: "Power Electronics",
        model: "NBi 180",
        widthIn: 39.37,
        depthIn: 31.5,
        heightIn: 78.74,
        weightLb: 1102.31,
        ccWIn: null,
        ccDIn: null,
      },
      partNumber: "NI-ADP-PB-Power-Electronics-NBI-180-US",
      partName: "NordBase Power Block Adapter plate – Power Electronics NBi 180",
    },
    {
      model: "NBi 360",
      configPending: true,
      chargerSpec: {
        manufacturer: "Power Electronics",
        model: "NBi 360",
        widthIn: 61.02,
        depthIn: 39.76,
        heightIn: 90.55,
        weightLb: 2645.54,
        ccWIn: null,
        ccDIn: null,
      },
      partNumber: "NI-ADP-PB-Power-Electronics-NBI-360-US",
      partName: "NordBase Power Block Adapter plate – Power Electronics NBi 360",
    },
  ],
  Siemens: [
    {
      model: "SICHARGE FLEX - Single",
      configPending: true,
      chargerSpec: {
        manufacturer: "Siemens",
        model: "SICHARGE FLEX - Single",
        widthIn: 31.5,
        depthIn: 55.12,
        heightIn: 94.88,
        weightLb: 2976.24,
        ccWIn: 50.16,
        ccDIn: 26.57,
      },
      partNumber: "NI-ADP-PB-Siemens-Sicharge-Flex-Singel-US",
      partName: "NordBase Power Block Adapter plate – Siemens SICHARGE FLEX - Single",
    },
    {
      model: "SICHARGE FLEX - Double",
      configPending: true,
      chargerSpec: {
        manufacturer: "Siemens",
        model: "SICHARGE FLEX - Double",
        widthIn: 31.5,
        depthIn: 86.61,
        heightIn: 94.88,
        weightLb: 5187.47,
        ccWIn: 81.61,
        ccDIn: 26.57,
      },
      partNumber: "NI-ADP-PB-Siemens-Sicharge-Flex-Double-US",
      partName: "NordBase Power Block Adapter plate – Siemens SICHARGE FLEX - Double",
    },
    {
      // Name suggests "triple" but that does NOT tell us whether this is 3
      // separate foundations bolted together (like Kempower C503) or one
      // wider single cabinet on one foundation — see POWER_BLOCK_MODELS note.
      model: "SICHARGE FLEX - Triple",
      configPending: true,
      chargerSpec: {
        manufacturer: "Siemens",
        model: "SICHARGE FLEX - Triple",
        widthIn: 31.5,
        depthIn: 125.98,
        heightIn: 94.88,
        weightLb: 7716.17,
        ccWIn: 113.07,
        ccDIn: 26.57,
      },
      partNumber: "NI-ADP-PB-Siemens-Sicharge-Flex-Trippel-US",
      partName: "NordBase Power Block Adapter plate – Siemens SICHARGE FLEX - Triple",
    },
  ],
  Tesla: [
    {
      // "unstyled-but-requested" in powerblock_dataset.json — Nordinfra's
      // internal tracker hasn't marked this one's dimension data reviewed
      // yet, but Simon explicitly asked for it by name, so it's included.
      model: "Supercharger V3 Cabinet",
      configPending: true,
      chargerSpec: {
        manufacturer: "Tesla",
        model: "Supercharger V3 Cabinet",
        widthIn: 49.21,
        depthIn: 39.37,
        heightIn: 86.61,
        weightLb: 2447.13,
        ccWIn: null,
        ccDIn: null,
      },
      partNumber: "NI-ADP-PB-Tesla-v3-Cabinet-US",
      partName: "NordBase Power Block Adapter plate – Tesla Supercharger V3 Cabinet",
    },
  ],
  Tritium: [
    {
      model: "TRI-FLEX HUB - 400/800kW",
      configPending: true,
      chargerSpec: {
        manufacturer: "Tritium",
        model: "TRI-FLEX HUB - 400/800kW",
        widthIn: 52.2,
        depthIn: 48.23,
        heightIn: 88.58,
        weightLb: null, // not given in source (weight_kg null)
        ccWIn: null,
        ccDIn: null,
      },
      partNumber: "NI-ADP-PB-Tritium-tri-Flex-Hub-400-800kw-US",
      partName: "NordBase Power Block Adapter plate – Tritium TRI-FLEX HUB - 400/800kW",
    },
    {
      model: "TRI-FLEX HUB - 1000kW",
      configPending: true,
      chargerSpec: {
        manufacturer: "Tritium",
        model: "TRI-FLEX HUB - 1000kW",
        widthIn: 104.41,
        depthIn: 48.23,
        heightIn: 88.58,
        weightLb: null, // not given in source (weight_kg null)
        ccWIn: null,
        ccDIn: null,
      },
      partNumber: "NI-ADP-PB-Tritium-Tri-Flex-Hub-1000kw-US",
      partName: "NordBase Power Block Adapter plate – Tritium TRI-FLEX HUB - 1000kW",
    },
    {
      model: "TRI-FLEX HUB - 1600kW",
      configPending: true,
      chargerSpec: {
        manufacturer: "Tritium",
        model: "TRI-FLEX HUB - 1600kW",
        widthIn: 156.61,
        depthIn: 48.23,
        heightIn: 88.58,
        weightLb: null, // not given in source (weight_kg null)
        ccWIn: null,
        ccDIn: null,
      },
      partNumber: "NI-ADP-PB-Tritium-Tri-Flex-Hub-1600kw-US",
      partName: "NordBase Power Block Adapter plate – Tritium TRI-FLEX HUB - 1600kW",
    },
  ],
  Autel: [
    {
      // "unstyled-but-requested" in powerblock_dataset.json — Nordinfra's
      // internal tracker hasn't marked this one's dimension data reviewed
      // yet, but Simon explicitly asked for it by name, so it's included.
      model: "MaxiCharger DC HiPower - 480/640 kW",
      configPending: true,
      chargerSpec: {
        manufacturer: "Autel",
        model: "MaxiCharger DC HiPower - 480/640 kW",
        widthIn: 66.93,
        depthIn: 35.43,
        heightIn: 78.74,
        weightLb: 3196.7,
        ccWIn: null,
        ccDIn: null,
      },
      partNumber: "NI-ADP-PB-Autel-DC-Hipower-CPU-US",
      partName: "NordBase Power Block Adapter plate – Autel MaxiCharger DC HiPower - 480/640 kW",
    },
  ],
};

// ---------------------------------------------------------------------------
// BACKFILL / SOIL — from Master ASCE7 sheet "2 - Basic Data"
// Passive-pressure coefficients are pre-engineered per backfill gradation, so
// the customer only ever picks a backfill material — no separate friction-
// angle / unit-weight entry needed.
// ---------------------------------------------------------------------------
const BACKFILL_OPTIONS = [
  {
    key: "A",
    label: '3/4" crushed stone (0–16mm)',
    phi: 35,
    Kpd: 2.91,
    isDefault: true,
  },
  { key: "B", label: '1/2–5/8" crushed stone (8–16mm)', phi: 40, Kpd: 3.52 },
  { key: "C", label: '5/8–1.25" crushed stone (16–32mm)', phi: 42, Kpd: 3.81 },
];
const SOIL_UNIT_WEIGHT_KNM3 = 19; // compacted crushed aggregate, all backfill options

// ---------------------------------------------------------------------------
// STRUCTURAL CONSTANTS — ASCE 7-22 / IBC 2021, held at Nordinfra's verified
// worst-case values (Exposure C, flat terrain, box-shaped bluff body).
// ---------------------------------------------------------------------------
const KZ = 0.85,
  KZT = 1.0,
  KD = 0.85,
  GCF = 1.3;
const WIND_DESTAB_FACTOR = 1.6; // LRFD 0.9D + 1.6W
const GRAVITY_STAB_FACTOR = 0.9;
const SEIS_AP = 1.0,
  SEIS_RP = 1.5,
  SEIS_IP = 1.0;
const FP_CALC_FACTOR = (0.4 * SEIS_AP) / (SEIS_RP / SEIS_IP); // at-grade, z/h=0
const FP_MIN_FACTOR = 0.3,
  FP_MAX_FACTOR = 1.6;

// ---------------------------------------------------------------------------
// STEEL / BOLT CONSTANTS — confirmed 2026-08-21 against the per-product
// Nordinfra_Master_USA_ASCE7_v6 workbooks (AC / DC Small / DC Medium). These
// three workbooks report identical steel grade and bolt spec, so the values
// below are treated as fixed across the current product line (NOT the Large
// concept, which has no confirmed wall gauge yet).
// ---------------------------------------------------------------------------
const STEEL_FY_MPA = 227.5; // ASTM A1011 SS Grade 33, min. yield 33 ksi
const STEEL_BENDING_PHI = 0.9; // AISC 360-22 §F1
const STEEL_BENDING_CAPACITY_MPA = STEEL_BENDING_PHI * STEEL_FY_MPA; // = 204.75 MPa
const BOLT_SPEC_LABEL = "M16 class 8.8 (ISO 898-1)";
const BOLT_FUB_MPA = 800; // M16 8.8 tensile strength
const BOLT_AS_MM2 = 157; // M16 tensile stress area per ISO 898-1
const BOLT_TENSION_PHI = 0.75; // ACI 318-19 §17.6.1
const BOLT_TENSION_CAPACITY_KN =
  BOLT_TENSION_PHI * BOLT_AS_MM2 * (BOLT_FUB_MPA / 1000); // = 94.2 kN (2 bolts in tension, per adapter-plate bolt pattern)

// M12 class 8.8 — Power Block plate bolts (plate-to-foundation, charger-to-
// plate). Different spec from the M16 8.8 above used on Small/Medium/Large.
// Confirmed 2026-08-27 against Nordinfra_Master_USA_ASCE7_v6's own corrective
// comment (M12 tensile stress area = 84.3mm² per ISO 898-1).
const BOLT_M12_SPEC_LABEL = "M12 class 8.8 (ISO 898-1)";
const BOLT_M12_AS_MM2 = 84.3;
const BOLT_M12_TENSION_CAPACITY_KN =
  BOLT_TENSION_PHI * BOLT_M12_AS_MM2 * (BOLT_FUB_MPA / 1000); // = 50.58 kN

const SDS_REFERENCE = [
  { city: "Los Angeles, CA", sds: 1.25 },
  { city: "San Francisco, CA", sds: 1.3 },
  { city: "Seattle, WA", sds: 1.2 },
  { city: "Salt Lake City, UT", sds: 1.1 },
  { city: "Memphis, TN", sds: 0.9 },
  { city: "Denver, CO", sds: 0.25 },
  { city: "New York, NY", sds: 0.35 },
  { city: "Dallas, TX", sds: 0.15 },
  { city: "Miami, FL", sds: 0.08 },
  { city: "Atlanta, GA", sds: 0.2 },
];

// ---------------------------------------------------------------------------
// CHARGER QUICK-FILL PRESETS (optional — customer can always override manually)
// -----------------------------------------------------------------------------------
// Kempower + ABB below are the two confirmed DC charger units kept from the
// original list (2026-08-26, Simon Gullberg) — every other charger unit that
// used to be here (Kempower Movable C-Series, ABB Terra 54 CJG, both
// Alpitronic models, Tritium PKM150) was removed per that same instruction.
//
// Everything below ABB is the verified Level-2 PEDESTAL survey (Simon
// Gullberg, 2026-08-26 — EV_Charger_Pedestals_US_Dimensions.xlsx). `weight`
// is set to the flat 100 lb standard value Simon specified ("max 100 lbs
// inkl. laddare") since none of these pedestals have a manufacturer-quoted
// weight yet — treat it as a conservative placeholder, not a spec value.
// Height is the manufacturer's MAX value where the source gave a range
// (worst case for wind load), per Simon's instruction.
//
// `ccW`/`ccD` — the model's OWN bolt-pattern spacing (width x depth, inches),
// where known. This drives the adapter-plate CC auto-fill (2026-08-26): the
// UI only auto-selects a CC value when ccW is in
// FOUNDATIONS.SMALL.adapterPlate.ccOptionsX AND ccD is in …ccOptionsY — i.e.
// the model's real pattern lands exactly on a hole Nordinfra has actually
// drilled per the Plate-2 grid drawing. Everything else (ccW/ccD null, OR a
// pattern that doesn't land on the grid) shows a "contact Nord-Infra to
// verify compatibility" prompt instead of guessing — we only have confirmed
// hole positions for the grid on that drawing.
// `basePlateW`/`basePlateD` — the pedestal's own base-plate footprint
// (informational display only, not fed into the structural calc).
// FOUNDATION-SCOPED (2026-08-26, Simon: "jag såg att på dc-medium och
// dc-large ligger pedestaler med i lista över tillverkare och modeller" —
// pedestal manufacturers like Postlane don't belong on Medium/Large, those
// are freestanding DC fast chargers, not Level 2 pedestals). This set below
// is PEDESTAL_CHARGER_PRESETS — used only for NordBase Small. Medium/Large
// use DC_FAST_CHARGER_PRESETS further down instead — see
// chargerPresetsForFoundation() for the actual per-foundation lookup.
// ---------------------------------------------------------------------------
const PEDESTAL_CHARGER_PRESETS = {
  Kempower: [
    {
      model: "Satellite C-Series",
      w: 11.8,
      d: 11.8,
      h: 59.1,
      weight: 132,
      ccW: null, // no confirmed bolt pattern on file yet for this unit
      ccD: null,
    },
    // Added from calculator_charger_dataset.json (2026-08-31, 60-model verified dataset)
    {
      model: "Satellite",
      w: 11.81,
      d: 11.81,
      h: 59.76,
      weight: 242.51,
      ccW: 9.45,
      ccD: 9.45,
      basePlateW: 11.81,
      basePlateD: 11.81,
      partNumber: "NI-ADP-DCS-Kempower-Satellite-US",
      partName: "NordBase Small Adapter plate – Kempower Satellite",
    },
  ],
  ABB: [
    {
      model: "Terra AC Wallbox Pedestal",
      w: 5.9,
      d: 5.9,
      h: 55.1,
      weight: 99,
      ccW: 6.5, // confirmed by Simon 2026-08-26 — NOT on the current SMALL grid yet
      ccD: 9.5,
    },
  ],
  WiLLev: [
    {
      model: "EV-SSAA",
      w: 4,
      d: 4,
      h: 96, // range given as 4-8 ft; using max (8 ft) per worst-case rule
      weight: 100,
      ccW: 6,
      ccD: 6,
      basePlateW: 8.5,
      basePlateD: 8.5,
    },
  ],
  Postlane: [
    {
      model: "7ft Steel",
      w: 4,
      d: 4,
      h: 84,
      weight: 100,
      ccW: 9,
      ccD: 9,
      basePlateW: 12,
      basePlateD: 12,
    },
    {
      model: "6ft Aluminium CW (triangular)",
      w: 2,
      d: 12,
      h: 72, // confirmed by Simon 2026-08-26
      weight: 100,
      ccW: 9,
      ccD: 9,
      basePlateW: 12,
      basePlateD: 12,
    },
  ],
  "Pedestal PRO": [
    {
      model: "BASE+ Brandable EV Pedestal (186EVCS-02B)",
      w: 8,
      d: 4,
      h: 95, // range given as 64"-95"; using max per worst-case rule
      weight: 100,
      ccW: 8,
      ccD: 5,
      basePlateW: 6.5,
      basePlateD: 20,
    },
  ],
  BHS: [
    {
      model: "EVCS (CSEV-1-96 / CSEV-2-96 / CSEV-1-60 / CSEV-2-60)",
      w: 4,
      d: 4,
      h: 96, // range given as 60"-96"; using max per worst-case rule
      weight: 100,
      ccW: 8,
      ccD: 8,
      basePlateW: 9.25,
      basePlateD: 9.25,
    },
  ],
  Eaton: [
    {
      model: "Universal EV Pedestal",
      w: 4,
      d: 11.75,
      // No height given anywhere in the source (not even a range) — using the
      // tallest comparable pedestal (96") as a conservative placeholder.
      // FLAG FOR SIMON: needs a real confirmed height before this is final.
      h: 96,
      weight: 100,
      ccW: null, // "Custom made" — bolt pattern not documented anywhere in the source
      ccD: null,
      basePlateW: 11,
      basePlateD: 14.5,
    },
  ],
  Leviton: [
    {
      model: "EPED1-1 / EPED2-2 / EPCMX-6 / EPCMY-6",
      w: 4,
      d: 4,
      h: 55,
      weight: 100,
      ccW: 5.3, // does NOT land on the current SMALL grid (X grid has no 5.3/5)
      ccD: 5.3,
      basePlateW: 7.1,
      basePlateD: 7.1,
    },
    {
      model: "EPED1 / EPED2",
      w: 7.87,
      d: 3.07,
      h: 55,
      weight: 100,
      ccW: 8.62, // does not land on the grid (nearest is 9" — 0.38" off)
      ccD: 3.67, // does not land on the grid (grid's shortest Y is 5")
      basePlateW: 6.1,
      basePlateD: 10.63,
    },
  ],
  Chargepoint: [
    {
      model: "CT4000 Level 2",
      w: 11.4,
      d: 13.7,
      h: 71.1, // confirmed by Simon 2026-08-26
      weight: 100,
      ccW: null, // triangular pattern — not documented, doesn't fit a 4-hole grid anyway
      ccD: null,
      basePlateW: 13,
      basePlateD: 11,
    },
  ],
  // ---- New manufacturers below added from calculator_charger_dataset.json
  // (2026-08-31, 60-model verified dataset) — none of these collided with
  // an existing key above, so each is added fresh. ----
  Alpitronic: [
    {
      model: "HYC50",
      w: 20.47,
      d: 9.84,
      h: 51.18,
      weight: 319.67,
      ccW: null, // bolt pattern not confirmed / not on file yet
      ccD: null,
      basePlateW: 15.75,
      basePlateD: 7.87,
      partNumber: "NI-ADP-DCS-Alpitronic-HYC50-US",
      partName: "NordBase Small Adapter plate – Alpitronic HYC50",
    },
  ],
  Autel: [
    {
      model: "AC Ultra",
      w: 14.17,
      d: 7.87,
      h: 56.69,
      weight: 165.35,
      ccW: null, // bolt pattern excluded from source data (Fundamentplatta smaller than CC — data error, needs Simon to resupply)
      ccD: null,
      basePlateW: 7.76,
      basePlateD: 14.17,
      partNumber: "NI-ADP-DCS-Autel-Maxicharger-AC-Ultra-US",
      partName: "NordBase Small Adapter plate – Autel AC Ultra",
    },
  ],
  "Blink Charging": [
    {
      model: "Pedestal 22kW",
      w: 11.81,
      d: 10.24,
      h: 96.85,
      weight: 110.23,
      ccW: 4.45,
      ccD: 4.92,
      basePlateW: 11.81,
      basePlateD: 11.81,
      partNumber: "NI-ADP-DCS-Blink-Charging-Pedestal-22kw-US",
      partName: "NordBase Small Adapter plate – Blink Charging Pedestal 22kW",
    },
  ],
  Siemens: [
    {
      model: "SICHARGE FLEX - Dispenser Small",
      w: 14.37,
      d: 11.81,
      h: 86.61,
      weight: 275.58,
      ccW: 11.22,
      ccD: 8.66,
      basePlateW: 14.37,
      basePlateD: 11.81,
      partNumber: "NI-ADP-DCS-Siemens-Sicharge-Flex-Dispenser-Small-US",
      partName: "NordBase Small Adapter plate – Siemens SICHARGE FLEX - Dispenser Small",
    },
  ],
};

// ---------------------------------------------------------------------------
// DC FAST CHARGER MANUFACTURERS — for NordBase Medium and Large (freestanding
// Level 3/4 DC fast chargers, not pedestals). List + alphabetical order per
// Simon Gullberg, 2026-08-26. Models intentionally left empty for now —
// "Jag återkommer med olika modeller för samtliga" (he'll follow up with
// model dimensions/bolt patterns per manufacturer). Until a manufacturer has
// at least one model here, the UI shows a "models coming soon" note instead
// of an empty dropdown — see the Configuration step below.
// HOW TO ADD A MODEL: add an entry to that manufacturer's array using the
// same shape as PEDESTAL_CHARGER_PRESETS above ({ model, w, d, h, weight,
// ccW, ccD, basePlateW?, basePlateD? }) — ccW/ccD null until a confirmed
// bolt pattern is on file.
// ---------------------------------------------------------------------------
const DC_FAST_CHARGER_PRESETS = {
  ABB: [
    {
      model: "C50",
      w: 25.7,
      d: 9.3,
      h: 77.4,
      weight: 385,
      ccW: 18.54,
      ccD: 7.56,
      basePlateW: 21.65,
      basePlateD: 9.45,
      partNumber: "NI-ADP-DCM-ABB-C50-US",
      partName: "NordBase Medium Adapter plate – ABB C50",
    },
    {
      model: "A200/300/400",
      w: 31.1,
      d: 31.9,
      h: 88.8,
      weight: 1322,
      ccW: 27.01,
      ccD: 22.05,
      basePlateW: 27.56,
      basePlateD: 23.62,
      partNumber: "NI-ADP-DCM-ABB-A200-300-400-US",
      partName: "NordBase Medium Adapter plate– ABB A200/300/400",
    },
    {
      model: "OM Solo/Duo",
      w: 21.26,
      d: 9.84,
      h: 85.24,
      weight: 330.69,
      ccW: 13.39,
      ccD: 7.09,
      basePlateW: 21.26,
      basePlateD: 9.84,
      partNumber: "NI-ADP-DCM-ABB-OM-Solo-Duo-US",
      partName: "NordBase Medium Adapter plate – ABB OM Solo/Duo",
    },
  ],
  Alpitronic: [
    {
      model: "HYC300/400",
      w: 28.82,
      d: 26.1,
      h: 87.99,
      weight: 1697.56,
      ccW: 18.5,
      ccD: 15.75,
      basePlateW: 21.65,
      basePlateD: 19.69,
      partNumber: "NI-ADP-DCM-Alpitronic-HYC400-US",
      partName: "NordBase Medium Adapter plate – Alpitronic HYC300/400",
    },
    {
      model: "HYC1000 - MCS",
      w: 30.71,
      d: 10.24,
      h: 91.34,
      weight: 771.62,
      ccW: 24.41,
      ccD: 5.31,
      basePlateW: 27.56,
      basePlateD: 7.09,
      partNumber: "NI-ADP-DCM-Alpitronic-HYC1000-MCS-US",
      partName: "NordBase Medium Adapter plate – Alpitronic HYC1000 - MCS",
    },
    {
      model: "HYC1000 - MCS-Dispenser",
      w: 24.41,
      d: 10.24,
      h: 91.34,
      weight: 606.27,
      ccW: 18.39,
      ccD: 5.31,
      basePlateW: 21.65,
      basePlateD: 7.09,
      partNumber: "NI-ADP-DCM-Alpitronic-HYC1000-MCS-Dispenser-US",
      partName: "NordBase Medium Adapter plate – Alpitronic HYC1000 - MCS-Dispenser",
    },
  ],
  Autel: [
    {
      model: "MaxiCharger DC Fast DF120",
      w: 32.28,
      d: 23.62,
      h: 76.77,
      weight: 1036.17,
      ccW: null,  // bolt pattern not confirmed / not on file yet
      ccD: null,
      basePlateW: null,
      basePlateD: null,
      partNumber: "NI-ADP-DCM-Autel-Maxicharger-DF120-US",
      partName: "NordBase Medium Adapter plate – Autel MaxiCharger DC Fast DF120",
    },
    {
      model: "MaxiCharger DC Fast DF240",
      w: 32.28,
      d: 27.56,
      h: 76.77,
      weight: 1141.99,
      ccW: 24.8,
      ccD: 17.72,
      basePlateW: 28.35,
      basePlateD: 21.65,
      partNumber: "NI-ADP-DCM-Autel-Maxicharger-DF240-US",
      partName: "NordBase Medium Adapter plate – Autel MaxiCharger DC Fast DF240",
    },
    {
      model: "DH480",
      w: 30.79,
      d: 30.79,
      h: 76.77,
      weight: 1675.51,
      ccW: 24.8,
      ccD: 19.69,
      basePlateW: 27.56,
      basePlateD: 22.44,
      partNumber: "NI-ADP-DCM-Autel-DH480-US",
      partName: "NordBase Medium Adapter plate – Autel DH480",
    },
    {
      model: "MaxiCharger DC HiPower - Dispenser",
      w: 22.83,
      d: 12.6,
      h: 81.69,
      weight: 418.88,
      ccW: 20.43,
      ccD: 5.12,
      basePlateW: 25.59,
      basePlateD: 9.06,
      partNumber: "NI-ADP-DCM-Autel-DCHhipower-Dispenser-US",
      partName: "NordBase Medium Adapter plate – Autel MaxiCharger DC HiPower - Dispenser",
    },
    {
      model: "MaxiCharger DC Compact",
      w: 21.65,
      d: 10.24,
      h: 39.37,
      weight: 264.55,
      ccW: 13.39,
      ccD: 9.06,
      basePlateW: 17.72,
      basePlateD: 13.78,
      partNumber: "NI-ADP-DCM-Autel-DC-Compact-US",
      partName: "NordBase Medium Adapter plate – Autel MaxiCharger DC Compact",
    },
  ],
  "Blink Charging": [
    {
      model: "DCFC 60-300kW",
      w: 41.97,
      d: 40.9,
      h: 90.12,
      weight: 1102.31,
      ccW: 17.32,
      ccD: 25.98,
      basePlateW: 19.69,
      basePlateD: 27.56,
      partNumber: "NI-ADP-DCM-Blink-Charging-DCFC-60-300kw-US",
      partName: "NordBase Medium Adapter plate – Blink Charging DCFC 60-300",
    },
    {
      model: "Sinexcel DCFC 120-240kW",
      w: 29.53,
      d: 33.46,
      h: 78.74,
      weight: 1058.22,
      ccW: 29.53,
      ccD: 16.93,
      basePlateW: 33.46,
      basePlateD: 21.65,
      partNumber: "NI-ADP-DCM-Blink-Charging-DCFC-120-240kw-US",
      partName: "NordBase Medium Adapter plate – Blink Charging Sinexcel DCFC 120-240kw",
    },
  ],
  "BTC Power": [],
  ChargePoint: [
    {
      model: "Express 250/280",
      w: 28.74,
      d: 17.32,
      h: 88.19,
      weight: 661.39,
      ccW: 17.87,
      ccD: 10.67,
      basePlateW: 29.53,
      basePlateD: 19.69,
      partNumber: "NI-ADP-DCM-Chargepoint-Express-250-280-US",
      partName: "NordBase Medium Adapterplåt – ChargePoint Express 250/280",
    },
    {
      model: "Express Plus - Power Block",
      w: 38.9,
      d: 40.91,
      h: 86.26,
      weight: 1003.1,
      ccW: 31.18,
      ccD: 26.06,
      basePlateW: 41.34,
      basePlateD: 39.37,
      partNumber: "NI-ADP-DCL-Chargepoint-Express-Power-Block-US",
      partName: "NordBase Large Adapter plate – ChargePoint Express Plus - Power Block",
    },
    {
      model: "Express Plus - Power Link 2000 ",
      w: 28.35,
      d: 17.32,
      h: 94.49,
      weight: 460.77,
      ccW: 17.86,
      ccD: 5.12,
      basePlateW: 29.53,
      basePlateD: 19.69,
      partNumber: "NI-ADP-DCM-Chargepoint-Express-Power-Link-2000-US",
      partName: "NordBase Medium Adapter plate – ChargePoint Express Plus - Power Link 2000",
    },
  ],
  "Delta Electronics": [
    {
      model: "UFC200/UFC500",
      w: 39.37,
      d: 33.82,
      h: 81.89,
      weight: 1543.23,
      ccW: 22.64,
      ccD: 21.65,
      basePlateW: 27.56,
      basePlateD: 27.56,
      partNumber: "NI-ADP-DCL-Delta-Electronics-UFC200/500-US",
      partName: "NordBase Large Adapter plate – Delta Electronics Ultra Fast Charger UFC200/UFC500",
    },
  ],
  Ekoenergetyka: [
    {
      model: "Axon Easy",
      w: 29.53,
      d: 38.78,
      h: 83.46,
      weight: 1543.23,
      ccW: 25.51,
      ccD: 14.88,
      basePlateW: 27.56,
      basePlateD: 27.56,
      partNumber: "NI-ADP-DCM-Ekoenergetyka-Axon-Easy-US",
      partName: "NordBase Medium Adapter plate – Ekoenergetyka Axon Easy",
    },
    {
      model: "Axon Sat 400",
      w: 15.75,
      d: 9.84,
      h: 78.74,
      weight: 727.52,
      ccW: 12.01,
      ccD: 3.54,
      basePlateW: 15.75,
      basePlateD: 7.87,
      partNumber: "NI-ADP-DCM-Ekoenergetyka-Axon-Sat-400-US",
      partName: "NordBase Medium Adapter plate – Ekoenergetyka Axon Sat 400",
    },
    {
      model: "Axon Sat 600",
      w: 15.75,
      d: 9.84,
      h: 78.74,
      weight: 727.52,
      ccW: 20.28,
      ccD: 9.45,
      basePlateW: 23.62,
      basePlateD: 15.75,
      partNumber: "NI-ADP-DCM-Ekoenergetyka-Axon-Sat-600-US",
      partName: "NordBase Medium Adapter plate – Ekoenergetyka Axon Sat 600",
    },
    {
      model: "Axon Side DLBS",
      w: 39.37,
      d: 41.34,
      h: 90.55,
      weight: 2866.01,
      ccW: null,  // bolt pattern not confirmed / not on file yet
      ccD: null,
      basePlateW: null,
      basePlateD: null,
      partNumber: "NI-ADP-DCL-Ekoenergetyka-Axon-Side-DLBS-US",
      partName: "NordBase Large Adapter plate – Ekoenergetyka Axon Side DLBS",
    },
  ],
  FreeWire: [],
  "InCharge Energy": [
    {
      model: "ICE-60-180",
      w: 27.56,
      d: 68.9,
      h: 29.53,
      weight: 881.85,
      ccW: 20.55,
      ccD: 16.54,
      basePlateW: 29.53,
      basePlateD: 27.56,
      partNumber: "NI-ADP-DCM-Incharge-Energy-ICE-60-180-US",
      partName: "NordBase Medium Adapter plate – InCharge Energy ICE-60-180",
    },
    {
      model: "ICE-480/ICE-600 Split System",
      w: 41.34,
      d: 45.28,
      h: 86.61,
      weight: 3306.93,
      ccW: 35.83,
      ccD: 39.37,
      basePlateW: 41.34,
      basePlateD: 45.28,
      partNumber: "NI-ADP-DCL-Incharge-Energy-ICE-480-600-Split-US",
      partName: "NordBase Large Adapter plate – InCharge Energy ICE-480/ICE-600 Split System",
    },
    {
      model: "ICE SlimLine Dispenser ",
      w: 23.62,
      d: 10.24,
      h: 70.87,
      weight: 429.9,
      ccW: 13.58,
      ccD: 7.24,
      basePlateW: 23.62,
      basePlateD: 10.24,
      partNumber: "NI-ADP-DCM-Incharge-Energy-ICE-Slimline-Dispenser-US",
      partName: "NordBase Medium Adapter plate – InCharge Energy ICE SlimLine Dispenser",
    },
  ],
  Kempower: [
    {
      model: "Station Charger C801",
      w: 25.59,
      d: 33.11,
      h: 94.29,
      weight: 1157.43,
      ccW: 23.94, // Fundamentplatta confirmed by Simon 2026-08-31 (750x800mm, now larger than CC — previous data-error flag resolved)
      ccD: 13.39,
      basePlateW: 29.53,
      basePlateD: 31.5,
      partNumber: "NI-ADP-DCM-Kempower-Station-Charger-C801-US",
      partName: "NordBase Medium Adapter plate – Kempower Station Charger C801",
    },
    {
      model: "Power Unit C801",
      w: 25.59,
      d: 33.11,
      h: 86.42,
      weight: 749.57,
      ccW: 23.94, // Fundamentplatta confirmed by Simon 2026-08-31 (750x800mm, now larger than CC — previous data-error flag resolved)
      ccD: 13.39,
      basePlateW: 29.53,
      basePlateD: 31.5,
      partNumber: "NI-ADP-DCM-Kempower-Power-Unit-C801-US",
      partName: "NordBase Medium Adapter plate – Kempower Power Unit C801",
    },
  ],
  "Power Electronics": [
    {
      model: "NB 160",
      w: 26.38,
      d: 29.53,
      h: 70.87,
      weight: 921.53,
      ccW: 29.92,
      ccD: 14.57,
      basePlateW: 31.5,
      basePlateD: 17.72,
      partNumber: "NI-ADP-DCM-Power-Electronics-NB-160-US",
      partName: "NordBase Medium Adapter plate – Power Electronics NB 160",
    },
    {
      model: "NB 240",
      w: 26.38,
      d: 37.4,
      h: 78.74,
      weight: 1278.68,
      ccW: 29.92,
      ccD: 14.57,
      basePlateW: 31.5,
      basePlateD: 17.72,
      partNumber: "NI-ADP-DCM-Power-Electronics-NB-240-US",
      partName: "NordBase Medium Adapter plate – Power Electronics NB 240",
    },
    {
      model: "NB 400",
      w: 27.95,
      d: 37.4,
      h: 88.58,
      weight: 1719.6,
      ccW: 29.92,
      ccD: 14.57,
      basePlateW: 31.5,
      basePlateD: 17.72,
      partNumber: "NI-ADP-DCM-Power-Electronics-NB-400-US",
      partName: "NordBase Medium Adapter plate – Power Electronics NB 400",
    },
    {
      model: "MCS Solution - Cooled",
      w: 29.53,
      d: 26.38,
      h: 70.87,
      weight: 771.62,
      ccW: null,  // bolt pattern not confirmed / not on file yet
      ccD: null,
      basePlateW: 31.5,
      basePlateD: 27.56,
      partNumber: "NI-ADP-DCL-Power-Electronics-MC-Solution-Cooled-US",
      partName: "NordBase Large Adapter plate – Power Electronics MCS Solution - Cooled",
    },
    {
      model: "MCS Solution - Slim",
      w: 29.92,
      d: 11.81,
      h: 70.87,
      weight: 573.2,
      ccW: 22.05,
      ccD: 5.12,
      basePlateW: 25.59,
      basePlateD: 9.84,
      partNumber: "NI-ADP-DCM-Power-Electronics-MCS-Solution-Slim-US",
      partName: "NordBase Medium Adapter plate – Power Electronics MCS Solution - Slim",
    },
  ],
  Siemens: [
    {
      model: "SICHARGE D",
      w: 33.27,
      d: 32.28,
      h: 90.55,
      weight: 1499.14,
      ccW: 25.75,
      ccD: 17.78,
      basePlateW: 29.53,
      basePlateD: 21.65,
      partNumber: "NI-ADP-DCM-Siemens-Sicharge-D-US",
      partName: "NordBase Medium Adapter plate – Siemens SICHARGE D",
    },
    {
      model: "SICHARGE D Dispenser",
      w: 23.62,
      d: 19.29,
      h: 90.55,
      weight: 440.92,
      ccW: 19.06,
      ccD: 7.87,
      basePlateW: 21.65,
      basePlateD: 11.81,
      partNumber: "NI-ADP-DCM-Siemens-Sicharge-D-Dispenser-US",
      partName: "NordBase Medium Adapter plate – Siemens SICHARGE D Dispenser",
    },
    {
      model: "SICHARGE FLEX - Dispenser Big",
      w: 25.83,
      d: 11.81,
      h: 86.61,
      weight: 440.92,
      ccW: 22.68,
      ccD: 8.66,
      basePlateW: 25.83,
      basePlateD: 11.81,
      partNumber: "NI-ADP-DCM-Siemens-Sicharge-Flex-Dispenser-Big-US",
      partName: "NordBase Medium Adapter plate – Siemens SICHARGE FLEX - Dispenser Big",
    },
  ],
  Tesla: [
    {
      model: "Supercharger V4 Dispenser",
      w: 13.15,
      d: 35.08,
      h: 76.61,
      weight: 198.42,
      ccW: null,  // bolt pattern not confirmed / not on file yet
      ccD: null,
      basePlateW: null,
      basePlateD: null,
      partNumber: "NI-ADP-DCM-Tesla-v4-Dispenser-US",
      partName: "NordBase Medium Adapter plate – Tesla V4 Dispenser",
    },
  ],
  Tritium: [
    {
      model: "PKM75",
      w: 30.83,
      d: 12.17,
      h: 78.66,
      weight: null,
      ccW: null,  // bolt pattern not confirmed / not on file yet
      ccD: null,
      basePlateW: null,
      basePlateD: null,
      partNumber: "NI-ADP-DCM-Tritium-PKM75-US",
      partName: "NordBase Medium Adapter plate – Tritium PKM75",
    },
    {
      model: "PKM150",
      w: 30.71,
      d: 11.81,
      h: 78.74,
      weight: null,
      ccW: null,  // bolt pattern not confirmed / not on file yet
      ccD: null,
      basePlateW: null,
      basePlateD: null,
      partNumber: "NI-ADP-DCM-Tritium-PKM150-US",
      partName: "NordBase Medium Adapter plate – Tritium PKM150",
    },
    {
      model: "TRI-FLEX Dispenser",
      w: 26.89,
      d: 13.15,
      h: 86.06,
      weight: 716.5,
      ccW: null,  // bolt pattern excluded from source data (Fundamentplatta smaller than CC — data error, needs Simon to resupply)
      ccD: null,
      basePlateW: 23.62,
      basePlateD: 7.09,
      partNumber: "NI-ADP-DCM-Tritium-Tri-Flex-Dispenser-US", // CC now on file in Excel (680x210mm) but STILL exceeds Fundamentplatta (600x180mm) on both axes — physically impossible, left null on purpose, flagged to Simon 2026-08-31
      partName: "NordBase Medium Adapter plate – Tritium TRI-FLEX Dispenser",
    },
    {
      model: "DC-FLEX",
      w: 26.69,
      d: 12.44,
      h: 78.74,
      weight: 440.92,
      ccW: 13.78,
      ccD: 4.92,
      basePlateW: 15.75,
      basePlateD: 5.91,
      partNumber: "NI-ADP-DCM-Tritium-DC-Flex-US",
      partName: "NordBase Medium Adapter plate – Tritium DC-FLEX",
    },
  ],
  Wallbox: [
    {
      model: "Supernova 180",
      w: 28.11,
      d: 17.83,
      h: 78.74,
      weight: 881.85,
      ccW: 25.79,
      ccD: 11.02,
      basePlateW: 28.35,
      basePlateD: 15.75,
      partNumber: "NI-ADP-DCM-Wallbox-Supernova-180-US",
      partName: "NordBase Medium Adapter plate – Wallbox Supernova 180 (US)",
    },
  ],
  "Zerova (Phihong)": [
    {
      model: "DT series 240kW",
      w: 35.12,
      d: 25.98,
      h: 86.61,
      weight: 1686.53,
      ccW: null,  // bolt pattern not confirmed / not on file yet
      ccD: null,
      basePlateW: null,
      basePlateD: null,
      partNumber: "NI-ADP-DCM-Zerova-DT-Series-240kw-US",
      partName: "NordBase Medium Adapterplåt – Zerova (Phihong) DT series 240kW",
    },
    {
      model: "DQ Series 480kW",
      w: 41.34,
      d: 31.5,
      h: 82.68,
      weight: 2557.36,
      ccW: null,  // bolt pattern not confirmed / not on file yet
      ccD: null,
      basePlateW: null,
      basePlateD: null,
      partNumber: "NI-ADP-DCL-Zerova-DQ-Series-480kw-US",
      partName: "NordBase Large Adapterplåt – Zerova (Phihong) DQ Series 480kW",
    },
  ],
};

// Power Block C503's charger is fixed (one confirmed Kempower C503 cabinet
// Returns the manufacturer/model preset set for a given foundation key —
// pedestal presets for Small, DC fast charger presets for Medium/Large,
// the Power Block model family for Power Block, nothing for foundations
// without a charger step (Bollard).
function chargerPresetsForFoundation(foundationKey) {
  if (foundationKey === "SMALL") return PEDESTAL_CHARGER_PRESETS;
  if (foundationKey === "MEDIUM" || foundationKey === "LARGE")
    return DC_FAST_CHARGER_PRESETS;
  if (foundationKey === "POWER_BLOCK") return POWER_BLOCK_MODELS;
  return {};
}

// ---------------------------------------------------------------------------
// ADAPTER PLATE DRAWINGS — real, dimensioned PDF drawings supplied by
// Nordinfra (NOT the auto-generated schematic further down in this file).
// Once a customer picks a foundation + charger manufacturer + model, if a
// matching entry exists here, the calculator shows a prominent "Download
// official drawing" button — a real manufactured drawing is more accurate
// than an algorithmically generated sketch, so it takes priority whenever
// one is available. The generated sketch still shows underneath as a live
// preview / fallback for models that don't have an official drawing yet.
//
// HOW TO ADD A NEW DRAWING (Simon — no other code changes needed):
//   1. Drop the PDF into public/drawings/adapter-plates/ using this naming
//      pattern:  {foundation-slug}_{manufacturer-slug}_{model-slug}.pdf
//        e.g.  medium_kempower_satellite-c-series.pdf
//      NordBase Small uses one shared "universal" plate today (no
//      manufacturer/model needed) — name that one small_universal.pdf.
//   2. Add one line to ADAPTER_PLATE_DRAWINGS below, using the exact
//      manufacturer/model text as it appears in PEDESTAL_CHARGER_PRESETS or
//      DC_FAST_CHARGER_PRESETS above (whichever applies to that foundation).
//   3. Commit + push — Vercel rebuilds and the link goes live automatically.
// DC Medium/Large need one of these per charger model once
// DC_FAST_CHARGER_PRESETS has models on file (currently empty — models
// pending from Simon). NordBase Small starts with a single shared universal
// plate; a couple more may be added later.
// ---------------------------------------------------------------------------
function adapterDrawingKey(foundationKey, manufacturer, model) {
  return `${foundationKey}|${manufacturer}|${model}`.toLowerCase();
}
function universalAdapterDrawingKey(foundationKey) {
  return `${foundationKey}|universal`.toLowerCase();
}
const ADAPTER_PLATE_DRAWINGS = {
  // Example (remove once the real PDF replaces it):
  // [adapterDrawingKey("MEDIUM", "Kempower", "Satellite C-Series")]:
  //   "/drawings/adapter-plates/medium_kempower_satellite-c-series.pdf",
  // [universalAdapterDrawingKey("SMALL")]:
  //   "/drawings/adapter-plates/small_universal.pdf",
};

// ---------------------------------------------------------------------------
// DOCUMENT LIBRARY — real PDFs supplied by Nordinfra, linked from the Report
// step. Manuals are foundation-specific; warranty and technical spec are
// universal (apply to the whole product line); the BABA certificate covers
// only the foundations listed in BABA_COVERED_FOUNDATIONS (per the source
// certificate's product table — NordBase Large is not yet covered, flag to
// Nordinfra if that needs updating).
// ---------------------------------------------------------------------------
const FOUNDATION_MANUALS = {
  BOLLARD: "/docs/manuals/NI_Manual_AC_001_US.pdf",
  SMALL: "/docs/manuals/NI_Manual_DCS_001_US.pdf",
  // MEDIUM / LARGE manuals not yet supplied — falls back to a "coming soon" note.
};
const BABA_CERTIFICATE_PDF = "/docs/certificates/NI_BABA_001_US_Certificate.pdf";
const BABA_COVERED_FOUNDATIONS = new Set(["BOLLARD", "SMALL", "MEDIUM"]);
const WARRANTY_PDF = "/docs/warranty/NI_WAR_001_US_Product_Warranty.pdf";
const TECHNICAL_SPEC_PDF = "/docs/technical-specs/Nordinfra_Technical_Spec_US.pdf";

// ---------------------------------------------------------------------------
// DISTRIBUTION PARTNERS — generic partner/location directory shown on the
// report step so a customer can be pointed to a distributor for order
// placement (Nordinfra sells only through partners/distributors, not
// direct). Built generically (not hardcoded to one partner) so additional
// regional partners (UK, Canada, Australia, more US distributors) can be
// added as new entries without any code changes. Fill in real addresses/
// coordinates before go-live — the entry below is a placeholder using
// approximate coordinates and MUST be verified/completed by Nordinfra.
// Lat/long are only used to build a "get directions" Google Maps link, so
// approximate values are fine; no map-tile/API dependency is required.
// ---------------------------------------------------------------------------
const PARTNERS = [
  {
    id: "postlane",
    name: "Postlane",
    // Company-level contact info (shown when a customer expands the partner
    // row). Website confirmed 2026-08-25 (postlaneusa.com — not postlane.com,
    // which is an unrelated investment firm). Phone/email confirmed
    // 2026-08-25 from postlaneusa.com's own site footer.
    website: "https://www.postlaneusa.com/",
    phone: "718.355.1808",
    email: "Info@postlaneusa.com",
    // TODO(Nordinfra): replace with Postlane's real branch list (~30 locations).
    // Each location needs its own entry once Postlane shares the list — this
    // single placeholder stands in for the whole network until then.
    locations: [
      {
        city: "New York",
        state: "NY",
        address: "Address on file — confirm with Postlane before publishing",
        phone: "",
        lat: 40.7128,
        lon: -74.006,
      },
    ],
  },
];

function hasConfirmedAddress(loc) {
  return Boolean(loc.address) && !loc.address.startsWith("Address on file");
}

function directionsUrl(loc) {
  const q = encodeURIComponent(`${loc.address}, ${loc.city}, ${loc.state}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// ---------------------------------------------------------------------------
// SELF-TEST — dev-only regression check for the stability calc engine.
// Cross-validated 2026-08-21/24 against all four confirmed
// Nordinfra_Master_USA_ASCE7_v6 workbooks: the tipping-arm lever "a" always
// equals half the BASE PLATE short side (foundation.bottom), not half the
// shell-top width. This guards that fix from silently regressing during
// productionization/refactoring. NOT wired into the UI — call manually from
// the browser console after deploying: window.__nordbaseSelfTest()
// ---------------------------------------------------------------------------
const EXPECTED_TIPPING_ARM_M = {
  BOLLARD: 0.1803, // 14.2" / 2
  SMALL: 0.2819, // 22.2" / 2
  MEDIUM: 0.3962, // 31.2" / 2 (short side of the 31.2x39.4 base plate)
  LARGE: 0.5969, // 47" / 2 — matches Nordinfra's Excel worked example exactly
};
// Single-foundation keys only — Power Block's tipping-arm formula is
// different (shared-plate bolt-pattern width / 2, computed in
// runPowerBlockCheck, not calcStability) and isn't covered by this
// generic-engine regression guard, so it's excluded here rather than added
// to EXPECTED_TIPPING_ARM_M with a mismatched formula.
const SELF_TEST_FOUNDATION_KEYS = FOUNDATION_ORDER.filter(
  (key) => !FOUNDATIONS[key].isPowerBlock
);
function runSelfTest() {
  const results = SELF_TEST_FOUNDATION_KEYS.map((key) => {
    const f = FOUNDATIONS[key];
    const basePlateShortIn = Math.min(f.bottom.w, f.bottom.d);
    const aM = inToM(basePlateShortIn) / 2;
    const expected = EXPECTED_TIPPING_ARM_M[key];
    const diff = Math.abs(aM - expected);
    return {
      foundation: key,
      calculated: Number(aM.toFixed(4)),
      expected,
      pass: diff < 0.0005,
    };
  });
  const allPass = results.every((r) => r.pass);
  // eslint-disable-next-line no-console
  console.table(results);
  // eslint-disable-next-line no-console
  console.log(
    allPass
      ? "✅ NordBase self-test PASSED — tipping-arm formula matches all 4 confirmed workbooks."
      : "❌ NordBase self-test FAILED — tipping-arm calc has regressed, check calcStability()."
  );
  return allPass;
}
if (typeof window !== "undefined") {
  window.__nordbaseSelfTest = runSelfTest;
}

// ---------------------------------------------------------------------------
// CALCULATION ENGINE
// ---------------------------------------------------------------------------
function calcWind({ chargerWidthIn, chargerHeightIn, windSpeedMph }) {
  const qzPsf = 0.00256 * KZ * KZT * KD * Math.pow(windSpeedMph, 2);
  const ArefFt2 = inToM(chargerWidthIn) * inToM(chargerHeightIn) * 10.764;
  const FwLbf = GCF * qzPsf * ArefFt2;
  const FwKn = FwLbf * 0.0044482216;
  const zcM = inToM(chargerHeightIn) / 2;
  const MwKnm = FwKn * zcM;
  const MdWindKnm = WIND_DESTAB_FACTOR * MwKnm;
  return { qzPsf, ArefFt2, FwKn, zcM, MwKnm, MdWindKnm };
}

function calcSeismic({ WpKn, sds, zcM }) {
  const FpCalc = FP_CALC_FACTOR * sds * WpKn;
  const FpMin = FP_MIN_FACTOR * sds * SEIS_IP * WpKn;
  const FpMax = FP_MAX_FACTOR * sds * SEIS_IP * WpKn;
  const FpDesign = Math.min(Math.max(FpCalc, FpMin), FpMax);
  const MdSeisKnm = FpDesign * zcM;
  return { FpCalc, FpMin, FpMax, FpDesign, MdSeisKnm };
}

function calcStability({ foundation, Kpd, sds, WpKn }) {
  const topShortIn = Math.min(foundation.top.w, foundation.top.d);
  // Passive-pressure width uses the actual tapered shell/mantle bottom (narrower),
  // NOT the flared base-plate foot shown as the marketing "Base" dimension — see
  // foundation.shellBottom. Falls back to the base-plate footprint (previous
  // behaviour) only where the shell-bottom dimension hasn't been confirmed yet
  // (currently: NordBase Large).
  const bottomForPassive = foundation.shellBottom || foundation.bottom;
  const bottomShortIn = Math.min(bottomForPassive.w, bottomForPassive.d);
  // Tipping-edge lever arm 'a': the source workbook's cell COMMENT says
  // "top_short/2", but the actual value it calculates with — cross-checked
  // against all four confirmed Nordinfra_Master_USA_ASCE7_v6 workbooks
  // (AC/Small/Medium/Large, 2026-08-21) — is consistently base-plate short
  // side / 2 (i.e. half of foundation.bottom, the flared foot / "Base: W×D"
  // dimension shown to customers), not half the narrower shell-top width.
  // Using the base-plate value here matches Nordinfra's own verified figures
  // exactly (validated to 4 decimal places against the Large workbook).
  const basePlateShortIn = Math.min(foundation.bottom.w, foundation.bottom.d);
  const aM = inToM(basePlateShortIn) / 2;
  const bMedM = (inToM(topShortIn) + inToM(bottomShortIn)) / 2;
  const hM = inToM(foundation.depthIn);
  const FpSoilKn = 0.5 * Kpd * SOIL_UNIT_WEIGHT_KNM3 * Math.pow(hM, 2) * bMedM;
  const MpKnm = FpSoilKn * ((2 * hM) / 3);
  const seismicDeadFactor = 0.9 - 0.2 * sds;
  const MstbWind = GRAVITY_STAB_FACTOR * (WpKn * aM + MpKnm);
  const MstbSeis = seismicDeadFactor * WpKn * aM + MpKnm;
  const slideCapacityKn = 0.9 * FpSoilKn;
  return {
    aM,
    bMedM,
    hM,
    FpSoilKn,
    MpKnm,
    MstbWind,
    MstbSeis,
    slideCapacityKn,
    seismicDeadFactor,
  };
}

function runCheck({
  foundation,
  chargerWidthIn,
  chargerDepthIn,
  chargerHeightIn,
  chargerWeightLb,
  windSpeedMph,
  sds,
  backfill,
  ccIn, // adapter-plate CC spacing (in) — drives the bolt-tension check lever arm; omit/0 to skip that check
}) {
  if (!foundation) return null;
  const w = Number(chargerWidthIn) || 0;
  const d = Number(chargerDepthIn) || 0;
  const h = Number(chargerHeightIn) || 0;
  const cw = Number(chargerWeightLb) || 0;
  const V = Number(windSpeedMph) || 0;
  const SDS = Number(sds) || 0;
  const adapterWeightLb = foundation.adapterPlateWeightLb || 0;

  const wind = calcWind({
    chargerWidthIn: w,
    chargerHeightIn: h,
    windSpeedMph: V,
  });
  const WpKn = lbToKN(foundation.weightLb + adapterWeightLb + cw);
  const seismic = calcSeismic({ WpKn, sds: SDS, zcM: wind.zcM });
  const stability = calcStability({
    foundation,
    Kpd: backfill.Kpd,
    sds: SDS,
    WpKn,
  });
  // Governing (larger) design moment between the wind and seismic load cases —
  // feeds the wall-bending and bolt-tension checks below, mirroring the source
  // workbook's "Governing design moment" row.
  const governingMomentKnm = Math.max(wind.MdWindKnm, seismic.MdSeisKnm);

  const checks = [
    {
      key: "ot-wind",
      label: "Overturning — wind",
      capacity: stability.MstbWind,
      demand: wind.MdWindKnm,
      unit: "kNm",
    },
    {
      key: "sl-wind",
      label: "Sliding — wind",
      capacity: stability.slideCapacityKn,
      demand: wind.FwKn,
      unit: "kN",
    },
    {
      key: "ot-seis",
      label: "Overturning — seismic",
      capacity: stability.MstbSeis,
      demand: seismic.MdSeisKnm,
      unit: "kNm",
    },
    {
      key: "sl-seis",
      label: "Sliding — seismic",
      capacity: stability.slideCapacityKn,
      demand: seismic.FpDesign,
      unit: "kN",
    },
  ];

  // Wall-plate bending — needs a confirmed wall gauge (foundation.wallThicknessMm).
  // Not available yet for NordBase Large, so the check is simply omitted there
  // rather than reported against a guessed thickness.
  if (foundation.wallThicknessMm) {
    const topShortMm = Math.min(foundation.top.w, foundation.top.d) * 25.4;
    const demandMPa =
      (governingMomentKnm * 1e6) /
      (2 * foundation.wallThicknessMm * Math.pow(topShortMm / 2, 2));
    checks.push({
      key: "wall-bending",
      label: "Wall plate bending",
      capacity: STEEL_BENDING_CAPACITY_MPA,
      demand: demandMPa,
      unit: "MPa",
    });
  }

  // Bolt tension (charger/adapter-plate connection) — needs the actual CC spacing
  // the customer selected in Step 2 (it is NOT a fixed value — it depends on the
  // charger). Omitted when there's no adapter-plate connection at all (Bollard)
  // or no CC has been entered yet.
  const ccInNum = Number(ccIn) || 0;
  if (foundation.hasCharger && ccInNum > 0) {
    const pitchM = (ccInNum * 0.0254) / 2; // lever arm = half the bolt CC spacing
    const demandKn = governingMomentKnm / (2 * pitchM);
    checks.push({
      key: "bolt-tension",
      label: `Bolt tension (${BOLT_SPEC_LABEL})`,
      capacity: BOLT_TENSION_CAPACITY_KN,
      demand: demandKn,
      unit: "kN",
    });
  }

  const scoredChecks = checks.map((c) => ({
    ...c,
    dcr: c.capacity > 0 ? c.demand / c.capacity : Infinity,
  }));

  const governing = scoredChecks.reduce(
    (a, b) => (b.dcr > a.dcr ? b : a),
    scoredChecks[0]
  );
  const pass = governing.dcr <= 1.0;

  return {
    wind,
    seismic,
    stability,
    WpKn,
    governingMomentKnm,
    checks: scoredChecks,
    governing,
    pass,
    chargerDepthIn: d,
  };
}

// ---------------------------------------------------------------------------
// POWER BLOCK CALC ENGINE — group-passive-resistance / group-wind-seismic
// checks for a multi-foundation array. Mirrors runCheck()'s shape (same
// checks[]/governing/pass return contract, so the Step-5 report UI works
// unmodified) but implements the group logic validated in
// Nordinfra_PowerBlock_C503_DRAFT_20260827_v3.xlsx. Geometry, bolt counts,
// rivet counts and lever arms come from the SELECTED MODEL (one entry of
// POWER_BLOCK_MODELS, e.g. Kempower C503) — this function is model-driven,
// not foundation-driven, so each model supplies its own confirmed numbers.
// Only call this for a model with dataConfirmed === true.
// ---------------------------------------------------------------------------
function runPowerBlockCheck({ model, windSpeedMph, sds, backfill }) {
  if (!model || !model.dataConfirmed) return null;
  const V = Number(windSpeedMph) || 0;
  const SDS = Number(sds) || 0;
  const unitCount = model.unitCount;
  const charger = model.chargerSpec;
  const plate = model.groupPlate;

  // Single-unit passive soil resistance, from the underlying NordBase Medium
  // geometry — matches "3 - Input & Calcs" of the confirmed per-unit
  // workbook (this IS the same calcStability() used for the standalone
  // Medium foundation elsewhere in this file; WpKn is irrelevant to FpSoilKn
  // so 0 is passed here — the group's own weight is applied further down).
  const singleStability = calcStability({
    foundation: FOUNDATIONS.MEDIUM,
    Kpd: backfill.Kpd,
    sds: SDS,
    WpKn: 0,
  });
  const FpSoilSingleKn = singleStability.FpSoilKn;
  const hM = singleStability.hM;

  // Group efficiency factor η = 1.0 — validated 2026-08-27: for the governing
  // wind-on-cabinet-long-side load case, the 3 foundations sit side-by-side
  // PERPENDICULAR to that load, so their passive-pressure wedges don't
  // shadow each other (consistent with AASHTO/Reese p-y group-reduction-
  // factor literature for laterally-loaded element groups). Converse-Labarre
  // (proposed by an independent second-opinion review) does NOT apply here —
  // that formula is for axial pile-group capacity, a different mechanism
  // from lateral passive-earth resistance on squat, wide-based shells like
  // these. This value is direction-dependent: it would drop toward ~0.4–0.5
  // if gable/short-end wind ever governed instead — that case is not
  // modeled. See claude/PowerBlock_C503_Draft_Calc_20260827.md for the full
  // derivation.
  const ETA_GROUP = 1.0;
  const FpSoilNaiveSumKn = FpSoilSingleKn * unitCount;
  const FpSoilGroupKn = ETA_GROUP * FpSoilNaiveSumKn;

  // Wind — ONE welded cabinet spans the whole group (confirmed by Simon
  // 2026-08-27 — do NOT multiply by unitCount; the width Simon supplied
  // (2000mm) already matches the group's own envelope width, not a single
  // per-slot charger).
  const wind = calcWind({
    chargerWidthIn: charger.widthIn,
    chargerHeightIn: charger.heightIn,
    windSpeedMph: V,
  });

  // Seismic — combined weight = N foundations + 1 shared plate + 1 cabinet
  // (not x unitCount on the plate or the cabinet).
  const WpGroupKn = lbToKN(
    unitCount * FOUNDATIONS.MEDIUM.weightLb + plate.weightLb + charger.weightLb
  );
  const seismic = calcSeismic({ WpKn: WpGroupKn, sds: SDS, zcM: wind.zcM });

  // Stability — tipping lever arm uses the shared plate's own bolt-pattern
  // width (half), not any single foundation's base plate. Short-axis
  // overturning only, matching the xlsx's own flagged simplification —
  // overturning about the long axis / differential effects between units are
  // not modeled.
  const aGroupM = inToM(plate.widthIn) / 2;
  const MpGroupKnm = FpSoilGroupKn * ((2 * hM) / 3);
  const seismicDeadFactor = 0.9 - 0.2 * SDS;
  const MstbWindGroup = GRAVITY_STAB_FACTOR * (WpGroupKn * aGroupM + MpGroupKnm);
  const MstbSeisGroup = seismicDeadFactor * WpGroupKn * aGroupM + MpGroupKnm;
  // Same φ=0.9 resistance factor on passive-earth sliding capacity applied to
  // BOTH load cases, consistent with calcStability() above (the confirmed
  // single-foundation engine uses one slideCapacityKn for wind and seismic
  // alike). This is a deliberate unification, more conservative than the
  // draft xlsx (which used the un-factored value for seismic sliding only) —
  // removes an asymmetry that was never independently reviewed.
  const slideCapacityGroupKn = 0.9 * FpSoilGroupKn;

  const checks = [
    {
      key: "ot-wind",
      label: "Overturning — wind (group)",
      capacity: MstbWindGroup,
      demand: wind.MdWindKnm,
      unit: "kNm",
    },
    {
      key: "sl-wind",
      label: "Sliding — wind (group)",
      capacity: slideCapacityGroupKn,
      demand: wind.FwKn,
      unit: "kN",
    },
    {
      key: "ot-seis",
      label: "Overturning — seismic (group)",
      capacity: MstbSeisGroup,
      demand: seismic.MdSeisKnm,
      unit: "kNm",
    },
    {
      key: "sl-seis",
      label: "Sliding — seismic (group)",
      capacity: slideCapacityGroupKn,
      demand: seismic.FpDesign,
      unit: "kN",
    },
  ];

  const governingMomentKnm = Math.max(wind.MdWindKnm, seismic.MdSeisKnm);

  // Hat-profile rivet connection (one long side) — PLACEHOLDER capacity
  // (model.hatProfile.rivetCapacityEachKn), not yet a manufacturer-confirmed
  // spec value. Conservative simplifying assumption carried from the xlsx:
  // one long side's rivets must carry the full lateral demand of one end
  // unit (group demand / unitCount), direct shear only — moment/
  // eccentricity in the joint is not modeled.
  const hat = model.hatProfile;
  const rivetSideCapacityKn = hat.rivetsPerSide * hat.rivetCapacityEachKn * hat.phi;
  const rivetDemandKn = Math.max(wind.FwKn, seismic.FpDesign) / unitCount;
  checks.push({
    key: "rivet-shear",
    label: "Hat-profile rivet connection — shear",
    capacity: rivetSideCapacityKn,
    demand: rivetDemandKn,
    unit: "kN",
  });

  // Plate-to-foundation and charger-to-plate bolt tension — M12 class 8.8,
  // same φNsa formula as the confirmed M16 spec used elsewhere in this file,
  // scaled to this connection's own bolt spec and each group's measured
  // pitch/lever arm (model.boltGroups).
  const bolts = model.boltGroups;
  const demandPlateToFoundationKn =
    governingMomentKnm / (2 * inToM(bolts.plateToFoundation.pitchIn));
  checks.push({
    key: "bolt-plate-foundation",
    label: `Plate-to-foundation bolts (${bolts.plateToFoundation.count}×${BOLT_M12_SPEC_LABEL.split(" ")[0]}) — tension`,
    capacity: BOLT_M12_TENSION_CAPACITY_KN,
    demand: demandPlateToFoundationKn,
    unit: "kN",
  });

  const demandChargerToPlateKn =
    governingMomentKnm / (2 * inToM(bolts.chargerToPlate.pitchIn));
  checks.push({
    key: "bolt-charger-plate",
    label: `Charger-to-plate bolts (${bolts.chargerToPlate.count}×${BOLT_M12_SPEC_LABEL.split(" ")[0]}) — tension`,
    capacity: BOLT_M12_TENSION_CAPACITY_KN,
    demand: demandChargerToPlateKn,
    unit: "kN",
  });

  const scoredChecks = checks.map((c) => ({
    ...c,
    dcr: c.capacity > 0 ? c.demand / c.capacity : Infinity,
  }));

  const governing = scoredChecks.reduce(
    (a, b) => (b.dcr > a.dcr ? b : a),
    scoredChecks[0]
  );
  const pass = governing.dcr <= 1.0;

  return {
    wind,
    seismic,
    WpKn: WpGroupKn,
    governingMomentKnm,
    checks: scoredChecks,
    governing,
    pass,
    chargerDepthIn: charger.depthIn,
  };
}

// ---------------------------------------------------------------------------
// VISUAL HELPERS
// ---------------------------------------------------------------------------
const brand = {
  dark: "#1B1E23",
  gold: "#C9A227",
  goldSoft: "#E4CE7A",
  steel: "#6B7280",
  bgSoft: "#F6F6F5",
  amber: "#9C5700",
  amberBg: "#FFF2CC",
};

// Schematic side-view diagram (top/bottom footprint + burial depth). Falls
// back to this SVG automatically if FOUNDATIONS[key].photoUrl is unset OR if
// the real photo fails to load (bad path, file not yet uploaded) — so a
// broken asset never shows as a broken-image icon in production.
function FoundationDiagram({ foundation }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  if (foundation.photoUrl && !photoFailed) {
    return (
      <img
        src={foundation.photoUrl}
        alt={foundation.name}
        className="w-full h-36 object-contain"
        onError={() => setPhotoFailed(true)}
      />
    );
  }
  if (!foundation.top || !foundation.bottom) {
    // Power Block: geometry is model-dependent, not a fixed shape on the
    // foundation object itself — show a neutral placeholder rather than
    // crash on a null top/bottom (only reachable if photoUrl is unset or
    // fails to load).
    return (
      <div
        className="w-full h-28 flex items-center justify-center text-[11px]"
        style={{ color: brand.steel }}
      >
        Photo pending
      </div>
    );
  }
  const pxPerIn = 1.1;
  const topShort = Math.min(foundation.top.w, foundation.top.d);
  const bottomShort = Math.min(foundation.bottom.w, foundation.bottom.d);
  const topHalf = (topShort * pxPerIn) / 2;
  const bottomHalf = (bottomShort * pxPerIn) / 2;
  const depthPx = foundation.depthIn * pxPerIn;
  const cx = 60,
    gradeY = 28;
  const points = `${cx - topHalf},${gradeY} ${cx + topHalf},${gradeY} ${
    cx + bottomHalf
  },${gradeY + depthPx} ${cx - bottomHalf},${gradeY + depthPx}`;

  return (
    <svg viewBox={`0 0 120 ${gradeY + depthPx + 10}`} className="w-full h-28">
      {/* soil hatch */}
      <rect x="0" y={gradeY} width="120" height={depthPx + 10} fill="#EDEBE6" />
      {/* grade line */}
      <line
        x1="0"
        y1={gradeY}
        x2="120"
        y2={gradeY}
        stroke={brand.steel}
        strokeWidth="0.6"
        strokeDasharray="2,2"
      />
      {/* foundation body */}
      <polygon
        points={points}
        fill={foundation.preliminary ? "#C7CBD1" : brand.dark}
        opacity={foundation.preliminary ? 0.6 : 1}
      />
      {/* pedestal / bollard above grade */}
      {foundation.hasCharger ? (
        <rect
          x={cx - 3}
          y={gradeY - 16}
          width="6"
          height="16"
          rx="1"
          fill={brand.gold}
        />
      ) : (
        <rect
          x={cx - 2.5}
          y={gradeY - 20}
          width="5"
          height="20"
          rx="2.5"
          fill={brand.gold}
        />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ACCESSORY PHOTOS — same self-serve mechanism as FOUNDATIONS[key].photoUrl:
// drop a real photo in /public and set its path here. Falls back to a plain
// placeholder box (not a fake product photo) until a real one is supplied.
// ---------------------------------------------------------------------------
const BOLLARD_ACCESSORY_PHOTOS = {
  sch10: "/bollard-sch10.png",
  sch40: "/bollard-sch40.png",
  cover: "/bollard-cover.png",
};

// Two-post collision-protection frame. Spec per Complete_Sensor_Pole__IMPERIAL
// drawing: 40.68"x33.68" footprint, ~34 lb total assembly. Frame/pipe/
// reinforcement/brace/spacer are hot-dip galvanized per ASTM A123 as one lot;
// the two SS304 posts are excluded from that lot and are powder-coated OSHA
// safety yellow (RAL 1003), shipped separately.
const SENSOR_POLE_PHOTO = "/sensor-pole.png";

function AccessoryImage({ src, label }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={label}
        className="w-full h-40 object-contain rounded-md border"
        style={{ background: "#FFFFFF", borderColor: "#D9D9D6" }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className="w-full h-40 flex items-center justify-center rounded-md border border-dashed text-[11px]"
      style={{ borderColor: "#D9D9D6", color: brand.steel, background: "#FFFFFF" }}
    >
      {label} — photo pending
    </div>
  );
}

// Dimensioned adapter-plate drawing — square outline with a 4-hole bolt
// pattern drawn live from the customer's selected/custom CC spacing, so they
// can visually verify hole layout before ordering. Renders nothing until both
// a confirmed plate size and a CC value are available.
function AdapterPlateDiagram({ plate, ccWIn, ccDIn }) {
  if (!plate || !ccWIn || ccWIn <= 0 || !ccDIn || ccDIn <= 0) return null;
  const maxPx = 150;
  const scale = maxPx / Math.max(plate.w, plate.d);
  const pw = plate.w * scale;
  const pd = plate.d * scale;
  const ccW = ccWIn * scale; // hole spacing along the plate's width (X) axis
  const ccD = ccDIn * scale; // hole spacing along the plate's depth (Y) axis
  const padL = 34,
    padT = 14,
    padR = 20,
    padB = 26;
  const vbW = pw + padL + padR;
  const vbH = pd + padT + padB;
  const x0 = padL,
    y0 = padT;
  const cx = x0 + pw / 2,
    cy = y0 + pd / 2;
  const holeR = Math.max(2.2, scale * 0.3);
  const holeOffsets = [
    [-ccW / 2, -ccD / 2],
    [ccW / 2, -ccD / 2],
    [ccW / 2, ccD / 2],
    [-ccW / 2, ccD / 2],
  ];
  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full max-w-[220px]"
      style={{ background: "#FAFAF8" }}
    >
      <rect
        x={x0}
        y={y0}
        width={pw}
        height={pd}
        fill="white"
        stroke={brand.dark}
        strokeWidth="1.2"
        rx="2"
      />
      {holeOffsets.map(([dx, dy], i) => (
        <circle
          key={i}
          cx={cx + dx}
          cy={cy + dy}
          r={holeR}
          fill="none"
          stroke={brand.gold}
          strokeWidth="1.5"
        />
      ))}
      <line
        x1={cx - ccW / 2}
        y1={cy - ccD / 2}
        x2={cx + ccW / 2}
        y2={cy - ccD / 2}
        stroke={brand.steel}
        strokeWidth="0.5"
        strokeDasharray="2,2"
      />
      <line
        x1={cx - ccW / 2}
        y1={cy - ccD / 2}
        x2={cx - ccW / 2}
        y2={cy + ccD / 2}
        stroke={brand.steel}
        strokeWidth="0.5"
        strokeDasharray="2,2"
      />
      <text
        x={cx}
        y={cy - ccD / 2 - 3}
        fontSize="7"
        textAnchor="middle"
        fill={brand.steel}
      >
        {ccWIn}"×{ccDIn}" CC
      </text>
      <line
        x1={x0}
        y1={y0 + pd + 8}
        x2={x0 + pw}
        y2={y0 + pd + 8}
        stroke={brand.steel}
        strokeWidth="0.6"
      />
      <text
        x={cx}
        y={y0 + pd + 19}
        fontSize="7.5"
        textAnchor="middle"
        fill={brand.dark}
        fontWeight="700"
      >
        {plate.w}"
      </text>
      <line
        x1={x0 - 8}
        y1={y0}
        x2={x0 - 8}
        y2={y0 + pd}
        stroke={brand.steel}
        strokeWidth="0.6"
      />
      <text
        x={x0 - 14}
        y={cy}
        fontSize="7.5"
        textAnchor="middle"
        fill={brand.dark}
        fontWeight="700"
        transform={`rotate(-90 ${x0 - 14} ${cy})`}
      >
        {plate.d}"
      </text>
    </svg>
  );
}

function Stepper({ step, steps }) {
  return (
    <div className="flex items-center gap-2 mb-8 flex-wrap">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: i <= step ? brand.gold : "#E5E5E3",
                color: i <= step ? brand.dark : "#9CA3AF",
              }}
            >
              {i + 1}
            </div>
            <span
              className="text-xs hidden sm:inline"
              style={{
                color: i <= step ? brand.dark : "#9CA3AF",
                fontWeight: i === step ? 700 : 400,
              }}
            >
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="w-4 sm:w-8 h-px"
              style={{ background: "#D9D9D6" }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Field({ label, hint, children, flag }) {
  return (
    <label className="block mb-5">
      <div
        className="flex items-center gap-1.5 text-sm font-semibold mb-1"
        style={{ color: brand.dark }}
      >
        {label}
        {flag && <AlertTriangle size={12} color={brand.amber} />}
      </div>
      {children}
      {hint && (
        <div className="text-xs mt-1" style={{ color: brand.steel }}>
          {hint}
        </div>
      )}
    </label>
  );
}

function Banner({ children }) {
  return (
    <div
      className="flex items-start gap-2 mt-2 mb-4 p-3 rounded-md text-xs"
      style={{ background: brand.amberBg, color: brand.amber }}
    >
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
const STEP_LABELS = [
  "Project",
  "Foundation",
  "Configuration",
  "Site",
  "Package",
  "Report",
];

export default function NordBaseCalculator() {
  // Resolved once at mount: a `?cfg=` resume link, else a silently
  // auto-saved localStorage draft, else nothing. Every field below falls
  // back to its normal default when neither is present, so this is a
  // no-op for a first-time visitor.
  const [initialConfig] = useState(() => loadInitialConfig());
  const savedData = initialConfig?.data || {};

  const [step, setStep] = useState(
    Math.min(5, Math.max(0, Number(savedData.step) || 0))
  );

  // step 0 — project info
  const [projectName, setProjectName] = useState(savedData.projectName ?? "");
  const [address, setAddress] = useState(savedData.address ?? "");
  const [contactName, setContactName] = useState(savedData.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(savedData.contactEmail ?? "");
  const [quantity, setQuantity] = useState(savedData.quantity ?? "1");

  // step 1 — foundation
  const [foundationKey, setFoundationKey] = useState(savedData.foundationKey ?? null);
  const foundation = foundationKey ? FOUNDATIONS[foundationKey] : null;
  // Manufacturer/model preset set for the SELECTED foundation only (2026-08-26
  // fix — Postlane and other pedestal brands were previously showing up as
  // options on Medium/Large, which don't take a pedestal at all).
  const chargerPresets = chargerPresetsForFoundation(foundation?.key);

  // step 2 — configuration (adapter plate + pedestal) — skipped for BOLLARD
  // Adapter-plate CC spacing (2026-08-26 rework): when a manufacturer/model
  // is picked, its own bolt pattern (CHARGER_PRESETS[...].ccW/ccD) drives the
  // CC automatically IF that exact pattern lands on the grid of holes we've
  // actually drilled (FOUNDATIONS.SMALL.adapterPlate.ccOptionsX/Y) — no more
  // manual button-picking from the grid. `useCustomCc` lets the customer
  // override that auto-fill (or is the only path when no model is selected,
  // or when the model's pattern isn't on the grid yet).
  const [useCustomCc, setUseCustomCc] = useState(savedData.useCustomCc ?? false);
  const [customCcW, setCustomCcW] = useState(savedData.customCcW ?? "");
  const [customCcD, setCustomCcD] = useState(savedData.customCcD ?? "");
  const [presetMfr, setPresetMfr] = useState(savedData.presetMfr ?? "");
  const [presetModel, setPresetModel] = useState(savedData.presetModel ?? "");
  const [chargerW, setChargerW] = useState(savedData.chargerW ?? "");
  const [chargerD, setChargerD] = useState(savedData.chargerD ?? "");
  const [chargerH, setChargerH] = useState(savedData.chargerH ?? "");
  const [chargerWeight, setChargerWeight] = useState(savedData.chargerWeight ?? "");

  // step 3 — site
  const [windSpeed, setWindSpeed] = useState(savedData.windSpeed ?? "110");
  const [sds, setSds] = useState(savedData.sds ?? "0.5");
  const [backfillKey, setBackfillKey] = useState(savedData.backfillKey ?? "B");
  const [nevi, setNevi] = useState(savedData.nevi ?? false);
  const [showSdsRef, setShowSdsRef] = useState(false);

  // step 3 — address-driven SDS auto-fill (Mapbox suggestions, same pattern
  // as Site Planner, + a live USGS ASCE 7-22 lookup). Wind stays manual.
  // Defaults from the project address (step 0) when set and nothing more
  // specific was saved — if the customer already typed their site address
  // on the first screen, don't make them retype it here too.
  const [addressInput, setAddressInput] = useState(
    savedData.addressInput ?? address ?? ""
  );
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressSuggestOpen, setAddressSuggestOpen] = useState(false);
  const [addressHighlightIndex, setAddressHighlightIndex] = useState(-1);
  const addressDebounceRef = useRef(null);
  const [sdsLookupStatus, setSdsLookupStatus] = useState("idle"); // idle | loading | done | error
  const [sdsLookupError, setSdsLookupError] = useState("");
  const [sdsLookupAddress, setSdsLookupAddress] = useState("");
  const [sdsSource, setSdsSource] = useState(savedData.sdsSource ?? "manual"); // manual | usgs

  // step 4 — accessories + package
  const [addBollard, setAddBollard] = useState(savedData.addBollard ?? false);
  const [bollardTier, setBollardTier] = useState(savedData.bollardTier ?? "sch10");
  const [addCover, setAddCover] = useState(savedData.addCover ?? false);
  const [addSensorPole, setAddSensorPole] = useState(savedData.addSensorPole ?? false);
  const [packageType, setPackageType] = useState(savedData.packageType ?? "submittal");
  const [customAssets, setCustomAssets] = useState({
    datasheet: true,
    drawingPdf: true,
    drawingDwg: true,
    csi: false,
    ...(savedData.customAssets || {}),
  });

  // Resume banner — only for a silent localStorage draft. A `?cfg=` link
  // was an explicit click, so it hydrates without asking. Dismissed by
  // either button below.
  const [showResumeBanner, setShowResumeBanner] = useState(
    initialConfig?.source === "draft"
  );
  const [linkCopyStatus, setLinkCopyStatus] = useState("idle"); // idle | copied | error

  // step 5 — report
  const [showDetails, setShowDetails] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsentWarning, setShowConsentWarning] = useState(false);
  const [partnerStateFilter, setPartnerStateFilter] = useState("");
  const [expandedPartnerId, setExpandedPartnerId] = useState(null);

  // cookie consent banner — remembers the visitor's choice in this browser
  // only (localStorage), never sent anywhere. Guarded with try/catch since
  // some browsers/privacy modes throw on storage access.
  const [cookieChoice, setCookieChoice] = useState(null); // null | "accepted" | "declined"
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("nordbase_cookie_consent");
      if (saved === "accepted" || saved === "declined") setCookieChoice(saved);
    } catch (e) {
      /* storage unavailable — banner will just show every visit */
    }
  }, []);
  function setCookieConsent(choice) {
    setCookieChoice(choice);
    try {
      window.localStorage.setItem("nordbase_cookie_consent", choice);
    } catch (e) {
      /* ignore — nothing to persist to */
    }
  }

  // Save & resume — snapshot of every field worth restoring (deliberately
  // excludes transient UI state like dropdown-open flags and lookup status,
  // which re-derive on their own).
  function buildConfigSnapshot() {
    return {
      step,
      projectName,
      address,
      contactName,
      contactEmail,
      quantity,
      foundationKey,
      useCustomCc,
      customCcW,
      customCcD,
      presetMfr,
      presetModel,
      chargerW,
      chargerD,
      chargerH,
      chargerWeight,
      windSpeed,
      sds,
      addressInput,
      sdsSource,
      backfillKey,
      nevi,
      addBollard,
      bollardTier,
      addCover,
      addSensorPole,
      packageType,
      customAssets,
    };
  }

  // Auto-save to localStorage as the customer progresses — silent, recovers
  // an accidentally-closed tab on the same browser. Debounced so typing
  // doesn't hit localStorage on every keystroke. Doesn't start until step 1
  // (foundation chosen) so a visitor who never really started doesn't leave
  // a draft behind.
  useEffect(() => {
    if (step === 0) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify(buildConfigSnapshot())
        );
      } catch (e) {
        /* storage unavailable — autosave silently skipped */
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    projectName,
    address,
    contactName,
    contactEmail,
    quantity,
    foundationKey,
    useCustomCc,
    customCcW,
    customCcD,
    presetMfr,
    presetModel,
    chargerW,
    chargerD,
    chargerH,
    chargerWeight,
    windSpeed,
    sds,
    addressInput,
    sdsSource,
    backfillKey,
    nevi,
    addBollard,
    bollardTier,
    addCover,
    addSensorPole,
    packageType,
    customAssets,
  ]);

  // Explicit "copy resume link" — encodes the same snapshot into a `?cfg=`
  // URL param instead. Works across devices/browsers and can be emailed to
  // a colleague, since the state lives in the link, not on a server.
  function copyResumeLink() {
    const encoded = encodeConfig(buildConfigSnapshot());
    if (!encoded) {
      setLinkCopyStatus("error");
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?cfg=${encoded}`;
    try {
      navigator.clipboard.writeText(url).then(
        () => {
          setLinkCopyStatus("copied");
          setTimeout(() => setLinkCopyStatus("idle"), 2500);
        },
        () => setLinkCopyStatus("error")
      );
    } catch (e) {
      setLinkCopyStatus("error");
    }
  }

  // Site step — address → SDS auto-fill. Debounced suggestions dropdown,
  // same 300ms pattern as Site Planner.
  useEffect(() => {
    return () => {
      if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    };
  }, []);

  function onAddressChange(value) {
    setAddressInput(value);
    setAddressHighlightIndex(-1);
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    if (!value.trim()) {
      setAddressSuggestions([]);
      setAddressSuggestOpen(false);
      return;
    }
    addressDebounceRef.current = setTimeout(async () => {
      const results = await geocodeSuggest(value);
      setAddressSuggestions(results);
      setAddressSuggestOpen(results.length > 0);
    }, 300);
  }

  function onAddressKeyDown(e) {
    if (!addressSuggestOpen || addressSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAddressHighlightIndex((i) =>
        Math.min(i + 1, addressSuggestions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAddressHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && addressHighlightIndex >= 0) {
      e.preventDefault();
      selectAddressSuggestion(addressSuggestions[addressHighlightIndex]);
    } else if (e.key === "Escape") {
      setAddressSuggestOpen(false);
    }
  }

  async function selectAddressSuggestion(s) {
    setAddressInput(s.placeName);
    setAddressSuggestions([]);
    setAddressSuggestOpen(false);
    setSdsLookupStatus("loading");
    setSdsLookupError("");
    try {
      const sdsValue = await fetchSdsFromUsgs(s.lat, s.lon);
      setSds(String(Math.round(sdsValue * 100) / 100));
      setSdsSource("usgs");
      setSdsLookupAddress(s.placeName);
      setSdsLookupStatus("done");
    } catch (err) {
      setSdsLookupStatus("error");
      setSdsLookupError(
        "Couldn't fetch SDS for that address automatically — enter it manually below, or use the USGS link."
      );
    }
  }

  const backfill = BACKFILL_OPTIONS.find((b) => b.key === backfillKey);

  // The selected manufacturer/model's full preset record (dimensions, weight,
  // its own bolt pattern, base-plate size) — null when nothing is picked yet.
  const presetModelData =
    presetMfr && presetModel !== ""
      ? chargerPresets[presetMfr]?.[Number(presetModel)]
      : null;
  const selectedChargerModelName = presetModelData?.model || "";
  // For the Power Block foundation, chargerPresets IS POWER_BLOCK_MODELS
  // (see chargerPresetsForFoundation), so presetModelData already holds the
  // selected model record — aliased here for readable Power Block-specific
  // code below.
  const selectedPowerBlockModel = foundation?.isPowerBlock
    ? presetModelData
    : null;

  // Is the selected model's CC "confirmed" for auto-fill purposes? Two
  // different mechanisms, depending on the foundation:
  //  - SMALL shares ONE pre-drilled "universal" adapter plate with a small
  //    fixed menu of actual hole positions (ccOptionsX/Y) — a model only
  //    counts as confirmed there if its CC lands exactly on one of those
  //    already-drilled holes.
  //  - MEDIUM/LARGE instead get a CUSTOM per-model adapter plate (see
  //    ADAPTER_PLATE_DRAWINGS) — there's no shared hole menu to match
  //    against, so once a model has its own ccW/ccD on file (sourced from
  //    Nordinfra's charger spec sheet / verified CAD drawing), that IS the
  //    confirmation. (Power Block doesn't use this at all — it's gated
  //    separately via selectedPowerBlockModel.dataConfirmed, since several
  //    Power Block models still have an open question about single- vs.
  //    multi-foundation configuration, not just CC.)
  // Simon Gullberg, 2026-08-31: "Vi har CC-mått nu, behöver vi endast ta
  // fram sista detaljen - ritningar" — CC on file is the confirmation for
  // Medium/Large now; the downloadable drawing PDF is a separate, tracked
  // gap (ADAPTER_PLATE_DRAWINGS / the "Download official drawing" UI), not
  // a reason to block the customer from proceeding.
  const usesSharedPlateGrid = foundation?.key === "SMALL";
  const modelCcOnGrid =
    !!presetModelData &&
    presetModelData.ccW != null &&
    presetModelData.ccD != null &&
    (!usesSharedPlateGrid ||
      (!!foundation?.adapterPlate?.ccOptionsX?.includes(presetModelData.ccW) &&
        !!foundation?.adapterPlate?.ccOptionsY?.includes(presetModelData.ccD)));
  const ccAutoFilled = modelCcOnGrid && !useCustomCc;

  const effectiveCcW = ccAutoFilled
    ? presetModelData.ccW
    : Number(customCcW) || 0;
  const effectiveCcD = ccAutoFilled
    ? presetModelData.ccD
    : Number(customCcD) || 0;
  // Bolt-tension check needs a single lever-arm spacing. For a rectangular
  // pattern (width CC !== depth CC) the shorter axis gives the smaller lever
  // arm and therefore the higher (worst-case/conservative) bolt demand, so
  // that's what feeds the structural check below.
  const effectiveCc =
    effectiveCcW > 0 && effectiveCcD > 0
      ? Math.min(effectiveCcW, effectiveCcD)
      : 0;

  // Official (real, dimensioned) adapter-plate drawing for the selected
  // foundation + charger manufacturer/model — see ADAPTER_PLATE_DRAWINGS
  // above. Falls back to the shared "universal" plate drawing (NordBase
  // Small today) when no manufacturer/model is selected yet.
  const officialDrawingUrl = foundation?.key
    ? selectedChargerModelName
      ? ADAPTER_PLATE_DRAWINGS[
          adapterDrawingKey(foundation.key, presetMfr, selectedChargerModelName)
        ]
      : ADAPTER_PLATE_DRAWINGS[universalAdapterDrawingKey(foundation.key)]
    : undefined;

  const result = useMemo(() => {
    if (foundation?.isPowerBlock) {
      // C501 ("isStandardSingle") never reaches here — selecting it switches
      // foundationKey to MEDIUM directly (see the Configuration step below).
      // No model picked yet, or a model whose hardware isn't confirmed yet
      // (e.g. C502) — nothing to calculate, not fabricated.
      if (!selectedPowerBlockModel || !selectedPowerBlockModel.dataConfirmed) {
        return null;
      }
      return runPowerBlockCheck({
        model: selectedPowerBlockModel,
        windSpeedMph: windSpeed,
        sds,
        backfill,
      });
    }
    if (!foundation || !foundation.hasCharger) {
      if (foundation && !foundation.hasCharger) {
        // Bollard: no charger wind load, but still check the bare foundation
        // against wind/seismic using the pole's own nominal geometry as a
        // conservative stand-in accessory load (bollard pole, negligible wind area).
        return runCheck({
          foundation,
          chargerWidthIn: 4,
          chargerDepthIn: 4,
          chargerHeightIn: 42,
          chargerWeightLb: 15,
          windSpeedMph: windSpeed,
          sds,
          backfill,
        });
      }
      return null;
    }
    return runCheck({
      foundation,
      chargerWidthIn: chargerW,
      chargerDepthIn: chargerD,
      chargerHeightIn: chargerH,
      chargerWeightLb: chargerWeight,
      windSpeedMph: windSpeed,
      sds,
      backfill,
      ccIn: effectiveCc,
    });
  }, [
    foundation,
    chargerW,
    chargerD,
    chargerH,
    chargerWeight,
    windSpeed,
    sds,
    backfill,
    effectiveCc,
    selectedPowerBlockModel,
  ]);

  // ---- step visibility / skip logic -----------------------------------
  const skipConfig = foundation && !foundation.hasCharger;
  function goNext() {
    if (step === 1 && skipConfig) {
      setStep(3);
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  }
  function goBack() {
    if (step === 3 && skipConfig) {
      setStep(1);
      return;
    }
    if (step === 0) {
      reset();
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  }

  const canNext = [
    true, // project info optional
    !!foundation,
    foundation?.isPowerBlock
      ? !!selectedPowerBlockModel && selectedPowerBlockModel.dataConfirmed // C501 redirects away; C502 (unconfirmed) blocks here until Nordinfra supplies hardware data
      : skipConfig
      ? true
      : !!chargerW &&
        !!chargerD &&
        !!chargerH &&
        !!chargerWeight &&
        !!effectiveCc,
    !!windSpeed && !!sds,
    true,
    false,
  ];

  // Fields specific to ONE piece of equipment — foundation choice, its
  // manufacturer/model/adapter-plate config, and its accessories/package.
  // Shared by both a full reset and "make another configuration" below.
  function clearFoundationSpecificFields() {
    setFoundationKey(null);
    setUseCustomCc(false);
    setCustomCcW("");
    setCustomCcD("");
    setPresetMfr("");
    setPresetModel("");
    setChargerW("");
    setChargerD("");
    setChargerH("");
    setChargerWeight("");
    setAddBollard(false);
    setBollardTier("sch10");
    setAddCover(false);
    setAddSensorPole(false);
    setPackageType("submittal");
  }

  function reset() {
    setStep(0);
    setProjectName("");
    setAddress("");
    setContactName("");
    setContactEmail("");
    setQuantity("1");
    clearFoundationSpecificFields();
    setWindSpeed("110");
    setSds("0.5");
    setAddressInput("");
    setAddressSuggestions([]);
    setAddressSuggestOpen(false);
    setSdsLookupStatus("idle");
    setSdsLookupError("");
    setSdsSource("manual");
    setBackfillKey("B");
    setNevi(false);
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      /* storage unavailable — nothing to clear */
    }
  }

  // "Make another configuration" — same project, same site. A project often
  // has more than one foundation (bollards + a DC fast charger, say), so
  // wind/SDS/address/backfill describe the SITE and carry over; only the
  // equipment-specific fields reset, and we jump straight to Foundation.
  function startNewConfiguration() {
    clearFoundationSpecificFields();
    setShowDetails(false);
    setConsentGiven(false);
    setShowConsentWarning(false);
    setStep(1);
  }

  function applyPreset(mfr, modelIdx) {
    const m = chargerPresets[mfr][modelIdx];
    setChargerW(String(m.w));
    setChargerD(String(m.d));
    setChargerH(String(m.h));
    setChargerWeight(String(m.weight));
    // Every new model selection starts fresh in auto-fill/banner mode —
    // don't carry over a manual CC override from a previously selected model.
    setUseCustomCc(false);
    setCustomCcW("");
    setCustomCcD("");
  }

  const PACKAGE_TYPES = {
    submittal: {
      label: "Submittal",
      desc: "Single compiled PDF · for AHJ or engineer of record",
      contents: [
        "Cover Sheet",
        "Product Data Sheet",
        "Calc Report",
        "References",
        "Foundation Detail Drawing",
      ],
    },
    specification: {
      label: "Specification",
      desc: "Zip · for incorporation into project specs",
      contents: [
        { name: "Calc File (Cover + Calc Report + References, PDF)" },
        { name: "Product Data Sheet (PDF)" },
        { name: "Foundation Detail Drawing (PDF)" },
        { name: "Foundation Detail Drawing (DWG)" },
        { name: "CSI Specification (DOCX)", comingSoon: true },
      ],
    },
    custom: { label: "Custom", desc: "Zip · choose included assets" },
  };

  function buildMailto() {
    if (!result) return "#";
    const to = "info@nord-infra.com";
    const subject = `NordBase calc — ${contactName || "Customer"} — ${
      foundation?.name || ""
    }`;
    const lines = [
      `${contactName || "(name not provided)"} (${
        contactEmail || "email not provided"
      }) has run a calculation on the following:`,
      "",
      `Project: ${projectName || "-"}`,
      `Address: ${address || "-"}`,
      `Quantity: ${quantity}`,
      `Foundation: ${foundation?.name || "-"} (${
        foundation?.levelLabel || "-"
      })`,
      foundation?.isPowerBlock && selectedPowerBlockModel
        ? `Charger: ${selectedPowerBlockModel.chargerSpec.manufacturer} ${selectedPowerBlockModel.chargerSpec.model} (fixed, ${selectedPowerBlockModel.unitCount}-foundation array)`
        : foundation?.hasCharger
        ? `Charger: ${chargerW}"×${chargerD}"×${chargerH}", ${chargerWeight} lb`
        : "",
      foundation?.hasCharger && !foundation?.isPowerBlock
        ? `Adapter plate CC: ${effectiveCcW}"×${effectiveCcD}"`
        : "",
      `Wind speed: ${windSpeed} mph  |  SDS: ${sds} g`,
      `Backfill: ${backfill.label}`,
      `Governing check: ${result.governing.label} — DCR ${(
        result.governing.dcr * 100
      ).toFixed(0)}% (${result.pass ? "OK" : "REVIEW"})`,
      addBollard
        ? `Bollard add-on: ${
            bollardTier === "sch10" ? "Schedule 10" : "Schedule 40 (Duplex)"
          }${foundation?.hasCharger ? " + standalone NordBase Bollard foundation" : ""}${
            addCover ? " + cover" : ""
          }`
        : "",
      addSensorPole ? "Sensor pole (collision-protection frame): yes" : "",
      `Package: ${PACKAGE_TYPES[packageType].label}`,
      nevi ? "NEVI/BABA certificate: yes" : "",
    ].filter(Boolean);
    return `mailto:${to}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(lines.join("\n"))}`;
  }

  return (
    <div className="min-h-screen" style={{ background: brand.bgSoft }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="print:hidden flex items-center gap-3 mb-8 flex-wrap">
          {/* logo-nav-dark.png was replaced 2026-08-25 with a properly
              padded export (the previous file had zero right-hand margin,
              clipping the final "a" in "Nordinfra" inside the image itself). */}
          <img
            src="/logo/logo-nav-dark.png"
            alt="Nordinfra"
            className="h-10 w-auto shrink-0"
          />
          <div className="h-8 w-px shrink-0 bg-black/10" />
          <div>
            <div
              className="text-xs font-bold tracking-widest"
              style={{ color: brand.gold }}
            >
              NORDBASE
            </div>
            <div
              className="text-xl font-bold"
              style={{ color: brand.dark, fontFamily: "Georgia, serif" }}
            >
              Foundation Selector
            </div>
          </div>
          <div className="ml-auto">
            <span
              className="text-xs px-2 py-1 rounded"
              style={{ background: brand.amberBg, color: brand.amber }}
            >
              PROTOTYPE — verify against Nordinfra's PE before production use
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 print:shadow-none print:p-0">
          {showResumeBanner && (
            <div
              className="print:hidden flex items-start gap-3 mb-4 p-3 rounded-md text-sm"
              style={{ background: brand.bgSoft }}
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: brand.gold }} />
              <div className="flex-1">
                Resumed your saved configuration from earlier (step{" "}
                {STEP_LABELS[step]}).
              </div>
              <button
                onClick={() => {
                  setShowResumeBanner(false);
                  reset();
                }}
                className="text-xs underline shrink-0"
                style={{ color: brand.steel }}
              >
                Start over instead
              </button>
              <button
                onClick={() => setShowResumeBanner(false)}
                aria-label="Dismiss"
                className="shrink-0"
                style={{ color: brand.steel }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="print:hidden flex items-center justify-between gap-3 mb-2 flex-wrap">
            <Stepper step={step} steps={STEP_LABELS} />
            {step >= 1 && (
              <button
                onClick={copyResumeLink}
                className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md border shrink-0 mb-8"
                style={{ borderColor: "#D9D9D6", color: brand.dark }}
              >
                {linkCopyStatus === "copied" ? (
                  <>
                    <CheckCircle2 size={12} style={{ color: brand.gold }} />
                    Link copied
                  </>
                ) : linkCopyStatus === "error" ? (
                  "Couldn't copy — try again"
                ) : (
                  <>
                    <Link2 size={12} /> Save & copy resume link
                  </>
                )}
              </button>
            )}
          </div>

          {/* STEP 0 — PROJECT INFO */}
          {step === 0 && (
            <div>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: brand.dark }}
              >
                Project information
              </h2>
              <p className="text-sm mb-6" style={{ color: brand.steel }}>
                Used on the report cover sheet and in the lead email to
                Nordinfra. Nothing here is required to continue.
              </p>
              <div className="grid sm:grid-cols-2 gap-x-4">
                <Field label="Project name">
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#D9D9D6" }}
                  />
                </Field>
                <Field label="Number of foundations">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#D9D9D6" }}
                  />
                </Field>
                <Field label="Project address">
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, city, state, ZIP"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#D9D9D6" }}
                  />
                </Field>
                <Field label="Contact name">
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#D9D9D6" }}
                  />
                </Field>
                <Field
                  label="Email"
                  hint="Only used on the report cover sheet — never sent anywhere unless you click send yourself."
                >
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#D9D9D6" }}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 1 — FOUNDATION PICKER */}
          {step === 1 && (
            <div>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: brand.dark }}
              >
                Select foundation
              </h2>
              <p className="text-sm mb-6" style={{ color: brand.steel }}>
                The foundation is chosen before the charger/adapter plate — it
                determines which adapter plates are available in the next step.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {FOUNDATION_ORDER.map((key) => {
                  const f = FOUNDATIONS[key];
                  const selected = foundationKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setFoundationKey(key)}
                      className="text-left border rounded-md p-3 transition"
                      style={{
                        borderColor: selected ? brand.gold : "#D9D9D6",
                        background: selected ? "#FBF7EA" : "white",
                      }}
                    >
                      <FoundationDiagram foundation={f} />
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="font-bold text-sm"
                          style={{ color: brand.dark }}
                        >
                          {f.name}
                        </span>
                        {f.preliminary && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              background: brand.amberBg,
                              color: brand.amber,
                            }}
                          >
                            Preliminary
                          </span>
                        )}
                      </div>
                      <div
                        className="text-xs font-semibold mt-0.5"
                        style={{ color: brand.gold }}
                      >
                        {f.levelLabel} — {f.levelDesc}
                      </div>
                      <p
                        className="text-xs mt-1.5 leading-snug"
                        style={{ color: brand.steel }}
                      >
                        {f.blurb}
                      </p>
                      {f.isPowerBlock ? (
                        <div
                          className="text-[11px] mt-2"
                          style={{ color: brand.steel }}
                        >
                          Dimensions depend on model — pick one in the next
                          step
                        </div>
                      ) : (
                        <div
                          className="text-[11px] mt-2 grid grid-cols-3 gap-1"
                          style={{ color: brand.steel }}
                        >
                          <div>
                            Top: {f.top.w}"×{f.top.d}"
                          </div>
                          <div>
                            Base: {f.bottom.w}"×{f.bottom.d}"
                          </div>
                          <div>Depth: {f.depthIn}"</div>
                        </div>
                      )}
                      {/* Reference-photo row — chargerFit (Small/Medium/Large,
                          with a max-footprint caption) or a plain top-level
                          refPhotoUrl (Bollard/Power Block, no charger-fit
                          sizing since Bollard has no charger and Power
                          Block's size depends on the model chosen next). */}
                      {(f.chargerFit?.refPhotoUrl || f.refPhotoUrl) && (
                        <div
                          className="flex items-center gap-2 mt-2 pt-2 border-t"
                          style={{ borderColor: "#F0F0EE" }}
                        >
                          {f.chargerFit?.refPhotoUrl && (
                            <img
                              src={f.chargerFit.refPhotoUrl}
                              alt={`Reference charger sized for ${f.name}`}
                              className="w-10 h-10 object-contain shrink-0 rounded"
                              style={{ background: brand.bgSoft }}
                            />
                          )}
                          {f.chargerFit?.refPhotoUrl2 && (
                            <img
                              src={f.chargerFit.refPhotoUrl2}
                              alt={`Additional reference charger sized for ${f.name}`}
                              className="w-10 h-10 object-contain shrink-0 rounded"
                              style={{ background: brand.bgSoft }}
                            />
                          )}
                          {!f.chargerFit && f.refPhotoUrl && (
                            <img
                              src={f.refPhotoUrl}
                              alt={`Reference photo for ${f.name}`}
                              className="w-10 h-10 object-contain shrink-0 rounded"
                              style={{ background: brand.bgSoft }}
                            />
                          )}
                          <div className="text-[11px] leading-snug" style={{ color: brand.steel }}>
                            {f.chargerFit ? (
                              f.chargerFit.maxWIn ? (
                                <>
                                  Fits chargers up to ~{f.chargerFit.maxWIn}"×
                                  {f.chargerFit.maxDIn}"×{f.chargerFit.maxHIn}"
                                  (W×D×H)
                                </>
                              ) : (
                                "Reference size — max charger footprint TBD"
                              )
                            ) : (
                              "Reference photo"
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {foundation?.structuralNote && (
                <Banner>{foundation.structuralNote}</Banner>
              )}
            </div>
          )}

          {/* STEP 2 — CONFIGURATION (adapter plate + charger) */}
          {step === 2 && foundation && !skipConfig && !foundation.isPowerBlock && (
            <div>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: brand.dark }}
              >
                Adapter plate &amp; charger
              </h2>
              <p className="text-sm mb-6" style={{ color: brand.steel }}>
                Pick a manufacturer/model first — it fills in the pedestal's
                dimensions and, where we have a confirmed hole pattern, the
                adapter-plate bolt spacing below.
              </p>

              <div
                className="text-sm font-semibold mb-2"
                style={{ color: brand.dark }}
              >
                Charger / pedestal — dimensions
              </div>
              <div className="flex gap-2 mb-4">
                <select
                  value={presetMfr}
                  onChange={(e) => {
                    setPresetMfr(e.target.value);
                    setPresetModel("");
                    setUseCustomCc(false);
                    setCustomCcW("");
                    setCustomCcD("");
                  }}
                  className="border rounded-md px-3 py-2 text-sm flex-1"
                  style={{ borderColor: "#D9D9D6" }}
                >
                  <option value="">Quick-fill manufacturer (optional)…</option>
                  {Object.keys(chargerPresets).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                {presetMfr && chargerPresets[presetMfr]?.length > 0 && (
                  <select
                    value={presetModel}
                    onChange={(e) => {
                      setPresetModel(e.target.value);
                      applyPreset(presetMfr, Number(e.target.value));
                    }}
                    className="border rounded-md px-3 py-2 text-sm flex-1"
                    style={{ borderColor: "#D9D9D6" }}
                  >
                    <option value="">Model…</option>
                    {chargerPresets[presetMfr].map((m, i) => (
                      <option key={m.model} value={i}>
                        {m.model}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {presetMfr && chargerPresets[presetMfr]?.length === 0 && (
                <div
                  className="text-xs mb-4 -mt-2"
                  style={{ color: brand.steel }}
                >
                  Models for {presetMfr} aren't on file yet — enter its
                  dimensions manually below, or contact Nord-Infra to confirm
                  compatibility.
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Width (in)">
                  <input
                    type="number"
                    value={chargerW}
                    onChange={(e) => setChargerW(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#D9D9D6" }}
                  />
                </Field>
                <Field label="Depth (in)">
                  <input
                    type="number"
                    value={chargerD}
                    onChange={(e) => setChargerD(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#D9D9D6" }}
                  />
                </Field>
                <Field label="Height (in)">
                  <input
                    type="number"
                    value={chargerH}
                    onChange={(e) => setChargerH(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#D9D9D6" }}
                  />
                </Field>
                <Field label="Weight (lb)">
                  <input
                    type="number"
                    value={chargerWeight}
                    onChange={(e) => setChargerWeight(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#D9D9D6" }}
                  />
                </Field>
              </div>
              {presetModelData?.basePlateW && presetModelData?.basePlateD && (
                <div className="text-xs mt-2" style={{ color: brand.steel }}>
                  Pedestal base plate ({selectedChargerModelName}):{" "}
                  <span style={{ fontWeight: 700, color: brand.dark }}>
                    {presetModelData.basePlateW}"×{presetModelData.basePlateD}
                    "
                  </span>{" "}
                  — per manufacturer spec, informational only.
                </div>
              )}

              <div className="h-px my-5" style={{ background: "#F0F0EE" }} />

              <div
                className="text-sm font-semibold mb-2"
                style={{ color: brand.dark }}
              >
                Adapter plate — bolt spacing (CC)
              </div>

              {presetModelData && modelCcOnGrid && !useCustomCc && (
                <div
                  className="mb-3 flex items-start justify-between gap-3 rounded-md border px-3 py-2.5"
                  style={{ borderColor: brand.gold, background: "#FBF6E8" }}
                >
                  <div className="text-xs" style={{ color: brand.dark }}>
                    <span className="font-semibold">
                      ✓ Bolt pattern for {selectedChargerModelName}:{" "}
                      {presetModelData.ccW}"×{presetModelData.ccD}" CC
                    </span>
                    <br />
                    Matches a hole position we've confirmed on the adapter
                    plate — filled in automatically.
                  </div>
                  <button
                    onClick={() => setUseCustomCc(true)}
                    className="text-xs font-semibold whitespace-nowrap underline"
                    style={{ color: brand.steel }}
                  >
                    Enter custom measurement
                  </button>
                </div>
              )}

              {presetModelData && !modelCcOnGrid && !useCustomCc && (
                <Banner>
                  <span className="font-semibold">
                    We don't have a confirmed adapter-plate hole pattern for{" "}
                    {selectedChargerModelName} yet.
                  </span>{" "}
                  Please contact Nord-Infra to verify compatibility before
                  ordering.{" "}
                  <button
                    onClick={() => setUseCustomCc(true)}
                    className="font-semibold underline"
                  >
                    Enter a measured CC instead
                  </button>
                </Banner>
              )}

              {(!presetModelData || useCustomCc) && (
                <>
                  {presetModelData && (
                    <div
                      className="text-xs mb-2 flex items-center justify-between"
                      style={{ color: brand.steel }}
                    >
                      <span>Enter the width/depth CC you've measured.</span>
                      {modelCcOnGrid && (
                        <button
                          onClick={() => setUseCustomCc(false)}
                          className="font-semibold underline whitespace-nowrap ml-2"
                        >
                          Use confirmed pattern instead
                        </button>
                      )}
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4 mb-3">
                    <div>
                      <div
                        className="text-xs font-semibold mb-1.5"
                        style={{ color: brand.dark }}
                      >
                        Width (X) CC
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={customCcW}
                        onChange={(e) => setCustomCcW(e.target.value)}
                        placeholder="Width CC, e.g. 8.5"
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        style={{ borderColor: "#D9D9D6" }}
                      />
                    </div>
                    <div>
                      <div
                        className="text-xs font-semibold mb-1.5"
                        style={{ color: brand.dark }}
                      >
                        Depth (Y) CC
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={customCcD}
                        onChange={(e) => setCustomCcD(e.target.value)}
                        placeholder="Depth CC, e.g. 5"
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        style={{ borderColor: "#D9D9D6" }}
                      />
                    </div>
                  </div>
                </>
              )}

              {foundation.adapterPlate.note && (
                <Banner>{foundation.adapterPlate.note}</Banner>
              )}
              {foundation.adapterPlate.size && (
                <div className="text-xs mb-2" style={{ color: brand.steel }}>
                  Plate: {foundation.adapterPlate.size.w}"×
                  {foundation.adapterPlate.size.d}",{" "}
                  {foundation.adapterPlate.thicknessIn}" thick,{" "}
                  {foundation.adapterPlate.material}
                </div>
              )}
              {officialDrawingUrl && (
                <div
                  className="mb-4 flex items-center justify-between rounded-md border px-3 py-2.5"
                  style={{ borderColor: brand.gold, background: "#FBF6E8" }}
                >
                  <div className="text-xs" style={{ color: brand.dark }}>
                    <span className="font-semibold">
                      ✓ Official manufacturer drawing available
                    </span>
                    <br />
                    Dimensioned PDF — verified more accurate than the preview
                    sketch below.
                  </div>
                  <a
                    href={officialDrawingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold px-3 py-1.5 rounded-md whitespace-nowrap"
                    style={{ background: brand.gold, color: brand.dark }}
                  >
                    Download PDF
                  </a>
                </div>
              )}
              {foundation.adapterPlate.size &&
                effectiveCcW > 0 &&
                effectiveCcD > 0 && (
                <div className="mb-4">
                  <div
                    className="text-xs font-semibold mb-1"
                    style={{ color: brand.dark }}
                  >
                    {officialDrawingUrl
                      ? "Preview sketch (for reference — see official drawing above)"
                      : "Adapter plate drawing — verify hole spacing"}
                  </div>
                  <AdapterPlateDiagram
                    plate={foundation.adapterPlate.size}
                    ccWIn={effectiveCcW}
                    ccDIn={effectiveCcD}
                  />
                  {!officialDrawingUrl && (
                    <div
                      className="text-xs mt-1"
                      style={{ color: brand.steel }}
                    >
                      Generated from your CC spacing — not yet an official
                      manufacturer drawing. Contact Nordinfra to confirm
                      before fabrication.
                    </div>
                  )}
                </div>
              )}
              {foundation.wallThicknessMm && (
                <div className="text-xs mb-4" style={{ color: brand.steel }}>
                  Foundation shell: {foundation.wallThicknessMm}mm ASTM A1011
                  SS Gr 33 + ZM115 · Base plate: {foundation.basePlateType} ·
                  Charger bolts: {BOLT_SPEC_LABEL}
                </div>
              )}
            </div>
          )}

          {/* STEP 2 (Power Block variant) — manufacturer/model dropdown,
              same pattern as the charger picker used elsewhere (see
              chargerPresetsForFoundation → POWER_BLOCK_MODELS). Each model
              branches to its own state: C501 redirects to the plain
              NordBase Medium flow, C502 shows geometry only pending
              hardware data, C503 shows the full confirmed configuration. */}
          {step === 2 && foundation && foundation.isPowerBlock && (
            <div>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: brand.dark }}
              >
                Power Block — manufacturer &amp; model
              </h2>
              <p className="text-sm mb-4" style={{ color: brand.steel }}>
                Nordinfra's concept solution for bigger units, such as
                satellite/power units for EV DC fast charging and MCS.
              </p>

              <div className="flex gap-2 mb-4">
                <select
                  value={presetMfr}
                  onChange={(e) => {
                    setPresetMfr(e.target.value);
                    setPresetModel("");
                  }}
                  className="border rounded-md px-3 py-2 text-sm flex-1"
                  style={{ borderColor: "#D9D9D6" }}
                >
                  <option value="">Manufacturer…</option>
                  {Object.keys(chargerPresets).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                {presetMfr && chargerPresets[presetMfr]?.length > 0 && (
                  <select
                    value={presetModel}
                    onChange={(e) => setPresetModel(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm flex-1"
                    style={{ borderColor: "#D9D9D6" }}
                  >
                    <option value="">Model…</option>
                    {chargerPresets[presetMfr].map((m, i) => (
                      <option key={m.model} value={i}>
                        {m.model}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {!selectedPowerBlockModel && (
                <div className="text-xs" style={{ color: brand.steel }}>
                  Pick a manufacturer and model to continue.
                </div>
              )}

              {selectedPowerBlockModel?.isStandardSingle && (
                <div
                  className="mb-4 rounded-md border px-3 py-2.5"
                  style={{ borderColor: brand.gold, background: "#FBF6E8" }}
                >
                  <div className="text-xs" style={{ color: brand.dark }}>
                    <span className="font-semibold">
                      {presetMfr} {selectedPowerBlockModel.model} is a single
                      NordBase Medium foundation
                    </span>
                    <br />
                    No group hardware — this is the standard single-unit
                    product. Continue there for charger dimensions and
                    adapter-plate CC spacing.
                  </div>
                  <button
                    onClick={() => setFoundationKey("MEDIUM")}
                    className="text-xs font-semibold mt-2 px-3 py-1.5 rounded-md"
                    style={{ background: brand.gold, color: brand.dark }}
                  >
                    Use NordBase Medium foundation
                  </button>
                </div>
              )}

              {selectedPowerBlockModel &&
                !selectedPowerBlockModel.isStandardSingle && (
                <>
                  {!selectedPowerBlockModel.configPending && (
                  <div
                    className="border rounded-md p-4 mb-4"
                    style={{ borderColor: "#D9D9D6" }}
                  >
                    <div
                      className="text-sm font-semibold mb-2"
                      style={{ color: brand.dark }}
                    >
                      {presetMfr} {selectedPowerBlockModel.model} —{" "}
                      {selectedPowerBlockModel.unitCount}-foundation array
                    </div>
                    <div
                      className="text-xs grid grid-cols-3 gap-2"
                      style={{ color: brand.steel }}
                    >
                      <div>
                        Top:{" "}
                        <span style={{ color: brand.dark, fontWeight: 600 }}>
                          {selectedPowerBlockModel.top.w.toFixed(1)}"×
                          {selectedPowerBlockModel.top.d.toFixed(1)}"
                        </span>
                      </div>
                      <div>
                        Base:{" "}
                        <span style={{ color: brand.dark, fontWeight: 600 }}>
                          {selectedPowerBlockModel.bottom.w.toFixed(1)}"×
                          {selectedPowerBlockModel.bottom.d.toFixed(1)}"
                        </span>
                      </div>
                      <div>
                        Depth:{" "}
                        <span style={{ color: brand.dark, fontWeight: 600 }}>
                          {foundation.depthIn}"
                        </span>
                      </div>
                    </div>
                  </div>
                  )}

                  {selectedPowerBlockModel.configPending && (
                    <div
                      className="border rounded-md p-4 mb-4"
                      style={{ borderColor: "#D9D9D6" }}
                    >
                      <div
                        className="text-sm font-semibold"
                        style={{ color: brand.dark }}
                      >
                        {presetMfr} {selectedPowerBlockModel.model}
                      </div>
                      <div className="text-xs mt-1" style={{ color: brand.steel }}>
                        Foundation count and array layout not yet
                        determined — see note below.
                      </div>
                    </div>
                  )}

                  {selectedPowerBlockModel.conceptPhotoUrl && (
                    <img
                      src={selectedPowerBlockModel.conceptPhotoUrl}
                      alt={`${presetMfr} ${selectedPowerBlockModel.model} on NordBase Power Block`}
                      className="w-full max-w-xs rounded-md border mb-4"
                      style={{ borderColor: "#D9D9D6" }}
                    />
                  )}

                  {selectedPowerBlockModel.chargerSpec && (
                    <div
                      className="border rounded-md p-4 mb-4"
                      style={{ borderColor: "#D9D9D6" }}
                    >
                      <div
                        className="text-sm font-semibold mb-2"
                        style={{ color: brand.dark }}
                      >
                        Charger cabinet
                      </div>
                      <div
                        className="text-xs grid grid-cols-2 sm:grid-cols-4 gap-2"
                        style={{ color: brand.steel }}
                      >
                        <div>
                          Width:{" "}
                          <span style={{ color: brand.dark, fontWeight: 600 }}>
                            {selectedPowerBlockModel.chargerSpec.widthIn.toFixed(1)}"
                          </span>
                        </div>
                        <div>
                          Depth:{" "}
                          <span style={{ color: brand.dark, fontWeight: 600 }}>
                            {selectedPowerBlockModel.chargerSpec.depthIn.toFixed(1)}"
                          </span>
                        </div>
                        <div>
                          Height:{" "}
                          <span style={{ color: brand.dark, fontWeight: 600 }}>
                            {selectedPowerBlockModel.chargerSpec.heightIn.toFixed(1)}"
                          </span>
                        </div>
                        <div>
                          Weight:{" "}
                          <span style={{ color: brand.dark, fontWeight: 600 }}>
                            {selectedPowerBlockModel.chargerSpec.weightLb != null
                              ? `${selectedPowerBlockModel.chargerSpec.weightLb.toFixed(0)} lb`
                              : "Not specified"}
                          </span>
                        </div>
                      </div>
                      {!selectedPowerBlockModel.configPending && (
                        <div className="text-xs mt-2" style={{ color: brand.steel }}>
                          Per Kempower Power Unit C500 datasheet. One welded
                          cabinet spans all {selectedPowerBlockModel.unitCount}{" "}
                          foundations — not {selectedPowerBlockModel.unitCount}{" "}
                          separate charger units.
                        </div>
                      )}
                      {selectedPowerBlockModel.configPending && (
                        <div className="text-xs mt-2" style={{ color: brand.steel }}>
                          Per manufacturer datasheet. Foundation count (single
                          vs. multi-unit array) not yet determined — see note
                          below.
                        </div>
                      )}
                    </div>
                  )}

                  {selectedPowerBlockModel.configPending && (
                    <Banner>
                      <span className="font-semibold">
                        Foundation configuration for {presetMfr}{" "}
                        {selectedPowerBlockModel.model} is not yet confirmed
                        by Nordinfra.
                      </span>{" "}
                      Cabinet dimensions above are from the manufacturer's
                      datasheet, but whether this unit mounts on a single
                      NordBase foundation (like C501) or requires a
                      multi-foundation hat-profile group (like C503) is a
                      structural engineering decision pending Nordinfra PE
                      review — added 2026-08-31, preliminary. Contact
                      Nordinfra for a manual assessment before specifying this
                      model.
                    </Banner>
                  )}

                  {!selectedPowerBlockModel.dataConfirmed &&
                    !selectedPowerBlockModel.configPending && (
                    <Banner>
                      <span className="font-semibold">
                        Structural data for {presetMfr}{" "}
                        {selectedPowerBlockModel.model} is not yet confirmed.
                      </span>{" "}
                      Hat-profile rivet count, bolt pattern, and adapter-plate
                      size are still pending (cabinet dimensions above are
                      already confirmed). Contact Nordinfra for a manual
                      assessment in the meantime.
                    </Banner>
                  )}

                  {selectedPowerBlockModel.dataConfirmed && (
                    <div
                      className="border rounded-md p-4 mb-4"
                      style={{ borderColor: "#D9D9D6" }}
                    >
                      <div
                        className="text-sm font-semibold mb-2"
                        style={{ color: brand.dark }}
                      >
                        Shared adapter plate
                      </div>
                      <div className="text-xs" style={{ color: brand.steel }}>
                        {selectedPowerBlockModel.groupPlate.widthIn.toFixed(1)}" ×{" "}
                        {selectedPowerBlockModel.groupPlate.heightIn.toFixed(1)}",{" "}
                        {selectedPowerBlockModel.groupPlate.thicknessMm}mm thick
                      </div>
                      <div className="text-xs mt-1" style={{ color: brand.steel }}>
                        {selectedPowerBlockModel.groupPlate.material}
                      </div>
                      <div
                        className="text-xs mt-2 grid grid-cols-2 gap-2"
                        style={{ color: brand.steel }}
                      >
                        <div>
                          Plate → foundations:{" "}
                          <span style={{ color: brand.dark, fontWeight: 600 }}>
                            {selectedPowerBlockModel.boltGroups.plateToFoundation.count}×M12
                          </span>
                        </div>
                        <div>
                          Cabinet → plate:{" "}
                          <span style={{ color: brand.dark, fontWeight: 600 }}>
                            {selectedPowerBlockModel.boltGroups.chargerToPlate.count}×M12
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {foundation.structuralNote && (
                <Banner>{foundation.structuralNote}</Banner>
              )}
            </div>
          )}

          {/* STEP 3 — SITE CONDITIONS */}
          {step === 3 && (
            <div>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: brand.dark }}
              >
                Site conditions
              </h2>
              <p className="text-sm mb-4" style={{ color: brand.steel }}>
                Look up wind and seismic values for your address using the
                official tools below, then enter them here.
              </p>

              <Field
                label="Project address"
                hint="Auto-fills SDS below from USGS (ASCE 7-22, Site Class D, Risk Category II). Wind speed is not auto-filled yet — enter it manually."
              >
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative w-full">
                      <MapPin
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: brand.steel }}
                      />
                      <input
                        type="text"
                        value={addressInput}
                        onChange={(e) => onAddressChange(e.target.value)}
                        onKeyDown={onAddressKeyDown}
                        onFocus={() =>
                          addressSuggestions.length > 0 &&
                          setAddressSuggestOpen(true)
                        }
                        onBlur={() =>
                          setTimeout(() => setAddressSuggestOpen(false), 150)
                        }
                        placeholder="e.g. 400 S Congress Ave, Austin, TX"
                        autoComplete="off"
                        disabled={!MAPBOX_TOKEN}
                        className="w-full border rounded-md pl-9 pr-3 py-2 text-sm disabled:opacity-50"
                        style={{ borderColor: "#D9D9D6" }}
                      />
                    </div>
                  </div>
                  {addressSuggestOpen && addressSuggestions.length > 0 && (
                    <div
                      className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-white shadow-lg"
                      style={{ borderColor: "#D9D9D6" }}
                    >
                      {addressSuggestions.map((s, i) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectAddressSuggestion(s);
                          }}
                          className="block w-full px-4 py-2 text-left text-sm"
                          style={{
                            background:
                              i === addressHighlightIndex
                                ? brand.bgSoft
                                : "white",
                            color: brand.dark,
                          }}
                        >
                          {s.placeName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!MAPBOX_TOKEN && (
                  <div className="text-[11px] mt-1" style={{ color: brand.steel }}>
                    Address lookup isn't configured yet — enter SDS manually
                    below, or via the USGS link.
                  </div>
                )}
                {sdsLookupStatus === "loading" && (
                  <div className="text-[11px] mt-1" style={{ color: brand.steel }}>
                    Looking up SDS from USGS…
                  </div>
                )}
                {sdsLookupStatus === "done" && sdsSource === "usgs" && (
                  <div className="text-[11px] mt-1 flex items-center gap-1" style={{ color: brand.dark }}>
                    <CheckCircle2 size={12} style={{ color: brand.gold }} />
                    SDS fetched from USGS for {sdsLookupAddress}
                  </div>
                )}
                {sdsLookupStatus === "error" && (
                  <div className="text-[11px] mt-1" style={{ color: "#B54708" }}>
                    {sdsLookupError}
                  </div>
                )}
              </Field>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <Field
                  label="Basic wind speed (mph)"
                  hint="Look up via ASCE Hazard Tool"
                >
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={windSpeed}
                      onChange={(e) => setWindSpeed(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      style={{ borderColor: "#D9D9D6" }}
                    />
                    <a
                      href="https://ascehazardtool.org/"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center px-3 rounded-md border text-xs shrink-0"
                      style={{ borderColor: brand.gold, color: brand.dark }}
                    >
                      <ExternalLink size={14} className="mr-1" /> ASCE
                    </a>
                  </div>
                </Field>
                <Field
                  label="SDS — seismic (g)"
                  hint="Look up via USGS Design Maps"
                >
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.05"
                      value={sds}
                      onChange={(e) => {
                        setSds(e.target.value);
                        setSdsSource("manual");
                      }}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      style={{ borderColor: "#D9D9D6" }}
                    />
                    <a
                      href="https://earthquake.usgs.gov/ws/designmaps/"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center px-3 rounded-md border text-xs shrink-0"
                      style={{ borderColor: brand.gold, color: brand.dark }}
                    >
                      <ExternalLink size={14} className="mr-1" /> USGS
                    </a>
                  </div>
                </Field>
              </div>

              <button
                onClick={() => setShowSdsRef((v) => !v)}
                className="text-xs flex items-center gap-1 mb-3"
                style={{ color: brand.steel }}
              >
                {showSdsRef ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}{" "}
                Approximate SDS reference values (Site Class D)
              </button>
              {showSdsRef && (
                <div
                  className="grid grid-cols-2 sm:grid-cols-5 gap-1 text-xs mb-3 p-3 rounded-md"
                  style={{ background: brand.bgSoft }}
                >
                  {SDS_REFERENCE.map((r) => (
                    <div key={r.city} className="flex justify-between gap-2">
                      <span style={{ color: brand.steel }}>{r.city}</span>
                      <span
                        className="font-semibold"
                        style={{ color: brand.dark }}
                      >
                        {r.sds}g
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Banner>
                Values entered here are the customer's responsibility to verify
                against the linked official sources. Nordinfra is not
                responsible for incorrect site data entered by the user.
              </Banner>

              <Field
                label="Backfill material"
                hint="Passive earth pressure (Kp,d) is pre-calculated per material — no separate friction-angle / unit-weight step needed."
              >
                <select
                  value={backfillKey}
                  onChange={(e) => setBackfillKey(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  style={{ borderColor: "#D9D9D6" }}
                >
                  {BACKFILL_OPTIONS.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.label} (φ={b.phi}°, Kp,d={b.Kpd})
                    </option>
                  ))}
                </select>
              </Field>

              <div
                className="flex items-start gap-2 p-3 rounded-md text-xs mb-2"
                style={{ background: brand.bgSoft, color: brand.steel }}
              >
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>
                  Asphalt or concrete (≥60mm) poured as a top layer after
                  compaction provides additional passive resistance beyond this
                  calculation's assumptions, but is not included in the result
                  below — contact Nordinfra for an in-depth calculation if this
                  should be credited. (Pull-out testing on a Swedish test
                  installation is in progress.)
                </span>
              </div>

              <label
                className="flex items-center gap-2 mt-2 text-sm"
                style={{ color: brand.dark }}
              >
                <input
                  type="checkbox"
                  checked={nevi}
                  onChange={(e) => setNevi(e.target.checked)}
                />
                This is a NEVI-funded or federally funded project (include Buy
                America certificate)
              </label>
            </div>
          )}

          {/* STEP 4 — ACCESSORIES + PACKAGE */}
          {step === 4 && (
            <div>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: brand.dark }}
              >
                Accessories &amp; package
              </h2>

              {foundation?.hasAccessories && (
                <>
                  <p className="text-sm mb-4" style={{ color: brand.steel }}>
                    Bollard (sch 10/40) mounts on {foundation.name} — your
                    smallest foundation model.
                  </p>
                  <div
                    className="border rounded-md p-4 mb-3"
                    style={{ borderColor: "#D9D9D6" }}
                  >
                    <label
                      className="flex items-center gap-2 font-semibold text-sm"
                      style={{ color: brand.dark }}
                    >
                      <input
                        type="checkbox"
                        checked={addBollard}
                        onChange={(e) => setAddBollard(e.target.checked)}
                      />{" "}
                      Add bollard
                    </label>
                    {addBollard && (
                      <>
                        <div className="mt-3 ml-6 flex gap-4 text-sm">
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              checked={bollardTier === "sch10"}
                              onChange={() => setBollardTier("sch10")}
                            />{" "}
                            Schedule 10 (standard)
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              checked={bollardTier === "sch40"}
                              onChange={() => setBollardTier("sch40")}
                            />{" "}
                            Schedule 40, Duplex
                          </label>
                        </div>
                        <div className="ml-6 mt-3 max-w-[360px]">
                          <AccessoryImage
                            src={BOLLARD_ACCESSORY_PHOTOS[bollardTier]}
                            label={
                              bollardTier === "sch10"
                                ? "Bollard, Schedule 10"
                                : "Bollard, Schedule 40"
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div
                    className="border rounded-md p-4 mb-6"
                    style={{ borderColor: "#D9D9D6" }}
                  >
                    <label
                      className="flex items-center gap-2 font-semibold text-sm"
                      style={{ color: brand.dark }}
                    >
                      <input
                        type="checkbox"
                        checked={addCover}
                        onChange={(e) => setAddCover(e.target.checked)}
                        disabled={!addBollard}
                      />{" "}
                      Bollard cover
                    </label>
                    {!addBollard && (
                      <div
                        className="text-xs ml-6 mt-1"
                        style={{ color: brand.steel }}
                      >
                        Requires bollard. (Many pedestals already include their
                        own base cover.)
                      </div>
                    )}
                    {addBollard && addCover && (
                      <div className="ml-6 mt-3 max-w-[360px]">
                        <AccessoryImage
                          src={BOLLARD_ACCESSORY_PHOTOS.cover}
                          label="Bollard cover"
                        />
                      </div>
                    )}
                  </div>
                  <div
                    className="border rounded-md p-4 mb-6"
                    style={{ borderColor: "#D9D9D6" }}
                  >
                    <label
                      className="flex items-center gap-2 font-semibold text-sm"
                      style={{ color: brand.dark }}
                    >
                      <input
                        type="checkbox"
                        checked={addSensorPole}
                        onChange={(e) => setAddSensorPole(e.target.checked)}
                      />{" "}
                      Sensor pole (collision-protection frame)
                    </label>
                    <div
                      className="text-xs ml-6 mt-1"
                      style={{ color: brand.steel }}
                    >
                      Two-post frame that straddles the foundation to shield a
                      sensor/camera pole from vehicle contact. ~34 lb
                      assembly, 40.7"×33.7" footprint. Frame hot-dip
                      galvanized per ASTM A123; the two stainless posts are
                      powder-coated OSHA safety yellow and ship separately.
                    </div>
                    {addSensorPole && (
                      <div className="ml-6 mt-3 max-w-[360px]">
                        <AccessoryImage
                          src={SENSOR_POLE_PHOTO}
                          label="Sensor pole"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
              {foundation?.hasCharger && (
                <>
                  <p className="text-sm mb-4" style={{ color: brand.steel }}>
                    Add a standalone bollard elsewhere in this installation —
                    this bundles its own NordBase Bollard foundation, pole,
                    and optional cover as a separate line item alongside{" "}
                    {foundation.name}.
                  </p>
                  <div
                    className="border rounded-md p-4 mb-3"
                    style={{ borderColor: "#D9D9D6" }}
                  >
                    <label
                      className="flex items-center gap-2 font-semibold text-sm"
                      style={{ color: brand.dark }}
                    >
                      <input
                        type="checkbox"
                        checked={addBollard}
                        onChange={(e) => setAddBollard(e.target.checked)}
                      />{" "}
                      Add bollard assembly (foundation + pole)
                    </label>
                    {addBollard && (
                      <>
                        <div className="mt-3 ml-6 flex gap-4 text-sm">
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              checked={bollardTier === "sch10"}
                              onChange={() => setBollardTier("sch10")}
                            />{" "}
                            Schedule 10 (standard)
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              checked={bollardTier === "sch40"}
                              onChange={() => setBollardTier("sch40")}
                            />{" "}
                            Schedule 40, Duplex
                          </label>
                        </div>
                        <div className="ml-6 mt-3 max-w-[360px]">
                          <AccessoryImage
                            src={BOLLARD_ACCESSORY_PHOTOS[bollardTier]}
                            label={
                              bollardTier === "sch10"
                                ? "Bollard, Schedule 10"
                                : "Bollard, Schedule 40"
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div
                    className="border rounded-md p-4 mb-6"
                    style={{ borderColor: "#D9D9D6" }}
                  >
                    <label
                      className="flex items-center gap-2 font-semibold text-sm"
                      style={{ color: brand.dark }}
                    >
                      <input
                        type="checkbox"
                        checked={addCover}
                        onChange={(e) => setAddCover(e.target.checked)}
                        disabled={!addBollard}
                      />{" "}
                      Bollard cover
                    </label>
                    {!addBollard && (
                      <div
                        className="text-xs ml-6 mt-1"
                        style={{ color: brand.steel }}
                      >
                        Requires the bollard assembly above.
                      </div>
                    )}
                    {addBollard && addCover && (
                      <div className="ml-6 mt-3 max-w-[360px]">
                        <AccessoryImage
                          src={BOLLARD_ACCESSORY_PHOTOS.cover}
                          label="Bollard cover"
                        />
                      </div>
                    )}
                  </div>
                  <div
                    className="border rounded-md p-4 mb-6"
                    style={{ borderColor: "#D9D9D6" }}
                  >
                    <label
                      className="flex items-center gap-2 font-semibold text-sm"
                      style={{ color: brand.dark }}
                    >
                      <input
                        type="checkbox"
                        checked={addSensorPole}
                        onChange={(e) => setAddSensorPole(e.target.checked)}
                      />{" "}
                      Sensor pole (collision-protection frame)
                    </label>
                    <div
                      className="text-xs ml-6 mt-1"
                      style={{ color: brand.steel }}
                    >
                      Two-post frame that straddles the foundation to shield a
                      sensor/camera pole from vehicle contact. ~34 lb
                      assembly, 40.7"×33.7" footprint. Frame hot-dip
                      galvanized per ASTM A123; the two stainless posts are
                      powder-coated OSHA safety yellow and ship separately.
                    </div>
                    {addSensorPole && (
                      <div className="ml-6 mt-3 max-w-[360px]">
                        <AccessoryImage
                          src={SENSOR_POLE_PHOTO}
                          label="Sensor pole"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
              {!foundation?.hasAccessories && !foundation?.hasCharger && (
                <p className="text-sm mb-6" style={{ color: brand.steel }}>
                  No accessories linked to {foundation?.name} yet.
                </p>
              )}

              <div
                className="text-sm font-semibold mb-2"
                style={{ color: brand.dark }}
              >
                Package type
              </div>
              <div className="grid sm:grid-cols-3 gap-2 mb-4">
                {Object.entries(PACKAGE_TYPES).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => setPackageType(key)}
                    className="text-left border rounded-md p-3"
                    style={{
                      borderColor: packageType === key ? brand.gold : "#D9D9D6",
                      background: packageType === key ? "#FBF7EA" : "white",
                    }}
                  >
                    <div
                      className="font-bold text-sm"
                      style={{ color: brand.dark }}
                    >
                      {p.label}
                    </div>
                    <div className="text-xs" style={{ color: brand.steel }}>
                      {p.desc}
                    </div>
                  </button>
                ))}
              </div>

              <div
                className="p-3 rounded-md"
                style={{
                  background: brand.bgSoft,
                  borderLeft: `3px solid ${brand.gold}`,
                }}
              >
                <div
                  className="text-xs font-bold tracking-wide mb-2"
                  style={{ color: brand.steel }}
                >
                  PACKAGE CONTENTS
                </div>
                {packageType !== "custom" ? (
                  <ul className="text-sm space-y-1">
                    {PACKAGE_TYPES[packageType].contents.map((c, i) => {
                      const name = typeof c === "string" ? c : c.name;
                      const soon = typeof c === "object" && c.comingSoon;
                      return (
                        <li
                          key={i}
                          className="flex items-center gap-2"
                          style={{
                            color: soon ? brand.steel : brand.dark,
                            opacity: soon ? 0.7 : 1,
                          }}
                        >
                          <CheckCircle2
                            size={14}
                            color={soon ? brand.steel : brand.gold}
                          />{" "}
                          {name}{" "}
                          {soon && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                background: brand.amberBg,
                                color: brand.amber,
                              }}
                            >
                              Coming soon
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-sm space-y-1">
                    <div
                      className="flex items-center gap-2"
                      style={{ color: brand.dark }}
                    >
                      <CheckCircle2 size={14} color={brand.gold} /> Calc File
                      (always included)
                    </div>
                    {[
                      ["datasheet", "Product Data Sheet (PDF)"],
                      ["drawingPdf", "Foundation Detail Drawing (PDF)"],
                      ["drawingDwg", "Foundation Detail Drawing (DWG)"],
                    ].map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={customAssets[k]}
                          onChange={(e) =>
                            setCustomAssets((s) => ({
                              ...s,
                              [k]: e.target.checked,
                            }))
                          }
                        />{" "}
                        {label}
                      </label>
                    ))}
                    <label className="flex items-center gap-2 opacity-70">
                      <input type="checkbox" disabled checked={false} /> CSI
                      Specification (DOCX){" "}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: brand.amberBg,
                          color: brand.amber,
                        }}
                      >
                        Coming soon
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5 — REPORT */}
          {step === 5 && result && foundation && (
            <div>
              {/* Print-only cover header — the interactive header above is
                  print:hidden, so without this the PDF/print output carried
                  no Nordinfra branding at all. */}
              <div className="hidden print:flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: "#D9D9D6" }}>
                <img
                  src="/logo/logo-nav-dark.png"
                  alt="Nordinfra"
                  className="h-9 w-auto shrink-0"
                />
                <div className="h-7 w-px shrink-0 bg-black/10" />
                <div>
                  <div
                    className="text-xs font-bold tracking-widest"
                    style={{ color: brand.gold }}
                  >
                    NORDBASE
                  </div>
                  <div
                    className="text-base font-bold"
                    style={{ color: brand.dark, fontFamily: "Georgia, serif" }}
                  >
                    Foundation Selector — Submittal Package
                  </div>
                </div>
                <div className="ml-auto text-right text-xs" style={{ color: brand.steel }}>
                  <div>{projectName || "Untitled project"}</div>
                  <div>{contactName || ""}</div>
                </div>
              </div>

              <h2
                className="text-lg font-bold mb-1"
                style={{ color: brand.dark }}
              >
                Report
              </h2>
              <p className="text-sm mb-6" style={{ color: brand.steel }}>
                Preliminary check per ASCE 7-22 / IBC 2021 — not PE-stamped.
              </p>

              <div
                className="rounded-md p-4 mb-4"
                style={{ background: brand.dark }}
              >
                <div className="flex justify-between items-center mb-3">
                  <span
                    className="text-xs font-bold tracking-wide"
                    style={{ color: brand.gold }}
                  >
                    GOVERNING CHECK — {result.governing.label.toUpperCase()}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded flex items-center gap-1"
                    style={{
                      background: result.pass ? "#2E7D32" : "#C0392B",
                      color: "white",
                    }}
                  >
                    {result.pass ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <AlertTriangle size={14} />
                    )}{" "}
                    {result.pass ? "OK" : "REVIEW"}
                  </span>
                </div>
                <div
                  className="grid grid-cols-2 gap-2 text-xs"
                  style={{ color: "#D9D9D6" }}
                >
                  <div>DCR: {(result.governing.dcr * 100).toFixed(1)}%</div>
                  <div>
                    Foundation: {foundation.name}
                    {selectedPowerBlockModel &&
                      ` — ${presetMfr} ${selectedPowerBlockModel.model}`}
                  </div>
                  <div>Wind: {windSpeed} mph</div>
                  <div>SDS: {sds}g</div>
                </div>
              </div>

              <button
                onClick={() => setShowDetails((v) => !v)}
                className="text-xs flex items-center gap-1 mb-3"
                style={{ color: brand.steel }}
              >
                {showDetails ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}{" "}
                Show calculation details (all {result.checks.length} checks)
              </button>
              {showDetails && (
                <div
                  className="border rounded-md mb-4 overflow-hidden"
                  style={{ borderColor: "#D9D9D6" }}
                >
                  <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: 420 }}>
                    <thead>
                      <tr style={{ background: brand.bgSoft }}>
                        <th className="text-left p-2">Check</th>
                        <th className="text-right p-2">Capacity</th>
                        <th className="text-right p-2">Demand</th>
                        <th className="text-right p-2">DCR</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.checks.map((c) => (
                        <tr
                          key={c.key}
                          className="border-t"
                          style={{ borderColor: "#F0F0EE" }}
                        >
                          <td className="p-2">{c.label}</td>
                          <td className="p-2 text-right">
                            {c.capacity.toFixed(3)} {c.unit}
                          </td>
                          <td className="p-2 text-right">
                            {c.demand.toFixed(3)} {c.unit}
                          </td>
                          <td className="p-2 text-right font-semibold">
                            {(c.dcr * 100).toFixed(1)}%
                          </td>
                          <td className="p-2 text-center">
                            {c.dcr <= 1 ? (
                              <CheckCircle2 size={12} color="#2E7D32" />
                            ) : (
                              <AlertTriangle size={12} color="#C0392B" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  <div
                    className="text-[11px] p-2"
                    style={{ color: brand.steel, background: brand.bgSoft }}
                  >
                    {foundation.isPowerBlock ? (
                      <>
                        Group overturning/sliding and bolt tension (
                        {BOLT_M12_SPEC_LABEL}, φNₛₐ ={" "}
                        {BOLT_M12_TENSION_CAPACITY_KN.toFixed(2)} kN, ACI
                        318-19 §17.6.1) use confirmed geometry from Simon's
                        assembly drawing and the validated single-foundation
                        methodology, extended to the{" "}
                        {selectedPowerBlockModel?.unitCount}-unit array.
                        Adapter-plate BENDING itself is NOT included — see the
                        note on the Configuration step. Source:
                        Nordinfra_PowerBlock_C503_DRAFT_20260827_v3.xlsx,
                        confirmed 2026-08-27.
                      </>
                    ) : foundation.wallThicknessMm ? (
                      <>
                        Wall plate bending uses confirmed material data:{" "}
                        {foundation.wallThicknessMm}mm ASTM A1011 SS Gr 33 +
                        ZM115, φ·f<sub>y</sub> = {STEEL_BENDING_CAPACITY_MPA}{" "}
                        MPa (AISC 360-22 §F1).
                        {foundation.hasCharger &&
                          ` Bolt tension uses ${BOLT_SPEC_LABEL}, φNₛₐ = ${BOLT_TENSION_CAPACITY_KN} kN (ACI 318-19 §17.6.1), with the lever arm taken from your selected CC spacing above.`}{" "}
                        Source: Nordinfra_Master_USA_ASCE7_v6 — confirmed
                        2026-08-21.
                      </>
                    ) : (
                      <>
                        Wall-plate bending and bolt tension are not included
                        for {foundation.name} — wall gauge and adapter-plate
                        weight are not yet confirmed for this preliminary
                        product. These are included automatically once that
                        data is provided.
                      </>
                    )}
                  </div>
                </div>
              )}

              <div
                className="border rounded-md p-4 mb-4"
                style={{ borderColor: "#D9D9D6" }}
              >
                <div
                  className="text-xs font-bold tracking-wide mb-3 flex items-center gap-2"
                  style={{ color: brand.gold }}
                >
                  <Package size={14} /> BILL OF MATERIALS
                </div>
                {foundation.isPowerBlock && selectedPowerBlockModel ? (
                  <div
                    className="flex justify-between text-sm py-1.5 border-b"
                    style={{ borderColor: "#F0F0EE" }}
                  >
                    <div>
                      <div style={{ color: brand.dark }}>
                        {selectedPowerBlockModel.unitCount}× NordBase Medium
                        foundation
                      </div>
                      <div className="text-xs" style={{ color: brand.steel }}>
                        {foundation.levelLabel} — joined array
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: brand.steel }}>
                      Price on request
                    </div>
                  </div>
                ) : !foundation.isPowerBlock ? (
                  <div
                    className="flex justify-between text-sm py-1.5 border-b"
                    style={{ borderColor: "#F0F0EE" }}
                  >
                    <div>
                      <div style={{ color: brand.dark }}>{foundation.name}</div>
                      <div className="text-xs" style={{ color: brand.steel }}>
                        {foundation.levelLabel}
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: brand.steel }}>
                      Price on request
                    </div>
                  </div>
                ) : null}
                {foundation.isPowerBlock && selectedPowerBlockModel && (
                  <div
                    className="flex justify-between text-sm py-1.5 border-b"
                    style={{ borderColor: "#F0F0EE" }}
                  >
                    <div>
                      <div style={{ color: brand.dark }}>
                        Hat-profile connector,{" "}
                        {selectedPowerBlockModel.hatProfile.sides} long sides
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: brand.steel }}>
                      Price on request
                    </div>
                  </div>
                )}
                {foundation.isPowerBlock && selectedPowerBlockModel && (
                  <div
                    className="flex justify-between text-sm py-1.5 border-b"
                    style={{ borderColor: "#F0F0EE" }}
                  >
                    <div>
                      <div style={{ color: brand.dark }}>
                        {selectedPowerBlockModel.partNumber
                          ? `Adapter Plate: ${selectedPowerBlockModel.partNumber}`
                          : `Shared adapter plate — ${presetMfr} ${selectedPowerBlockModel.model}`}
                      </div>
                      <div className="text-xs" style={{ color: brand.steel }}>
                        {selectedPowerBlockModel.partName && (
                          <>
                            {selectedPowerBlockModel.partName}
                            <br />
                          </>
                        )}
                        {selectedPowerBlockModel.boltGroups.plateToFoundation.count}
                        ×M12 to foundations,{" "}
                        {selectedPowerBlockModel.boltGroups.chargerToPlate.count}
                        ×M12 to charger
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: brand.steel }}>
                      Price on request
                    </div>
                  </div>
                )}
                {foundation.hasCharger && !foundation.isPowerBlock && (
                  <div
                    className="flex justify-between text-sm py-1.5 border-b"
                    style={{ borderColor: "#F0F0EE" }}
                  >
                    <div>
                      <div style={{ color: brand.dark }}>
                        {presetModelData?.partNumber
                          ? `Adapter Plate: ${presetModelData.partNumber}`
                          : `Adapter plate, CC ${effectiveCcW}"×${effectiveCcD}"`}
                      </div>
                      <div className="text-xs" style={{ color: brand.steel }}>
                        {presetModelData?.partName
                          ? presetModelData.partName
                          : foundation.adapterPlate.material || "Material TBD"}
                      </div>
                      {presetModelData?.partNumber && (
                        <div
                          className="text-xs"
                          style={{ color: brand.steel }}
                        >
                          CC {effectiveCcW}"×{effectiveCcD}" ·{" "}
                          {foundation.adapterPlate.material || "Material TBD"}
                        </div>
                      )}
                      {officialDrawingUrl && (
                        <a
                          href={officialDrawingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold"
                          style={{ color: brand.gold }}
                        >
                          Official drawing (PDF) ↗
                        </a>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: brand.steel }}>
                      Price on request
                    </div>
                  </div>
                )}
                {addBollard && foundation.hasCharger && (
                  <div
                    className="flex justify-between text-sm py-1.5 border-b"
                    style={{ borderColor: "#F0F0EE" }}
                  >
                    <div>
                      <div style={{ color: brand.dark }}>
                        NordBase Bollard foundation
                      </div>
                      <div className="text-xs" style={{ color: brand.steel }}>
                        Standalone — for the bollard assembly below
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: brand.steel }}>
                      Price on request
                    </div>
                  </div>
                )}
                {addBollard && (
                  <div
                    className="flex justify-between text-sm py-1.5 border-b"
                    style={{ borderColor: "#F0F0EE" }}
                  >
                    <div style={{ color: brand.dark }}>
                      Bollard,{" "}
                      {bollardTier === "sch10"
                        ? "Schedule 10"
                        : "Schedule 40 (Duplex)"}
                    </div>
                    <div className="text-xs" style={{ color: brand.steel }}>
                      Price on request
                    </div>
                  </div>
                )}
                {addCover && (
                  <div
                    className="flex justify-between text-sm py-1.5 border-b"
                    style={{ borderColor: "#F0F0EE" }}
                  >
                    <div style={{ color: brand.dark }}>Bollard cover</div>
                    <div className="text-xs" style={{ color: brand.steel }}>
                      Price on request
                    </div>
                  </div>
                )}
                {addSensorPole && (
                  <div className="flex justify-between text-sm py-1.5">
                    <div>
                      <div style={{ color: brand.dark }}>
                        Sensor pole (collision-protection frame)
                      </div>
                      <div className="text-xs" style={{ color: brand.steel }}>
                        ~34 lb, galvanized frame + OSHA-yellow SS304 posts
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: brand.steel }}>
                      Price on request
                    </div>
                  </div>
                )}
              </div>

              {/* AVAILABLE-BUT-NOT-SELECTED ACCESSORIES — print-only (part of
                  the submittal package, not the interactive UI): so the
                  recipient sees what else is compatible with this foundation
                  even if nothing, or only some, of it was added here. */}
              {(() => {
                const canBollard =
                  foundation?.hasAccessories || foundation?.hasCharger;
                const availableExtras = [
                  canBollard &&
                    !addBollard && {
                      name: "Bollard assembly (foundation + pole)",
                      desc: "Schedule 10 or Schedule 40 Duplex, with optional cover.",
                    },
                  addBollard &&
                    !addCover && {
                      name: "Bollard cover",
                      desc: "Finishes the bollard base — many pedestals already include their own.",
                    },
                  canBollard &&
                    !addSensorPole && {
                      name: "Sensor pole (collision-protection frame)",
                      desc: "~34 lb two-post frame, galvanized + OSHA-yellow SS304 posts.",
                    },
                ].filter(Boolean);
                if (!availableExtras.length) return null;
                return (
                  <div
                    className="hidden print:block border rounded-md p-4 mb-4 print:break-inside-avoid"
                    style={{ borderColor: "#D9D9D6" }}
                  >
                    <div
                      className="text-xs font-bold tracking-wide mb-2"
                      style={{ color: brand.gold }}
                    >
                      ALSO AVAILABLE FOR {foundation.name.toUpperCase()}
                    </div>
                    <div className="text-xs mb-3" style={{ color: brand.steel }}>
                      Not included in this configuration — ask Nordinfra to
                      add any of these.
                    </div>
                    {availableExtras.map((a) => (
                      <div
                        key={a.name}
                        className="py-1.5 border-b"
                        style={{ borderColor: "#F0F0EE" }}
                      >
                        <div style={{ color: brand.dark }}>{a.name}</div>
                        <div className="text-xs" style={{ color: brand.steel }}>
                          {a.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* DOCUMENT LIBRARY — manual, warranty, BABA cert (conditional
                  on the NEVI checkbox above), and technical spec. Real PDFs,
                  see FOUNDATION_MANUALS / BABA_CERTIFICATE_PDF / etc. above. */}
              <div
                className="border rounded-md p-4 mb-4 print:break-inside-avoid"
                style={{ borderColor: "#D9D9D6" }}
              >
                <div
                  className="text-xs font-bold tracking-wide mb-2 flex items-center gap-2"
                  style={{ color: brand.gold }}
                >
                  <FileText size={14} /> DOCUMENTS FOR THIS FOUNDATION
                </div>
                <div className="flex flex-col gap-2">
                  {FOUNDATION_MANUALS[foundation.key] ? (
                    <a
                      href={FOUNDATION_MANUALS[foundation.key]}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between text-sm rounded-md border px-3 py-2 hover:bg-black/[0.02]"
                      style={{ borderColor: "#F0F0EE" }}
                    >
                      <span style={{ color: brand.dark }}>
                        Installation manual — {foundation.name}
                      </span>
                      <Download size={14} color={brand.steel} />
                    </a>
                  ) : (
                    <div
                      className="text-xs rounded-md border px-3 py-2"
                      style={{ borderColor: "#F0F0EE", color: brand.steel }}
                    >
                      Installation manual for {foundation.name} — coming
                      soon. Contact Nordinfra for interim guidance.
                    </div>
                  )}
                  <a
                    href={WARRANTY_PDF}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-sm rounded-md border px-3 py-2 hover:bg-black/[0.02]"
                    style={{ borderColor: "#F0F0EE" }}
                  >
                    <span style={{ color: brand.dark }}>
                      US Product &amp; Function Warranty
                    </span>
                    <Download size={14} color={brand.steel} />
                  </a>
                  <a
                    href={TECHNICAL_SPEC_PDF}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-sm rounded-md border px-3 py-2 hover:bg-black/[0.02]"
                    style={{ borderColor: "#F0F0EE" }}
                  >
                    <span style={{ color: brand.dark }}>
                      Technical Specifications &amp; Durability (ZAM
                      coating)
                    </span>
                    <Download size={14} color={brand.steel} />
                  </a>
                  {nevi &&
                    (BABA_COVERED_FOUNDATIONS.has(foundation.key) ? (
                      <a
                        href={BABA_CERTIFICATE_PDF}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between text-sm rounded-md border px-3 py-2 hover:bg-black/[0.02]"
                        style={{ borderColor: brand.gold, background: "#FBF6E8" }}
                      >
                        <span
                          className="flex items-center gap-2"
                          style={{ color: brand.dark }}
                        >
                          <ShieldCheck size={14} color={brand.gold} /> Buy
                          America / BABA Certificate of Compliance
                        </span>
                        <Download size={14} color={brand.steel} />
                      </a>
                    ) : (
                      <div
                        className="text-xs rounded-md border px-3 py-2"
                        style={{ borderColor: "#F0F0EE", color: brand.steel }}
                      >
                        BABA certificate for {foundation.name} not yet
                        issued — contact Nordinfra before submitting on a
                        federally funded project.
                      </div>
                    ))}
                </div>
              </div>

              {/* DISTRIBUTION PARTNER LOCATOR — Nordinfra sells only through
                  partners/distributors, so orders are placed with a partner,
                  not directly with Nordinfra. Generic partner list — see
                  PARTNERS above. Real branch data still needs to be filled in
                  by Nordinfra before go-live (placeholder marked below). */}
              <div
                className="border rounded-md p-4 mb-4 print:break-inside-avoid"
                style={{ borderColor: "#D9D9D6" }}
              >
                <div
                  className="text-xs font-bold tracking-wide mb-2 flex items-center gap-2"
                  style={{ color: brand.gold }}
                >
                  <MapPin size={14} /> WHERE TO ORDER
                </div>
                <p className="text-xs mb-3" style={{ color: brand.steel }}>
                  Nordinfra sells through authorized distribution partners.
                  Find your nearest partner location to place an order for
                  this configuration.
                </p>
                <div className="print:hidden mb-3">
                  <input
                    value={partnerStateFilter}
                    onChange={(e) => setPartnerStateFilter(e.target.value)}
                    placeholder="Filter by state (e.g. NY)…"
                    className="w-full sm:w-52 border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#D9D9D6" }}
                  />
                </div>
                <div className="space-y-2">
                  {PARTNERS.flatMap((partner) =>
                    partner.locations
                      .filter(
                        (loc) =>
                          !partnerStateFilter ||
                          loc.state
                            .toLowerCase()
                            .includes(partnerStateFilter.toLowerCase())
                      )
                      .map((loc, i) => {
                        const expanded = expandedPartnerId === partner.id;
                        const hasContactInfo =
                          partner.website || partner.phone || partner.email;
                        return (
                          <div
                            key={`${partner.id}-${i}`}
                            className="rounded-md overflow-hidden"
                            style={{ background: brand.bgSoft }}
                          >
                            <div className="flex items-center justify-between gap-3 text-sm p-2">
                              <button
                                type="button"
                                onClick={() =>
                                  hasContactInfo &&
                                  setExpandedPartnerId(
                                    expanded ? null : partner.id
                                  )
                                }
                                className="print:pointer-events-none text-left flex items-start gap-1.5 min-w-0"
                              >
                                <div className="min-w-0">
                                  <div
                                    className="font-semibold flex items-center gap-1 flex-wrap"
                                    style={{ color: brand.dark }}
                                  >
                                    {partner.name} — {loc.city}, {loc.state}
                                    {hasContactInfo &&
                                      (expanded ? (
                                        <ChevronUp
                                          size={14}
                                          className="print:hidden shrink-0"
                                          style={{ color: brand.steel }}
                                        />
                                      ) : (
                                        <ChevronDown
                                          size={14}
                                          className="print:hidden shrink-0"
                                          style={{ color: brand.steel }}
                                        />
                                      ))}
                                  </div>
                                  <div
                                    className="text-xs"
                                    style={{ color: brand.steel }}
                                  >
                                    {hasConfirmedAddress(loc)
                                      ? loc.address
                                      : "Exact branch address not yet on file"}
                                    {loc.phone ? ` · ${loc.phone}` : ""}
                                  </div>
                                </div>
                              </button>
                              {hasConfirmedAddress(loc) ? (
                                <a
                                  href={directionsUrl(loc)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="print:hidden shrink-0 text-xs px-2 py-1 rounded-md border flex items-center gap-1"
                                  style={{
                                    borderColor: brand.gold,
                                    color: brand.dark,
                                  }}
                                >
                                  <ExternalLink size={12} /> Directions
                                </a>
                              ) : partner.website ? (
                                <a
                                  href={partner.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="print:hidden shrink-0 text-xs px-2 py-1 rounded-md border flex items-center gap-1"
                                  style={{
                                    borderColor: brand.gold,
                                    color: brand.dark,
                                  }}
                                >
                                  <Globe size={12} /> Visit website
                                </a>
                              ) : null}
                            </div>
                            {expanded && hasContactInfo && (
                              <div
                                className="print:hidden px-2 pb-3 pt-1 text-xs space-y-1.5 border-t"
                                style={{ borderColor: "#E5E4E1" }}
                              >
                                {partner.website && (
                                  <a
                                    href={partner.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 hover:underline"
                                    style={{ color: brand.dark }}
                                  >
                                    <Globe size={12} style={{ color: brand.gold }} />
                                    {partner.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                                  </a>
                                )}
                                <div
                                  className="flex items-center gap-1.5"
                                  style={{ color: partner.phone ? brand.dark : brand.steel }}
                                >
                                  <Phone size={12} style={{ color: brand.gold }} />
                                  {partner.phone || "Phone not yet on file — see website"}
                                </div>
                                <div
                                  className="flex items-center gap-1.5"
                                  style={{ color: partner.email ? brand.dark : brand.steel }}
                                >
                                  <Mail size={12} style={{ color: brand.gold }} />
                                  {partner.email || "Email not yet on file — see website"}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                  {PARTNERS.flatMap((p) => p.locations).every(
                    (loc) =>
                      partnerStateFilter &&
                      !loc.state
                        .toLowerCase()
                        .includes(partnerStateFilter.toLowerCase())
                  ) && (
                    <div className="text-xs" style={{ color: brand.steel }}>
                      No partner location found for "{partnerStateFilter}" —
                      contact Nordinfra directly.
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="print:hidden w-full py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 mb-2"
                style={{ background: brand.gold, color: brand.dark }}
              >
                <Download size={16} /> Download{" "}
                {PACKAGE_TYPES[packageType].label} package
              </button>

              <label
                className="print:hidden flex items-start gap-2 mb-2 text-xs"
                style={{ color: brand.dark }}
              >
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => {
                    setConsentGiven(e.target.checked);
                    if (e.target.checked) setShowConsentWarning(false);
                  }}
                  className="mt-0.5"
                />
                <span>
                  I agree to Nordinfra collecting and using the information I
                  submit (including my contact details and this calculation)
                  to email me my results and follow up about this project,
                  and, where applicable, to share it with an authorized
                  Nordinfra distribution partner in my region to process an
                  order. See our{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: brand.gold, textDecoration: "underline" }}
                  >
                    Privacy Policy
                  </a>{" "}
                  for details.
                </span>
              </label>

              <a
                href={consentGiven ? buildMailto() : undefined}
                onClick={(e) => {
                  if (!consentGiven) {
                    e.preventDefault();
                    setShowConsentWarning(true);
                  }
                }}
                className="print:hidden w-full py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 border"
                style={{
                  borderColor: brand.dark,
                  color: brand.dark,
                  opacity: consentGiven ? 1 : 0.5,
                  cursor: consentGiven ? "pointer" : "not-allowed",
                }}
              >
                <Mail size={16} /> Send calc to Nordinfra (opens your email
                client)
              </a>
              {showConsentWarning && (
                <p
                  className="print:hidden text-xs text-center mt-1"
                  style={{ color: "#C0392B" }}
                >
                  Please check the box above before sending.
                </p>
              )}
              <p
                className="print:hidden text-xs text-center mt-2"
                style={{ color: brand.steel }}
              >
                The production version generates a formatted PDF + DWG + Word
                spec directly. The email opens in your own email client —
                nothing is sent or stored by the tool itself.
              </p>
            </div>
          )}

          {/* NAV */}
          <div
            className="print:hidden flex justify-between mt-8 pt-6 border-t"
            style={{ borderColor: "#F0F0EE" }}
          >
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm px-4 py-2 rounded-md border"
              style={{ borderColor: "#D9D9D6", color: brand.dark }}
            >
              {step === 0 ? (
                <>
                  <RotateCcw size={14} /> Reset
                </>
              ) : (
                <>
                  <ChevronLeft size={14} /> Back
                </>
              )}
            </button>
            {step < 5 && (
              <button
                onClick={goNext}
                disabled={!canNext[step]}
                className="flex items-center gap-1 text-sm px-5 py-2 rounded-md font-bold"
                style={{
                  background: canNext[step] ? brand.gold : "#E5E5E3",
                  color: canNext[step] ? brand.dark : "#9CA3AF",
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            )}
            {step === 5 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={startNewConfiguration}
                  className="flex items-center gap-1 text-sm px-4 py-2 rounded-md border font-semibold"
                  style={{ borderColor: brand.gold, color: brand.dark }}
                >
                  <Layers size={14} /> Make another configuration
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-1 text-sm px-5 py-2 rounded-md font-bold"
                  style={{ background: brand.gold, color: brand.dark }}
                >
                  <CheckCircle2 size={14} /> Done
                </button>
              </div>
            )}
          </div>
        </div>

        <p
          className="print:hidden text-center text-xs mt-6"
          style={{ color: brand.steel }}
        >
          NordBase Foundation Selector — Prototype v2. Calculation engine ported
          from Nordinfra_Master_USA_ASCE7_v6.xlsx. Not for construction use
          without PE review.
        </p>
      </div>

      {cookieChoice === null && (
        <div
          className="print:hidden fixed bottom-0 left-0 right-0 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 z-50"
          style={{
            background: brand.dark,
            color: "#F0F0EE",
            boxShadow: "0 -2px 12px rgba(0,0,0,0.25)",
          }}
          role="dialog"
          aria-label="Cookie consent"
        >
          <p className="text-xs flex-1">
            This site uses cookies to understand how visitors use our
            calculator and to improve it. You can accept or decline
            non-essential cookies at any time.{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              style={{ color: brand.goldSoft, textDecoration: "underline" }}
            >
              Learn more
            </a>
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setCookieConsent("declined")}
              className="text-xs px-3 py-2 rounded-md border"
              style={{ borderColor: "#6B7280", color: "#F0F0EE" }}
            >
              Decline
            </button>
            <button
              onClick={() => setCookieConsent("accepted")}
              className="text-xs px-3 py-2 rounded-md font-bold"
              style={{ background: brand.gold, color: brand.dark }}
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
