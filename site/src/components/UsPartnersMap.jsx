import React, { useState } from "react";
import { MapPin } from "lucide-react";

// ---------------------------------------------------------------------------
// PARTNERS MAP — rebuilt 2026-09-28 (Simon Gullberg: "Denna skulle jag vilja
// bygga om... deras pin ligger helt fel... mycket snyggare karta") to use a
// real Mapbox basemap with a pin at each partner's own geocoded location,
// replacing the previous approach (a hand-drawn SVG US outline, one pin per
// STATE at that state's geographic centroid). The old approach is exactly
// why Postlane's pin was nowhere near Brooklyn -- New York State's centroid
// sits well upstate, nothing to do with where the branch actually is.
//
// Uses the SAME Mapbox access token already configured for the Site Planner
// tool (VITE_MAPBOX_TOKEN, already set in this project's Vercel env) -- no
// new account/API key needed. The basemap is a single Mapbox Static Images
// API request (a plain <img>, same lightweight pattern as
// SitePlannerApp.jsx's satellite preview -- NOT the full interactive
// Mapbox GL JS SDK). Because the request uses an explicit center/zoom
// (never "auto"), every partner's pixel position can be computed with a
// standard Web Mercator projection (see project() below) and overlaid as
// absolutely-positioned HTML on top of the image -- that's what lets pins
// keep hover tooltips, which a plain static image alone can't do.
//
// HOW TO ADD A PIN: give the partner a `lat`/`lon` in PartnersApp.jsx's
// REGIONS (US_PARTNER_PINS is derived from that automatically). If you're
// also fixing the calculator's own "get directions" locator, do the same
// in NordBaseCalculator.jsx's PARTNERS array -- the two are separate,
// manually kept in sync, same as the rest of partner data.
//
// FRAME: fixed to the continental US (MAP_CENTER/MAP_ZOOM below), matching
// the old SVG map's continental-only coverage. A partner in Alaska, Hawaii,
// or otherwise outside this frame would compute an off-image position --
// rather than silently placing a pin outside the visible map (or clipping
// it invisibly), pins outside the 0-100% range are left off the overlay
// and listed in a line below the map instead. Widen MAP_ZOOM (zoom out) or
// move MAP_CENTER if the partner network outgrows this frame.
//
// LOAD FAILURE: the <img> below has an onError handler (2026-09-28, after
// the Mapbox Static Images API returned 403/503 for this project's token
// live in production the same day this shipped -- unrelated to this
// component's own code: Site Planner's separately-existing satellite
// preview and address geocoding, which use the SAME VITE_MAPBOX_TOKEN,
// failed identically at the same time, so the token/account itself needs
// checking at account.mapbox.com, not this file). Without this handler a
// failed request left a broken-image icon with pins floating over nothing
// -- now it falls back to the same dashed-border message used when the
// token is missing entirely, so partners are still reachable via the list
// below the map either way.
// ---------------------------------------------------------------------------

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

const MAP_CENTER = { lon: -96.0, lat: 38.5 };
// 2026-09-28 (fix, same day as launch): was 4.3 -- wrong on a false
// assumption about Mapbox's tile size (see project() below). At 4.3 with
// the CORRECT tile size the frame was actually zoomed in far enough to
// clip the whole Northeast off the right edge (verified live: Postlane's
// Brooklyn pin computed to 110% -- off the visible frame -- and the
// basemap image itself only showed Wyoming to Ohio, not the full
// continental US). 3.3 is the value that actually fits the continental US
// in this W x H frame -- verified against Seattle/LA/Miami/Boston/Brooklyn
// and the four continental-bbox corners all landing with sane padding.
const MAP_ZOOM = 3.3;
const MAP_W = 1030;
const MAP_H = 610;

const MAP_IMAGE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${MAP_CENTER.lon},${MAP_CENTER.lat},${MAP_ZOOM},0/${MAP_W}x${MAP_H}@2x?access_token=${MAPBOX_TOKEN}`
  : null;

// Standard Web Mercator projection (the same math Mapbox/Google Maps static
// APIs use internally) -- converts lon/lat into a pixel position WITHIN the
// MAP_W x MAP_H frame above, centered exactly on MAP_CENTER at MAP_ZOOM.
// Returned as a 0-100 percentage of the frame (not raw px) so a pin's
// position stays correct no matter how large the responsive <img> actually
// renders on screen.
//
// TILE SIZE = 512, not the "classic" 256: fixed 2026-09-28 after every pin
// rendered roughly 2x too close to the map's center in production (e.g.
// Brooklyn landed over Ohio instead of New York). Mapbox's newer vector
// styles (light-v11 here, and satellite-v9 in SitePlannerApp.jsx) use a
// 512px world-tile convention, not the legacy 256px raster-tile one this
// formula originally (incorrectly) assumed -- confirmed by requesting the
// same style/zoom/center from Mapbox with one of its own marker overlays
// (?/pin-s+.../lon,lat/...) and comparing where MAPBOX itself drew the pin
// against where this formula predicted it, at both tile sizes.
function project(lon, lat) {
  const scale = 512 * 2 ** MAP_ZOOM;
  const worldX = (lonV) => ((lonV + 180) / 360) * scale;
  const worldY = (latV) => {
    const rad = (latV * Math.PI) / 180;
    return (0.5 - Math.asinh(Math.tan(rad)) / (2 * Math.PI)) * scale;
  };
  const cx = worldX(MAP_CENTER.lon);
  const cy = worldY(MAP_CENTER.lat);
  const leftPct = ((MAP_W / 2 + (worldX(lon) - cx)) / MAP_W) * 100;
  const topPct = ((MAP_H / 2 + (worldY(lat) - cy)) / MAP_H) * 100;
  return { leftPct, topPct };
}

// `partners`: [{ name, city, state, lat, lon }] -- one entry per PIN (not
// per state anymore -- two partners in the same state now get two separate
// pins, at their own locations, instead of sharing one state-centroid pin).
export default function UsPartnersMap({ partners }) {
  const [hovered, setHovered] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);

  const withCoords = (partners || []).filter(
    (p) => typeof p.lat === "number" && typeof p.lon === "number"
  );
  const pins = withCoords.map((p) => ({ ...p, ...project(p.lon, p.lat) }));
  const onFrame = pins.filter(
    (p) => p.leftPct >= 0 && p.leftPct <= 100 && p.topPct >= 0 && p.topPct <= 100
  );
  const offFrame = pins.filter((p) => !onFrame.includes(p));

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 bg-bgSoft p-6 text-sm text-steel">
        Map needs a Mapbox access token. Get one free at{" "}
        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-dark underline"
        >
          account.mapbox.com
        </a>{" "}
        and add it as{" "}
        <code className="rounded bg-white px-1">VITE_MAPBOX_TOKEN</code> in this site's
        Vercel project settings.
      </div>
    );
  }

  // Token is present but the basemap image itself failed to load (see the
  // LOAD FAILURE note above the component) -- degrade to the same style of
  // message rather than a broken-image icon with pins floating over
  // nothing. Partners are still listed in full below the map either way.
  if (imgFailed) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 bg-bgSoft p-6 text-sm text-steel">
        Map temporarily unavailable. Partners are listed below.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-sky-50">
      <div className="relative">
        <img
          src={MAP_IMAGE_URL}
          alt="Map of Nordinfra distribution partners across the United States"
          className="block h-auto w-full"
          onError={() => setImgFailed(true)}
        />
        {onFrame.map((p) => {
          const key = `${p.name}-${p.city}`;
          return (
            <div
              key={key}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${p.leftPct}%`, top: `${p.topPct}%` }}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered((h) => (h === key ? null : h))}
            >
              <span className="absolute inset-0 -m-1.5 animate-ping rounded-full bg-gold/40" />
              <span className="relative block h-3 w-3 rounded-full border-2 border-dark bg-gold" />
              {hovered === key && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-dark px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg">
                  {p.name} — {p.city}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {pins.length === 0 && (
        <div className="flex items-center gap-2 border-t border-black/10 bg-white px-4 py-3 text-sm text-steel">
          <MapPin className="h-4 w-4 text-gold" /> No confirmed partner
          locations yet — check back as the US distribution network grows.
        </div>
      )}
      {offFrame.length > 0 && (
        <div className="border-t border-black/10 bg-white px-4 py-3 text-xs text-steel">
          Also serving: {offFrame.map((p) => `${p.name} (${p.city})`).join(", ")} — outside
          the continental-US map view shown above.
        </div>
      )}
    </div>
  );
}
