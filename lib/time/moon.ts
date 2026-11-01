export interface MoonPhase {
  name: string;
  illumination: number;
  ageDays: number;
}

const REF = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC — new moon epoch
const SYNODIC = 29.530588853; // mean synodic month in days
const DAY_MS = 86_400_000;

const PHASE_NAMES = [
  "new moon",
  "waxing crescent",
  "first quarter",
  "waxing gibbous",
  "full moon",
  "waning gibbous",
  "last quarter",
  "waning crescent",
] as const;

export function moonPhase(date: Date): MoonPhase {
  const ageDays =
    (((date.getTime() - REF) / DAY_MS) % SYNODIC + SYNODIC) % SYNODIC;

  const phaseFraction = ageDays / SYNODIC;
  const illumination = (1 - Math.cos(2 * Math.PI * phaseFraction)) / 2;

  const idx = Math.round(phaseFraction * 8) % 8;
  const name = PHASE_NAMES[idx];

  return { name, illumination, ageDays };
}
