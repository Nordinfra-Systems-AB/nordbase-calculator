// Vercel serverless function for the site's "Questions" contact form
// (SiteChrome.jsx -> SiteFooter, under the existing #contact anchor).
// Added 2026-09-28 per Simon Gullberg: "Jag tänker att vi också ska få in
// en Questions fält så att folk kan skicka meddelande till oss direkt.
// Denna kan ligga under 'contact'" -- backend choice confirmed by Simon as
// email-only via Resend ("E-post via Resend (som leads idag)"), not the
// fuller Resend+ClickUp pattern the calculator's own lead form uses (see
// api/submit-lead.js in the calculator app -- this is a deliberately
// simpler, single-channel sibling of that same pattern, not a shared
// import: the site and calculator are separate Vercel projects with
// separate serverless function bundles).
//
// SETUP REQUIRED before this actually sends anything:
//   In Vercel -> the SITE project (nordinfra-site, nord-infra.com -- NOT
//   the calculator project, they're separate) -> Settings -> Environment
//   Variables, add:
//     RESEND_API_KEY = <a Resend API key -- the calculator project already
//       has one; either reuse the same key or generate a second one in the
//       same Resend account, either works>
//   Optional overrides (same place):
//     CONTACT_TO_EMAIL -- where messages land (default: info@nord-infra.com)
//     FROM_EMAIL -- must be on a domain verified in Resend (default:
//       contact@nord-infra.com -- 2026-09-28: nordbaseusa.com was tried
//       first since that's the site's own domain, but Resend rejected it
//       with "domain is not verified"; only nord-infra.com is actually
//       verified on this account, confirmed by sending a real test message
//       through the live Resend API with each candidate from-address).
//   Redeploy after adding the env var -- Vercel only picks it up on the
//   next deploy, not on an already-running one.
//
// Until RESEND_API_KEY is set, this endpoint responds 500 not_configured
// and the form UI shows an inline "message us directly" fallback with the
// info@nord-infra.com mailto: link instead of silently losing the message.

import { rateLimit } from "./_rateLimit.js";

async function sendEmail({ firstName, lastName, email, phone, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { attempted: false };

  const toEmail = process.env.CONTACT_TO_EMAIL || "info@nord-infra.com";
  const fromEmail = process.env.FROM_EMAIL || "contact@nord-infra.com";

  const subject = `Website contact form: ${firstName} ${lastName}`;
  const lines = [
    `Name: ${firstName} ${lastName}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    "",
    "Message:",
    message,
  ].filter((l) => l !== null);

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Nordinfra Website <${fromEmail}>`,
      to: [toEmail],
      reply_to: email,
      subject,
      text: lines.join("\n"),
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.error("Resend API error", resendRes.status, errText);
    throw new Error(`resend_${resendRes.status}`);
  }
  return { attempted: true };
}

// Very small, deliberately permissive check -- this is a spam/typo guard,
// not full RFC 5322 validation (which would reject plenty of real
// addresses). Mirrors the level of validation already used elsewhere on
// the site rather than pulling in a validation library for one field.
function looksLikeEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const rl = rateLimit(req, {
    windowMs: 10 * 60 * 1000,
    max: 5,
    keyPrefix: "submit-contact",
  });
  if (rl.limited) {
    res.setHeader("Retry-After", String(rl.retryAfterSeconds));
    res.status(429).json({ ok: false, error: "rate_limited" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      res.status(400).json({ ok: false, error: "invalid_json" });
      return;
    }
  }

  const { firstName, lastName, email, phone, message, consent } = body || {};

  if (!consent) {
    res.status(400).json({ ok: false, error: "consent_required" });
    return;
  }
  if (!firstName || !lastName || !email || !message) {
    res.status(400).json({ ok: false, error: "missing_fields" });
    return;
  }
  if (!looksLikeEmail(email)) {
    res.status(400).json({ ok: false, error: "invalid_email" });
    return;
  }
  // Basic sanity caps -- not real spam/abuse protection, just stops a
  // trivially malformed or hostile request from doing much.
  if (
    String(firstName).length > 200 ||
    String(lastName).length > 200 ||
    String(email).length > 300 ||
    String(phone || "").length > 60 ||
    String(message).length > 8000
  ) {
    res.status(400).json({ ok: false, error: "payload_too_large" });
    return;
  }

  const result = await Promise.allSettled([
    sendEmail({ firstName, lastName, email, phone, message }),
  ]);
  const emailResult = result[0];
  const emailOk = emailResult.status === "fulfilled" && emailResult.value.attempted;
  const emailConfigured = emailResult.status === "rejected" || emailOk;

  if (emailResult.status === "rejected") {
    // eslint-disable-next-line no-console
    console.error("submit-contact: email channel failed", emailResult.reason);
  }

  if (emailOk) {
    res.status(200).json({ ok: true });
    return;
  }

  res.status(emailConfigured ? 502 : 500).json({
    ok: false,
    error: emailConfigured ? "send_failed" : "not_configured",
  });
}
