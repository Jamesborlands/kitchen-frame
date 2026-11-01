// Generate the watercolor illustration set via Vercel AI Gateway (Nano Banana Pro / Gemini 3 Pro Image).
//
// Per project rule, ALL model selection goes through Vercel AI Gateway (the AI SDK
// `ai` package + a `provider/model` string), never a provider SDK directly.
//
// Requires AI_GATEWAY_API_KEY (Vercel AI Gateway key) in the environment or .env.local.
//
// Usage:
//   node scripts/generate-watercolors.mjs --probe        # 3 style probes (clear, rain, place-ludlow-summer)
//   node scripts/generate-watercolors.mjs                # full set used by the UI
//   node scripts/generate-watercolors.mjs clear golden   # only the named scene keys
//   node scripts/generate-watercolors.mjs --seasonal-missing  # seasonal skies not yet generated
//
// Output: public/watercolor/<key>.webp  (4:3, cover-cropped, ~800x600, quality 82)

import fs from "node:fs";
import path from "node:path";
import { generateText } from "ai";
import sharp from "sharp";

const ROOT = process.cwd();

// --- load AI_GATEWAY_API_KEY from .env.local if not already in the environment ---
const envPath = path.join(ROOT, ".env.local");
if (!process.env.AI_GATEWAY_API_KEY && fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
}
if (!process.env.AI_GATEWAY_API_KEY) {
  console.error(
    "Missing AI_GATEWAY_API_KEY (Vercel AI Gateway). Put it in .env.local as\n" +
      "  AI_GATEWAY_API_KEY=...\n" +
      "or export it in your shell, then re-run.",
  );
  process.exit(1);
}

// --- locked style seed (from docs/research/2026-06-23-design-watercolor.md) ---
const STYLE =
  "English watercolor illustration, SUBJECT, luminous pastel palette, loose wet-on-wet wash, " +
  "cold-pressed paper texture, white paper showing through, soft diffused light, traditional British " +
  "watercolor tradition, no hard edges, no digital artifacts, no text or words or lettering, " +
  "no signature, no artist signature, no watermark, no initials, no border or frame, " +
  "calm and unhurried, landscape 4:3 composition";

// Scene keys MUST match WatercolorKey (lib/weather/codes.ts) + place stems (lib/config.ts).
const SUBJECTS = {
  // weather skies — the weather CONDITION must read clearly at a glance (this is the kitchen weather cue)
  clear: "a bright sunny day with a cloudless vivid blue sky and a clear radiant sun, unmistakably fine clear weather, over the rolling English downs",
  cloud: "a partly cloudy day with several distinct rounded white cumulus clouds drifting across a blue sky, clearly cloudy, over English countryside",
  overcast: "a dull grey overcast day, the whole sky a flat even blanket of grey cloud with no blue and no sun, clearly overcast, over the English countryside",
  fog: "a thick foggy morning, dense low mist blanketing the water meadows so trees fade into white, unmistakably foggy",
  rain: "a clearly rainy day, visible streaks of falling rain slanting from heavy grey rain-clouds onto a wet English meadow, puddles and reflections",
  snow: "a clearly snowy day, large white snowflakes falling thickly from a soft pale sky onto a snow-covered English field",
  storm: "a dramatic stormy day, dark heavy thunderclouds and a curtain of distant rain sweeping over the downs, unmistakably stormy weather",
  golden: "a vivid golden-hour sunset, a low glowing sun flooding the sky with warm amber, orange and rose light, clearly a sunset, over the English countryside",
  sunrise: "a soft sunrise, the low early-morning sun lifting through a pale rose and apricot dawn sky, gentle fresh light just warming the rolling English downs, clearly daybreak",
  sunset: "a glowing sunset, the low evening sun sinking into deep bands of amber, coral and rose, long warm light across the English countryside, clearly dusk",
  twilight: "the blue hour just after sunset, a deep dusky indigo and soft violet sky with the very first faint star, the downs in calm silhouette, clearly twilight, no bright sun",
  night: "a calm moonlit night sky scattered with soft stars over the rolling English downs, deep indigo and midnight blue, a gentle glowing moon, peaceful and still",
  // seasonal weather skies (the home place's season): the same condition, but the land and light of the season
  "rain-summer":
    "a warm summer shower over the rolling English downs, soft rain falling from broken bright clouds onto lush deep-green fields and full-leafed trees, sunlight breaking through behind the rain, wet wildflower meadow, clearly rain in summer",
  "rain-autumn":
    "a wet autumn day, steady rain slanting from heavy grey clouds over the English downs, trees in russet, amber and gold, fallen leaves on a wet country lane, puddles reflecting the sky, clearly autumn rain",
  "rain-winter":
    "a cold winter rain over the English downs, bare leafless trees, cold sleety rain from a low pewter sky, muddy brown winter fields and dark hedgerows, puddles, clearly a cold wet winter day",
  // family-location scenes: four seasons per place (lib/time/season.ts placeScene picks one by
  // month + each place's own hemisphere). The bare stem (e.g. "place-ludlow") is the fallback and
  // is a copy of one seasonal painting, not a separate generation.
  "place-ludlow-spring":
    "the Shropshire market town of Ludlow in spring, Ludlow Castle on its wooded rise above the River Teme, the old stone arches of Ludford Bridge, the tall square tower of St Laurence's church above red-brown town rooftops, fresh bright-green trees in pale new leaf, white blossom along the river bank, soft fresh light",
  "place-ludlow-summer":
    "the Shropshire market town of Ludlow in summer, Ludlow Castle's ruined stone walls rising above the River Teme at Dinham, the old stone arches of Ludford Bridge, the tall square tower of St Laurence's church above the town rooftops, trees in full deep-green leaf, warm bright summer day",
  "place-ludlow-autumn":
    "the Shropshire market town of Ludlow in autumn, Ludlow Castle on its rise above the River Teme, the old stone arches of Ludford Bridge, the tall square tower of St Laurence's church above the town rooftops, wooded banks in russet, amber and gold, soft mist on the river, warm low golden light",
  "place-ludlow-winter":
    "the Shropshire market town of Ludlow in winter, Ludlow Castle on its rise above the River Teme, the old stone arches of Ludford Bridge, the tall square tower of St Laurence's church above frosted town rooftops, bare leafless trees, pale cold sky, a light dusting of frost, crisp still winter day",
  "place-edinburgh-spring":
    "the Edinburgh Old Town skyline in spring, Edinburgh Castle high on its volcanic castle rock above Princes Street Gardens, the tall stone tenements and spires of the Old Town, cherry blossom and fresh green trees in the gardens, soft fresh spring light",
  "place-edinburgh-summer":
    "the Edinburgh Old Town skyline in summer, Edinburgh Castle high on its volcanic castle rock above the green lawns of Princes Street Gardens, the tall stone tenements and spires of the Old Town, trees in full leaf, long bright Scottish summer light",
  "place-edinburgh-autumn":
    "the Edinburgh Old Town skyline in autumn, Edinburgh Castle high on its volcanic castle rock above Princes Street Gardens, the tall stone tenements and spires of the Old Town, trees in russet, amber and gold, a soft haar drifting below the castle, low golden light",
  "place-edinburgh-winter":
    "the Edinburgh Old Town skyline in winter, Edinburgh Castle high on its volcanic castle rock dusted with snow, the tall stone tenements and spires of the Old Town, bare trees in Princes Street Gardens, pale cold winter sky, crisp still winter day",
  "place-northberwick-spring":
    "the little Scottish seaside town of North Berwick in spring, the small stone harbour with a few moored boats, the great white-topped Bass Rock rising out of the blue Firth of Forth offshore, sandy beach, fresh green grass and yellow gorse on the links, bright fresh spring light",
  "place-northberwick-summer":
    "the little Scottish seaside town of North Berwick in summer, the small stone harbour with moored boats, the great white-topped Bass Rock rising out of the sparkling blue Firth of Forth offshore, a golden sandy beach, warm bright summer day",
  "place-northberwick-autumn":
    "the little Scottish seaside town of North Berwick in autumn, the small stone harbour at low tide, the great Bass Rock rising out of the Firth of Forth offshore, golden-brown grass on the links, a breezy autumn sky with soft clouds over the sea",
  "place-northberwick-winter":
    "the little Scottish seaside town of North Berwick in winter, the small stone harbour, the great Bass Rock rising out of a grey-blue Firth of Forth under a pale cold winter sky, waves breaking on the rocks, frosty grass on the links, crisp still winter day",
  "place-santacruz-spring":
    "Santa Cruz on the California coast in spring, the long wooden wharf stretching out over the blue Pacific, the seaside boardwalk with its old wooden roller coaster along the beach, green coastal bluffs dotted with orange poppies and wildflowers, surfers on gentle waves, soft fresh morning light",
  "place-santacruz-summer":
    "Santa Cruz on the California coast in summer, the long wooden wharf stretching out over the blue Pacific, the seaside boardwalk with its old wooden roller coaster along a sunny sandy beach, surfers riding the waves, warm golden afternoon light",
  "place-santacruz-autumn":
    "Santa Cruz on the California coast in autumn, the long wooden wharf stretching out over a calm Pacific, the seaside boardwalk along the beach, dry golden coastal grasses on the bluffs, surfers in the swell, warm clear golden low sun, a gentle late-season glow",
  "place-santacruz-winter":
    "Santa Cruz on the California coast in mild winter, the long wooden wharf over the Pacific, the seaside boardwalk along a quiet beach, green winter grass on the coastal bluffs, big rolling surf, soft low winter sun and a few clouds, calm warm-temperate California coast",
  "place-queenstown-spring":
    "Queenstown in New Zealand in spring, the deep blue water of Lake Wakatipu, the jagged Remarkables mountains with melting snow on their high peaks, fresh green trees and spring blossom along the lakefront, bright clear spring sky",
  "place-queenstown-summer":
    "Queenstown in New Zealand in summer, the deep turquoise-blue water of Lake Wakatipu, the jagged Remarkables mountains bare of snow, green hills and trees along the lakefront, bright warm clear summer day",
  "place-queenstown-autumn":
    "Queenstown in New Zealand in autumn, the deep blue water of Lake Wakatipu, the jagged Remarkables mountains, golden and amber poplar trees along the lakefront, a light early dusting of snow on the highest peaks, cool clear autumn light",
  "place-queenstown-winter":
    "Queenstown in New Zealand in winter, the deep blue water of Lake Wakatipu, the jagged Remarkables mountains covered in deep white snow, snowy hills above the little lakeside town, pale cold winter sky, crisp still winter day",
  "place-whistler-spring":
    "Whistler mountain village in British Columbia in spring, the alpine village with its chalet rooftops, snow still on the high peaks of Whistler and Blackcomb mountains, green pine forest and fresh green valley meadows below, bright clear spring sky",
  "place-whistler-summer":
    "Whistler mountain village in British Columbia in summer, the alpine village with its chalet rooftops, green Whistler and Blackcomb mountains with no snow, dense pine forest, a calm blue alpine lake and wildflower meadows, warm bright clear day",
  "place-whistler-autumn":
    "Whistler mountain village in British Columbia in autumn, the alpine village with its chalet rooftops, Whistler and Blackcomb mountains with golden larches and dark pine forest, soft mist in the valley, a first dusting of snow on the highest peaks, cool clear autumn light",
  "place-whistler-winter":
    "the snowy alpine ski village of Whistler in British Columbia in winter, chalet rooftops deep in snow, snow-covered Whistler and Blackcomb mountains with ski runs, snowy pine forest, pale cold winter sky",
};

// Seasonal skies: each condition in the home place's four seasons (lib/weather/seasonalSky.ts
// picks them, falling back to the plain key). The rain-* trio above was the hand-written probe.
const CONDITION = {
  clear: "a bright sunny day with a cloudless vivid blue sky and a clear radiant sun, unmistakably fine clear weather",
  cloud: "a partly cloudy day, several distinct rounded white cumulus clouds drifting across a blue sky, clearly cloudy",
  overcast: "a dull grey overcast day, the whole sky a flat even blanket of grey cloud with no blue and no sun, clearly overcast",
  fog: "a thick foggy morning, dense low mist blanketing the water meadows so trees fade into white, unmistakably foggy",
  rain: "a clearly rainy day, visible streaks of falling rain from grey rain-clouds, wet ground, puddles and reflections",
  storm: "a dramatic stormy day, dark heavy thunderclouds and a curtain of distant rain sweeping over the downs, unmistakably stormy",
  snow: "a clearly snowy day, large white snowflakes falling thickly from a soft pale sky, snow settling on the ground",
  sunrise: "a soft sunrise, the low early-morning sun lifting through a pale rose and apricot dawn sky, clearly daybreak",
  sunset: "a glowing sunset, the low evening sun sinking into deep bands of amber, coral and rose, long warm light, clearly dusk",
  twilight: "the blue hour just after sunset, a deep dusky indigo and soft violet sky with the very first faint star, the land in calm silhouette, clearly twilight, no bright sun",
  night: "a calm moonlit night sky scattered with soft stars, deep indigo and midnight blue, a gentle glowing moon, peaceful and still",
};
const SEASON_LAND = {
  spring: "over the rolling English downs in spring, fresh bright-green fields, trees in pale new leaf and white blossom, primroses and daffodils in the hedgerow, clearly springtime",
  summer: "over the rolling English downs in high summer, lush deep-green fields and golden ripening wheat, trees in full dark leaf, poppies and wildflowers, clearly summertime",
  autumn: "over the rolling English downs in autumn, trees in russet, amber and gold, ploughed brown fields, fallen leaves on a country lane, clearly autumn",
  winter: "over the rolling English downs in winter, bare leafless trees, pale frosted fields and dark hedgerows, a cold low light, clearly wintertime",
};
const SEASONAL_CONDITIONS = ["clear", "cloud", "overcast", "fog", "rain", "storm", "sunrise", "sunset", "twilight", "night"];
for (const c of SEASONAL_CONDITIONS) {
  for (const season of Object.keys(SEASON_LAND)) {
    SUBJECTS[`${c}-${season}`] ??= `${CONDITION[c]}, ${SEASON_LAND[season]}`;
  }
}
for (const season of ["autumn", "winter", "spring"]) SUBJECTS[`snow-${season}`] ??= `${CONDITION.snow}, ${SEASON_LAND[season]}`;

const PROBES = ["clear", "rain", "place-ludlow-summer"];
// The full set the UI actually references:
const UI_SET = Object.keys(SUBJECTS);

const flags = process.argv.slice(2).filter((a) => a.startsWith("--"));
const named = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const SEASONAL_SET = Object.keys(SUBJECTS).filter((k) => /-(spring|summer|autumn|winter)$/.test(k) && !k.startsWith("place-"));
const keys = flags.includes("--probe") ? PROBES
  : flags.includes("--seasonal-missing") ? SEASONAL_SET.filter((k) => !fs.existsSync(path.join(ROOT, "public", "watercolor", `${k}.webp`)))
  : named.length ? named : UI_SET;

const outDir = path.join(ROOT, "public", "watercolor");
fs.mkdirSync(outDir, { recursive: true });

let ok = 0;
for (const key of keys) {
  const subject = SUBJECTS[key];
  if (!subject) {
    console.warn(`! unknown scene key "${key}" — skipping`);
    continue;
  }
  const prompt = STYLE.replace("SUBJECT", subject);
  process.stdout.write(`generating ${key} … `);
  try {
    const result = await generateText({ model: "google/gemini-3-pro-image", prompt });
    const img = result.files?.find((f) => f.mediaType?.startsWith("image/"));
    if (!img) {
      console.error(`no image returned${result.text ? ` (model said: ${result.text.slice(0, 120)})` : ""}`);
      continue;
    }
    const outPath = path.join(outDir, `${key}.webp`);
    await sharp(Buffer.from(img.uint8Array))
      .resize(800, 600, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toFile(outPath);
    console.log(`saved ${path.relative(ROOT, outPath)}`);
    ok++;
  } catch (err) {
    console.error(`failed: ${err?.message ?? err}`);
  }
}
console.log(`\ndone — ${ok}/${keys.length} image(s) written to public/watercolor/`);
