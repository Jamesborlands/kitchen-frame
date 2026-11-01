import { type NoticeCard, type NoticeSource } from "@/lib/notice/card";
import { HOME } from "@/lib/config";
import { fetchAirQuality, peakForDay, type AirReading } from "@/lib/sources/airQuality";

// Bad pollen or air days in Ludlow. Open-Meteo/CAMS pollen is grains/m³ and the
// bands follow the Met Office's: grass high ≥50, very high ≥150; birch high ≥80,
// very high ≥200. European AQI ≥60 is "poor", ≥80 "very poor".

function band(v: number | null, high: number, veryHigh: number): "high" | "very high" | null {
  if (v === null) return null;
  if (v >= veryHigh) return "very high";
  if (v >= high) return "high";
  return null;
}

export function airCardFor(reading: AirReading, day: string): NoticeCard | null {
  const grass = band(reading.grassPollen, 50, 150);
  const birch = band(reading.birchPollen, 80, 200);
  const aqi = reading.europeanAqi;

  let title: string | null = null;
  if (grass || birch) {
    const worst = grass === "very high" || birch === "very high" ? "very high" : "high";
    const kinds = [grass && "grass", birch && "birch"].filter(Boolean).join(" and ");
    title = `${worst} ${kinds} pollen today — one for the hay fever tablets.`;
  } else if (aqi !== null && aqi >= 60) {
    title = `${aqi >= 80 ? "very poor" : "poor"} air quality in Ludlow today.`;
  }
  if (!title) return null;
  return { id: `air-${day}`, kind: "weather", label: "ludlow air", title, priority: 60 };
}

export const airQualitySource: NoticeSource = async (ctx, fetchImpl = fetch) => {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: HOME.timezone }).format(ctx.now);
  const json = await fetchAirQuality(HOME.latitude, HOME.longitude, HOME.timezone, fetchImpl);
  const card = airCardFor(peakForDay(json, day), day);
  return card ? [card] : [];
};
