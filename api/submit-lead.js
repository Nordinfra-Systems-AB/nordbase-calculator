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
  state: "b3d0d0f2-7b4c-49bb-a558-9733f5c70bd8", // Delstat — converted short_text → dropdown 2026-09-04
  foundationType: "a64fcb4e-cfa7-4010-94e1-7aa6a6e4c3ee", // Fundamenttyp
  email: "c2553654-d974-42fe-bc31-e0444dcc7c9d", // E-post
  chargerManufacturer: "c6053cdb-ae4f-4081-bc73-2135556d0dae", // Laddartillverkare — converted short_text → dropdown 2026-09-04
  // Uppskattat Ordervarde (c8947cf8-f30d-475d-9218-d4a10717d7a2) is
  // deliberately left unset — the calculator has no pricing data to
  // source it from; sales fills it in manually after review.
};

// Delstat and Laddartillverkare were converted from free-text to dropdown
// fields on 2026-09-04 so Nordinfra can natively group/filter leads by state
// or manufacturer in ClickUp (List view → Group by) without a paid Dashboard
// upgrade — see claude/ClickUp_Ultimate_Konfiguration_Plan_20260904.md. A
// ClickUp dropdown field only accepts one of its option IDs, never free
// text, so both maps below are REQUIRED — sending m.projectState or
// m.presetMfr directly (as before this change) would now make ClickUp
// reject the whole task.
//
// The calculator's own "State" field is a <select> of exactly these 51 USPS
// codes (src/NordBaseCalculator.jsx, US_STATES), so every submission matches
// a key here by construction.
const STATE_TO_CLICKUP_OPTION = {
  AL: "c703f441-9d4e-4136-9094-d9d9ee35261a",
  AK: "bbac984b-1af5-4bde-8889-07828aaa9272",
  AZ: "13079ba5-01ea-47d5-b499-0c7db0c2159c",
  AR: "22cd9da9-cc4d-4889-998a-d586c161acf4",
  CA: "b87a2d55-2b6c-4a5b-8513-65cc40fbcef4",
  CO: "e3d0efb4-6c8b-4f26-b1ed-06740f088117",
  CT: "d50aaf00-0c60-4abf-b770-363e91e280b0",
  DE: "0abbf055-44db-4517-88bb-66dbfa8b24f9",
  DC: "adc7b426-f6ff-4a26-92b0-41f9b645910f",
  FL: "96daafde-a684-4a98-a7f9-0d84037ae748",
  GA: "4a0bce15-5dff-473a-aa57-06348dda85a9",
  HI: "c2933714-f642-47bb-ada3-48fe078bd083",
  ID: "09f91212-817f-4ef3-abb4-f03a86274a00",
  IL: "7f543d6a-35ca-424a-bd27-da005135561e",
  IN: "888e18b8-cf14-497c-b6e8-31614852e7ff",
  IA: "bd77359d-4c4c-41c6-9a30-53f40616fca3",
  KS: "e571d6c7-67cf-4c7b-8cfa-c4720fb6053e",
  KY: "830dd386-053a-4ef2-9753-3706d7e0ac2a",
  LA: "0de6b479-6b16-442a-8ff9-34e39273e44a",
  ME: "fdb35bc8-6fe5-404b-9e05-2359e34e4267",
  MD: "4da8852a-13b7-43f7-966e-720a5cb423a7",
  MA: "684f39ea-1a7e-464e-8f79-c7a39f468890",
  MI: "85afdd2f-f872-4490-8f04-c55904e75f54",
  MN: "da652dee-eb0d-44ad-9833-58f1d96ad52f",
  MS: "e36851eb-e1d9-4a01-b49c-38e7d3c49b43",
  MO: "d24f4ba3-85a7-4b22-9736-c2c86624e271",
  MT: "1f64f157-c4df-4d81-9af3-36187b6dd3fb",
  NE: "a689c52b-8d40-4926-8bdb-676ff93a6acc",
  NV: "ddd1333d-476a-4366-9b5c-1ea446444316",
  NH: "68a5838c-6beb-4c60-9381-8c1d9a274f0a",
  NJ: "4455123e-745d-4a73-9b6d-a9a97ceff930",
  NM: "526d9e92-fb4e-4e54-a219-6d516fbca72b",
  NY: "e687e931-7a72-4904-b9e0-8dff2352253a",
  NC: "459d9846-3b06-4bf1-9387-c7a923c36fba",
  ND: "ea869f1b-d879-4ef8-9965-c9a28d4a4778",
  OH: "bf18ea96-f735-4cb9-9398-f4d0f7cd5f73",
  OK: "64996fad-9b01-4680-b555-55fa04404166",
  OR: "6e12bc3b-3e16-4853-88a1-09880921bc31",
  PA: "ff689a70-a595-462c-a2cd-9ba1a2885a3d",
  RI: "1b426e64-9f0f-49f9-8dd0-29f7751c33fe",
  SC: "e51accaf-13c3-47fd-a601-38fc78791b1f",
  SD: "0d796156-dac5-4d6b-90fb-7caf36fc4ec5",
  TN: "74c8432e-ae39-4d6d-bbe5-f3c0e1f9ea33",
  TX: "58f7d3e1-84e6-4c92-bfe1-97044f44359e",
  UT: "0affa951-84cf-43c2-af76-285c6b7cad0d",
  VT: "4abc54db-a96f-454a-82ca-9b9179cc13e2",
  VA: "bc54998a-5967-4931-b580-a5404dec3fa3",
  WA: "d9e57883-0569-48a5-973c-96f34855c792",
  WV: "e3f825f6-76e0-4802-a89a-c416e4ff876c",
  WI: "fc618ac9-4928-4e59-ab6a-4a9b4b7104c8",
  WY: "23851bc6-4511-410a-adee-22bf039dfd08",
};

// Keyed by the exact manufacturer name strings used as `presetMfr` in
// shared/chargerData.js (POWER_BLOCK_MODELS / PEDESTAL_CHARGER_PRESETS /
// DC_FAST_CHARGER_PRESETS). Those three objects use inconsistent casing for
// one manufacturer ("Chargepoint" vs "ChargePoint") — pre-existing, not
// touched here — but ClickUp dropdown option names are case-insensitive-
// unique, so both casings are mapped to the single "ChargePoint" option
// created in ClickUp.
const MANUFACTURER_TO_CLICKUP_OPTION = {
  ABB: "809ef35b-e1aa-4b17-ba39-77bcf57f7873",
  Alpitronic: "fe13469e-6437-4e29-8887-04530c703721",
  Autel: "dfbaf653-b064-41f5-84ab-bcf97df36a80",
  BHS: "38b9c2bb-d500-4050-9eca-ede0bfa224a4",
  "Blink Charging": "887f773b-df8f-4b11-b9e6-4807756e09eb",
  "BTC Power": "9b8bd4e8-c7ef-4b4d-9371-d55719aa6b0a",
  ChargePoint: "bc1b8b21-c8df-4d20-a840-fd4ccfedac6b",
  Chargepoint: "bc1b8b21-c8df-4d20-a840-fd4ccfedac6b", // casing variant used in PEDESTAL_CHARGER_PRESETS
  "Delta Electronics": "1ccaf36d-dd5b-4e43-86ae-052e5f476f18",
  Eaton: "a37bc07b-0e4b-4c8e-9bca-83039681aecc",
  Ekoenergetyka: "226a474a-6bc7-4fff-8071-a8a64e50ef49",
  "InCharge Energy": "ca6a7226-f222-4f3a-817c-e7eb57d0122a",
  Kempower: "3e752457-f0ca-4aab-9014-e7cf4b9f00f3",
  Leviton: "f1ad163a-ad87-4697-a78d-9fe37c401798",
  "Pedestal PRO": "d067a7c3-0a4c-4880-9ada-0b119e28b0e1",
  Postlane: "d4aea592-af67-451b-bd5f-060fda1a493e",
  "Power Electronics": "667aea64-de0b-4049-836d-bc7ff4dd0a41",
  Siemens: "6a8eb1cd-317c-4b5c-a6a2-bae2503322fd",
  Tesla: "254f46b2-5d83-4f0e-8156-cfc2c2322425",
  Tritium: "dd4567e5-fedc-483a-8092-ccda5df2dbb2",
  Wallbox: "d129aef9-8b16-47c5-bbb7-7e0b5e14c50b",
  "Zerova (Phihong)": "70749575-88a2-4685-8108-3faa51943803",
  WiLLev: "2f6889a1-042a-434b-affc-6aa4e67e63e3",
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
  const stateOptionId = m.projectState && STATE_TO_CLICKUP_OPTION[m.projectState];
  if (stateOptionId)
    custom_fields.push({ id: CLICKUP_FIELD_IDS.state, value: stateOptionId });
  if (m.contactEmail)
    custom_fields.push({ id: CLICKUP_FIELD_IDS.email, value: m.contactEmail });
  const mfrOptionId = m.presetMfr && MANUFACTURER_TO_CLICKUP_OPTION[m.presetMfr];
  if (mfrOptionId)
    custom_fields.push({
      id: CLICKUP_FIELD_IDS.chargerManufacturer,
      value: mfrOptionId,
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
