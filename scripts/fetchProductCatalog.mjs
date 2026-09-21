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
// Usage:
//   NORDBASE_API_URL=https://<your-nordbase-backend-domain> npm run fetch:catalog

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = process.env.NORDBASE_API_URL;
const OUT_PATH = path.join(__dirname, "..", "shared", "productCatalog.generated.json");

async function main() {
  if (!API_URL) {
    console.log(
      "[fetchProductCatalog] NORDBASE_API_URL not set — skipping. " +
        "(This is fine: nothing currently depends on this file yet.)"
    );
    return;
  }

  const url = `${API_URL.replace(/\/$/, "")}/public/products`;
  console.log(`[fetchProductCatalog] fetching ${url} ...`);

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    throw new Error(`nordbase-backend responded ${res.status} ${res.statusText}`);
  }
  const products = await res.json();
  if (!Array.isArray(products) || products.length === 0) {
    // Refuse to overwrite a good file with an empty/broken one — an empty
    // response is far more likely to mean "something's wrong" than "the
    // catalog is genuinely empty" at this stage.
    throw new Error("nordbase-backend returned no products — refusing to overwrite existing data");
  }

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    JSON.stringify({ fetchedAt: new Date().toISOString(), source: url, products }, null, 2)
  );
  console.log(
    `[fetchProductCatalog] wrote ${products.length} products to ` +
      path.relative(process.cwd(), OUT_PATH)
  );
}

main().catch((err) => {
  console.error("[fetchProductCatalog] failed (non-fatal, build continues):", err.message);
  process.exit(0);
});
