// One-off: generate a watercolour of Bramble (the demo household's dog) via Vercel AI
// Gateway (Nano Banana Pro). Per project rule: gateway only, no provider SDK.
//
// Usage: node scripts/generate-bramble.mjs
// Needs AI_GATEWAY_API_KEY in .env.local or the environment.

import fs from "node:fs";
import path from "node:path";
import { generateText } from "ai";
import sharp from "sharp";

const ROOT = process.cwd();

const envPath = path.join(ROOT, ".env.local");
if (!process.env.AI_GATEWAY_API_KEY && fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}
if (!process.env.AI_GATEWAY_API_KEY) {
  console.error("Missing AI_GATEWAY_API_KEY (Vercel AI Gateway).");
  process.exit(1);
}

const prompt =
  "A soft English watercolour illustration of a friendly golden-brown border terrier mix " +
  "standing in a clear shallow river with green trees behind. Luminous pastel palette, loose wet-on-wet " +
  "wash, cold-pressed paper texture, white paper showing through, soft diffused light, traditional British " +
  "watercolour tradition, no hard edges, no digital artifacts, no text, no signature, no watermark, " +
  "no border or frame, calm and gentle, landscape 4:3 composition.";

console.log("generating bramble…");
const result = await generateText({
  model: "google/gemini-3-pro-image",
  messages: [
    {
      role: "user",
      content: [{ type: "text", text: prompt }],
    },
  ],
});

const img = result.files?.find((f) => f.mediaType?.startsWith("image/"));
if (!img) {
  console.error("no image returned" + (result.text ? ` (model said: ${result.text.slice(0, 160)})` : ""));
  process.exit(1);
}
const outPath = path.join(ROOT, "public", "watercolor", "bramble.webp");
await sharp(Buffer.from(img.uint8Array))
  .resize(800, 600, { fit: "cover", position: "centre" })
  .webp({ quality: 82 })
  .toFile(outPath);
console.log(`saved ${path.relative(ROOT, outPath)}`);
