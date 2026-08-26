import React, { useCallback, useRef, useState } from "react";
import {
  ArrowRight,
  Loader2,
  MapPin,
  Printer,
  RotateCw,
  Search,
  Trash2,
} from "lucide-react";
import { CALCULATOR_URL } from "./constants.js";
import { SiteHeader, SiteFooter } from "./components/SiteChrome.jsx";
import { PRODUCTS, PRODUCT_ORDER } from "./foundationData.js";

// ---------------------------------------------------------------------------
// SITE PLANNER — "design your site": address in, satellite photo out, drag
// correctly-scaled foundation footprints onto it. See
// 2D_Site_Layout_Tool_Scope.md (project docs) for the full scope decision
// record — this implements v1 exactly as scoped:
//   - static image, not an interactive/pannable map (cheaper, simpler,
//     lets us lay fixed-scale overlays on top with plain CSS)
//   - click-to-place + drag-to-position, rotate in fixed 15° steps
//     (no free rotate, no resize handles — speed and no fiddling over
//     precision, since this is a rough site sketch, not a CAD drawing)
//   - no accounts, no saved projects — "Print / Save as PDF" via the
//     browser's native print dialog is the only export
//   - no calculator prefill yet (v2 candidate) — selecting a placed
//     foundation just links out to the calculator
//
// REQUIRES a Mapbox access token (Static Images API + Geocoding API v5).
// Nordinfra needs to create a free Mapbox account, generate a token, and
// restrict it to this site's domain(s) under "URL restrictions" in the
// Mapbox account dashboard (tokens are meant to be client-visible — the
// domain restriction is what prevents abuse, not secrecy). Add it as
// VITE_MAPBOX_TOKEN in Vercel's environment variables for the `site`
// project — see site/.env.example. Without it, this page shows a setup
// notice instead of a broken map.
// ---------------------------------------------------------------------------

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

// Fixed image request size (logical / CSS pixels — @2x below doubles the
// actual bitmap for retina without changing this geographic math). Kept
// well under Mapbox's Static Images API size cap.
const IMAGE_W = 640;
const IMAGE_H = 480;
const ZOOM = 20; // close enough to see individual parking stalls

const ICON_STYLES = {
  bollard: { fill: "#6B7280", label: "B" }, // steel
  small: { fill: "#E4CE7A", label: "S" }, // goldSoft
  medium: { fill: "#C9A227", label: "M" }, // gold
  large: { fill: "#1B1E23", label: "L" }, // dark
};

function metersPerPixel(lat, zoom) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

function inchesToMeters(inches) {
  return inches * 0.0254;
}

async function geocodeAddress(address) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address
  )}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=address,poi,place`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("geocode_failed");
  const data = await res.json();
  const feature = data.features && data.features[0];
  if (!feature) throw new Error("not_found");
  const [lon, lat] = feature.center;
  return { lon, lat, placeName: feature.place_name };
}

function staticImageUrl(lon, lat) {
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lon},${lat},${ZOOM},0/${IMAGE_W}x${IMAGE_H}@2x?access_token=${MAPBOX_TOKEN}`;
}

let nextId = 1;

function SetupNotice() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-black/10 bg-white p-6 text-sm text-steel">
      <p className="font-bold text-dark">Site Planner isn't configured yet.</p>
      <p className="mt-2">
        This page needs a Mapbox access token to fetch address lookups and
        satellite imagery. Create a free account at{" "}
        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-dark underline"
        >
          account.mapbox.com
        </a>
        , restrict the token to this site's domain under "URL restrictions",
        and add it as <code className="rounded bg-bgSoft px-1">VITE_MAPBOX_TOKEN</code> in
        the site's Vercel project environment variables.
      </p>
    </div>
  );
}

export default function SitePlannerApp() {
  const [addressInput, setAddressInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const [location, setLocation] = useState(null); // { lon, lat, placeName }
  const [placed, setPlaced] = useState([]); // [{ id, type, xPct, yPct, rotation }]
  const [selectedId, setSelectedId] = useState(null);
  const containerRef = useRef(null);
  const draggingRef = useRef(null); // { id, pointerId }

  const mpp = location ? metersPerPixel(location.lat, ZOOM) : null;

  function footprintPct(type) {
    const p = PRODUCTS[type];
    const wM = inchesToMeters(p.dims.bottom.w);
    const dM = inchesToMeters(p.dims.bottom.d);
    return {
      wPct: (wM / mpp / IMAGE_W) * 100,
      hPct: (dM / mpp / IMAGE_H) * 100,
    };
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!addressInput.trim() || !MAPBOX_TOKEN) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const loc = await geocodeAddress(addressInput.trim());
      setLocation(loc);
      setPlaced([]);
      setSelectedId(null);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err.message === "not_found"
          ? "Couldn't find that address — try adding city and state."
          : "Something went wrong looking up that address. Try again."
      );
    }
  }

  function addFoundation(type) {
    const id = nextId++;
    setPlaced((prev) => [
      ...prev,
      { id, type, xPct: 50, yPct: 50, rotation: 0 },
    ]);
    setSelectedId(id);
  }

  function rotateSelected() {
    if (selectedId == null) return;
    setPlaced((prev) =>
      prev.map((p) =>
        p.id === selectedId ? { ...p, rotation: (p.rotation + 15) % 360 } : p
      )
    );
  }

  function deleteSelected() {
    if (selectedId == null) return;
    setPlaced((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  }

  const onPointerDownIcon = useCallback((e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    draggingRef.current = { id, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    const drag = draggingRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const xPct = Math.min(100, Math.max(0, ((e.clientX - box.left) / box.width) * 100));
    const yPct = Math.min(100, Math.max(0, ((e.clientY - box.top) / box.height) * 100));
    setPlaced((prev) =>
      prev.map((p) => (p.id === drag.id ? { ...p, xPct, yPct } : p))
    );
  }, []);

  const onPointerUp = useCallback((e) => {
    if (draggingRef.current?.pointerId === e.pointerId) {
      draggingRef.current = null;
    }
  }, []);

  const counts = PRODUCT_ORDER.reduce((acc, key) => {
    acc[key] = placed.filter((p) => p.type === key).length;
    return acc;
  }, {});
  const totalPlaced = placed.length;
  const selected = placed.find((p) => p.id === selectedId) || null;

  return (
    <div className="min-h-screen bg-bgSoft text-dark">
      <div className="no-print">
        <SiteHeader />
      </div>

      <section className="border-b border-black/10 bg-white py-10 no-print">
        <div className="mx-auto max-w-6xl px-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-4 py-1.5 text-sm font-semibold text-dark">
            <MapPin className="h-4 w-4" /> Site Planner
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Sketch a layout on your own site
          </h1>
          <p className="mt-2 max-w-2xl text-steel">
            Enter an address to pull up a satellite photo of the property,
            then drop correctly-scaled NordBase foundations onto it. This is
            a rough visual sketch for planning purposes — not a substitute
            for a surveyed site plan or the calculator's stability
            calculation.
          </p>
        </div>
      </section>

      {!MAPBOX_TOKEN ? (
        <section className="py-16">
          <SetupNotice />
        </section>
      ) : (
        <section className="py-10">
          <div className="mx-auto max-w-6xl px-6">
            <form
              onSubmit={handleSearch}
              className="no-print flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="e.g. 400 S Congress Ave, Austin, TX"
                className="flex-1 rounded-md border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-dark hover:bg-goldSoft disabled:opacity-60"
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Find address
              </button>
            </form>
            {status === "error" && (
              <p className="no-print mt-2 text-sm font-medium text-red-600">
                {errorMsg}
              </p>
            )}

            {location && (
              <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
                {/* CANVAS */}
                <div>
                  <div
                    ref={containerRef}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    className="relative w-full select-none overflow-hidden rounded-xl border border-black/10 bg-black/5"
                    style={{ aspectRatio: `${IMAGE_W} / ${IMAGE_H}` }}
                  >
                    <img
                      src={staticImageUrl(location.lon, location.lat)}
                      alt={`Satellite view of ${location.placeName}`}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                      draggable={false}
                    />
                    {placed.map((p) => {
                      const { wPct, hPct } = footprintPct(p.type);
                      const style = ICON_STYLES[p.type];
                      const isSelected = p.id === selectedId;
                      return (
                        <div
                          key={p.id}
                          onPointerDown={(e) => onPointerDownIcon(e, p.id)}
                          className="absolute flex cursor-grab items-center justify-center rounded-sm text-xs font-extrabold text-white shadow active:cursor-grabbing"
                          style={{
                            left: `${p.xPct}%`,
                            top: `${p.yPct}%`,
                            width: `${wPct}%`,
                            height: `${hPct}%`,
                            transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
                            backgroundColor: style.fill,
                            border: isSelected
                              ? "2px solid white"
                              : "1px solid rgba(255,255,255,0.6)",
                            outline: isSelected ? "2px solid #C9A227" : "none",
                            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                          }}
                          title={PRODUCTS[p.type].name}
                        >
                          {style.label}
                        </div>
                      );
                    })}
                  </div>
                  <p className="no-print mt-2 text-xs text-steel">
                    {location.placeName} — drag a placed foundation to move
                    it, click it to select, then rotate or delete from the
                    panel.
                  </p>

                  {/* PRINT-ONLY summary, shown below the canvas on paper */}
                  <div className="hidden print:block mt-4 border-t border-black/10 pt-4 text-sm">
                    <div className="font-bold text-dark">{location.placeName}</div>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                      {PRODUCT_ORDER.filter((k) => counts[k] > 0).map((k) => (
                        <span key={k}>
                          {counts[k]} × {PRODUCTS[k].name}
                        </span>
                      ))}
                      {totalPlaced === 0 && <span>No foundations placed yet.</span>}
                    </div>
                    <p className="mt-2 text-xs text-steel">
                      Rough visual sketch, not a surveyed site plan. Run the
                      NordBase calculator for a project-specific submittal
                      package.
                    </p>
                  </div>
                </div>

                {/* SIDEBAR */}
                <div className="no-print flex flex-col gap-6">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-steel">
                      Add a foundation
                    </div>
                    <div className="mt-2 flex flex-col gap-2">
                      {PRODUCT_ORDER.map((key) => (
                        <button
                          key={key}
                          onClick={() => addFoundation(key)}
                          className="flex items-center gap-2.5 rounded-md border border-black/10 bg-white px-3 py-2 text-left text-sm font-semibold hover:border-gold"
                        >
                          <span
                            className="h-4 w-4 shrink-0 rounded-sm"
                            style={{ backgroundColor: ICON_STYLES[key].fill }}
                          />
                          {PRODUCTS[key].name}
                          <span className="ml-auto text-xs font-normal text-steel">
                            {counts[key] > 0 ? `×${counts[key]}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selected && (
                    <div className="rounded-md border border-gold/40 bg-gold/10 p-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-dark">
                        Selected: {PRODUCTS[selected.type].name}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={rotateSelected}
                          className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold hover:border-gold"
                        >
                          <RotateCw className="h-3.5 w-3.5" /> Rotate 15°
                        </button>
                        <button
                          onClick={deleteSelected}
                          className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:border-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                      <a
                        href={CALCULATOR_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-dark hover:text-gold"
                      >
                        Configure this foundation{" "}
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-steel">
                      On this layout
                    </div>
                    <div className="mt-2 rounded-md border border-black/10 bg-white p-3 text-sm">
                      {totalPlaced === 0 ? (
                        <span className="text-steel">Nothing placed yet.</span>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {PRODUCT_ORDER.filter((k) => counts[k] > 0).map((k) => (
                            <li key={k} className="flex justify-between">
                              <span>{PRODUCTS[k].name}</span>
                              <span className="font-bold">{counts[k]}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-dark px-4 py-2.5 text-sm font-bold text-white hover:bg-dark/90"
                  >
                    <Printer className="h-4 w-4" /> Print / Save as PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="no-print">
        <SiteFooter />
      </div>
    </div>
  );
}
