import React, { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Download,
  Ruler,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { CALCULATOR_URL } from "./constants.js";
import { SiteHeader, SiteFooter } from "./components/SiteChrome.jsx";
import { PRODUCTS, PRODUCT_ORDER } from "./foundationData.js";

// ---------------------------------------------------------------------------
// PRODUCT DETAIL — one shared template, not four separate static pages
// (confirmed with Simon 2026-08-25). Reads which foundation to show from the
// ?f= query string, e.g. /product.html?f=medium. This mirrors how EV Blocks
// gives each foundation its own page with drawings/dimensions, plus a
// manufacturer list — see foundationData.js for why that list names
// manufacturers rather than claiming per-foundation certified compatibility.
// ---------------------------------------------------------------------------

function getSlugFromUrl() {
  if (typeof window === "undefined") return "bollard";
  const params = new URLSearchParams(window.location.search);
  const f = params.get("f");
  return PRODUCTS[f] ? f : null;
}

function DocRow({ label, file, note }) {
  const available = Boolean(file);
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-black/10 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-semibold text-dark">{label}</div>
        {note && <div className="mt-0.5 text-xs text-steel">{note}</div>}
      </div>
      {available ? (
        <a
          href={file}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-dark hover:bg-goldSoft sm:self-auto"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      ) : (
        <span className="shrink-0 self-start rounded-md border border-black/10 px-3 py-1.5 text-xs font-semibold text-steel sm:self-auto">
          Coming soon
        </span>
      )}
    </div>
  );
}

function DimRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-black/5 py-2.5 text-sm last:border-0">
      <span className="text-steel">{label}</span>
      <span className="font-semibold text-dark">{value}</span>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-bgSoft text-dark">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Product not found
        </h1>
        <p className="mt-3 text-steel">
          We couldn't find a foundation matching that link.
        </p>
        <a
          href="/#products"
          className="mt-6 inline-flex items-center gap-1.5 font-bold text-dark hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to product line
        </a>
      </section>
      <SiteFooter />
    </div>
  );
}

export default function ProductApp() {
  const [slug] = useState(getSlugFromUrl);
  const product = slug ? PRODUCTS[slug] : null;

  if (!product) return <NotFound />;

  const idx = PRODUCT_ORDER.indexOf(product.slug);
  const prevSlug = idx > 0 ? PRODUCT_ORDER[idx - 1] : null;
  const nextSlug = idx < PRODUCT_ORDER.length - 1 ? PRODUCT_ORDER[idx + 1] : null;

  return (
    <div className="min-h-screen bg-bgSoft text-dark">
      <SiteHeader />

      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <a
            href="/#products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-steel hover:text-dark"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Product line
          </a>
        </div>
      </section>

      {/* HERO */}
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-3">
            <div className="flex aspect-square items-center justify-center rounded-xl border border-black/10 bg-white p-6">
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-contain"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-3 gap-3">
                {product.images.slice(1).map((src) => (
                  <div
                    key={src}
                    className="flex aspect-square items-center justify-center rounded-lg border border-black/10 bg-white p-3"
                  >
                    <img
                      src={src}
                      alt={`${product.name} — installed assembly`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <span className="inline-flex w-fit items-center rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-dark">
              {product.level} — {product.levelDesc}
            </span>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
              {product.name}
            </h1>
            <p className="mt-2 text-sm font-medium uppercase tracking-wide text-steel/70">
              {product.subtitle}
            </p>
            <p className="mt-4 text-steel">{product.tagline}</p>
            <p className="mt-4 text-sm leading-relaxed text-steel">
              {product.blurb}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={CALCULATOR_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-dark hover:bg-goldSoft"
              >
                Configure this foundation <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/installation.html"
                className="inline-flex items-center gap-2 rounded-md border border-black/15 px-5 py-2.5 text-sm font-bold text-dark hover:bg-black/[0.03]"
              >
                See how it installs
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* DIMENSIONS */}
      <section className="border-b border-black/10 bg-bgSoft py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold">
              <Ruler className="h-4 w-4" /> Dimensions & weight
            </div>
            <div className="mt-4 rounded-xl border border-black/10 bg-white p-5">
              <DimRow
                label="Top opening"
                value={`${product.dims.top.w}" × ${product.dims.top.d}"`}
              />
              <DimRow
                label="Base footprint"
                value={`${product.dims.bottom.w}" × ${product.dims.bottom.d}" (${product.dims.basePlateType})`}
              />
              <DimRow label="Depth" value={`${product.dims.depthIn}"`} />
              <DimRow
                label="Foundation weight"
                value={`${product.dims.weightLb} lb`}
              />
              {product.adapterPlate?.weightLb ? (
                <DimRow
                  label="Adapter plate weight"
                  value={`${product.adapterPlate.weightLb} lb`}
                />
              ) : null}
            </div>
            <p className="mt-3 text-xs text-steel">
              Preliminary dimensions for planning purposes — see the
              calculator for a project-specific, exportable submittal
              package.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gold">
              <Layers className="h-4 w-4" /> Material
            </div>
            <div className="mt-4 rounded-xl border border-black/10 bg-white p-5 text-sm text-steel">
              {product.material}
            </div>

            {product.adapterPlate && (
              <div className="mt-6">
                <div className="text-sm font-semibold uppercase tracking-wider text-gold">
                  Adapter plate
                </div>
                <div className="mt-4 rounded-xl border border-black/10 bg-white p-5">
                  {product.adapterPlate.size ? (
                    <>
                      <DimRow
                        label="Plate size"
                        value={`${product.adapterPlate.size.w}" × ${product.adapterPlate.size.d}"`}
                      />
                      <DimRow
                        label="Thickness"
                        value={`${product.adapterPlate.thicknessIn}"`}
                      />
                      <DimRow label="Material" value={product.adapterPlate.material} />
                    </>
                  ) : null}
                  {product.adapterPlate.ccOptionsX?.length > 0 ? (
                    <div className="flex items-center justify-between border-b border-black/5 py-2.5 text-sm">
                      <span className="text-steel">Width (X) CC options</span>
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {product.adapterPlate.ccOptionsX.map((cc) => (
                          <span
                            key={cc}
                            className="rounded-md bg-gold/15 px-2 py-0.5 text-xs font-bold text-dark"
                          >
                            {cc}"
                          </span>
                        ))}
                      </span>
                    </div>
                  ) : null}
                  {product.adapterPlate.ccOptionsY?.length > 0 ? (
                    <div className="flex items-center justify-between border-b border-black/5 py-2.5 text-sm last:border-0">
                      <span className="text-steel">Depth (Y) CC options</span>
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {product.adapterPlate.ccOptionsY.map((cc) => (
                          <span
                            key={cc}
                            className="rounded-md bg-gold/15 px-2 py-0.5 text-xs font-bold text-dark"
                          >
                            {cc}"
                          </span>
                        ))}
                      </span>
                    </div>
                  ) : null}
                  {product.adapterPlate.ccOptionsX?.length > 0 &&
                  product.adapterPlate.ccOptionsY?.length > 0 ? (
                    <p className="pt-2.5 text-xs text-steel">
                      Pick any width × depth combination — matching values
                      give a square bolt pattern, different values give a
                      rectangular one.
                    </p>
                  ) : null}
                  {product.adapterPlate.note && (
                    <p className="pt-2.5 text-xs text-steel">
                      {product.adapterPlate.note}
                    </p>
                  )}
                </div>
              </div>
            )}

            {product.structuralNote && (
              <div className="mt-6 flex gap-3 rounded-xl border border-black/10 bg-white p-4 text-xs text-steel">
                <ShieldCheck className="h-4 w-4 shrink-0 text-gold" />
                <span>{product.structuralNote}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CHARGER MANUFACTURERS — only rendered when this product has a
          verified pedestal-bolt-pattern survey on file (SMALL today).
          Medium/Large intentionally show nothing here rather than implying
          compatibility that hasn't been confirmed for those sizes. */}
      {product.chargerManufacturers?.length > 0 && (
        <section className="border-b border-black/10 bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-extrabold tracking-tight">
              Sized for the chargers you're already speccing
            </h2>
            <p className="mt-2 max-w-2xl text-steel">
              Pick your pedestal in the calculator and it fills in the exact
              bolt spacing automatically wherever we have a confirmed hole
              pattern on file — otherwise it flags a quick compatibility
              check with Nordinfra instead of guessing. These manufacturers'
              pedestal footprints are already dialed into the calculator's
              sizing tool:
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {product.chargerManufacturers.map((m) => (
                <span
                  key={m.name}
                  className="rounded-full border border-black/10 bg-bgSoft px-4 py-2 text-sm font-semibold text-dark"
                >
                  {m.name}{" "}
                  <span className="font-normal text-steel">
                    ({m.models} model{m.models > 1 ? "s" : ""})
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-steel">
              This reflects footprints we've sized reference dimensions for —
              not an exhaustive or certified compatibility list. Don't see
              your charger? The calculator accepts a custom footprint for any
              pedestal.
            </p>
          </div>
        </section>
      )}

      {/* DOCUMENTS */}
      <section className="border-b border-black/10 bg-bgSoft py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-extrabold tracking-tight">
            Drawings & documentation
          </h2>
          <div className="mt-5 flex flex-col gap-2">
            <DocRow
              label={`${product.name} — Installation Manual`}
              file={product.manual}
            />
            <DocRow
              label="US Product & Function Warranty"
              file="/docs/warranty/NI_WAR_001_US_Product_Warranty.pdf"
            />
            <DocRow
              label="Technical Specifications, Durability & Lifecycle Analysis"
              file="/docs/technical-specs/Nordinfra_Technical_Spec_US.pdf"
            />
            {product.baba && (
              <DocRow
                label="Buy America / BABA Certificate of Compliance"
                file="/docs/certificates/NI_BABA_001_US_Certificate.pdf"
              />
            )}
          </div>
          <a
            href="/resources.html"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-dark hover:text-gold"
          >
            View the full resource library <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      {/* PREV/NEXT */}
      <section className="bg-white py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm font-semibold">
          {prevSlug ? (
            <a
              href={`/product.html?f=${prevSlug}`}
              className="inline-flex items-center gap-1.5 text-dark hover:text-gold"
            >
              <ArrowLeft className="h-4 w-4" /> {PRODUCTS[prevSlug].name}
            </a>
          ) : (
            <span />
          )}
          {nextSlug ? (
            <a
              href={`/product.html?f=${nextSlug}`}
              className="inline-flex items-center gap-1.5 text-dark hover:text-gold"
            >
              {PRODUCTS[nextSlug].name} <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <span />
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
