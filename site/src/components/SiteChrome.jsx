import React from "react";
import { ArrowRight, Mail } from "lucide-react";
import { CALCULATOR_URL } from "../constants.js";

// ---------------------------------------------------------------------------
// SHARED SITE HEADER + FOOTER — extracted from App.jsx (2026-08-25) so every
// full page (home, product detail, installation guide) carries the same nav
// instead of the stripped Partners/Resources-style header. Partners.jsx and
// Resources.jsx keep their own simpler header on purpose (they're reference
// directories, not primary content pages) — this is not used there.
//
// Section anchors (#products, #sustainability, #contact) are written as
// "/#anchor" rather than "#anchor" so they resolve correctly from any page,
// not just the homepage. On the homepage itself this behaves identically to
// a plain hash link (same document, so the browser just scrolls).
//
// "Markets" nav item + homepage section removed 2026-08-26 (Simon Gullberg)
// — Nordinfra is focusing on the US market only for now.
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { label: "Products", href: "/#products" },
  { label: "Sustainability", href: "/#sustainability" },
  { label: "Installation", href: "/installation.html" },
  { label: "Site Planner", href: "/site-planner.html" },
  { label: "Partners", href: "/partners.html" },
  { label: "Resources", href: "/resources.html" },
  { label: "Contact", href: "/#contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-dark/90 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        {/* shrink-0 is load-bearing: without it, on narrow screens the flex
            row squeezes this link below the logo image's natural width and
            the image overflows behind the CTA button instead of resizing
            (that's what "part of the logo gets covered" was).
            logo-nav-light.png was replaced 2026-08-25 with a properly
            padded export (the previous file had zero right-hand margin,
            clipping the final "a" in "Nordinfra" inside the image itself). */}
        <a href="/" className="flex shrink-0 items-center">
          <img
            src="/logo/logo-nav-light.png"
            alt="Nordinfra"
            className="h-9 w-auto sm:h-11"
          />
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-white/70 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href={CALCULATOR_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-gold px-3 py-2 text-xs font-bold text-dark hover:bg-goldSoft sm:px-4 sm:text-sm"
        >
          Calculate<span className="hidden sm:inline"> your foundation</span>{" "}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-white/10 bg-dark py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div>
            <img
              src="/logo/logo-full-light.png"
              alt="Nordinfra — Practical. Proven. Progressive."
              className="h-14 w-auto"
            />
            <p className="mt-4 max-w-xs text-sm text-white/50">
              Nordinfra Systems AB, Varberg, Sweden. Nordinfra USA LLC
              (Delaware) — in formation.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Mail className="h-4 w-4" />
            <a href="mailto:simon@nord-infra.com" className="hover:text-white">
              simon@nord-infra.com
            </a>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/40">
          PREVIEW — this page is a working draft, not yet the live
          nord-infra.com site. Content is a starting point for review, not
          final marketing copy. Preliminary calculations from the calculator
          are not a substitute for a PE-stamped package.
        </div>
      </div>
    </footer>
  );
}
