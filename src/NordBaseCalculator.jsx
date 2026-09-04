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

import {
  POWER_BLOCK_MODELS,
  PEDESTAL_CHARGER_PRESETS,
  DC_FAST_CHARGER_PRESETS,
} from "../shared/chargerData.js";

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
// mmToIn/kgToLb moved to ../shared/chargerData.js (2026-09-01) — they were
// only ever used inside the charger preset data that now lives there.

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
    // Adapter-plate-to-FOUNDATION mounting bolts — a separate connection
    // from adapterPlate.ccOptionsX/Y above (that's the customer's charger
    // bolted to the plate; this is the plate bolted down to the foundation
    // itself). Confirmed by Simon Gullberg, 2026-09-01: "DC Small =
    // 270x270mm M12" — SS304 A2-70, same spec as Medium/Large below. Bolt
    // count confirmed separately (Simon Gullberg, 2026-09-01: "small är 4
    // bultar") — a plain 4-corner square pattern, no mid-span bolts like
    // Medium/Large.
    mountingBolts: {
      spec: "M12 A2-70 stainless (ISO 3506-1)",
      count: 4, // confirmed by Simon Gullberg, 2026-09-01
      ccWIn: 270 / 25.4,
      ccDIn: 270 / 25.4,
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
    // Adapter-plate-to-FOUNDATION mounting bolts (separate from
    // adapterPlate.ccOptionsX/Y, which is empty here since Medium uses
    // per-charger CC instead — see the comment on usesSharedPlateGrid further
    // down). Confirmed by Simon Gullberg, 2026-09-01: "DC Medium = 462,5 x
    // 612,5 (mitt emellan 612,5mm sitter det ett till bultpar alltå
    // adapterplåt sitter med 6 bultar) M12" — SS304 A2-70. This is the SAME
    // physical pattern Kempower C503's Power Block group reuses per
    // foundation (boltGroups.plateToFoundation in shared/chargerData.js,
    // pitchIn 612mm — cross-referenced 2026-09-01).
    mountingBolts: {
      spec: "M12 A2-70 stainless (ISO 3506-1)",
      count: 6, // 4 corners + 1 pair mid-span on the two 612.5mm sides
      ccWIn: 462.5 / 25.4,
      ccDIn: 612.5 / 25.4,
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
    // Adapter-plate-to-FOUNDATION mounting bolts. Confirmed by Simon
    // Gullberg, 2026-09-01: "DC Large = 8st M12 29,5" x 29,5" med en bult
    // mitt emellan 29,5" så det blir 8st totalt" — SS304 A2-70. Read as 4
    // corners + 1 additional bolt centered on EACH of the 4 equal 29.5"
    // sides = 8 total (unlike Medium, which only got a mid-span pair on its
    // two longer sides — Large's square pattern gets one on every side).
    mountingBolts: {
      spec: "M12 A2-70 stainless (ISO 3506-1)",
      count: 8, // 4 corners + 1 mid-span bolt on each of the 4 sides
      ccWIn: 29.5,
      ccDIn: 29.5,
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

// POWER_BLOCK_MODELS — moved to ../shared/chargerData.js (2026-09-01, single source of truth for
// both this app and the marketing site — see that file's header comment).


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
// LRFD 0.9D + 1.0W (ASCE 7-16/7-22 §2.3.1, combination 6) — NOT the pre-2010
// service-level 0.9D+1.6W combo. qz above (0.00256·Kz·Kzt·Kd·V²) is built to
// take V straight from the ASCE Hazard Tool's ultimate/strength-level wind
// speed map (the same tool this step links to), which already produces a
// strength-level pressure — applying 1.6 on top of that double-counts the
// factor and overstates wind demand by 60%. Fixed 2026-09 after an Opus
// review flagged the mismatch between this comment (labeled "7-22") and the
// actual pre-2010 factor it was using.
const WIND_DESTAB_FACTOR = 1.0;
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
// = 94.2 kN — this is ONE M16 8.8 bolt's φNsa, not two. It's compared
// (runCheck's "bolt-tension" check, below) against the TOTAL tension-side
// demand from the governing moment, i.e. treated as if only one bolt resists
// it — conservative, since the real pattern has bolts on both sides of the
// tipping axis. Do NOT "fix" this by halving the demand to represent 2
// bolts — the capacity side, not the demand side, is what's simplified here.
// Comment corrected 2026-09 (previously said "2 bolts in tension" here,
// which described the demand-side assumption backwards).
const BOLT_TENSION_CAPACITY_KN =
  BOLT_TENSION_PHI * BOLT_AS_MM2 * (BOLT_FUB_MPA / 1000);

// M12 class 8.8 — Power Block CHARGER-to-plate bolts only (the charger
// manufacturer's own mounting hardware; Simon Gullberg, 2026-09-01: this
// connection is the charger OEM's own design responsibility, Nordinfra
// assumes they sized it correctly, so it keeps this generic carbon-steel
// assumption rather than Nordinfra's own confirmed SS304 spec below).
// Different spec from the M16 8.8 above used on Small/Medium/Large's own
// charger-to-plate check. Confirmed 2026-08-27 against
// Nordinfra_Master_USA_ASCE7_v6's own corrective comment (M12 tensile stress
// area = 84.3mm² per ISO 898-1).
const BOLT_M12_SPEC_LABEL = "M12 class 8.8 (ISO 898-1)";
const BOLT_M12_AS_MM2 = 84.3;
const BOLT_M12_TENSION_CAPACITY_KN =
  BOLT_TENSION_PHI * BOLT_M12_AS_MM2 * (BOLT_FUB_MPA / 1000); // = 50.58 kN — ONE bolt's capacity

// M12 A2-70 stainless (ISO 3506-1) — the FOUNDATION-to-adapter-plate
// connection specifically (Simon Gullberg, 2026-09-01: "M12 eller 1/2" som
// bult i SS304 kvalite... Utgå från A2-70"), used both for Power Block's
// plate-to-foundation bolts and the standalone Small/Medium/Large mounting-
// bolt check below. Property class "70" per ISO 3506-1 = 700 MPa minimum
// tensile strength (same designation logic as steel's "8.8" = 800 MPa,
// just a different, lower-strength stainless grade — same M12 tensile
// stress area, 84.3mm², since that's geometry, not material). Unlike the
// two constants above, THIS capacity is meant to be multiplied by the
// connection's actual bolt count (Simon, 2026-09-01: "Skala mot antal
// bultar - alltid... Kapacitet ska vara baserat på antalet bultar mellan
// fundament och adapterplåt ej skalad till endast 1 bult") — see each call
// site for `count × BOLT_M12_A2_70_TENSION_CAPACITY_KN`.
const BOLT_M12_A2_70_SPEC_LABEL = "M12 A2-70 stainless (ISO 3506-1)";
const BOLT_A2_70_FUB_MPA = 700;
const BOLT_M12_A2_70_TENSION_CAPACITY_KN =
  BOLT_TENSION_PHI * BOLT_M12_AS_MM2 * (BOLT_A2_70_FUB_MPA / 1000); // = 44.26 kN — ONE bolt's capacity, multiply by count at each call site

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

// PEDESTAL_CHARGER_PRESETS — moved to ../shared/chargerData.js (2026-09-01, single source of truth for
// both this app and the marketing site — see that file's header comment).


// DC_FAST_CHARGER_PRESETS — moved to ../shared/chargerData.js (2026-09-01, single source of truth for
// both this app and the marketing site — see that file's header comment).


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
    // Calls the REAL calcStability() — a prior version of this test
    // re-derived aM with its own copy of the base-plate-short-side/2 formula
    // instead of calling the actual function, so a regression inside
    // calcStability() (e.g. someone "fixing" the tipping-arm lever back to
    // top-width/2, the mismatch the comment above warns about) would still
    // print "PASSED". Kpd/sds/WpKn don't affect aM, so any valid values work
    // here — 0 keeps this a pure geometry check.
    const { aM } = calcStability({ foundation: f, Kpd: 0, sds: 0, WpKn: 0 });
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

// calcWind() takes ONE horizontal dimension as the wind-facing width — for a
// charger/cabinet that isn't square in plan, wind normal to the DEEPER face
// can produce a larger projected area (and thus a larger destabilizing
// moment) than wind normal to the wider face. Using only chargerWidthIn
// silently skipped that case (Opus engineering review, 2026-09-01, finding
// #9). This runs calcWind() against both horizontal dimensions and returns
// whichever face governs (larger MdWindKnm) — same return shape as
// calcWind() itself, so every downstream consumer (checks[], reports) is
// unaffected. The tipping-arm lever (aM in calcStability()) is unchanged by
// this — that lever is already the conservative base-plate short side
// regardless of which face wind acts on.
function calcGoverningWind({
  chargerWidthIn,
  chargerDepthIn,
  chargerHeightIn,
  windSpeedMph,
}) {
  const onWidth = calcWind({ chargerWidthIn, chargerHeightIn, windSpeedMph });
  if (!chargerDepthIn || chargerDepthIn === chargerWidthIn) return onWidth;
  const onDepth = calcWind({
    chargerWidthIn: chargerDepthIn,
    chargerHeightIn,
    windSpeedMph,
  });
  return onDepth.MdWindKnm > onWidth.MdWindKnm ? onDepth : onWidth;
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
  // foundation.shellBottom. Falls back to the base-plate footprint only for a
  // foundation whose shell-bottom dimension isn't confirmed yet — every
  // current foundation (incl. Large, confirmed 2026-08-21) has it, so this
  // fallback is currently unused; kept for the next unconfirmed concept.
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
  // Both stabilizing moments are 0.9·(dead weight arm) + 0.9·(passive-earth
  // arm) — MpKnm is the same physical H (lateral passive-earth resistance)
  // in both load cases, so it gets the same ASCE 7 §2.3.1 0.9 factor in
  // both, only the dead-weight coefficient changes between wind's flat 0.9
  // and seismic's SDS-dependent (0.9-0.2·SDS). MstbSeis previously left
  // MpKnm unfactored (effectively 1.0×), which overstated seismic
  // overturning capacity — fixed 2026-09 after an Opus review flagged the
  // inconsistency with the wind case directly above.
  const MstbWind = GRAVITY_STAB_FACTOR * (WpKn * aM + MpKnm);
  const MstbSeis = seismicDeadFactor * WpKn * aM + GRAVITY_STAB_FACTOR * MpKnm;
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

  const wind = calcGoverningWind({
    chargerWidthIn: w,
    chargerDepthIn: d,
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
  // Every current foundation has one (Large confirmed 2026-08-21), so this
  // check runs for all of them today; the guard stays for the next
  // unconfirmed concept rather than reporting against a guessed thickness.
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

  // Adapter-plate-to-FOUNDATION mounting bolts — a separate connection from
  // the charger-to-plate check above (that one uses whatever CC the
  // customer's charger has; this one is Nordinfra's own fixed bolt pattern
  // for mounting the adapter plate down onto the foundation itself). Added
  // 2026-09-01 per Simon Gullberg's confirmed bolt patterns
  // (FOUNDATIONS[key].mountingBolts) — M12 A2-70 stainless, capacity scaled
  // by the connection's actual bolt count (Simon, 2026-09-01: "Skala mot
  // antal bultar - alltid... ej skalad till endast 1 bult"), NOT the
  // single-bolt-vs-total-demand convention used for the customer-CC check
  // above (that one stays conservative because we don't know the customer's
  // actual bolt count; here we do). Uses the shorter of the two CC
  // dimensions as the governing lever arm, same worst-case-axis convention
  // as the charger-to-plate check elsewhere in this file. Not run for
  // Bollard (no mountingBolts data — Simon, 2026-09-01: bollard bolts may
  // deliberately be an under-strength breakaway design instead, still
  // undecided).
  if (foundation.mountingBolts) {
    const mb = foundation.mountingBolts;
    const ccShortIn = Math.min(mb.ccWIn, mb.ccDIn);
    const mountDemandKn = governingMomentKnm / inToM(ccShortIn);
    const mountCapacityKn = mb.count * BOLT_M12_A2_70_TENSION_CAPACITY_KN;
    checks.push({
      key: "bolt-mounting",
      label: `Adapter-plate-to-foundation bolts (${mb.count}×${BOLT_M12_A2_70_SPEC_LABEL.split(" ")[0]})`,
      capacity: mountCapacityKn,
      demand: mountDemandKn,
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
  const wind = calcGoverningWind({
    chargerWidthIn: charger.widthIn,
    chargerDepthIn: charger.depthIn,
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
  // Same fix as the single-foundation calcStability() above (2026-09): the
  // passive-earth moment MpGroupKnm gets the same 0.9 factor in both load
  // cases, since it's the same physical resisting force in both.
  const MstbWindGroup = GRAVITY_STAB_FACTOR * (WpGroupKn * aGroupM + MpGroupKnm);
  const MstbSeisGroup =
    seismicDeadFactor * WpGroupKn * aGroupM + GRAVITY_STAB_FACTOR * MpGroupKnm;
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

  // Wall-plate bending — Power Block units are the same NordBase Medium
  // shell used standalone elsewhere in this file, just several bolted
  // side-by-side under one shared adapter plate (Simon Gullberg, 2026-09-01:
  // "power block är bara våra fundament fast flera på rad så väggböjning är
  // samma" — Power Block is just our foundations, several in a row, so wall
  // bending is the same). Same formula as runCheck()'s wall-bending check,
  // using FOUNDATIONS.MEDIUM's confirmed wall gauge and shell-top width.
  // Demand is the group's governing moment split evenly across unitCount
  // foundations — the same "group demand / unitCount" simplifying
  // assumption already used for the rivet-shear check below (one unit's
  // tributary share, not a full FEA of load distribution through the shared
  // plate). This check was previously missing entirely for Power Block.
  const topShortMmPB =
    Math.min(FOUNDATIONS.MEDIUM.top.w, FOUNDATIONS.MEDIUM.top.d) * 25.4;
  const wallDemandMPa =
    ((governingMomentKnm / unitCount) * 1e6) /
    (2 * FOUNDATIONS.MEDIUM.wallThicknessMm * Math.pow(topShortMmPB / 2, 2));
  checks.push({
    key: "wall-bending",
    label: "Wall plate bending (per unit)",
    capacity: STEEL_BENDING_CAPACITY_MPA,
    demand: wallDemandMPa,
    unit: "MPa",
  });

  // Hat-profile rivet connection (one long side) — shear capacity confirmed
  // by Simon Gullberg 2026-09-01 (rivetCapacityEachKn = 4 kN per rivet,
  // 4.8mm SS304 blind rivet — no longer a placeholder). Conservative
  // simplifying assumption carried from the xlsx: one long side's rivets
  // must carry the full lateral demand of one end unit (group demand /
  // unitCount), direct shear only — moment/eccentricity in the joint is not
  // modeled.
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

  // Plate-to-foundation and charger-to-plate bolt tension.
  //
  // pitchIn CONFIRMED 2026-09-01 as the FULL center-to-center bolt spacing
  // across the tipping axis (same convention as runCheck()'s ccIn) — cross-
  // checked against Simon Gullberg's confirmed standalone bolt patterns: DC
  // Medium's own adapter-plate-to-foundation CC is 462.5×612.5mm, and
  // C503's plateToFoundation.pitchIn (612mm, i.e. mmToIn(612) here) is
  // exactly that same 612.5mm dimension carried over — C503 is 3 Medium
  // foundations sharing one plate, reusing Medium's own mounting pattern.
  // runCheck()'s proven formula for a FULL cc spacing is demand = M / cc
  // (lever arm = cc/2, demand = M / (2 * cc/2) = M/cc). The previous
  // formula here — M / (2 * pitchIn) — treated pitchIn as if it were
  // already the half-spacing lever arm, understating demand by 2x. Fixed to
  // match runCheck()'s convention on both bolt groups (same field
  // semantics, same code shape, so both had the same bug).
  //
  // CAPACITY (2026-09-01, Simon Gullberg): "Skala mot antal bultar - alltid!
  // Kapacitet ska vara baserat på antalet bultar mellan fundament och
  // adapterplåt ej skalad till endast 1 bult" — capacity is now count ×
  // one bolt's φNsa on BOTH connections, not the single-bolt-vs-total-demand
  // simplification used elsewhere in this file (that older convention was
  // deliberately conservative for a customer-entered/unknown bolt count;
  // here the count is a known, confirmed hardware spec, so using it directly
  // is both more accurate and what Simon asked for).
  //
  // MATERIAL: plate-to-foundation is the SAME physical connection as the
  // standalone-foundation mounting-bolt check below (same reused hole
  // pattern, per the pitchIn match above) — Simon's 2026-09-01 SS304 A2-70
  // spec for "bultar mellan fundament och adapterplåt" applies here too, so
  // this switches from the earlier (unconfirmed) M12 class 8.8 assumption
  // to BOLT_M12_A2_70_TENSION_CAPACITY_KN. Charger-to-plate stays class 8.8
  // — that's the charger OEM's own hardware, a separate, unconfirmed
  // assumption Simon has said Nordinfra doesn't own (see BOLT_M12_SPEC_LABEL
  // above), not the SS304 spec Simon just confirmed.
  const bolts = model.boltGroups;
  const demandPlateToFoundationKn =
    governingMomentKnm / inToM(bolts.plateToFoundation.pitchIn);
  checks.push({
    key: "bolt-plate-foundation",
    label: `Plate-to-foundation bolts (${bolts.plateToFoundation.count}×${BOLT_M12_A2_70_SPEC_LABEL.split(" ")[0]}) — tension`,
    capacity: bolts.plateToFoundation.count * BOLT_M12_A2_70_TENSION_CAPACITY_KN,
    demand: demandPlateToFoundationKn,
    unit: "kN",
  });

  const demandChargerToPlateKn =
    governingMomentKnm / inToM(bolts.chargerToPlate.pitchIn);
  checks.push({
    key: "bolt-charger-plate",
    label: `Charger-to-plate bolts (${bolts.chargerToPlate.count}×${BOLT_M12_SPEC_LABEL.split(" ")[0]}) — tension`,
    capacity: bolts.chargerToPlate.count * BOLT_M12_TENSION_CAPACITY_KN,
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
  const [companyName, setCompanyName] = useState(savedData.companyName ?? "");
  const [contactPhone, setContactPhone] = useState(savedData.contactPhone ?? "");
  const [projectState, setProjectState] = useState(savedData.projectState ?? "");
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
  const [submitStatus, setSubmitStatus] = useState("idle"); // idle | sending | sent | error
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
      companyName,
      contactPhone,
      projectState,
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
    companyName,
    contactPhone,
    projectState,
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

  // Site data must be a real, positive wind speed and a non-negative SDS —
  // NOT just "the field isn't empty". `!!windSpeed` alone treated the string
  // "0" (and "-5") as valid, since a non-empty string is truthy: a user who
  // cleared the field to 0 mph / 0g (or typed a negative SDS) could advance
  // past this step, and every downstream demand comes out 0 (or negative),
  // which makes every check DCR<=1 — a silent, wrong "PASS" on the final
  // report. windSpeed=0 is never physically valid (ASCE always specifies a
  // minimum mapped speed); SDS=0 is allowed (very low seismic sites exist)
  // but negative SDS is not.
  const windSpeedNum = Number(windSpeed);
  const sdsNum = Number(sds);
  const hasValidSiteData =
    windSpeed !== "" &&
    sds !== "" &&
    Number.isFinite(windSpeedNum) &&
    windSpeedNum > 0 &&
    Number.isFinite(sdsNum) &&
    sdsNum >= 0;

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
    hasValidSiteData,
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

  // Shared by both the mailto: fallback and the real submit-lead endpoint
  // below, so the two paths can never drift apart. Returns null if there's
  // no result yet (nothing to send).
  function buildSubmissionContent() {
    if (!result) return null;
    const subject = `NordBase calc — ${contactName || "Customer"} — ${
      foundation?.name || ""
    }`;
    const lines = [
      `${contactName || "(name not provided)"}${
        companyName ? ` (${companyName})` : ""
      } (${contactEmail || "email not provided"}${
        contactPhone ? `, ${contactPhone}` : ""
      }) has run a calculation on the following:`,
      "",
      `Project: ${projectName || "-"}`,
      `Address: ${address || "-"}${projectState ? `, ${projectState}` : ""}`,
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
    return { subject, text: lines.join("\n") };
  }

  function buildMailto() {
    const content = buildSubmissionContent();
    if (!content) return "#";
    const to = "info@nord-infra.com";
    return `mailto:${to}?subject=${encodeURIComponent(
      content.subject
    )}&body=${encodeURIComponent(content.text)}`;
  }

  // Real lead capture (2026-09-02) — replaces relying on the customer's own
  // email client actually being configured and them actually hitting send.
  // POSTs to a Vercel serverless function (api/submit-lead.js) which emails
  // Nordinfra directly. Falls back to the old mailto: link automatically if
  // the endpoint isn't reachable/configured yet (e.g. RESEND_API_KEY not set
  // in Vercel) — so this can ship before that setup step is done, and never
  // leaves the customer with a dead button.
  async function submitLead() {
    const content = buildSubmissionContent();
    if (!content) return;
    setSubmitStatus("sending");
    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: content.subject,
          text: content.text,
          consent: consentGiven,
          meta: {
            contactName,
            contactEmail,
            companyName,
            contactPhone,
            projectState,
            projectName,
            address,
            quantity,
            foundationKey,
            presetMfr,
            windSpeed,
            sds,
            packageType,
            governingCheck: result?.governing?.label,
            dcrPct: result ? Math.round(result.governing.dcr * 100) : null,
            pass: result?.pass ?? null,
          },
        }),
      });
      if (!res.ok) throw new Error(`status_${res.status}`);
      setSubmitStatus("sent");
    } catch (e) {
      // Server not reachable/configured — fall back to the customer's own
      // email client rather than leaving them stuck.
      setSubmitStatus("error");
      window.location.href = buildMailto();
    }
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
                <Field label="Company">
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
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
                <Field label="State">
                  <input
                    value={projectState}
                    onChange={(e) => setProjectState(e.target.value)}
                    placeholder="e.g. TX"
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
                <Field label="Phone">
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
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
                      min="1"
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
                      min="0"
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

              {/* Single download button (2026-09-02, per Simon Gullberg) —
                  the separate "Send calc to Nordinfra" button was removed.
                  Consent is now required to download at all (previously the
                  checkbox only gated the separate send button, and download
                  worked unconditionally) — checking it also lights the
                  button from its dimmed/"ljusgul" state to full gold.
                  Clicking it both submits the lead (submitLead(), same
                  serverless endpoint + mailto fallback as before) and opens
                  the browser print dialog for the package — the print/
                  download itself never waits on the network call. */}
              <button
                type="button"
                disabled={submitStatus === "sending"}
                onClick={() => {
                  if (!consentGiven) {
                    setShowConsentWarning(true);
                    return;
                  }
                  setShowConsentWarning(false);
                  submitLead();
                  window.print();
                }}
                className="print:hidden w-full py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 mb-2"
                style={{
                  background: brand.gold,
                  color: brand.dark,
                  opacity: consentGiven
                    ? submitStatus === "sending"
                      ? 0.7
                      : 1
                    : 0.4,
                  cursor:
                    submitStatus === "sending" ? "not-allowed" : "pointer",
                }}
              >
                <Download size={16} /> Download{" "}
                {PACKAGE_TYPES[packageType].label} package
              </button>
              {showConsentWarning && (
                <p
                  className="print:hidden text-xs text-center mt-1"
                  style={{ color: "#C0392B" }}
                >
                  Please check the box above before downloading.
                </p>
              )}
              {submitStatus === "sent" && (
                <p
                  className="print:hidden text-xs text-center mt-1"
                  style={{ color: "#2E7D32" }}
                >
                  <CheckCircle2
                    size={12}
                    style={{ display: "inline", marginRight: 4 }}
                  />
                  Sent to Nordinfra — we'll be in touch.
                </p>
              )}
              {submitStatus === "error" && (
                <p
                  className="print:hidden text-xs text-center mt-1"
                  style={{ color: brand.amber }}
                >
                  Couldn't reach our server — opened your email client
                  instead so you can still send it.
                </p>
              )}
              <p
                className="print:hidden text-xs text-center mt-2"
                style={{ color: brand.steel }}
              >
                The production version generates a formatted PDF + DWG + Word
                spec directly. Sends your details and this calculation
                straight to Nordinfra — see the Privacy Policy above for how
                that information is used.
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
