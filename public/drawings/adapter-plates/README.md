# Adapter plate drawings

Drop the official, dimensioned PDF drawings here — these are what the
calculator links to instead of (or alongside) the auto-generated sketch.

## File naming

```
{foundation-slug}_{manufacturer-slug}_{model-slug}.pdf
```

Examples:

- `medium_kempower_satellite-c-series.pdf`
- `medium_abb_terra-54-cjg.pdf`
- `small_universal.pdf` — NordBase Small's shared universal plate (no
  manufacturer/model needed yet)

Use lowercase, hyphens instead of spaces, no special characters.

## After adding a file

Open `src/NordBaseCalculator.jsx`, find the `ADAPTER_PLATE_DRAWINGS` object
(just below `CHARGER_PRESETS`), and add one line per drawing, e.g.:

```js
const ADAPTER_PLATE_DRAWINGS = {
  [adapterDrawingKey("MEDIUM", "Kempower", "Satellite C-Series")]:
    "/drawings/adapter-plates/medium_kempower_satellite-c-series.pdf",
  [universalAdapterDrawingKey("SMALL")]:
    "/drawings/adapter-plates/small_universal.pdf",
};
```

The manufacturer/model text must match `CHARGER_PRESETS` exactly (case
doesn't matter — the lookup lowercases everything). Commit + push and Vercel
rebuilds automatically; no other code changes needed.

DC Medium needs ~15 of these (one per charger model — add the model to
`CHARGER_PRESETS` first if it isn't listed yet). NordBase Small starts with
one shared universal plate.
