"use client";
import { useWeather } from "@/lib/hooks/useWeather";
import { HOME } from "@/lib/config";
import { WeatherIcon } from "@/components/WeatherIcon";
import { describeWeather } from "@/lib/weather/codes";

function hourLabel(iso: string): string {
  const h = parseInt(iso.slice(11, 13), 10);
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

// Current Ludlow hour as a sortable "YYYY-MM-DDTHH" key, so we can compare
// it against Open-Meteo's local-time hourly strings without timezone parsing.
function londonNowKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}`;
}

export function HourlyStrip() {
  const { data } = useWeather(HOME);
  if (!data?.hourly?.length) return null;

  const nowKey = londonNowKey();
  const upcoming = data.hourly.filter((h) => h.time.slice(0, 13) >= nowKey).slice(0, 18);
  if (upcoming.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <ul className="flex min-w-min gap-4">
        {upcoming.map((h) => {
          const sky = describeWeather(h.weatherCode);
          return (
            <li key={h.time} className="flex w-12 shrink-0 flex-col items-center gap-1 text-center">
              <span className="section-label">{hourLabel(h.time)}</span>
              <WeatherIcon sky={sky.watercolor} className="text-sage text-lg" title={sky.label} />
              <span className="text-sm tabular-nums">{Math.round(h.temp)}°</span>
              <span className="text-xs tabular-nums" style={{ minHeight: "1rem", color: "#6E93B0" }}>
                {h.precipProbability >= 20 ? `${h.precipProbability}%` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
