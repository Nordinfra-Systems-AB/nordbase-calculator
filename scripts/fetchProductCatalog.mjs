#!/usr/bin/env node
// Fetches the public product catalog from nordbase-backend at BUILD time —
// not at runtime — and writes it to shared/productCatalog.generated.json.
// Added 2026-09-20 per Simon's "database as a hub" idea: this is step 1 of
// actually connecting the calculator/website to nordbase-backend, kept
// deliberately narrow and safe. It does NOT yet feed into
// NordBaseCalculator.jsx or site/src/foundationData.js — those still read
// from shared/chargerData.js exactly as before. This script only proves
// the pipe works end to end (real data, real fetch, real file written).
// Wiring the actual calculator/site UI to prefer this generated data over
// the hand-maintained FOUNDATIONS/chargerData values is a separate,
// deliberate next step — needs a field-by-field mapping review, not a
// blind swap, since NordBaseCalculator.jsx is large and load-bearing.
//
// Why build time and not runtime: if this script fails for any reason
// (nordbase-backend down, NORDBASE_API_URL not set, network hiccup), it
// must NEVER fail the actual site build — see the `|| true` on the
// "prebuild" script in package.json (once wired in) and the process.exit(0)
// in the catch below. A visitor on the already-live site never notices
// either way; worst case, the next deploy just keeps last known data.
//
// Not wired into the automatic build yet on purpose — call it manually
// (`npm run fetch:catalog`) to try it, and hook it into "prebuild" only
// once you're happy with the output.
//
// 2026-09-25 update: also fetches /public/charger-compatibility (which
// charger manufacturer/model pairs with which adapter-plate/foundation
// part.no — see NordBase_Databas_Hemsida_Kalkylator_Radata_Synk_Skiss_
// 20260925.md in the project for the narrowed scope this serves). Same
// build-time-only, never-fail-the-build philosophy as products above.
// Deliberately identity-only data (manufacturer, model name, part.no) —
// nothing here is dimensional/structural, so it still does not feed
// calcStability() or any hardcoded CC/bolt-pattern value in
// NordBaseCalculator.jsx / shared/chargerData.js. Not wired into the
// dropdown UI yet — this step only proves the fetch + file output, same
// as products did on 2026-09-20.
//
// Usage:
//   NORDBASE_API_URL=https://<your-nordbase-backend-domain> npm run fetch:catalog

import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = process.env.NORDBASE_API_URL;
const OUT_PATH = path.join(__dirname, "..", "shared", "productCatalog.generated.json");

// 2026-09-25: this file went from "nothing reads it" to actually being
// statically imported by NordBaseCalculator.jsx (see
// shared/mergeGeneratedCharger.js). A static JSON import that resolves to
// a MISSING file fails the whole Vite build/dev-server, which would be a
// regression against this script's own "can only ever fail a build, never
// take down the live site" rule -- so from here on this script must NEVER
// finish without SOME valid file at OUT_PATH, even on a completely fresh
// checkout with no NORDBASE_API_URL and no prior generated file at all.
async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeEmptyShell(reason) {
  if (await fileExists(OUT_PATH)) {
    // A previous successful run already left good data here -- keep it
    // (the existing "worst case, next deploy just keeps last known data"
    // philosophy), don't stomp it with an empty shell.
    console.log(`[fetchProductCatalog] ${reason} -- keeping existing ${path.relative(process.cwd(), OUT_PATH)} as-is.`);
    return;
  }
  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    JSON.stringify(
      { fetchedAt: null, source: null, products: [], chargerCompatibilitySource: null, chargerCompatibility: [] },
      null,
      2
    )
  );
  console.log(`[fetchProductCatalog] ${reason} -- wrote an empty shell to ${path.relative(process.cwd(), OUT_PATH)} so imports never crash.`);
}

async function fetchJson(url) {
  console.log(`[fetchProductCatalog] fetching ${url} ...`);
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    throw new Error(`nordbase-backend responded ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

async function main() {
  if (!API_URL) {
    await writeEmptyShell("NORDBASE_API_URL not set");
    return;
  }

  const base = API_URL.replace(/\/$/, "");
  const productsUrl = `${base}/public/products`;
  const compatUrl = `${base}/public/charger-compatibility`;

  const products = await fetchJson(productsUrl);
  if (!Array.isArray(products) || products.length === 0) {
    // Refuse to overwrite a good file with an empty/broken one — an empty
    // response is far more likely to mean "something's wrong" than "the
    // catalog is genuinely empty" at this stage.
    throw new Error("nordbase-backend returned no products — refusing to overwrite existing data");
  }

  const chargerCompatibility = await fetchJson(compatUrl);
  if (!Array.isArray(chargerCompatibility)) {
    throw new Error("nordbase-backend returned malformed charger-compatibility data — refusing to overwrite existing data");
  }

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        source: productsUrl,
        products,
        chargerCompatibilitySource: compatUrl,
        chargerCompatibility,
      },
      null,
      2
    )
  );
  console.log(
    `[fetchProductCatalog] wrote ${products.length} products and ` +
      `${chargerCompatibility.length} charger models (with compatibility) to ` +
      path.relative(process.cwd(), OUT_PATH)
  );
}

main().catch(async (err) => {
  console.error("[fetchProductCatalog] failed (non-fatal, build continues):", err.message);
  await writeEmptyShell("fetch failed").catch(() => {}); // never let the fallback write itself fail the build
  process.exit(0);
});
