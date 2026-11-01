#!/usr/bin/env node
// One-time Cloudflare setup for cottage view. Run after `npx wrangler login`:
//
//   npm run cf:setup
//
// Creates the two R2 buckets and the KV namespace that wrangler.jsonc binds, then
// writes the KV namespace id into wrangler.jsonc. Safe to re-run: anything that
// already exists is reused.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const BUCKETS = ["cottage-view-cache", "cottage-view-photos"];
const KV_TITLE = "cottage-view-frame";
const PLACEHOLDER = "REPLACE_WITH_KV_NAMESPACE_ID";

function wrangler(args) {
  try {
    return { ok: true, out: execFileSync("npx", ["wrangler", ...args], { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

for (const bucket of BUCKETS) {
  const r = wrangler(["r2", "bucket", "create", bucket]);
  if (r.ok) console.log(`✓ created R2 bucket ${bucket}`);
  else if (/already exists|already own/i.test(r.out)) console.log(`· R2 bucket ${bucket} already exists`);
  else {
    console.error(`✗ couldn't create R2 bucket ${bucket}:\n${r.out}`);
    process.exit(1);
  }
}

function findNamespaceId() {
  const r = wrangler(["kv", "namespace", "list"]);
  if (!r.ok) return null;
  const json = r.out.slice(r.out.indexOf("["));
  const ns = JSON.parse(json).find((n) => n.title === KV_TITLE);
  return ns?.id ?? null;
}

let id = findNamespaceId();
if (id) {
  console.log(`· KV namespace ${KV_TITLE} already exists`);
} else {
  const r = wrangler(["kv", "namespace", "create", KV_TITLE]);
  id = r.out.match(/"?id"?\s*[:=]\s*"([0-9a-f]{32})"/)?.[1] ?? findNamespaceId();
  if (!id) {
    console.error(`✗ couldn't create KV namespace ${KV_TITLE}:\n${r.out}`);
    process.exit(1);
  }
  console.log(`✓ created KV namespace ${KV_TITLE}`);
}

const config = readFileSync("wrangler.jsonc", "utf8");
if (config.includes(PLACEHOLDER)) {
  writeFileSync("wrangler.jsonc", config.replace(PLACEHOLDER, id));
  console.log(`✓ wrote KV id ${id} into wrangler.jsonc — commit that change`);
} else if (config.includes(id)) {
  console.log("· wrangler.jsonc already has the KV id");
} else {
  console.log(`! wrangler.jsonc has a different KV id; the ${KV_TITLE} namespace is ${id}`);
}
