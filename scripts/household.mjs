#!/usr/bin/env node
// Set up and look after households on the live site (admin only).
//
//   node scripts/household.mjs list
//   node scripts/household.mjs new <id> "<name>" "<home town>" [--who "Sophie"]
//   node scripts/household.mjs set-whatsapp <id> <phone number id | none>
//   node scripts/household.mjs reset-pin <id>
//   node scripts/household.mjs add-frame <id> [label]
//
// A new PIN or frame key goes straight into the macOS Keychain and is never
// printed: services cottage-view-<id>-pin and cottage-view-<id>-frame-key.
// Copy one with:  security find-generic-password -s cottage-view-<id>-pin -w | pbcopy
// Needs SESSION_SECRET and ADMIN_PIN in .env.cloudflare (the same ones the Worker has).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { adminCookieValue } from "./lib/adminCookie.mjs";

const BASE = process.env.COTTAGE_VIEW_URL || "https://cottage-view.example.workers.dev";
const env = Object.fromEntries(readFileSync(".env.cloudflare", "utf8").split("\n")
  .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
if (!env.SESSION_SECRET || !env.ADMIN_PIN) { console.error("SESSION_SECRET and ADMIN_PIN needed in .env.cloudflare"); process.exit(1); }

async function api(body) {
  const res = await fetch(`${BASE}/api/admin/households`, {
    method: "POST",
    headers: { cookie: `cv_admin=${adminCookieValue(env.SESSION_SECRET, env.ADMIN_PIN)}`, "content-type": "application/json", "user-agent": "curl/8" },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) { console.error(`refused (${res.status}): ${out.error ?? "?"}`); process.exit(1); }
  return out;
}

function keep(id, what, secret) {
  // -U updates an existing item; the value goes via argv to `security` only (not printed)
  execFileSync("security", ["add-generic-password", "-U", "-a", id, "-s", `cottage-view-${id}-${what}`, "-w", secret]);
  console.log(`  ${what} saved to the Keychain → security find-generic-password -s cottage-view-${id}-${what} -w | pbcopy`);
}

async function findHome(name) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`);
  const found = ((await r.json()).results ?? []).filter((x) => x.timezone);
  if (!found.length) { console.error(`no place called ${name}`); process.exit(1); }
  const f = found[0];
  console.log(`home: ${f.name}, ${[f.admin1, f.country].filter(Boolean).join(", ")} (${f.timezone})` +
    (found.length > 1 ? `  — not right? be more specific, e.g. "${f.name}, ${found[1].country}"` : ""));
  return { label: f.name, latitude: Math.round(f.latitude * 1e4) / 1e4, longitude: Math.round(f.longitude * 1e4) / 1e4, timezone: f.timezone };
}

const [cmd, id, ...rest] = process.argv.slice(2);
const flag = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };

if (cmd === "list") {
  for (const h of (await api({ action: "list" })).households) console.log(`${h.id}\t${h.name}`);
} else if (cmd === "new" && id && rest[0] && rest[1]) {
  const home = await findHome(rest[1]);
  const who = flag("--who");
  if (who) home.sublabel = who;
  const out = await api({ action: "new", id, name: rest[0], home });
  console.log(`created ${id}`);
  keep(id, "pin", out.pin);
  keep(id, "frame-key", out.frameKey);
  console.log(`next: scripts/provision-frame.sh <frame ip> ${id}   (then give them the PIN for ${BASE}/family)`);
} else if (cmd === "set-whatsapp" && id && rest[0]) {
  await api({ action: "set-whatsapp", id, phoneNumberId: rest[0] === "none" ? null : rest[0] });
  console.log(`${id}: WhatsApp number ${rest[0] === "none" ? "removed" : "set"}`);
} else if (cmd === "reset-pin" && id) {
  keep(id, "pin", (await api({ action: "reset-pin", id })).pin);
} else if (cmd === "add-frame" && id) {
  keep(id, "frame-key", (await api({ action: "add-frame", id, label: rest[0] ?? "kitchen" })).frameKey);
} else {
  console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 15).join("\n"));
  process.exit(cmd ? 1 : 0);
}
