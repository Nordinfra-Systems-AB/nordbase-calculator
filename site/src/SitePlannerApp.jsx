import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Copy,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Printer,
  Redo2,
  Ruler,
  Search,
  Square,
  Trash2,
  Undo2,
} from "lucide-react";
import { CALCULATOR_URL } from "./constants.js";
import { SiteHeader, SiteFooter } from "./components/SiteChrome.jsx";
import { PRODUCTS, PRODUCT_ORDER } from "./foundationData.js";

// ---------------------------------------------------------------------------
// SITE PLANNER — "design your site": address in, satellite photo out, drag
// correctly-scaled foundation footprints (or custom-dimensioned rectangles)
// onto it. See 2D_Site_Layout_Tool_Scope.md (project docs) for the v1 scope
// decision record, the 2026-08-26 follow-up (zoom + custom rectangles), and
// this 2026-08-26 v2 follow-up per Simon's feedback list:
//   - click-and-drag panning of the map
//   - duplicate a placed item instead of retyping dimensions
//   - type an exact rotation instead of relative 15° clicks
//   - a reference line + "place N along it" array tool for rows of stalls
//   - center-to-center dimension labels between placed items
//   - undo/redo, since manual layouts now take real work to build
//   - a scale bar, since printed sketches had no way to judge scale
//
// STILL a static image, not a full interactive map SDK (Mapbox GL JS) — a
// deliberate scope call: panning is implemented as "drag to shift the
// image's center + refetch", which gets the same UX win without the bundle
// size, cost-model change, and testing burden of a full map SDK. If site
// layouts keep growing in complexity, that's the natural next step.
//
// POSITION MODEL (v2): every placed item and the reference line stores an
// ABSOLUTE {lon, lat}, not an offset from the search center. That's what
// makes panning possible at all — with v1's "meters offset from center"
// model, panning the center would have silently moved every placed item.
// Screen position is computed at render time from the current map center +
// zoom, exactly like v1 did for zoom alone.
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

const METERS_PER_DEG_LAT = 111320;

const ICON_STYLES = {
  bollard: { fill: "#6B7280", label: "B" }, // steel
  small: { fill: "#E4CE7A", label: "S" }, // goldSoft
  medium: { fill: "#C9A227", label: "M" }, // gold
  large: { fill: "#1B1E23", label: "L" }, // dark
};

const MAX_HISTORY = 50;

function metersPerPixel(lat, zoom) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

function metersPerDegLon(lat) {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function inchesToMeters(inches) {
  return inches * 0.0254;
}

function feetToMeters(feet) {
  return feet * 0.3048;
}

function metersToFeet(meters) {
  return meters / 0.3048;
}

// lon/lat -> meters offset from a center point (x: +east, y: +south, so it
// matches screen-down = positive, same convention v1 used).
function lonLatToOffsetM(lon, lat, centerLon, centerLat) {
  const mLon = metersPerDegLon(centerLat);
  return {
    xM: (lon - centerLon) * mLon,
    yM: (centerLat - lat) * METERS_PER_DEG_LAT,
  };
}

// meters offset from a center point -> lon/lat.
function offsetMToLonLat(xM, yM, centerLon, centerLat) {
  const mLon = metersPerDegLon(centerLat);
  return {
    lon: centerLon + xM / mLon,
    lat: centerLat - yM / METERS_PER_DEG_LAT,
  };
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

// "Nice" scale-bar lengths in feet to choose between.
const SCALE_STEPS_FT = [5, 10, 20, 25, 50, 100, 150, 200, 300, 500, 1000, 2000];

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
  const [location, setLocation] = useState(null); // { lon, lat, placeName } — lon/lat is the CURRENT map center (pan moves it)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [imgTranslate, setImgTranslate] = useState({ dxPx: 0, dyPx: 0 }); // live pan feedback before commit

  // placed items: foundations -> { id, kind:"foundation", type, lon, lat, rotation }
  //               custom rects -> { id, kind:"rect", wFt, dFt, label, lon, lat, rotation }
  const [placed, setPlaced] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [rectW, setRectW] = useState("");
  const [rectD, setRectD] = useState("");
  const [rectLabel, setRectLabel] = useState("");

  // reference line + array tool
  const [addingLine, setAddingLine] = useState(null); // null | "a" | "b"
  const [referenceLine, setReferenceLine] = useState(null); // { a:{lon,lat}, b:{lon,lat} }
  const [arrayTemplateKind, setArrayTemplateKind] = useState("medium"); // foundation key or "rect"
  const [arrayRectW, setArrayRectW] = useState("");
  const [arrayRectD, setArrayRectD] = useState("");
  const [arrayLabel, setArrayLabel] = useState("");
  const [arraySpacing, setArraySpacing] = useState("");
  const [arrayCount, setArrayCount] = useState("");
  const [arrayPerpendicular, setArrayPerpendicular] = useState(false);

  const [showMeasurements, setShowMeasurements] = useState(false);

  // undo/redo
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const containerRef = useRef(null);
  const draggingRef = useRef(null); // { id, pointerId }
  const panRef = useRef(null); // { pointerId, startClientX, startClientY, startLon, startLat, moved }

  const mpp = location ? metersPerPixel(location.lat, zoom) : null;

  function pushHistory(snapshot) {
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), snapshot]);
    setFuture([]);
  }

  function undo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture((f) => [placed, ...f].slice(0, MAX_HISTORY));
    setHistory((h) => h.slice(0, -1));
    setPlaced(prev);
    setSelectedId((id) => (prev.some((p) => p.id === id) ? id : null));
  }

  function redo() {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h, placed].slice(-MAX_HISTORY));
    setFuture((f) => f.slice(1));
    setPlaced(next);
    setSelectedId((id) => (next.some((p) => p.id === id) ? id : null));
  }

  // Global undo/redo keyboard shortcuts (skip while typing in a field).
  useEffect(() => {
    function onKeyDown(e) {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, history, future]);

  function offsetToPct(offsetM, imagePx) {
    return 50 + (offsetM / mpp / imagePx) * 100;
  }

  function lonLatToPct(lon, lat) {
    const { xM, yM } = lonLatToOffsetM(lon, lat, location.lon, location.lat);
    return { leftPct: offsetToPct(xM, IMAGE_W), topPct: offsetToPct(yM, IMAGE_H) };
  }

  function pointerToLonLat(clientX, clientY) {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return null;
    const xPct = ((clientX - box.left) / box.width) * 100 - 50;
    const yPct = ((clientY - box.top) / box.height) * 100 - 50;
    const xM = (xPct / 100) * IMAGE_W * mpp;
    const yM = (yPct / 100) * IMAGE_H * mpp;
    return offsetMToLonLat(xM, yM, location.lon, location.lat);
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
      setReferenceLine(null);
      setAddingLine(null);
      setHistory([]);
      setFuture([]);
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
    pushHistory(placed);
    const id = nextId++;
    setPlaced((prev) => [
      ...prev,
      { id, kind: "foundation", type, lon: location.lon, lat: location.lat, rotation: 0 },
    ]);
    setSelectedId(id);
  }

  function addCustomRect(e) {
    e.preventDefault();
    const w = parseFloat(rectW);
    const d = parseFloat(rectD);
    if (!w || !d || w <= 0 || d <= 0) return;
    pushHistory(placed);
    const id = nextId++;
    setPlaced((prev) => [
      ...prev,
      {
        id,
        kind: "rect",
        wFt: w,
        dFt: d,
        label: rectLabel.trim() || `${w}×${d} ft`,
        lon: location.lon,
        lat: location.lat,
        rotation: 0,
      },
    ]);
    setSelectedId(id);
    setRectW("");
    setRectD("");
    setRectLabel("");
  }

  function duplicateSelected() {
    const item = placed.find((p) => p.id === selectedId);
    if (!item) return;
    pushHistory(placed);
    // Offset the clone ~2m east/south so it's visibly distinct, not stacked exactly on top.
    const { lon, lat } = offsetMToLonLat(2, 2, item.lon, item.lat);
    const id = nextId++;
    const clone = { ...item, id, lon, lat };
    setPlaced((prev) => [...prev, clone]);
    setSelectedId(id);
  }

  function setSelectedRotation(deg) {
    if (selectedId == null) return;
    const norm = ((Math.round(deg) % 360) + 360) % 360;
    setPlaced((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, rotation: norm } : p))
    );
  }

  function nudgeRotation(delta) {
    const item = placed.find((p) => p.id === selectedId);
    if (!item) return;
    pushHistory(placed);
    setSelectedRotation(item.rotation + delta);
  }

  function deleteSelected() {
    if (selectedId == null) return;
    pushHistory(placed);
    setPlaced((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  }

  // --- item drag -------------------------------------------------------
  const onPointerDownIcon = useCallback(
    (e, id) => {
      e.stopPropagation();
      setSelectedId(id);
      pushHistory(placed);
      draggingRef.current = { id, pointerId: e.pointerId };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placed]
  );

  const onPointerMove = useCallback(
    (e) => {
      const drag = draggingRef.current;
      if (drag && drag.pointerId === e.pointerId) {
        const ll = pointerToLonLat(e.clientX, e.clientY);
        if (!ll) return;
        setPlaced((prev) =>
          prev.map((p) => (p.id === drag.id ? { ...p, ...ll } : p))
        );
        return;
      }
      const pan = panRef.current;
      if (pan && pan.pointerId === e.pointerId) {
        const dxPx = e.clientX - pan.startClientX;
        const dyPx = e.clientY - pan.startClientY;
        if (Math.abs(dxPx) > 3 || Math.abs(dyPx) > 3) pan.moved = true;
        setImgTranslate({ dxPx, dyPx });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mpp, location]
  );

  const onPointerUp = useCallback(
    (e) => {
      if (draggingRef.current?.pointerId === e.pointerId) {
        draggingRef.current = null;
        return;
      }
      const pan = panRef.current;
      if (pan && pan.pointerId === e.pointerId) {
        if (pan.moved) {
          const dxPx = e.clientX - pan.startClientX;
          const dyPx = e.clientY - pan.startClientY;
          // Content follows the drag, so the new center is the OLD center
          // minus that pixel shift converted to meters (see the sign
          // convention in offsetMToLonLat: x:+east, y:+south).
          const { lon, lat } = offsetMToLonLat(
            -dxPx * mpp,
            -dyPx * mpp,
            pan.startLon,
            pan.startLat
          );
          setLocation((prev) => ({ ...prev, lon, lat }));
        } else {
          // plain click on empty background — deselect
          setSelectedId(null);
        }
        setImgTranslate({ dxPx: 0, dyPx: 0 });
        panRef.current = null;
      }
    },
    [mpp]
  );

  // --- background pan / reference-line placement ------------------------
  function onContainerPointerDown(e) {
    if (addingLine) return; // clicks handled by onContainerClick while placing a line
    panRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLon: location.lon,
      startLat: location.lat,
      moved: false,
    };
    containerRef.current?.setPointerCapture(e.pointerId);
  }

  function onContainerClick(e) {
    if (!addingLine) return;
    const ll = pointerToLonLat(e.clientX, e.clientY);
    if (!ll) return;
    if (addingLine === "a") {
      setReferenceLine({ a: ll, b: ll });
      setAddingLine("b");
    } else if (addingLine === "b") {
      setReferenceLine((prev) => ({ ...prev, b: ll }));
      setAddingLine(null);
    }
  }

  function startAddingLine() {
    setAddingLine("a");
    setReferenceLine(null);
  }

  function clearReferenceLine() {
    setReferenceLine(null);
    setAddingLine(null);
  }

  function lineHeadingAndLength() {
    if (!referenceLine) return null;
    const { xM, yM } = lonLatToOffsetM(
      referenceLine.b.lon,
      referenceLine.b.lat,
      referenceLine.a.lon,
      referenceLine.a.lat
    );
    const lengthM = Math.hypot(xM, yM);
    const headingDeg = (Math.atan2(yM, xM) * 180) / Math.PI;
    return { xM, yM, lengthM, headingDeg };
  }

  function placeArray(e) {
    e.preventDefault();
    if (!referenceLine) return;
    const spacingFt = parseFloat(arraySpacing);
    const count = parseInt(arrayCount, 10);
    if (!spacingFt || spacingFt <= 0 || !count || count <= 0) return;
    const geo = lineHeadingAndLength();
    if (!geo || geo.lengthM === 0) return;
    const spacingM = feetToMeters(spacingFt);
    const ux = geo.xM / geo.lengthM;
    const uy = geo.yM / geo.lengthM;
    const rotation = arrayPerpendicular ? geo.headingDeg + 90 : geo.headingDeg;

    const template =
      arrayTemplateKind === "rect"
        ? { kind: "rect", wFt: parseFloat(arrayRectW) || 1, dFt: parseFloat(arrayRectD) || 1 }
        : { kind: "foundation", type: arrayTemplateKind };

    pushHistory(placed);
    const newItems = [];
    for (let i = 0; i < count; i++) {
      const posXm = ux * spacingM * i;
      const posYm = uy * spacingM * i;
      const { lon, lat } = offsetMToLonLat(posXm, posYm, referenceLine.a.lon, referenceLine.a.lat);
      const id = nextId++;
      if (template.kind === "rect") {
        newItems.push({
          id,
          kind: "rect",
          wFt: template.wFt,
          dFt: template.dFt,
          label: `${arrayLabel.trim() || "Stall"} ${i + 1}`,
          lon,
          lat,
          rotation: ((rotation % 360) + 360) % 360,
        });
      } else {
        newItems.push({
          id,
          kind: "foundation",
          type: template.type,
          lon,
          lat,
          rotation: ((rotation % 360) + 360) % 360,
        });
      }
    }
    setPlaced((prev) => [...prev, ...newItems]);
    setSelectedId(null);
  }

  const counts = PRODUCT_ORDER.reduce((acc, key) => {
    acc[key] = placed.filter((p) => p.kind === "foundation" && p.type === key).length;
    return acc;
  }, {});
  const customShapes = placed.filter((p) => p.kind === "rect");
  const totalPlaced = placed.length;
  const selected = placed.find((p) => p.id === selectedId) || null;
  const lineInfo = referenceLine ? lineHeadingAndLength() : null;
  const fitsCount =
    lineInfo && arraySpacing && parseFloat(arraySpacing) > 0
      ? Math.max(1, Math.floor(metersToFeet(lineInfo.lengthM) / parseFloat(arraySpacing)) + 1)
      : null;

  // Scale bar: pick the largest "nice" foot value whose pixel width is
  // still comfortably inside the image.
  let scaleBar = null;
  if (mpp) {
    let chosenFt = SCALE_STEPS_FT[0];
    for (const ft of SCALE_STEPS_FT) {
      const px = feetToMeters(ft) / mpp;
      if (px > IMAGE_W * 0.4) break;
      chosenFt = ft;
    }
    scaleBar = { ft: chosenFt, px: feetToMeters(chosenFt) / mpp };
  }

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
            drag to pan, drop correctly-scaled NordBase foundations, or add
            your own custom-sized rectangles — one at a time, or a whole row
            at once along a reference line. This is a rough visual sketch for
            planning purposes — not a substitute for a surveyed site plan or
            the calculator's stability calculation.
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
              <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
                {/* CANVAS */}
                <div>
                  <div
                    ref={containerRef}
                    onPointerDown={onContainerPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onClick={onContainerClick}
                    className="relative w-full select-none overflow-hidden rounded-xl border border-black/10 bg-black/5"
                    style={{
                      aspectRatio: `${IMAGE_W} / ${IMAGE_H}`,
                      cursor: addingLine ? "crosshair" : "grab",
                    }}
                  >
                    <img
                      src={staticImageUrl(location.lon, location.lat, zoom)}
                      alt={`Satellite view of ${location.placeName}`}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                      style={{
                        transform: `translate(${imgTranslate.dxPx}px, ${imgTranslate.dyPx}px)`,
                      }}
                      draggable={false}
                    />

                    {/* ZOOM CONTROLS */}
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="no-print absolute right-2 top-2 flex flex-col overflow-hidden rounded-md border border-black/10 bg-white shadow"
                    >
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

                    {/* UNDO/REDO */}
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="no-print absolute left-2 top-2 flex overflow-hidden rounded-md border border-black/10 bg-white shadow"
                    >
                      <button
                        type="button"
                        onClick={undo}
                        disabled={history.length === 0}
                        className="p-2 hover:bg-bgSoft disabled:opacity-30"
                        title="Undo"
                      >
                        <Undo2 className="h-4 w-4" />
                      </button>
                      <div className="border-l border-black/10" />
                      <button
                        type="button"
                        onClick={redo}
                        disabled={future.length === 0}
                        className="p-2 hover:bg-bgSoft disabled:opacity-30"
                        title="Redo"
                      >
                        <Redo2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* REFERENCE LINE + MEASUREMENT SVG OVERLAY */}
                    <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
                      {referenceLine &&
                        (() => {
                          const a = lonLatToPct(referenceLine.a.lon, referenceLine.a.lat);
                          const b = lonLatToPct(referenceLine.b.lon, referenceLine.b.lat);
                          const midX = (a.leftPct + b.leftPct) / 2;
                          const midY = (a.topPct + b.topPct) / 2;
                          const lenFt = lineInfo ? metersToFeet(lineInfo.lengthM).toFixed(1) : "";
                          return (
                            <g className="no-print">
                              <line
                                x1={`${a.leftPct}%`}
                                y1={`${a.topPct}%`}
                                x2={`${b.leftPct}%`}
                                y2={`${b.topPct}%`}
                                stroke="#C9A227"
                                strokeWidth="2"
                                strokeDasharray="6 4"
                              />
                              <circle cx={`${a.leftPct}%`} cy={`${a.topPct}%`} r="4" fill="#C9A227" />
                              <circle cx={`${b.leftPct}%`} cy={`${b.topPct}%`} r="4" fill="#C9A227" />
                              <text
                                x={`${midX}%`}
                                y={`${midY}%`}
                                dy="-6"
                                fontSize="11"
                                fontWeight="bold"
                                fill="#1B1E23"
                                textAnchor="middle"
                                style={{ textShadow: "0 1px 1px rgba(255,255,255,0.9)" }}
                              >
                                {lenFt} ft
                              </text>
                            </g>
                          );
                        })()}

                      {showMeasurements &&
                        placed.slice(1).map((item, i) => {
                          const prev = placed[i];
                          const a = lonLatToPct(prev.lon, prev.lat);
                          const b = lonLatToPct(item.lon, item.lat);
                          const { xM, yM } = lonLatToOffsetM(item.lon, item.lat, prev.lon, prev.lat);
                          const distFt = metersToFeet(Math.hypot(xM, yM)).toFixed(1);
                          const midX = (a.leftPct + b.leftPct) / 2;
                          const midY = (a.topPct + b.topPct) / 2;
                          return (
                            <g key={`m-${item.id}`}>
                              <line
                                x1={`${a.leftPct}%`}
                                y1={`${a.topPct}%`}
                                x2={`${b.leftPct}%`}
                                y2={`${b.topPct}%`}
                                stroke="#1B1E23"
                                strokeWidth="1"
                                strokeDasharray="3 3"
                                opacity="0.7"
                              />
                              <text
                                x={`${midX}%`}
                                y={`${midY}%`}
                                dy="-4"
                                fontSize="10"
                                fontWeight="bold"
                                fill="#1B1E23"
                                textAnchor="middle"
                                style={{ textShadow: "0 1px 1px rgba(255,255,255,0.9)" }}
                              >
                                {distFt} ft cc
                              </text>
                            </g>
                          );
                        })}
                    </svg>

                    {placed.map((p) => {
                      const { wPct, hPct } = footprintPct(p);
                      const isSelected = p.id === selectedId;
                      const { leftPct: left, topPct: top } = lonLatToPct(p.lon, p.lat);
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

                    {/* SCALE BAR — shown both on screen and in print */}
                    {scaleBar && (
                      <div className="absolute bottom-2 left-2 flex flex-col items-start gap-0.5 rounded bg-white/80 px-2 py-1 text-[10px] font-semibold text-dark">
                        <div
                          style={{ width: `${scaleBar.px}px`, borderBottom: "2px solid #1B1E23" }}
                        />
                        {scaleBar.ft} ft
                      </div>
                    )}
                  </div>
                  <p className="no-print mt-2 text-xs text-steel">
                    {location.placeName} — drag the map to pan, drag a placed
                    item to move it, click it to select. Click empty map to
                    deselect. Use +/− to zoom.
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

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-steel">
                      Reference line &amp; row
                    </div>
                    <p className="mt-1 text-xs text-steel">
                      For a row of stalls: draw a line along a curb or drive
                      aisle, then place several evenly-spaced copies along it
                      in one go.
                    </p>
                    {!referenceLine ? (
                      <button
                        type="button"
                        onClick={startAddingLine}
                        className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm font-semibold hover:border-gold"
                      >
                        <Ruler className="h-3.5 w-3.5" />
                        {addingLine ? "Click two points on the map…" : "Draw reference line"}
                      </button>
                    ) : (
                      <div className="mt-2 flex flex-col gap-2">
                        <div className="text-xs text-steel">
                          Line length: {lineInfo ? metersToFeet(lineInfo.lengthM).toFixed(1) : "—"} ft
                        </div>
                        <form onSubmit={placeArray} className="flex flex-col gap-2">
                          <select
                            value={arrayTemplateKind}
                            onChange={(e) => setArrayTemplateKind(e.target.value)}
                            className="rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-gold"
                          >
                            {PRODUCT_ORDER.map((key) => (
                              <option key={key} value={key}>
                                {PRODUCTS[key].name}
                              </option>
                            ))}
                            <option value="rect">Custom rectangle</option>
                          </select>
                          {arrayTemplateKind === "rect" && (
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={arrayRectW}
                                onChange={(e) => setArrayRectW(e.target.value)}
                                placeholder="Width (ft)"
                                className="w-1/2 rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-gold"
                              />
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={arrayRectD}
                                onChange={(e) => setArrayRectD(e.target.value)}
                                placeholder="Depth (ft)"
                                className="w-1/2 rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-gold"
                              />
                            </div>
                          )}
                          {arrayTemplateKind === "rect" && (
                            <input
                              type="text"
                              value={arrayLabel}
                              onChange={(e) => setArrayLabel(e.target.value)}
                              placeholder="Label prefix (e.g. Stall)"
                              className="rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-gold"
                            />
                          )}
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={arraySpacing}
                              onChange={(e) => setArraySpacing(e.target.value)}
                              placeholder="Spacing cc (ft)"
                              className="w-1/2 rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-gold"
                            />
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={arrayCount}
                              onChange={(e) => setArrayCount(e.target.value)}
                              placeholder="Count"
                              className="w-1/2 rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-gold"
                            />
                          </div>
                          {fitsCount && (
                            <div className="text-xs text-steel">
                              Line fits ~{fitsCount} at this spacing.
                            </div>
                          )}
                          <label className="flex items-center gap-1.5 text-xs text-steel">
                            <input
                              type="checkbox"
                              checked={arrayPerpendicular}
                              onChange={(e) => setArrayPerpendicular(e.target.checked)}
                            />
                            Rotate 90° from line (perpendicular stalls)
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gold px-3 py-1.5 text-sm font-bold text-dark hover:bg-goldSoft"
                            >
                              Place along line
                            </button>
                            <button
                              type="button"
                              onClick={clearReferenceLine}
                              className="inline-flex items-center justify-center rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm font-semibold hover:border-red-300"
                            >
                              Clear
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>

                  {selected && (
                    <div className="rounded-md border border-gold/40 bg-gold/10 p-3">
                      <div className="text-xs font-bold uppercase tracking-wide text-dark">
                        Selected:{" "}
                        {selected.kind === "rect"
                          ? selected.label
                          : PRODUCTS[selected.type].name}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => nudgeRotation(-15)}
                          className="rounded-md border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold hover:border-gold"
                          title="Rotate -15°"
                        >
                          -15°
                        </button>
                        <input
                          type="number"
                          value={Math.round(selected.rotation)}
                          onChange={(e) => setSelectedRotation(parseFloat(e.target.value) || 0)}
                          onFocus={() => pushHistory(placed)}
                          className="w-16 rounded-md border border-black/15 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-gold"
                        />
                        <span className="text-xs text-steel">°</span>
                        <button
                          type="button"
                          onClick={() => nudgeRotation(15)}
                          className="rounded-md border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold hover:border-gold"
                          title="Rotate +15°"
                        >
                          +15°
                        </button>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={duplicateSelected}
                          className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold hover:border-gold"
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicate
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

                  <label className="flex items-center gap-1.5 text-xs font-semibold text-steel">
                    <input
                      type="checkbox"
                      checked={showMeasurements}
                      onChange={(e) => setShowMeasurements(e.target.checked)}
                    />
                    Show CC measurements between items
                  </label>

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
