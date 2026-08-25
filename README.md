# NordBase Foundation Selector

Sales-facing calculator for EV-charger foundation selection and preliminary
wind/seismic stability checking, for Nordinfra's US market entry.

**Status:** Prototype. Calculation engine ported from
`Nordinfra_Master_USA_ASCE7_v6.xlsx` and cross-validated against all four
confirmed per-product workbooks (AC / DC Small / DC Medium / DC Large). Not a
substitute for a PE-stamped calculation package — see the in-app disclaimer
and `NordBase_Calculation_Methodology.docx` for the full methodology and open
items.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs a static site in `dist/` — deployable to Vercel, Netlify, or any
static host. Recommended: connect this repo to Vercel or Netlify (import via
their GitHub integration) so every push to `main` auto-deploys. Point
`calculator.nord-infra.com` at that deployment via DNS once live.

## Project structure

- `src/NordBaseCalculator.jsx` — the entire application (single component:
  data, calculation engine, and UI). Kept as one file intentionally to match
  how it was originally developed/reviewed; safe to split up further as the
  codebase grows.
- `src/main.jsx` — mounts the component.
- Tailwind CSS for styling, `lucide-react` for icons.

## Regression self-test

The calculation engine includes a dev-only sanity check for the
tipping-arm/stability formula (validated against all four Excel workbooks).
After deploying, run this in the browser console:

```js
window.__nordbaseSelfTest()
```

It should log `PASSED`. If it logs `FAILED`, the stability calc has
regressed — check `calcStability()` in `NordBaseCalculator.jsx` before
shipping.

## Ownership

This repository belongs to the Nordinfra-Systems-AB GitHub organization —
please keep all work pushed here (not only shared as files) so the codebase
stays owned by Nordinfra rather than tied to any one contributor.
