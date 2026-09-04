// Vercel serverless function — aggregate lead statistics for Nordinfra's
// sales team, read live from ClickUp's "Kalkylator-leads" list.
//
// WHY THIS EXISTS: ClickUp's native Dashboard feature can do this (grouped
// Pie/Bar charts + a Calculation card for summed order value) but that
// requires upgrading the ClickUp workspace to the Business plan ($19/user/
// month, or $12/user/month billed annually — confirmed in the ClickUp
// desktop app UI on 2026-09-04, the "Custom" chart cards are locked behind
// an "Upgrade to Business" paywall on the current plan). Simon chose to
// build this instead of paying for the upgrade. If Nordinfra upgrades
// ClickUp later, the same data can be recreated as native Dashboard cards
// and this endpoint/page can be retired — nothing here is a dead end.
//
// This endpoint fetches every task in the list (paginated) using the same
// CLICKUP_API_TOKEN already configured for submit-lead.js, and returns
// pre-aggregated counts so the stats page itself stays a dumb renderer.
//
// ACCESS CONTROL: this is business data (lead volume, which states/products
// are converting, aggregate deal value), not something that should be a
// public unauthenticated URL even if it's hard to guess. Set STATS_ACCESS_KEY
// in Vercel (Settings → Environment Variables) to any password of your
// choice, then open /stats.html?key=<that value> (the page asks for it and
// remembers it in the browser after the first visit). Until STATS_ACCESS_KEY
// is set, this endpoint refuses all requests (fails closed, not open) and
// returns "not_configured" — so there's no accidental unprotected window.

const CLICKUP_FIELD_IDS = {
  state: "b3d0d0f2-7b4c-49bb-a558-9733f5c70bd8", // Delstat — converted short_text → dropdown 2026-09-04
  foundationType: "a64fcb4e-cfa7-4010-94e1-7aa6a6e4c3ee", // Fundamenttyp
  chargerManufacturer: "c6053cdb-ae4f-4081-bc73-2135556d0dae", // Laddartillverkare — converted short_text → dropdown 2026-09-04
  orderValue: "c8947cf8-f30d-475d-9218-d4a10717d7a2", // Uppskattat Ordervarde
};

function fieldValue(task, fieldId) {
  const f = (task.custom_fields || []).find((cf) => cf.id === fieldId);
  if (!f || f.value === undefined || f.value === null || f.value === "")
    return null;
  // Dropdown fields store the value as an option id (or index, depending on
  // ClickUp version) — resolve it to the human-readable option name using
  // the option list ClickUp includes on the field definition itself.
  if (f.type === "drop_down" && f.type_config?.options) {
    const opt =
      f.type_config.options.find((o) => o.id === f.value) ||
      f.type_config.options[f.value]; // legacy: value as array index
    return opt ? opt.name : null;
  }
  return f.value;
}

function bump(map, key) {
  const k = key || "(ej angivet)";
  map[k] = (map[k] || 0) + 1;
}

function toSortedArray(map) {
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

async function fetchAllTasks(listId, token) {
  const tasks = [];
  let page = 0;
  // ClickUp paginates at 100 tasks/page; include_closed so leads that moved
  // to VUNNEN/FÖRLORAD still count — this is lead volume, not an open-work
  // queue.
  for (;;) {
    const url = `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true&subtasks=true&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: token } });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`clickup_${res.status}: ${errText}`);
    }
    const data = await res.json();
    tasks.push(...(data.tasks || []));
    if (data.last_page || !data.tasks || data.tasks.length === 0) break;
    page += 1;
    if (page > 50) break; // sanity cap — 5,000 leads; avoids a runaway loop
  }
  return tasks;
}

export default async function handler(req, res) {
  const accessKey = process.env.STATS_ACCESS_KEY;
  if (!accessKey) {
    res.status(500).json({
      ok: false,
      error: "not_configured",
      message:
        "STATS_ACCESS_KEY is not set in Vercel — set it under Settings → Environment Variables to enable this page.",
    });
    return;
  }
  const providedKey = req.query?.key;
  if (!providedKey || providedKey !== accessKey) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    res.status(500).json({ ok: false, error: "clickup_not_configured" });
    return;
  }
  const listId = process.env.CLICKUP_LIST_ID || "1200320000000218";

  try {
    const tasks = await fetchAllTasks(listId, token);

    const byState = {};
    const byFoundation = {};
    const byManufacturer = {};
    let orderValueSum = 0;
    let orderValueCount = 0;

    for (const task of tasks) {
      bump(byState, fieldValue(task, CLICKUP_FIELD_IDS.state));
      bump(byFoundation, fieldValue(task, CLICKUP_FIELD_IDS.foundationType));
      bump(
        byManufacturer,
        fieldValue(task, CLICKUP_FIELD_IDS.chargerManufacturer)
      );
      const ov = fieldValue(task, CLICKUP_FIELD_IDS.orderValue);
      if (ov !== null && !Number.isNaN(Number(ov))) {
        orderValueSum += Number(ov);
        orderValueCount += 1;
      }
    }

    res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      totalLeads: tasks.length,
      byState: toSortedArray(byState),
      byFoundation: toSortedArray(byFoundation),
      byManufacturer: toSortedArray(byManufacturer),
      orderValue: {
        sum: orderValueSum,
        leadsWithValue: orderValueCount,
        leadsWithoutValue: tasks.length - orderValueCount,
        currency: "USD",
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("stats: failed to fetch/aggregate ClickUp tasks", e);
    res.status(502).json({ ok: false, error: "clickup_fetch_failed" });
  }
}
