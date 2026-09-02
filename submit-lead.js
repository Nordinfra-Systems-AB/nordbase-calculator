// Vercel serverless function — receives the "Send calc to Nordinfra"
// submittal payload directly from the calculator and emails it to Nordinfra
// via Resend, instead of relying on a mailto: link (which depended on the
// customer's own email client being configured AND them actually hitting
// send in it — a real conversion leak). Added 2026-09-02 per Simon
// Gullberg's decision to build lead capture now and add a full CRM later.
//
// SETUP REQUIRED before this actually sends anything (Simon/Nordinfra):
//   1. Create a Resend account: https://resend.com (generous free tier —
//      100 emails/day / 3,000/month, plenty for lead notifications).
//   2. Verify a sending domain in Resend (e.g. nordbaseusa.com or
//      nord-infra.com) — required before Resend will actually deliver;
//      their onboarding domain only sends to your own verified account
//      email, not real customers.
//   3. Generate an API key in the Resend dashboard.
//   4. In Vercel → this project (the CALCULATOR app specifically —
//      calculator.nordbaseusa.com — NOT the marketing site, they're
//      separate Vercel projects) → Settings → Environment Variables, add:
//        RESEND_API_KEY = <the key from step 3>
//      Redeploy after adding it — Vercel only picks up new env vars on the
//      next deploy, not on already-running ones.
//   5. Optional overrides (same place, only if you want something other
//      than the defaults below):
//        LEAD_TO_EMAIL — where leads land (default: info@nord-infra.com,
//          matching the old mailto: address)
//        FROM_EMAIL — must be on the domain verified in step 2 (default:
//          leads@nordbaseusa.com)
//
// Until RESEND_API_KEY is set, this endpoint returns an error and the
// calculator's UI automatically falls back to the old mailto: link (see
// submitLead() in NordBaseCalculator.jsx) — so this ships safely before
// that setup is done; leads just aren't captured server-side yet.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: "not_configured" });
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

  const { subject, text, meta, consent } = body || {};

  // Mirrors the UI's own consent gate (NordBaseCalculator.jsx won't call
  // this without consentGiven === true) — checked again here since this
  // endpoint is a public URL and shouldn't trust the client alone.
  if (!consent) {
    res.status(400).json({ ok: false, error: "consent_required" });
    return;
  }
  if (!subject || !text) {
    res.status(400).json({ ok: false, error: "missing_fields" });
    return;
  }
  // Basic sanity caps — not real spam/abuse protection, just stops a
  // trivially malformed or hostile request from doing much.
  if (String(subject).length > 500 || String(text).length > 20000) {
    res.status(400).json({ ok: false, error: "payload_too_large" });
    return;
  }

  const toEmail = process.env.LEAD_TO_EMAIL || "info@nord-infra.com";
  const fromEmail = process.env.FROM_EMAIL || "leads@nordbaseusa.com";
  const replyTo = meta && meta.contactEmail ? meta.contactEmail : undefined;

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `NordBase Foundation Selector <${fromEmail}>`,
        to: [toEmail],
        reply_to: replyTo,
        subject,
        text,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.error("Resend API error", resendRes.status, errText);
      res.status(502).json({ ok: false, error: "send_failed" });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("submit-lead error", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
}
