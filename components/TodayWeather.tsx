"use client";
import { Section } from "@/components/Section";
import { WatercolorScene } from "@/components/WatercolorScene";
import { useWeather } from "@/lib/hooks/useWeather";
import { useNow } from "@/lib/hooks/useNow";
import { HOME } from "@/lib/config";
import { describeWeather, skyKey, lightPhase } from "@/lib/weather/codes";
import { seasonalSkyKey } from "@/lib/weather/seasonalSky";
import { wallClockMinutes } from "@/lib/time/clocks";
import { MoonPhase } from "@/components/MoonPhase";
import { londonHourKey, todayOutlook } from "@/lib/weather/today";
import { staleLabel } from "@/lib/time/stale";

function clockLabel(iso: string): string {
  // iso like "2026-06-23T21:24" (local to Ludlow already)
  return iso.slice(11, 16);
}

export function TodayWeather({ fill = false }: { fill?: boolean }) {
  const now = useNow();
  const { data, error } = useWeather(HOME);

  // fill mode (kitchen): the section grows so the watercolour card eats the
  // spare column height, becoming big and near-square instead of a thin band.
  const sectionClass = fill ? "flex min-h-0 flex-1 flex-col" : "";
  const cardClass = fill ? "min-h-0 flex-1" : "h-64";

  if (!data) {
    return (
      <Section label="today in ludlow" className={sectionClass}>
        <p className="text-muted">
          {error ? "couldn't load the weather just now." : "loading…"}
        </p>
      </Section>
    );
  }

  const { current, daily } = data;
  const today = daily[0];
  const desc = describeWeather(current.weatherCode);
  // Sunrise/sunset are Ludlow-local wall-clock strings (e.g. "2026-06-23T04:51"); compare in the same zone.
  const nowMin = wallClockMinutes("Europe/London", now);
  const sunriseMin = Number(today.sunrise.slice(11, 13)) * 60 + Number(today.sunrise.slice(14, 16));
  const sunsetMin = Number(today.sunset.slice(11, 13)) * 60 + Number(today.sunset.slice(14, 16));
  const phase = lightPhase(nowMin, sunriseMin, sunsetMin);
  const sky = seasonalSkyKey(skyKey(current.weatherCode, phase), now, HOME.latitude);
  const outlook = todayOutlook(today, data.hourly, londonHourKey(now));
  const stale = staleLabel(data.fetchedAt, now.getTime());

  return (
    <Section label="today in ludlow" className={sectionClass}>
      {/* The watercolour is the whole card; the readings float over a soft scrim
          at the bottom. Light text + a gentle shadow keep it legible even on the
          pale paintings. */}
      <div className={`relative overflow-hidden rounded-2xl border border-divider ${cardClass}`}>
        <WatercolorScene sceneKey={sky} alt={desc.label} className="h-full w-full" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
        />
        {stale && (
          <p className="absolute right-4 top-4 rounded-full bg-black/35 px-3 py-1 text-xs text-paper/90">
            {stale}
          </p>
        )}
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-paper"
          style={{ textShadow: "0 1px 5px rgba(0,0,0,0.4)" }}
        >
          <div>
            <p className="font-[family-name:var(--font-cormorant)] text-6xl leading-none">
              {Math.round(current.temperature)}°
            </p>
            <p className="mt-1.5 text-paper/85">{desc.label} · feels {Math.round(current.apparentTemperature)}°</p>
            <p className="mt-0.5 text-sm text-paper/80">
              high {outlook.high}° · low {outlook.low}°{outlook.rain && ` · ${outlook.rain}`}
            </p>
          </div>
          <div className="text-right text-sm text-paper/85">
            <div>uv {Math.round(current.uvIndex)}</div>
            <div>↑ {clockLabel(today.sunrise)} · ↓ {clockLabel(today.sunset)}</div>
            <MoonPhase date={now} onImage />
          </div>
        </div>
      </div>
    </Section>
  );
}
