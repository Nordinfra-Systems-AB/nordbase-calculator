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

    const mfr = charger.manufacturer;
    const modelName = modelDisplayName(charger);
    const existingList = merged[mfr] || (merged[mfr] = []);
    if (existingList.some((m) => m.model === modelName)) continue; // hand-maintained entry wins, never overwritten

    const adapterLink = charger.compatibility.find((c) => c.fitType === "adapter_plate");
    existingList.push({
      model: modelName,
      // Physical/structural fields: deliberately left unset. Never guessed,
      // never defaulted to anything other than "not yet confirmed".
      w: null,
      d: null,
      h: null,
      weight: null,
      ccW: null,
      ccD: null,
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
    });
  }

  return merged;
}
