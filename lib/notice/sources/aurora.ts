import { type NoticeSource } from "@/lib/notice/card";

const KP_FORECAST_URL =
  "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";

export function requiredKp(lat: number): number {
  return Math.round((65 - Math.abs(lat)) / 2);
}

interface KpRow {
  time_tag?: string;
  kp?: number;
}

export function maxKpNext24h(rows: unknown, now: Date): number {
  if (!Array.isArray(rows)) return 0;
  const horizon = now.getTime() + 24 * 60 * 60 * 1000;
  let max = 0;
  for (const r of rows as KpRow[]) {
    if (typeof r?.kp !== "number" || typeof r?.time_tag !== "string") continue;
    // NOAA time tags are UTC without a zone suffix
    const t = new Date(`${r.time_tag}Z`).getTime();
    if (t >= now.getTime() && t <= horizon && r.kp > max) max = r.kp;
  }
  return max;
}

export const auroraSource: NoticeSource = async (ctx, fetchImpl = fetch) => {
  try {
    const res = await fetchImpl(KP_FORECAST_URL);
    if (!res.ok) return [];
    const maxKp = maxKpNext24h(await res.json(), ctx.now);
    if (maxKp <= 0) return [];
    return ctx.locations
      .filter((loc) => maxKp >= requiredKp(loc.latitude))
      .map((loc) => ({
        id: `aurora-${loc.key}`,
        kind: "aurora" as const,
        label: `northern lights · ${loc.label.toLowerCase()}`,
        title: `aurora possible tonight from ${loc.label} (Kp ${maxKp}).`,
        priority: 60,
      }));
  } catch {
    return [];
  }
};
