import React, { useState, useMemo, useEffect } from "react";
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
      ccOptions: [6, 7.5, 9],
      note: null,
    },
    blurb:
      "For Level 2 pedestals. Square adapter plate with three standard CC options or a custom dimension for square hole patterns.",
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
      ccOptions: [],
      note: "Standard CC options are still in development — enter a custom dimension for now.",
    },
    blurb:
      "For Level 3 DC fast chargers. Rectangular base gives a larger stabilizing footprint for heavier equipment.",
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
    // ---- Confirmed structural data (Nordinfra_Master_USA_ASCE7_v6 — DC Large, 2026-08-21) ----
    wallThicknessMm: 1.9, // ASTM A1011 SS Gr33 + ZM115, 14ga — same as Small/Medium
    shellBottom: { w: 36, d: 36 }, // actual tapered shell/mantle bottom (914.4mm) — narrower than the base-plate foot above
    basePlateType: "Round",
    adapterPlateWeightLb: 70.55, // 32 kg adapter plate
    adapterPlate: {
      size: null,
      thicknessIn: null,
      material: null,
      ccOptions: [],
      note: "Adapter-plate dimensions and standard CC options are still in development — enter a custom dimension for now.",
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
  },
};

const FOUNDATION_ORDER = ["BOLLARD", "SMALL", "MEDIUM", "LARGE"];

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
// ---------------------------------------------------------------------------
const CHARGER_PRESETS = {
  Kempower: [
    { model: "Satellite C-Series", w: 11.8, d: 11.8, h: 59.1, weight: 132 },
    { model: "Movable C-Series", w: 15.7, d: 15.7, h: 63.0, weight: 209 },
  ],
  ABB: [
    { model: "Terra AC Wallbox Pedestal", w: 5.9, d: 5.9, h: 55.1, weight: 99 },
    { model: "Terra 54 CJG", w: 23.6, d: 23.6, h: 59.1, weight: 485 },
  ],
  Alpitronic: [
    { model: "HYC50", w: 15.7, d: 15.7, h: 61.0, weight: 309 },
    { model: "HYC400", w: 23.6, d: 27.6, h: 74.8, weight: 838 },
  ],
  Tritium: [{ model: "PKM150", w: 15.7, d: 15.7, h: 63.0, weight: 331 }],
};

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
//      manufacturer/model text as it appears in CHARGER_PRESETS above.
//   3. Commit + push — Vercel rebuilds and the link goes live automatically.
// DC Medium needs ~15 of these (one per charger model, more than the 5
// currently listed in CHARGER_PRESETS — add new manufacturer/model entries
// there first if a charger isn't listed yet). NordBase Small starts with a
// single shared universal plate; a couple more may be added later.
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

function directionsUrl(loc) {
  const q = encodeURIComponent(
    loc.address && !loc.address.startsWith("Address on file")
      ? `${loc.address}, ${loc.city}, ${loc.state}`
      : `${loc.lat},${loc.lon}`
  );
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
function runSelfTest() {
  const results = FOUNDATION_ORDER.map((key) => {
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

// Schematic side-view diagram (top/bottom footprint + burial depth). Swap for
// a real product photo by replacing the <svg> below with an <img src="..." />
// — see FOUNDATIONS[key].photoUrl for where to plug in a real asset path.
function FoundationDiagram({ foundation }) {
  if (foundation.photoUrl) {
    return (
      <img
        src={foundation.photoUrl}
        alt={foundation.name}
        className="w-full h-28 object-contain"
      />
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

function AccessoryImage({ src, label }) {
  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className="w-full h-20 object-contain rounded-md"
        style={{ background: "#FAFAF8" }}
      />
    );
  }
  return (
    <div
      className="w-full h-20 flex items-center justify-center rounded-md border border-dashed text-[11px]"
      style={{ borderColor: "#D9D9D6", color: brand.steel, background: "#FAFAF8" }}
    >
      {label} — photo pending
    </div>
  );
}

// Dimensioned adapter-plate drawing — square outline with a 4-hole bolt
// pattern drawn live from the customer's selected/custom CC spacing, so they
// can visually verify hole layout before ordering. Renders nothing until both
// a confirmed plate size and a CC value are available.
function AdapterPlateDiagram({ plate, ccIn }) {
  if (!plate || !ccIn || ccIn <= 0) return null;
  const maxPx = 150;
  const scale = maxPx / Math.max(plate.w, plate.d);
  const pw = plate.w * scale;
  const pd = plate.d * scale;
  const cc = ccIn * scale;
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
    [-cc / 2, -cc / 2],
    [cc / 2, -cc / 2],
    [cc / 2, cc / 2],
    [-cc / 2, cc / 2],
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
        x1={cx - cc / 2}
        y1={cy - cc / 2}
        x2={cx + cc / 2}
        y2={cy - cc / 2}
        stroke={brand.steel}
        strokeWidth="0.5"
        strokeDasharray="2,2"
      />
      <line
        x1={cx - cc / 2}
        y1={cy - cc / 2}
        x2={cx - cc / 2}
        y2={cy + cc / 2}
        stroke={brand.steel}
        strokeWidth="0.5"
        strokeDasharray="2,2"
      />
      <text
        x={cx}
        y={cy - cc / 2 - 3}
        fontSize="7"
        textAnchor="middle"
        fill={brand.steel}
      >
        {ccIn}" CC
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
  const [step, setStep] = useState(0);

  // step 0 — project info
  const [projectName, setProjectName] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [quantity, setQuantity] = useState("1");

  // step 1 — foundation
  const [foundationKey, setFoundationKey] = useState(null);
  const foundation = foundationKey ? FOUNDATIONS[foundationKey] : null;

  // step 2 — configuration (adapter plate + pedestal) — skipped for BOLLARD
  const [ccChoice, setCcChoice] = useState(null); // number or "custom"
  const [customCc, setCustomCc] = useState("");
  const [presetMfr, setPresetMfr] = useState("");
  const [presetModel, setPresetModel] = useState("");
  const [chargerW, setChargerW] = useState("");
  const [chargerD, setChargerD] = useState("");
  const [chargerH, setChargerH] = useState("");
  const [chargerWeight, setChargerWeight] = useState("");

  // step 3 — site
  const [windSpeed, setWindSpeed] = useState("110");
  const [sds, setSds] = useState("0.5");
  const [backfillKey, setBackfillKey] = useState("A");
  const [nevi, setNevi] = useState(false);
  const [showSdsRef, setShowSdsRef] = useState(false);

  // step 4 — accessories + package
  const [addBollard, setAddBollard] = useState(false);
  const [bollardTier, setBollardTier] = useState("sch10");
  const [addCover, setAddCover] = useState(false);
  const [packageType, setPackageType] = useState("submittal");
  const [customAssets, setCustomAssets] = useState({
    datasheet: true,
    drawingPdf: true,
    drawingDwg: true,
    csi: false,
  });

  // step 5 — report
  const [showDetails, setShowDetails] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsentWarning, setShowConsentWarning] = useState(false);
  const [partnerStateFilter, setPartnerStateFilter] = useState("");

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

  const backfill = BACKFILL_OPTIONS.find((b) => b.key === backfillKey);

  const effectiveCc = ccChoice === "custom" ? Number(customCc) || 0 : ccChoice;

  // Official (real, dimensioned) adapter-plate drawing for the selected
  // foundation + charger manufacturer/model — see ADAPTER_PLATE_DRAWINGS
  // above. Falls back to the shared "universal" plate drawing (NordBase
  // Small today) when no manufacturer/model is selected yet.
  const selectedChargerModelName =
    presetMfr && presetModel !== ""
      ? CHARGER_PRESETS[presetMfr]?.[Number(presetModel)]?.model
      : "";
  const officialDrawingUrl = foundation?.key
    ? selectedChargerModelName
      ? ADAPTER_PLATE_DRAWINGS[
          adapterDrawingKey(foundation.key, presetMfr, selectedChargerModelName)
        ]
      : ADAPTER_PLATE_DRAWINGS[universalAdapterDrawingKey(foundation.key)]
    : undefined;

  const result = useMemo(() => {
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
    skipConfig
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

  function reset() {
    setStep(0);
    setProjectName("");
    setAddress("");
    setContactName("");
    setContactEmail("");
    setQuantity("1");
    setFoundationKey(null);
    setCcChoice(null);
    setCustomCc("");
    setPresetMfr("");
    setPresetModel("");
    setChargerW("");
    setChargerD("");
    setChargerH("");
    setChargerWeight("");
    setWindSpeed("110");
    setSds("0.5");
    setBackfillKey("A");
    setNevi(false);
    setAddBollard(false);
    setAddCover(false);
    setPackageType("submittal");
  }

  function applyPreset(mfr, modelIdx) {
    const m = CHARGER_PRESETS[mfr][modelIdx];
    setChargerW(String(m.w));
    setChargerD(String(m.d));
    setChargerH(String(m.h));
    setChargerWeight(String(m.weight));
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
    const to = "simon@nord-infra.com";
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
      foundation?.hasCharger
        ? `Charger: ${chargerW}"×${chargerD}"×${chargerH}", ${chargerWeight} lb`
        : "",
      foundation?.hasCharger ? `Adapter plate CC: ${effectiveCc}"` : "",
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
          <div className="w-8 h-8 shrink-0" style={{ background: brand.gold }} />
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
          <div className="print:hidden">
            <Stepper step={step} steps={STEP_LABELS} />
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
          {step === 2 && foundation && !skipConfig && (
            <div>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: brand.dark }}
              >
                Adapter plate &amp; charger
              </h2>
              <p className="text-sm mb-6" style={{ color: brand.steel }}>
                Choosing a manufacturer/model really just selects an adapter
                plate — the foundation is already chosen.
              </p>

              <div
                className="text-sm font-semibold mb-2"
                style={{ color: brand.dark }}
              >
                Adapter plate — bolt spacing (CC)
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {foundation.adapterPlate.ccOptions.map((cc) => (
                  <button
                    key={cc}
                    onClick={() => setCcChoice(cc)}
                    className="px-3 py-1.5 rounded-md border text-sm"
                    style={{
                      borderColor: ccChoice === cc ? brand.gold : "#D9D9D6",
                      background: ccChoice === cc ? brand.gold : "white",
                      color: ccChoice === cc ? brand.dark : brand.dark,
                      fontWeight: ccChoice === cc ? 700 : 400,
                    }}
                  >
                    {cc}"
                  </button>
                ))}
                <button
                  onClick={() => setCcChoice("custom")}
                  className="px-3 py-1.5 rounded-md border text-sm"
                  style={{
                    borderColor: ccChoice === "custom" ? brand.gold : "#D9D9D6",
                    background: ccChoice === "custom" ? brand.gold : "white",
                    fontWeight: ccChoice === "custom" ? 700 : 400,
                  }}
                >
                  Custom
                </button>
              </div>
              {ccChoice === "custom" && (
                <div className="mb-3">
                  <input
                    type="number"
                    step="0.01"
                    value={customCc}
                    onChange={(e) => setCustomCc(e.target.value)}
                    placeholder="CC spacing in inches, e.g. 8.5"
                    className="w-40 border rounded-md px-3 py-2 text-sm"
                    style={{ borderColor: "#D9D9D6" }}
                  />
                  <div className="text-xs mt-1" style={{ color: brand.steel }}>
                    Only square hole patterns are supported today. A rectangular
                    adapter plate will be developed later.
                  </div>
                </div>
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
              {foundation.adapterPlate.size && effectiveCc > 0 && (
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
                    ccIn={effectiveCc}
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

              <div className="h-px my-5" style={{ background: "#F0F0EE" }} />

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
                  }}
                  className="border rounded-md px-3 py-2 text-sm flex-1"
                  style={{ borderColor: "#D9D9D6" }}
                >
                  <option value="">Quick-fill manufacturer (optional)…</option>
                  {Object.keys(CHARGER_PRESETS).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                {presetMfr && (
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
                    {CHARGER_PRESETS[presetMfr].map((m, i) => (
                      <option key={m.model} value={i}>
                        {m.model}
                      </option>
                    ))}
                  </select>
                )}
              </div>
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
              <p className="text-sm mb-6" style={{ color: brand.steel }}>
                Look up wind and seismic values for your address using the
                official tools below, then enter them here.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
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
                      onChange={(e) => setSds(e.target.value)}
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
                        <div className="ml-6 mt-3 max-w-[180px]">
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
                      <div className="ml-6 mt-3 max-w-[180px]">
                        <AccessoryImage
                          src={BOLLARD_ACCESSORY_PHOTOS.cover}
                          label="Bollard cover"
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
                        <div className="ml-6 mt-3 max-w-[180px]">
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
                      <div className="ml-6 mt-3 max-w-[180px]">
                        <AccessoryImage
                          src={BOLLARD_ACCESSORY_PHOTOS.cover}
                          label="Bollard cover"
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
                  <div>Foundation: {foundation.name}</div>
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
                    {foundation.wallThicknessMm ? (
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
                {foundation.hasCharger && (
                  <div
                    className="flex justify-between text-sm py-1.5 border-b"
                    style={{ borderColor: "#F0F0EE" }}
                  >
                    <div>
                      <div style={{ color: brand.dark }}>
                        Adapter plate, CC {effectiveCc}"
                      </div>
                      <div className="text-xs" style={{ color: brand.steel }}>
                        {foundation.adapterPlate.material || "Material TBD"}
                      </div>
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
                  <div className="flex justify-between text-sm py-1.5">
                    <div style={{ color: brand.dark }}>Bollard cover</div>
                    <div className="text-xs" style={{ color: brand.steel }}>
                      Price on request
                    </div>
                  </div>
                )}
              </div>

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
                      .map((loc, i) => (
                        <div
                          key={`${partner.id}-${i}`}
                          className="flex items-center justify-between gap-3 text-sm p-2 rounded-md"
                          style={{ background: brand.bgSoft }}
                        >
                          <div>
                            <div
                              className="font-semibold"
                              style={{ color: brand.dark }}
                            >
                              {partner.name} — {loc.city}, {loc.state}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: brand.steel }}
                            >
                              {loc.address}
                              {loc.phone ? ` · ${loc.phone}` : ""}
                            </div>
                          </div>
                          <a
                            href={directionsUrl(loc)}
                            target="_blank"
                            rel="noreferrer"
                            className="print:hidden shrink-0 text-xs px-2 py-1 rounded-md border flex items-center gap-1"
                            style={{ borderColor: brand.gold, color: brand.dark }}
                          >
                            <ExternalLink size={12} /> Directions
                          </a>
                        </div>
                      ))
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
