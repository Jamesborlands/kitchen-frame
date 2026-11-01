# Watercolor illustration set — prompts & generation

The dashboard's illustrations are an AI-generated, style-locked watercolor set.

**Generation:** `scripts/generate-watercolors.mjs` — runs through **Vercel AI Gateway**
(model `google/gemini-3-pro-image`, "Nano Banana Pro") via the Vercel AI SDK. Never call a
provider SDK directly (project rule). Needs `AI_GATEWAY_API_KEY` in `.env.local` or the env.

```bash
node scripts/generate-watercolors.mjs --probe     # 3 style probes for approval
node scripts/generate-watercolors.mjs             # full set used by the UI
node scripts/generate-watercolors.mjs clear rain  # specific scene keys
# or: npm run watercolors -- --probe
```

Output: `public/watercolor/<key>.webp` (4:3, cover-cropped ~800×600, quality 82).

**Then trim the paper border** — the model bakes a cold-pressed-paper margin into each
image, which shows as white bars on the sides of wide containers once `object-cover` crops
the top/bottom. `scripts/trim-watercolors.mjs` trims that margin and re-covers to 800×600:

```bash
node scripts/trim-watercolors.mjs                  # whole set in place
node scripts/trim-watercolors.mjs night clear      # specific keys
node scripts/trim-watercolors.mjs sunrise --review # write to scratch-trim/ to eyeball first
```

It only trims genuine uniform borders (framed scenes); already-full-bleed pale paintings are
left alone. Run it after every generation.

## Locked style seed

> English watercolor illustration, **{SUBJECT}**, luminous pastel palette, loose wet-on-wet
> wash, cold-pressed paper texture, white paper showing through, soft diffused light,
> traditional British watercolor tradition, no hard edges, no digital artifacts, no text or
> words or lettering, no signature, no artist signature, no watermark, no initials,
> no border or frame, calm and unhurried, landscape 4:3 composition

## Scene keys & subjects

Keys must match `WatercolorKey` (`lib/weather/codes.ts`) and the place stems (`lib/config.ts`).

**Weather skies** — the condition must read at a glance (this is the kitchen weather cue):

| Key | Subject |
|---|---|
| `clear` | clear blue summer sky over the rolling English downs |
| `cloud` | soft partly-cloudy sky over English countryside |
| `overcast` | calm flat overcast grey-white sky over the English countryside |
| `fog` | misty foggy morning over the water meadows |
| `rain` | gentle rain over an English meadow, wet reflections |
| `snow` | quiet snowfall over an English field |
| `storm` | soft dramatic stormy sky, distant rain over the downs |

**Light phases** — chosen by time of day (`lightPhase` in `codes.ts`) when the sky is clear/cloud:

| Key | Subject |
|---|---|
| `sunrise` | soft rose-and-apricot dawn, low sun lifting over the downs |
| `sunset` | glowing amber/coral sunset, low evening sun over the countryside |
| `golden` | golden-hour sunset (legacy; superseded by `sunrise`/`sunset`) |
| `twilight` | blue hour after sunset, deep indigo/violet, first faint star |
| `night` | calm moonlit night sky, deep indigo, gentle moon |

**Locations — seasonal.** Each place has `-spring`, `-summer`, `-autumn` and `-winter`
variants; the UI picks one by month + the place's own hemisphere (`lib/time/season.ts` →
`watercolorSeason` / `placeScene`). The bare stem is a copy of one seasonal painting (the
fallback when a variant is missing):

| Key stem | Scene | Bare stem copies |
|---|---|---|
| `place-ludlow` | Ludlow Castle above the River Teme, Ludford Bridge / Dinham, St Laurence's tower over the rooftops | `-summer` |
| `place-edinburgh` | Old Town skyline, the castle on its rock above Princes Street Gardens | `-summer` |
| `place-northberwick` | the little stone harbour, Bass Rock out in the Firth of Forth | `-summer` |
| `place-santacruz` | the wharf and boardwalk (wooden roller coaster), surfers; mild California seasons | `-summer` |
| `place-queenstown` (S. hemisphere) | Lake Wakatipu under the Remarkables; snow-covered in winter (July) | `-winter` |
| `place-whistler` | the village under Whistler & Blackcomb; ski runs in winter | `-winter` |

**Process:** generate the 3 probes first, sign off on the look, then batch the
full set (the seed keeps them consistent), then **trim**. Existing scenes can be reused as a
fallback by copying the file (e.g. `place-whistler-winter` → `place-whistler`).
