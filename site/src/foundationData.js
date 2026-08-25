// ---------------------------------------------------------------------------
// PRODUCT DETAIL DATA — one shared template page (product.html?f=<slug>)
// reads this instead of four separate static pages. Every number here is
// pulled directly from the FOUNDATIONS object in the calculator's
// NordBaseCalculator.jsx (source: Nordinfra_Master_USA_ASCE7_v6, confirmed
// 2026-08-21) — nothing here is estimated or re-derived. The calculator and
// this site are separate deployments with no shared imports, so this is kept
// in sync manually, same as PARTNERS and the document-library PDFs.
//
// HOW TO ADD/UPDATE A FOUNDATION: edit the matching entry below. If a
// dimension changes in the calculator's FOUNDATIONS object, mirror the
// change here too.
//
// CHARGER FOOTPRINTS — deliberately NOT presented as a per-foundation
// "compatible with X charger" claim. There is no verified foundation +
// manufacturer + model pairing on file yet (that's what
// ADAPTER_PLATE_DRAWINGS in the calculator is for, and it's currently
// empty). Instead this lists the manufacturers whose pedestal footprints
// are already dialed into the calculator's adapter-plate sizing tool, with
// an honest note that the plate is field-drillable to match essentially any
// pedestal charger — closer to EV Blocks' "universal adapter plate" framing,
// but naming the real manufacturers behind it since we do have that data.
// ---------------------------------------------------------------------------

export const CHARGER_MANUFACTURERS = [
  { name: "Kempower", models: 2 },
  { name: "ABB", models: 2 },
  { name: "Alpitronic", models: 2 },
  { name: "Tritium", models: 1 },
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
      "For Level 2 pedestal chargers — square adapter plate, three standard CC options.",
    blurb:
      "NordBase Small is sized for Level 2 pedestal chargers. Its square adapter plate ships with three standard center-to-center (CC) spacing options, or a custom dimension for any square hole pattern — the calculator generates the exact drawing once you pick your charger's footprint.",
    images: ["/photos/product-small.png", "/photos/assembly-small.png"],
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
      ccOptions: [6, 7.5, 9],
      note: null,
    },
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
    images: ["/photos/product-medium.png", "/photos/assembly-medium.png"],
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
      ccOptions: [],
      note: "Standard CC options for this size are still in development — enter your charger's exact footprint in the calculator for a custom-dimensioned plate today.",
    },
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
      ccOptions: [],
      note: "Adapter-plate dimensions and standard CC options for this size are still in development — contact Nordinfra with your charger's footprint for engineering support.",
    },
    structuralNote:
      "Global stability, wall-plate bending, and bolt tension are calculated per ASCE 7-22 / IBC 2021, the same methodology as NordBase Small/Medium. Local wall-panel buckling under backfill compaction load is a separate failure mode not covered by these checks and has not yet been independently verified for this larger panel size.",
    manual: null,
    baba: false,
  },
};

export const PRODUCT_ORDER = ["bollard", "small", "medium", "large"];
