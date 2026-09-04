// Vercel serverless function — receives the "Send calc to Nordinfra"
// submittal payload directly from the calculator and delivers it to
// Nordinfra two ways: (1) email via Resend, and (2) a task created
// directly in ClickUp's "Kalkylator-leads" list — instead of relying on a
// mailto: link (which depended on the customer's own email client being
// configured AND them actually hitting send in it — a real conversion
// leak). Added 2026-09-02 (Resend) / 2026-09-04 (ClickUp) per Simon
// Gullberg's decision to build lead capture now and add a full CRM later.
//
// Both channels are attempted independently (Promise.allSettled) so a
// failure in one never blocks the other — per Simon's explicit choice to
// keep both rather than go ClickUp-only, so no lead is lost if either
// integration is down or not yet configured. The response is ok:true as
// soon as AT LEAST ONE channel succeeds; the calculator's UI only falls
// back to the customer's own mailto: link if BOTH fail (see submitLead()
// in NordBaseCalculator.jsx).
//
// SETUP REQUIRED before this actually sends/creates anything (Simon/Nordinfra):
//
//   EMAIL (Resend):
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
//   CLICKUP:
//   1. In ClickUp: click your avatar (bottom-left) → Settings → Apps →
//      "API Token" → Generate → copy the personal token (starts with
//      "pk_").
//   2. In Vercel → the same calculator project → Settings → Environment
//      Variables, add:
//        CLICKUP_API_TOKEN = <the pk_... token from step 1>
//      Redeploy after adding it.
//   3. Optional override: CLICKUP_LIST_ID (default: 1200320000000218, the
//      "Kalkylator-leads" list in the Product & Distribution space).
//
// Each channel ships safely on its own: until RESEND_API_KEY is set the
// email half is skipped (not an error), and until CLICKUP_API_TOKEN is set
// the ClickUp half is skipped. Only when NEITHER is configured (or both
// fail) does this endpoint return an error and the UI falls back to the
// old mailto: link — so this can go live with just one of the two set up.

// Maps the calculator's internal foundation key to the matching option in
// ClickUp's "Fundamenttyp" dropdown on Kalkylator-leads. These are the same
// 5 real product names as FOUNDATIONS[key].name in NordBaseCalculator.jsx
// (fixed 2026-09-04 — the dropdown previously had invented, unrelated
// option names that didn't match the calculator's actual products).
const FOUNDATION_TO_CLICKUP_OPTION = {
  BOLLARD: "93b7fb85-ff69-4e85-a96c-2e011bbb8057", // NordBase Bollard
  SMALL: "9913cec6-95af-4eec-b849-23ee3f14a78b", // NordBase Small
  MEDIUM: "de634859-a1d8-49d0-acce-f6f53e6a7881", // NordBase Medium
  LARGE: "d9540e18-ec0c-4431-a60b-0aaacbf5244f", // NordBase Large
  POWER_BLOCK: "34c2de21-e046-42d5-9b9d-dda9d4540e55", // NordBase Power Block
};

const CLICKUP_FIELD_IDS = {
  company: "18abfce7-08d3-4893-89ff-ec855655ab0f", // Företag
  contactName: "18cf1747-1a1d-4965-9a49-69e97c7c1d09", // Kontaktperson
  phone: "2ca2a01c-acac-417e-808e-d26d1ad789c5", // Telefon
  state: "7567c5b9-5dc0-49cb-a59d-c9b4a1c2c6d2", // Delstat
  foundationType: "a64fcb4e-cfa7-4010-94e1-7aa6a6e4c3ee", // Fundamenttyp
  email: "c2553654-d974-42fe-bc31-e0444dcc7c9d", // E-post
  chargerManufacturer: "7160be8d-d8c3-4c0f-b726-377d420ef1c9", // Laddartillverkare (added 2026-09-04, for lead stats)
  // Uppskattat Ordervarde (c8947cf8-f30d-475d-9218-d4a10717d7a2) is
  // deliberately left unset — the calculator has no pricing data to
  // source it from; sales fills it in manually after review.
};

async function sendEmail({ subject, text, meta }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { attempted: false };

  const toEmail = process.env.LEAD_TO_EMAIL || "info@nord-infra.com";
  const fromEmail = process.env.FROM_EMAIL || "leads@nordbaseusa.com";
  const replyTo = meta && meta.contactEmail ? meta.contactEmail : undefined;

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
    throw new Error(`resend_${resendRes.status}`);
  }
  return { attempted: true };
}

async function createClickUpTask({ subject, text, meta }) {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) return { attempted: false };

  const listId = process.env.CLICKUP_LIST_ID || "1200320000000218";
  const m = meta || {};

  const custom_fields = [];
  if (m.companyName)
    custom_fields.push({ id: CLICKUP_FIELD_IDS.company, value: m.companyName });
  if (m.contactName)
    custom_fields.push({
      id: CLICKUP_FIELD_IDS.contactName,
      value: m.contactName,
    });
  if (m.contactPhone)
    custom_fields.push({ id: CLICKUP_FIELD_IDS.phone, value: m.contactPhone });
  if (m.projectState)
    custom_fields.push({ id: CLICKUP_FIELD_IDS.state, value: m.projectState });
  if (m.contactEmail)
    custom_fields.push({ id: CLICKUP_FIELD_IDS.email, value: m.contactEmail });
  if (m.presetMfr)
    custom_fields.push({
      id: CLICKUP_FIELD_IDS.chargerManufacturer,
      value: m.presetMfr,
    });
  const foundationOptionId =
    m.foundationKey && FOUNDATION_TO_CLICKUP_OPTION[m.foundationKey];
  if (foundationOptionId)
    custom_fields.push({
      id: CLICKUP_FIELD_IDS.foundationType,
      value: foundationOptionId,
    });

  const taskName = [m.companyName || m.contactName || "New calculator lead", m.projectName]
    .filter(Boolean)
    .join(" — ");

  async function attemptCreate(fields) {
    const clickupRes = await fetch(
      `https://api.clickup.com/api/v2/list/${listId}/task`,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: taskName,
          description: text,
          custom_fields: fields,
        }),
      }
    );
    if (clickupRes.ok) return { ok: true };
    const errText = await clickupRes.text().catch(() => "");
    let errJson = null;
    try {
      errJson = JSON.parse(errText);
    } catch (e) {
      /* not JSON — keep errJson null, errText still logged below */
    }
    return { ok: false, status: clickupRes.status, errText, errJson };
  }

  let result = await attemptCreate(custom_fields);

  // A single malformed custom field (e.g. a phone number in a format
  // ClickUp's Phone field type won't accept — confirmed to happen with
  // real customer input, not just malformed test data: 2026-09-04) would
  // otherwise fail the ENTIRE task and lose the lead. Since the field
  // that rejected the value is always our Telefon field in practice
  // (FIELD_016 = "Value is not a valid phone number" is ClickUp's phone
  // validator), retry once without it — the number is still preserved in
  // the task description text either way, just not in the structured
  // field.
  if (
    !result.ok &&
    result.status === 400 &&
    result.errJson?.ECODE === "FIELD_016" &&
    custom_fields.some((f) => f.id === CLICKUP_FIELD_IDS.phone)
  ) {
    // eslint-disable-next-line no-console
    console.error(
      "ClickUp API error (retrying without Telefon field)",
      result.status,
      result.errText
    );
    const fieldsWithoutPhone = custom_fields.filter(
      (f) => f.id !== CLICKUP_FIELD_IDS.phone
    );
    result = await attemptCreate(fieldsWithoutPhone);
  }

  if (!result.ok) {
    // eslint-disable-next-line no-console
    console.error("ClickUp API error", result.status, result.errText);
    throw new Error(`clickup_${result.status}`);
  }
  return { attempted: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
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

  const [emailResult, clickupResult] = await Promise.allSettled([
    sendEmail({ subject, text, meta }),
    createClickUpTask({ subject, text, meta }),
  ]);

  const emailOk = emailResult.status === "fulfilled" && emailResult.value.attempted;
  const clickupOk =
    clickupResult.status === "fulfilled" && clickupResult.value.attempted;
  // "Configured" = the env var was set, whether or not the call itself
  // then succeeded — used only to pick the right error code below.
  const emailConfigured = emailResult.status === "rejected" || emailOk;
  const clickupConfigured = clickupResult.status === "rejected" || clickupOk;

  if (emailResult.status === "rejected") {
    // eslint-disable-next-line no-console
    console.error("submit-lead: email channel failed", emailResult.reason);
  }
  if (clickupResult.status === "rejected") {
    // eslint-disable-next-line no-console
    console.error("submit-lead: clickup channel failed", clickupResult.reason);
  }

  if (emailOk || clickupOk) {
    res.status(200).json({ ok: true, email: emailOk, clickup: clickupOk });
    return;
  }

  // Neither channel is configured, or both attempts failed — let the
  // client fall back to mailto: so the lead is never simply lost.
  const neitherConfigured = !emailConfigured && !clickupConfigured;
  res.status(neitherConfigured ? 500 : 502).json({
    ok: false,
    error: neitherConfigured ? "not_configured" : "send_failed",
  });
}
