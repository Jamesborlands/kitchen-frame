#!/usr/bin/env node
// One-off: copy the kitchen frame's photos + notes from Vercel (Upstash KV +
// private Vercel Blob) to Cloudflare (Workers KV + R2). Run once at cut-over,
// after `npm run cf:setup`, with the Vercel credentials in your shell:
//
//   npx vercel env pull .env.vercel          # or copy them from the Vercel dashboard
//   node --env-file=.env.vercel scripts/migrate-from-vercel.mjs
//
// Needs KV_REST_API_URL + KV_REST_API_TOKEN (Upstash) and BLOB_READ_WRITE_TOKEN.
// Writes go through wrangler (you must be logged in). Re-running is safe: it
// overwrites the same keys with the same data.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { KV_REST_API_URL, KV_REST_API_TOKEN, BLOB_READ_WRITE_TOKEN } = process.env;
if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
  console.error("Set KV_REST_API_URL and KV_REST_API_TOKEN (the Upstash/Vercel KV credentials).");
  process.exit(1);
}

const BUCKET = "cottage-view-photos";
const kvId = readFileSync("wrangler.jsonc", "utf8").match(/"binding":\s*"FRAME",\s*"id":\s*"([0-9a-f]{32})"/)?.[1];
if (!kvId) {
  console.error("No FRAME KV id in wrangler.jsonc — run `npm run cf:setup` first.");
  process.exit(1);
}

const wrangler = (args) => execFileSync("npx", ["wrangler", ...args], { stdio: ["inherit", "pipe", "inherit"] });

async function upstashGet(key) {
  const res = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`upstash ${key}: ${res.status}`);
  const { result } = await res.json();
  if (result == null) return [];
  // @upstash/redis stored the arrays as JSON strings
  return typeof result === "string" ? JSON.parse(result) : result;
}

function ext(contentType) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

const tmp = mkdtempSync(join(tmpdir(), "cottage-migrate-"));
try {
  const photos = await upstashGet("frame:photos");
  const notes = await upstashGet("frame:notes");
  console.log(`found ${photos.length} photos, ${notes.length} notes`);

  const moved = [];
  for (const photo of photos) {
    if (!photo.url.includes(".blob.vercel-storage.com/")) {
      moved.push(photo); // seed / local paths need no copying
      continue;
    }
    if (!BLOB_READ_WRITE_TOKEN) throw new Error("Set BLOB_READ_WRITE_TOKEN to copy the photos.");
    const res = await fetch(photo.url, { headers: { Authorization: `Bearer ${BLOB_READ_WRITE_TOKEN}` } });
    if (!res.ok) {
      console.warn(`  skipped ${photo.url} (${res.status})`);
      continue;
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const name = new URL(photo.url).pathname.split("/").pop().replace(/\.[a-z]+$/i, "").replace(/[^A-Za-z0-9_-]/g, "_");
    const key = `whatsapp/${name}.${ext(contentType)}`;
    const file = join(tmp, `${name}.${ext(contentType)}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    wrangler(["r2", "object", "put", `${BUCKET}/${key}`, "--file", file, "--content-type", contentType, "--remote"]);
    moved.push({ ...photo, url: `/api/photo?k=${encodeURIComponent(key)}` });
    console.log(`  copied ${key}`);
  }

  for (const [key, value] of [["frame:photos", moved], ["frame:notes", notes]]) {
    const file = join(tmp, `${key.replace(":", "-")}.json`);
    writeFileSync(file, JSON.stringify(value));
    wrangler(["kv", "key", "put", key, "--path", file, "--namespace-id", kvId, "--remote"]);
    console.log(`✓ wrote ${key} (${value.length})`);
  }
  console.log("done — the kitchen on Cloudflare now has the same photos and notes.");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
