import React, { useCallback, useRef, useState } from "react";
import {
  ArrowRight,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Printer,
  RotateCw,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import { CALCULATOR_URL } from "./constants.js";
import { SiteHeader, SiteFooter } from "./components/SiteChrome.jsx";
import { PRODUCTS, PRODUCT_ORDER } from "./foundationData.js";

// ---------------------------------------------------------------------------
// SITE PLANNER — "design your site": address in, satellite photo out, drag
// correctly-scaled foundation footprints (and now custom-dimensioned
// rectangles, e.g. parking stalls or drive aisles) onto it. See
// 2D_Site_Layout_Tool_Scope.md (project docs) for the original scope
// decision record, plus the 2026-08-26 follow-up: added zoom in/out
// (still a static image per request — no interactive map SDK — just
// re-fetched at a different zoom level) and a custom-rectangle tool
// (typed width/depth in feet) instead of a freehand line tool, since
// Simon wants the customer to lay out their OWN parking-lot elements
// manually — no automatic line/stall detection from the photo.
//
// Still true from the original scope:
//   - static image, not an interactive/pannable map
//   - click-to-place + drag-to-position, rotate in fixed 15° steps
//   - no accounts, no saved projects — browser print is the only export
//   - no calculator prefill — selecting a placed foundation just links out
//
// POSITION MODEL: placed items store their offset from the image's center
// in real-world METERS (xOffsetM/yOffsetM), not screen percentage. That's
// what makes zoom in/out work correctly — a foundation placed at a given
// spot on the ground stays at that spot when you zoom, instead of drifting
// as the image's meters-per-pixel ratio changes. Percentage position is
// only computed at render time, from the current zoom.
//
// REQUIRES a Mapbox access token (Static Images API + Geocoding API v5) —
// see site/.env.example and SetupNotice below.
// ---------------------------------------------------------------------------

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

// Fixed image request size (logical / CSS pixels — @2x below doubles the
// actual bitmap for retina without changing this geographic math). Kept
// well under Mapbox's Static Images API size cap.
const IMAGE_W = 640;
const IMAGE_H = 480;
const DEFAULT_ZOOM = 20; // close enough to see individual parking stalls
const MIN_ZOOM = 15; // ~a full city block
const MAX_ZOOM = 21; // as close as satellite imagery reliably supports

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

function feetToMeters(feet) {
  return feet * 0.3048;
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

function staticImageUrl(lon, lat, zoom) {
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lon},${lat},${zoom},0/${IMAGE_W}x${IMAGE_H}@2x?access_token=${MAPBOX_TOKEN}`;
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
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  // placed items: foundations -> { id, kind:"foundation", type, xOffsetM, yOffsetM, rotation }
  //               custom rects -> { id, kind:"rect", wFt, dFt, label, xOffsetM, yOffsetM, rotation }
  const [placed, setPlaced] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [rectW, setRectW] = useState("");
  const [rectD, setRectD] = useState("");
  const [rectLabel, setRectLabel] = useState("");
  const containerRef = useRef(null);
  const draggingRef = useRef(null); // { id, pointerId }

  const mpp = location ? metersPerPixel(location.lat, zoom) : null;

  function offsetToPct(offsetM, imagePx) {
    return 50 + (offsetM / mpp / imagePx) * 100;
  }

  function pointerToOffset(clientX, clientY) {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return null;
    const xPct = ((clientX - box.left) / box.width) * 100 - 50;
    const yPct = ((clientY - box.top) / box.height) * 100 - 50;
    return {
      xOffsetM: (xPct / 100) * IMAGE_W * mpp,
      yOffsetM: (yPct / 100) * IMAGE_H * mpp,
    };
  }

  function footprintPct(item) {
    let wM, dM;
    if (item.kind === "rect") {
      wM = feetToMeters(item.wFt);
      dM = feetToMeters(item.dFt);
    } else {
      const p = PRODUCTS[item.type];
      wM = inchesToMeters(p.dims.bottom.w);
      dM = inchesToMeters(p.dims.bottom.d);
    }
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
      setZoom(DEFAULT_ZOOM);
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

  function zoomBy(delta) {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  }

  function addFoundation(type) {
    const id = nextId++;
    setPlaced((prev) => [
      ...prev,
      { id, kind: "foundation", type, xOffsetM: 0, yOffsetM: 0, rotation: 0 },
    ]);
    setSelectedId(id);
  }

  function addCustomRect(e) {
    e.preventDefault();
    const w = parseFloat(rectW);
    const d = parseFloat(rectD);
    if (!w || !d || w <= 0 || d <= 0) return;
    const id = nextId++;
    setPlaced((prev) => [
      ...prev,
      {
        id,
        kind: "rect",
        wFt: w,
        dFt: d,
        label: rectLabel.trim() || `${w}×${d} ft`,
        xOffsetM: 0,
        yOffsetM: 0,
        rotation: 0,
      },
    ]);
    setSelectedId(id);
    setRectW("");
    setRectD("");
    setRectLabel("");
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

  const onPointerMove = useCallback(
    (e) => {
      const drag = draggingRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const offset = pointerToOffset(e.clientX, e.clientY);
      if (!offset) return;
      setPlaced((prev) =>
        prev.map((p) => (p.id === drag.id ? { ...p, ...offset } : p))
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mpp]
  );

  const onPointerUp = useCallback((e) => {
    if (draggingRef.current?.pointerId === e.pointerId) {
      draggingRef.current = null;
    }
  }, []);

  const counts = PRODUCT_ORDER.reduce((acc, key) => {
    acc[key] = placed.filter((p) => p.kind === "foundation" && p.type === key).length;
    return acc;
  }, {});
  const customShapes = placed.filter((p) => p.kind === "rect");
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
            then drop correctly-scaled NordBase foundations onto it — or add
            your own custom-sized rectangle for a parking stall, drive aisle,
            or anything else. This is a rough visual sketch for planning
            purposes — not a substitute for a surveyed site plan or the
            calculator's stability calculation.
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
                      src={staticImageUrl(location.lon, location.lat, zoom)}
                      alt={`Satellite view of ${location.placeName}`}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                      draggable={false}
                    />

                    {/* ZOOM CONTROLS */}
                    <div className="no-print absolute right-2 top-2 flex flex-col overflow-hidden rounded-md border border-black/10 bg-white shadow">
                      <button
                        type="button"
                        onClick={() => zoomBy(1)}
                        disabled={zoom >= MAX_ZOOM}
                        className="p-2 hover:bg-bgSoft disabled:opacity-30"
                        title="Zoom in"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <div className="border-t border-black/10" />
                      <button
                        type="button"
                        onClick={() => zoomBy(-1)}
                        disabled={zoom <= MIN_ZOOM}
                        className="p-2 hover:bg-bgSoft disabled:opacity-30"
                        title="Zoom out"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>

                    {placed.map((p) => {
                      const { wPct, hPct } = footprintPct(p);
                      const isSelected = p.id === selectedId;
                      const left = offsetToPct(p.xOffsetM, IMAGE_W);
                      const top = offsetToPct(p.yOffsetM, IMAGE_H);
                      if (p.kind === "rect") {
                        return (
                          <div
                            key={p.id}
                            onPointerDown={(e) => onPointerDownIcon(e, p.id)}
                            className="absolute flex cursor-grab items-center justify-center rounded-sm text-center text-[10px] font-bold leading-tight text-dark shadow active:cursor-grabbing"
                            style={{
                              left: `${left}%`,
                              top: `${top}%`,
                              width: `${wPct}%`,
                              height: `${hPct}%`,
                              transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
                              backgroundColor: "rgba(255,255,255,0.55)",
                              border: isSelected
                                ? "2px solid #C9A227"
                                : "1.5px dashed rgba(27,30,35,0.7)",
                              textShadow: "0 1px 1px rgba(255,255,255,0.8)",
                            }}
                            title={p.label}
                          >
                            {p.label}
                          </div>
                        );
                      }
                      const style = ICON_STYLES[p.type];
                      return (
                        <div
                          key={p.id}
                          onPointerDown={(e) => onPointerDownIcon(e, p.id)}
                          className="absolute flex cursor-grab items-center justify-center rounded-sm text-xs font-extrabold text-white shadow active:cursor-grabbing"
                          style={{
                            left: `${left}%`,
                            top: `${top}%`,
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
                    {location.placeName} — drag a placed item to move it,
                    click it to select, then rotate or delete from the panel.
                    Use +/− to zoom in or out.
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
                      {customShapes.map((s) => (
                        <span key={s.id}>{s.label}</span>
                      ))}
                      {totalPlaced === 0 && <span>Nothing placed yet.</span>}
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

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-steel">
                      Add a custom shape
                    </div>
                    <p className="mt-1 text-xs text-steel">
                      For a parking stall, drive aisle, or anything else with
                      its own dimensions.
                    </p>
                    <form onSubmit={addCustomRect} className="mt-2 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={rectW}
                          onChange={(e) => setRectW(e.target.value)}
                          placeholder="Width (ft)"
                          className="w-1/2 rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-gold"
                        />
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={rectD}
                          onChange={(e) => setRectD(e.target.value)}
                          placeholder="Depth (ft)"
                          className="w-1/2 rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-gold"
                        />
                      </div>
                      <input
                        type="text"
                        value={rectLabel}
                        onChange={(e) => setRectLabel(e.target.value)}
                        placeholder="Label (optional, e.g. Parking stall)"
                        className="rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-gold"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm font-semibold hover:border-gold"
                      >
                        <Square className="h-3.5 w-3.5" /> Add shape
                      </button>
                    </form>
                  </div>

                  {selected && (
                    <div className="rounded-md border border-gold/40 bg-gold/10 p-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-dark">
                        Selected:{" "}
                        {selected.kind === "rect"
                          ? selected.label
                          : PRODUCTS[selected.type].name}
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
                      {selected.kind === "foundation" && (
                        <a
                          href={CALCULATOR_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-dark hover:text-gold"
                        >
                          Configure this foundation{" "}
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      )}
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
                          {customShapes.map((s) => (
                            <li key={s.id} className="flex justify-between">
                              <span>{s.label}</span>
                              <span className="font-bold">
                                {s.wFt}×{s.dFt} ft
                              </span>
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
