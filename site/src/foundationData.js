// ---------------------------------------------------------------------------
// PRODUCT DETAIL DATA — one shared template page (product.html?f=<slug>)
// reads this instead of four separate static pages. Every number here is
// pulled directly from the FOUNDATIONS/CHARGER_PRESETS objects in the
// calculator's NordBaseCalculator.jsx — nothing here is estimated or
// re-derived. The calculator and this site are separate deployments with no
// shared imports, so this is kept in sync manually, same as PARTNERS and the
// document-library PDFs.
//
// HOW TO ADD/UPDATE A FOUNDATION: edit the matching entry below. If a
// dimension changes in the calculator's FOUNDATIONS object, mirror the
// change here too.
//
// CHARGER/PEDESTAL COMPATIBILITY (updated 2026-08-26 to match the
// calculator's PEDESTAL_CHARGER_PRESETS/DC_FAST_CHARGER_PRESETS split +
// adapter-plate grid rework) — each product's `chargerManufacturers` list is
// scoped to that product only. SMALL has a verified pedestal-bolt-pattern
// survey on file, so its entries carry real model counts. MEDIUM/LARGE now
// also list manufacturers (the DC fast charger brands Simon named
// 2026-08-26), but every entry has `models: 0` — no dimensions/bolt patterns
// on file yet ("jag återkommer med olika modeller för samtliga"). See how
// ProductApp.jsx's chargerManufacturers section renders the two differently:
// a manufacturer with models shows a count pill, a manufacturer with none
// shows a "models coming soon" note instead. This still isn't a "verified
// foundation + manufacturer + model pairing" claim (that's what
// ADAPTER_PLATE_DRAWINGS in the calculator is for, and it's currently
// empty) — it lists the manufacturers whose footprints are (or will be)
// dialed into the calculator's sizing tool.
// ---------------------------------------------------------------------------

// DC fast charger manufacturers for Medium/Large (freestanding Level 3/4
// units, not pedestals) — list + alphabetical order per Simon Gullberg,
// 2026-08-26. Mirrors DC_FAST_CHARGER_PRESETS in NordBaseCalculator.jsx.
// UPDATED 2026-08-31 to match the calculator's real model counts (42 models
// total across Medium+Large, from the 2026-08-31 60-model verified dataset)
// — most manufacturers now have real models on file, so most entries no
// longer show `models: 0`. A manufacturer still at 0 (BTC Power, FreeWire)
// genuinely has no dimensions/bolt patterns on file yet in the calculator.
// Also added "Blink Charging", "InCharge Energy", Wallbox, "Zerova (Phihong)"
// — present in the calculator's DC_FAST_CHARGER_PRESETS but missing from
// this list before. See the `chargerManufacturers` rendering below for how a
// manufacturer with zero models on file is shown differently from one with
// confirmed models.
const DC_FAST_CHARGER_MANUFACTURERS = [
  { name: "ABB", models: 3 },
  { name: "Alpitronic", models: 3 },
  { name: "Autel", models: 5 },
  { name: "Blink Charging", models: 2 },
  { name: "BTC Power", models: 0 },
  { name: "ChargePoint", models: 3 },
  { name: "Delta Electronics", models: 1 },
  { name: "Ekoenergetyka", models: 4 },
  { name: "FreeWire", models: 0 },
  { name: "InCharge Energy", models: 3 },
  { name: "Kempower", models: 2 },
  { name: "Power Electronics", models: 5 },
  { name: "Siemens", models: 3 },
  { name: "Tesla", models: 1 },
  { name: "Tritium", models: 4 },
  { name: "Wallbox", models: 1 },
  { name: "Zerova (Phihong)", models: 2 },
];

// Power Block manufacturers — its own separate list (NOT the Medium/Large
// list above). Added 2026-08-31 to match POWER_BLOCK_MODELS in
// NordBaseCalculator.jsx (16 models total, all `configPending: true` —
// cabinet dimensions are confirmed manufacturer datasheet data, but
// single-vs-group foundation configuration is still pending Nordinfra PE
// review; see the note on POWER_BLOCK_MODELS in the calculator). Previously
// this product wrongly reused DC_FAST_CHARGER_MANUFACTURERS.
const POWER_BLOCK_MANUFACTURERS = [
  { name: "ABB", models: 2 },
  { name: "Autel", models: 1 },
  { name: "Kempower", models: 4 },
  { name: "Power Electronics", models: 2 },
  { name: "Siemens", models: 3 },
  { name: "Tesla", models: 1 },
  { name: "Tritium", models: 3 },
];

export const PRODUCTS = {
  bollard: {
    slug: "bollard",
    key: "BOLLARD",
    name: "NordBase Bollard",
    subtitle: "AC foundation",
    level: "Bollard",
    levelDesc: "No charger foundation",
    tagline:
      "Standalone protective foundation for a bollard or post — the smallest, lightest model in the lineup.",
    blurb:
      "NordBase Bollard is a foundation for a standalone bollard or protective post, not a charger — no adapter plate, no CC spacing to configure. It shares the same laser-cut, hot-dip galvanized steel construction as the rest of the NordBase line, and installs the same way: dig, drop in, backfill, done in a day.",
    images: ["/photos/product-bollard.png", "/photos/assembly-ac.png"],
    hasCharger: false,
    dims: {
      top: { w: 7.6, d: 7.6 },
      bottom: { w: 14.2, d: 14.2 },
      depthIn: 19.8,
      weightLb: 16.3,
      basePlateType: "Round",
    },
    material: "1.9mm ASTM A1011 SS Gr33 + ZM115 coating, 14ga wall thickness.",
    adapterPlate: null,
    manual: "/docs/manuals/NI_Manual_AC_001_US.pdf",
    baba: true,
  },
  small: {
    slug: "small",
    key: "SMALL",
    name: "NordBase Small",
    subtitle: "DC foundation",
    level: "Level 2",
    levelDesc: "Pedestal-mounted chargers",
    tagline:
      "For Level 2 pedestal chargers — a grid of confirmed hole positions covers square and rectangular bolt patterns.",
    blurb:
      "NordBase Small is sized for Level 2 pedestal chargers. Its adapter plate has a grid of confirmed hole positions — square or rectangular — or a custom dimension for anything not yet on the grid. Pick your pedestal in the calculator and it fills in the exact bolt spacing automatically wherever we have a confirmed match.",
    images: [
      "/photos/product-small.png",
      "/photos/assembly-small.png",
      "/photos/small-pedestal-full.png",
      "/photos/small-pedestal-detail.png",
      "/photos/small-sensor-detail1.png",
      "/photos/small-sensor-detail2.png",
    ],
    hasCharger: true,
    dims: {
      top: { w: 12, d: 12 },
      bottom: { w: 22.2, d: 22.2 },
      depthIn: 25.8,
      weightLb: 33.16,
      basePlateType: "Round",
    },
    material: "1.9mm ASTM A1011 SS Gr33 + ZM115 coating, 14ga wall thickness.",
    adapterPlate: {
      size: { w: 13.39, d: 13.39 },
      thicknessIn: 0.25,
      material: '1/4" A36, hot-dip galvanized',
      weightLb: 11.02,
      ccOptionsX: [6, 8, 9, 10.6],
      ccOptionsY: [5, 6, 8, 9, 10.6],
      note: null,
    },
    chargerManufacturers: [
      { name: "Kempower", models: 1 },
      { name: "ABB", models: 1 },
      { name: "WiLLev", models: 1 },
      { name: "Postlane", models: 2 },
      { name: "Pedestal PRO", models: 1 },
      { name: "BHS", models: 1 },
      { name: "Eaton", models: 1 },
      { name: "Leviton", models: 2 },
      { name: "Chargepoint", models: 1 },
    ],
    manual: "/docs/manuals/NI_Manual_DCS_001_US.pdf",
    baba: true,
  },
  medium: {
    slug: "medium",
    key: "MEDIUM",
    name: "NordBase Medium",
    subtitle: "DC foundation",
    level: "Level 3",
    levelDesc: "DC fast chargers",
    tagline:
      "For Level 3 DC fast chargers — rectangular base for a larger stabilizing footprint.",
    blurb:
      "NordBase Medium is built for Level 3 DC fast chargers. Its rectangular base plate gives heavier equipment a wider stabilizing footprint than the square Small tier, and it shares the same passive-pressure-engineered backfill approach across the whole line.",
    images: [
      "/photos/product-medium.png",
      "/photos/assembly-medium.png",
      "/photos/medium-nested-stack.png",
      "/photos/medium-shells-angle1.png",
      "/photos/medium-shells-angle2.png",
      "/photos/medium-array-front.png",
      "/photos/medium-single-iso.png",
      "/photos/medium-assembly-iso1.png",
      "/photos/medium-assembly-iso2.png",
      "/photos/medium-assembly-iso3.png",
    ],
    hasCharger: true,
    dims: {
      top: { w: 19.6, d: 25.6 },
      bottom: { w: 31.2, d: 39.4 },
      depthIn: 25.8,
      weightLb: 61.26,
      basePlateType: "Oval",
    },
    material: "1.9mm ASTM A1011 SS Gr33 + ZM115 coating, 14ga wall thickness.",
    adapterPlate: {
      size: { w: 28.7, d: 24.8 },
      thicknessIn: 0.25,
      material: '1/4" A36, hot-dip galvanized',
      weightLb: 44.09,
      ccOptionsX: [],
      ccOptionsY: [],
      note: "Standard CC options for this size are still in development — enter your charger's exact footprint in the calculator for a custom-dimensioned plate today.",
    },
    chargerManufacturers: DC_FAST_CHARGER_MANUFACTURERS,
    manual: null,
    baba: true,
  },
  large: {
    slug: "large",
    key: "LARGE",
    name: "NordBase Large",
    subtitle: "DC foundation",
    level: "Level 4",
    levelDesc: "High-power DC",
    tagline:
      "For Level 4 / high-power DC charging — widened base plate, reinforced shell.",
    blurb:
      "NordBase Large is the top of the lineup, for Level 4 and other high-power DC charging equipment. It carries a widened round base plate and reinforced shell to handle the heaviest pedestal loads in the range.",
    images: ["/photos/product-large.png"],
    hasCharger: true,
    dims: {
      top: { w: 32, d: 32 },
      bottom: { w: 47, d: 47 },
      depthIn: 25.8,
      weightLb: 99.21,
      basePlateType: "Round",
    },
    material: "1.9mm ASTM A1011 SS Gr33 + ZM115 coating, 14ga wall thickness.",
    adapterPlate: {
      size: null,
      thicknessIn: null,
      material: null,
      weightLb: 70.55,
      ccOptionsX: [],
      ccOptionsY: [],
      note: "Adapter-plate dimensions and standard CC options for this size are still in development — contact Nordinfra with your charger's footprint for engineering support.",
    },
    chargerManufacturers: DC_FAST_CHARGER_MANUFACTURERS,
    structuralNote:
      "Global stability, wall-plate bending, and bolt tension are calculated per ASCE 7-22 / IBC 2021, the same methodology as NordBase Small/Medium. Local wall-panel buckling under backfill compaction load is a separate failure mode not covered by these checks and has not yet been independently verified for this larger panel size.",
    manual: null,
    baba: false,
  },
  powerblock: {
    slug: "powerblock",
    key: "POWERBLOCK",
    name: "NordBase Power Block",
    subtitle: "DC foundation",
    level: "Power Block",
    levelDesc: "Grouped DC power cabinets",
    tagline:
      "For grouped Power Units — multiple DC fast charging power cabinets sharing one modular steel base.",
    blurb:
      "NordBase Power Block extends the same modular steel platform to grouped Power Units — the multi-cabinet DC fast charging power blocks (like Kempower's multi-CPU units) that sit alongside dispenser pedestals on a DC fast charging site. It's built with adapter plates the same way as the rest of the NordBase line, sized to the cabinet count and footprint of the specific power block being installed, and shares the same laser-cut, hot-dip galvanized steel construction and dig-drop-backfill install method as every other NordBase tier.",
    images: [
      "/photos/powerblock-bare-foundation.png",
      "/photos/powerblock-kempower-mounted-front.png",
      "/photos/powerblock-kempower-mounted-bollards.png",
    ],
    hasCharger: true,
    // Dimensions vary by cabinet count/footprint and haven't been reduced to
    // a single spec sheet yet — omit `dims` rather than invent numbers; the
    // Dimensions section below renders a "contact Nordinfra" note instead
    // whenever a product has no `dims` object.
    dims: null,
    material:
      "Same laser-cut, hot-dip galvanized steel construction as the rest of the NordBase line. Because a Power Block spans multiple power cabinets, gauge and plate thickness are sized to the specific configuration rather than fixed per tier.",
    adapterPlate: {
      size: null,
      thicknessIn: null,
      material: null,
      weightLb: null,
      ccOptionsX: [],
      ccOptionsY: [],
      note: "Adapter-plate dimensions for grouped Power Block configurations are still in development — contact Nordinfra with your cabinet count and footprint for engineering support.",
    },
    chargerManufacturers: POWER_BLOCK_MANUFACTURERS,
    manual: null,
    baba: false,
  },
};

export const PRODUCT_ORDER = ["bollard", "small", "medium", "large", "powerblock"];

// ---------------------------------------------------------------------------
// ACCESSORIES — same three add-ons the calculator offers on every foundation
// (Simon, 2026-08-26: product landing pages should show "våra tillbehör" —
// "samma logik på alla fundament"). Mirrors NordBaseCalculator.jsx's Step 4
// (addBollard/addCover/addSensorPole) — kept in sync manually like the rest
// of this file. Bollard mounts directly on NordBase Bollard itself, or as a
// standalone assembly (its own foundation + pole) alongside any charger
// foundation; the cover and sensor pole work the same way everywhere.
// ---------------------------------------------------------------------------
export const ACCESSORIES = [
  {
    key: "bollard",
    name: "Bollard",
    image: "/photos/accessory-bollard-sch10.png",
    blurb:
      "Schedule 10 (standard) or Schedule 40, Duplex — a protective bollard pole configured in the calculator alongside your foundation.",
  },
  {
    key: "cover",
    name: "Bollard cover",
    image: "/photos/accessory-bollard-cover.png",
    blurb:
      "Snap-on cover for the bollard pole. Requires the bollard above — many pedestals already include their own base cover.",
  },
  {
    key: "sensor-pole",
    name: "Sensor pole (collision-protection frame)",
    image: "/photos/accessory-sensor-pole.png",
    blurb:
      'Two-post frame that straddles the foundation to shield a sensor/camera pole from vehicle contact. ~34 lb assembly, 40.7"×33.7" footprint. Frame hot-dip galvanized per ASTM A123; the two stainless posts are powder-coated OSHA safety yellow and ship separately.',
  },
];
