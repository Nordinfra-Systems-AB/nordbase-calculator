// =====================================================================================
// NORDBASE SHARED CHARGER + ADAPTER PLATE DATA
// -----------------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for both the calculator app (src/NordBaseCalculator.jsx,
// one directory up) and the marketing site (site/src/foundationData.js, two
// directories down from there). Both apps import the three exports below instead
// of keeping their own copies — moved here 2026-09-01 specifically to kill the
// "kalkylator and site drift out of sync" bug class (stale manufacturer/model
// counts, "models coming soon" text that didn't match reality, etc. — several of
// these were caught and fixed by hand across 2026-08-31).
//
// HOW TO UPDATE: edit the relevant preset object below (same shape as before —
// nothing about the data itself changed in this move, only where it lives).
// Both the calculator and the site pick up the change automatically on next
// build — no need to touch anything in NordBaseCalculator.jsx or
// foundationData.js for a data-only change (new model, new CC value, renamed
// manufacturer, etc). You only need to touch those other two files if you're
// adding a NEW manufacturer/model GROUP KEY that a UI dropdown needs to know
// about structurally (rare) — a new model under an EXISTING manufacturer key
// needs no other file changes at all.
// =====================================================================================

// Unit-conversion helpers used by the POWER_BLOCK_MODELS data below (some
// manufacturer datasheets give mm/kg, some give in/lb — converted to in/lb
// at the data layer so every model has consistent units downstream). Not
// used anywhere else in this file's data, so kept local here rather than
// imported from NordBaseCalculator.jsx (which has its own copies used for
// live structural calculations — keeping these decoupled avoids a
// site → calculator dependency that has no reason to exist).
const mmToIn = (mm) => mm / 25.4;
const kgToLb = (kg) => kg * 2.2046226;

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
export const POWER_BLOCK_MODELS = {
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
export const PEDESTAL_CHARGER_PRESETS = {
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
export const DC_FAST_CHARGER_PRESETS = {
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
