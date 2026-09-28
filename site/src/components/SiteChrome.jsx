import React, { useState } from "react";
import { ArrowRight, Mail, Loader2, CheckCircle2 } from "lucide-react";
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
//
// "Site Planner" nav item removed 2026-09-01 (Simon Gullberg) — the tool
// itself is paused (quality issues, flagged 2026-08-26) and is being
// revisited later; hidden from navigation in the meantime rather than
// deleted, so the page at /site-planner.html still exists for direct/
// internal access if needed before it's re-launched.
//
// "Questions" contact form added 2026-09-28 (Simon Gullberg, re: the
// Partners-page rebuild request: "Jag tänker att vi också ska få in en
// Questions fält så att folk kan skicka meddelande till oss direkt. Denna
// kan ligga under 'contact'") — added directly into this footer since
// #contact (below) is the anchor every "Contact" nav link on the site
// already points at. Posts to /api/submit-contact (this site's own Vercel
// project — see site/api/submit-contact.js), email-only via Resend per
// Simon's explicit choice over the calculator's fuller Resend+ClickUp
// pattern ("E-post via Resend (som leads idag)").
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { label: "Products", href: "/#products" },
  { label: "Sustainability", href: "/#sustainability" },
  { label: "Installation", href: "/installation.html" },
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

const CONTACT_FIELD_CLASS =
  "w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-gold focus:ring-1 focus:ring-gold";

function ContactForm() {
  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [consent, setConsent] = useState(false);
  // idle | submitting | success | error
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function setField(key) {
    return (e) => setFields((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!consent) {
      setStatus("error");
      setErrorMsg("Please check the consent box before sending.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/submit-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `http_${res.status}`);
      }
      setStatus("success");
      setFields({ firstName: "", lastName: "", email: "", phone: "", message: "" });
      setConsent(false);
    } catch (err) {
      setStatus("error");
      // "not_configured" means RESEND_API_KEY isn't set on this Vercel
      // project yet (see site/api/submit-contact.js) -- a real customer
      // should never lose their message over that, so point them at a
      // direct mailto: fallback instead of a bare error.
      setErrorMsg(
        err.message === "not_configured"
          ? "Sending isn't set up yet on our end -- please email us directly at info@nord-infra.com instead."
          : "Something went wrong sending your message. Please try again, or email us directly at info@nord-infra.com."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm text-white">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <div>
          <p className="font-semibold">Message sent.</p>
          <p className="mt-1 text-white/70">
            Thanks for reaching out -- we'll get back to you shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="First name"
          required
          value={fields.firstName}
          onChange={setField("firstName")}
          className={CONTACT_FIELD_CLASS}
        />
        <input
          type="text"
          placeholder="Last name"
          required
          value={fields.lastName}
          onChange={setField("lastName")}
          className={CONTACT_FIELD_CLASS}
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={fields.email}
          onChange={setField("email")}
          className={CONTACT_FIELD_CLASS}
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={fields.phone}
          onChange={setField("phone")}
          className={CONTACT_FIELD_CLASS}
        />
      </div>
      <textarea
        placeholder="How can we help?"
        required
        rows={3}
        value={fields.message}
        onChange={setField("message")}
        className={CONTACT_FIELD_CLASS}
      />
      <label className="flex items-start gap-2 text-xs text-white/60">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I agree to Nordinfra storing and using the information I submit to
          respond to my message. See our{" "}
          <a
            href={`${CALCULATOR_URL}privacy`}
            target="_blank"
            rel="noreferrer"
            className="text-gold underline hover:text-goldSoft"
          >
            Privacy Policy
          </a>{" "}
          for details.
        </span>
      </label>

      {status === "error" && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-bold text-dark hover:bg-goldSoft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-white/10 bg-dark py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <img
                src="/logo/logo-full-light.png"
                alt="Nordinfra — Practical. Proven. Progressive."
                className="h-14 w-auto"
              />
              {/* 2026-09-17 (Simon, direct instruction): dropped the Sweden
                  parent-company line and replaced the "Nordinfra USA LLC
                  (Delaware) — in formation" line with the entity's current
                  name. Also removed the PE-stamped disclaimer paragraph
                  below per the same instruction. */}
              <p className="mt-4 max-w-xs text-sm text-white/50">
                NordBase USA Inc.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Mail className="h-4 w-4" />
              <a href="mailto:info@nord-infra.com" className="hover:text-white">
                info@nord-infra.com
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">
              Questions?
            </h3>
            <p className="mt-1 text-sm text-white/50">
              Send us a message and we'll get back to you.
            </p>
            <div className="mt-4">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
