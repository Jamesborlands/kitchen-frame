// Trim the white cold-pressed-paper border baked into the generated watercolor
// images, then re-cover to 800x600. The paper margin shows as white bars on the
// sides of wide containers (e.g. the kitchen weather strip) once object-cover
// crops the top/bottom borders away.
//
// Usage:
//   node scripts/trim-watercolors.mjs night --review   # write to scratch for eyeballing
//   node scripts/trim-watercolors.mjs                   # trim the whole set in place
//   node scripts/trim-watercolors.mjs night clear       # only named keys, in place

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const dir = path.join(ROOT, "public", "watercolor");
const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const named = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const review = flags.includes("--review");

const keys = named.length
  ? named
  : fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".webp"))
      .map((f) => f.replace(/\.webp$/, ""));

const reviewDir = path.join(ROOT, "scratch-trim");
if (review) fs.mkdirSync(reviewDir, { recursive: true });

for (const key of keys) {
  const src = path.join(dir, `${key}.webp`);
  if (!fs.existsSync(src)) {
    console.warn(`! ${key}.webp not found — skipping`);
    continue;
  }
  const input = await fs.promises.readFile(src);
  const before = await sharp(input).metadata();
  // threshold tuned to the paper margin: high enough to eat the textured
  // off-white border, low enough to stop at the painted wash.
  const trimmed = await sharp(input)
    .trim({ background: "#f4f0e9", threshold: 34 })
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);

  const painted = trimmed
    ? await sharp(trimmed.data)
        .resize(800, 600, { fit: "cover", position: "centre" })
        .webp({ quality: 82 })
        .toBuffer()
    : null;

  if (!painted) {
    console.warn(`! ${key}: trim found no border — left as-is`);
    continue;
  }

  const out = review ? path.join(reviewDir, `${key}.webp`) : src;
  await fs.promises.writeFile(out, painted);
  const t = trimmed ? `${trimmed.info.trimOffsetLeft ?? "?"},${trimmed.info.trimOffsetTop ?? "?"}` : "n/a";
  console.log(
    `${key}: ${before.width}x${before.height} → trimmed to ${trimmed.info.width}x${trimmed.info.height} (offset ${t}) → ${review ? "scratch-trim/" : ""}${key}.webp`,
  );
}
console.log("done");
