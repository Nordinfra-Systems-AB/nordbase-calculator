// =====================================================================================
// MERGE: database-sourced charger identity  ->  hand-maintained charger presets
// -----------------------------------------------------------------------------------
// Added 2026-09-25, per the narrowed scope in
// NordBase_Databas_Hemsida_Kalkylator_Radata_Synk_Skiss_20260925.md (project docs):
// Simon wants a new charger manufacturer/model he links in nordbase-backend's admin
// to show up in the calculator's dropdown automatically, with the right adapter-plate
// part.no once he links one — nothing more.
//
// HARD RULE, carried over from that doc and confirmed directly by Simon ("Jag tycker
// inte att vi rör vår lastberäkning"): this file NEVER touches runCheck()/
// calcStability() itself, and it NEVER invents or overwrites a physical/structural
// value. An entry that already exists in PEDESTAL_CHARGER_PRESETS / DC_FAST_CHARGER_
// PRESETS (shared/chargerData.js) is passed through completely untouched — its
// hand-confirmed dimensions, weight and CC/bolt-pattern values always win, no matter
// what the database says. This function only ADDS an entry for a charger model that
// exists in the database's charger_compatibility but has no hand-maintained entry
// yet, and that new entry carries ONLY identity data (model name, adapter-plate
// part.no) — every physical field is left null, exactly like the existing
// "we don't have a confirmed adapter-plate hole pattern yet" case already in the
// hand-maintained data (see e.g. Autel "MaxiCharger DC Fast DF120" in chargerData.js).
// NordBaseCalculator.jsx is responsible for never auto-filling a null field into the
// structural inputs (chargerW/D/H/Weight, ccW/ccD) — see applyPreset there.
//
// Deliberately scoped to SMALL/MEDIUM/LARGE only (PEDESTAL_CHARGER_PRESETS /
// DC_FAST_CHARGER_PRESETS) — POWER_BLOCK_MODELS has a completely different shape
// (unitCount, hat-profile group hardware, dataConfirmed/configPending flags) and is
// not part of this pass. Bollard has no charger step at all.
//
// 2026-09-25 UPDATE to the hard rule above, confirmed directly by Simon in chat
// the same day: a NEW charger model IS now allowed to carry real w/d/h/weight/
// ccW/ccD values from the database -- but ONLY once an admin has explicitly
// confirmed them in nordbase-backend (charger_model.dimensions_confirmed = true,
// checked against the manufacturer datasheet/drawing; see chargerModels.ts and
// charger-detail.js there). /public/charger-compatibility only ever includes the
// six physical fields at all once that flag is true (see src/routes/public.ts) --
// an unconfirmed model still comes through with every physical field absent, so
// the "entry carries ONLY identity data" behavior above is exactly what still
// happens for those. Simon: "Jag vill helst inte att en kund ska fylla i
// uppgifter som påverkar beräkningar... beräkning hämtar sin beräkningsdata
// från de inmatade dimensionerna och vikten" -- once Nordinfra has verified a
// model's numbers, the customer shouldn't re-enter or be able to override them;
// NordBaseCalculator.jsx enforces that by disabling the width/depth/height/
// weight inputs whenever presetModelData.dimensionsConfirmed is true. STILL
// true, unchanged: calcStability()/runCheck() themselves are never touched by
// this file -- this only changes which value (and whether it's editable)
// prefills an already-existing input field.

// Foundation part.no -> the foundation key this preset set belongs under. Matches
// the FOUNDATIONS.<KEY>.partNumber values added to NordBaseCalculator.jsx on
// 2026-09-25 (100200 Small / 100300 Medium / 100400 Large) — same source of truth,
// so a charger's foundation-compatibility link in the database tells us exactly
// which dropdown it belongs in, rather than guessing from charger_type.
export const FOUNDATION_PART_NUMBER_TO_KEY = {
  100200: "SMALL",
  100300: "MEDIUM",
  100400: "LARGE",
};

// Deliberate local duplicate of chargerData.js's own private mmToIn/kgToLb
// (not exported from there on purpose -- see that file's comment above its
// copies) rather than a new cross-file dependency; same formula, same reason
// to keep this file decoupled from chargerData.js's data-authoring concerns.
const mmToIn = (mm) => mm / 25.4;
const kgToLb = (kg) => kg * 2.2046226;

function modelDisplayName(charger) {
  return charger.modelVariant ? `${charger.modelName} ${charger.modelVariant}` : charger.modelName;
}

// basePresets: a manufacturer -> model[] object (PEDESTAL_CHARGER_PRESETS or
// DC_FAST_CHARGER_PRESETS as imported from chargerData.js).
// chargerCompatibility: the array from productCatalog.generated.json's
// `chargerCompatibility` key (see scripts/fetchProductCatalog.mjs / the
// /public/charger-compatibility endpoint in nordbase-backend).
// foundationKey: "SMALL" | "MEDIUM" | "LARGE" — which preset set this is for.
export function mergeGeneratedChargerCompatibility(basePresets, chargerCompatibility, foundationKey) {
  if (!Array.isArray(chargerCompatibility) || chargerCompatibility.length === 0) {
    return basePresets;
  }

  // Shallow-clone so the hand-maintained source objects/arrays from
  // chargerData.js are never mutated in place.
  const merged = {};
  for (const [mfr, models] of Object.entries(basePresets)) {
    merged[mfr] = models.map((m) => ({ ...m }));
  }

  for (const charger of chargerCompatibility) {
    const foundationLink = charger.compatibility.find((c) => c.fitType === "foundation");
    if (!foundationLink) continue; // not linked to any foundation yet -- nothing to add
    if (FOUNDATION_PART_NUMBER_TO_KEY[foundationLink.partNumber] !== foundationKey) continue;

    // Match the database's manufacturer name against an existing hand-
    // maintained key case-insensitively before creating a new one --
    // chargerData.js spells at least one manufacturer two different ways
    // across the two preset sets ("Chargepoint" in PEDESTAL_CHARGER_PRESETS/
    // SMALL, "ChargePoint" in DC_FAST_CHARGER_PRESETS/MEDIUM+LARGE -- see
    // MANUFACTURER_TO_CLICKUP_OPTION's comment on the same inconsistency in
    // the calculator's api/submit-lead.js), while nordbase-backend's
    // manufacturer.name is always the single canonical "ChargePoint". Without
    // this, linking a ChargePoint model to the SMALL foundation in the admin
    // UI would silently create a SECOND, duplicate "ChargePoint" entry in the
    // dropdown next to the existing "Chargepoint" one instead of joining it --
    // confirmed reproducible against the actual manufacturer names on file.
    // 2026-09-25.
    const mfr = charger.manufacturer;
    const existingKey = Object.keys(merged).find((k) => k.toLowerCase() === mfr.toLowerCase());
    const modelName = modelDisplayName(charger);
    const existingList = existingKey ? merged[existingKey] : (merged[mfr] = []);
    if (existingList.some((m) => m.model === modelName)) continue; // hand-maintained entry wins, never overwritten

    const adapterLink = charger.compatibility.find((c) => c.fitType === "adapter_plate");
    // Physical/structural fields: null unless the backend has already
    // confirmed them (see the 2026-09-25 update above) -- /public/charger-
    // compatibility never sends a partial/unverified number, so "confirmed"
    // here just means "present at all". Still never guessed or defaulted
    // to anything ourselves.
    const confirmed = charger.dimensionsConfirmed === true;
    existingList.push({
      model: modelName,
      w: confirmed && charger.widthMm != null ? mmToIn(charger.widthMm) : null,
      d: confirmed && charger.depthMm != null ? mmToIn(charger.depthMm) : null,
      h: confirmed && charger.heightMm != null ? mmToIn(charger.heightMm) : null,
      weight: confirmed && charger.weightKg != null ? kgToLb(charger.weightKg) : null,
      ccW: confirmed && charger.ccSpacingBMm != null ? mmToIn(charger.ccSpacingBMm) : null,
      ccD: confirmed && charger.ccSpacingDMm != null ? mmToIn(charger.ccSpacingDMm) : null,
      basePlateW: null,
      basePlateD: null,
      // Identity fields: this is the actual payload Simon asked for.
      partNumber: adapterLink?.productNumber ?? null,
      partName: adapterLink?.name ?? null,
      partNo: adapterLink ? String(adapterLink.partNumber) : null,
      // Lets the UI (NordBaseCalculator.jsx) tell this apart from a
      // hand-confirmed entry and show the right "not yet confirmed" banner
      // instead of silently presenting blank structural fields.
      fromDatabase: true,
      // Distinct from fromDatabase: true here means the six physical fields
      // above are populated AND verified -- NordBaseCalculator.jsx disables
      // the width/depth/height/weight inputs and shows a "verified" banner
      // instead of the usual editable fields when this is true.
      dimensionsConfirmed: confirmed,
    });
  }

  return merged;
}
