"use client";

import Link from "next/link";
import { useNow } from "@/lib/hooks/useNow";
import { useWeather } from "@/lib/hooks/useWeather";
import { readClock, HINT_COPY } from "@/lib/time/clocks";
import { seasonalScene } from "@/lib/time/season";
import { describeWeather } from "@/lib/weather/codes";
import { WatercolorScene } from "@/components/WatercolorScene";
import { WeatherIcon } from "@/components/WeatherIcon";
import { Section } from "@/components/Section";
import type { GeoLocation } from "@/lib/config";
import { SantaCruzMarine } from "@/components/SantaCruzMarine";
import { SnowReport } from "@/components/SnowReport";

// Open-Meteo gives sunrise/sunset as the location's own wall-clock time
// ("2026-06-23T05:42", no zone), so read the digits rather than parsing a Date,
// which would shift it by the viewer's timezone (a UK screen showed Santa Cruz's
// sunrise as 9:51 PM).
export function formatSunTime(iso: string): string {
  const h = Number(iso.slice(11, 13));
  const m = iso.slice(14, 16);
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

export function LocationDetail({ location }: { location: GeoLocation }) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      <Link href="/" className="text-muted text-sm">← home</Link>
      <LocationDetailBody location={location} />
    </main>
  );
}

// The page body without the page chrome, so the kitchen can show it in a panel.
// `split` puts the painting beside the details for a wide landscape screen.
export function LocationDetailBody({ location, split = false }: { location: GeoLocation; split?: boolean }) {
  const now = useNow();
  const clock = readClock(location.timezone, now);
  const { data } = useWeather(location);
  const currentDesc = data ? describeWeather(data.current.weatherCode) : null;
  const today = data?.daily[0] ?? null;

  return (
    <div className={split ? "grid grid-cols-[1fr_1.1fr] items-start gap-8" : "space-y-6"}>
      {/* Hero banner */}
      {/* Full painting (4:3), not a cropped band — centred so it reads as the hero */}
      <div className="space-y-4">
        <WatercolorScene
          sceneKey={seasonalScene(location.watercolor, now, location.latitude)}
          alt={location.label}
          className="mx-auto aspect-[4/3] w-full max-w-2xl rounded-2xl"
        />

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-cormorant)]">{location.label}</h1>
          <p className="text-muted">{location.sublabel}</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* Clock + Weather side-by-side cards */}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Card A — now */}
          <div className="rounded-2xl border border-divider bg-card p-5">
            <p className="section-label mb-3">now</p>
            <p className="text-4xl font-[family-name:var(--font-cormorant)]">
              {clock.time}<span className="ml-1 text-lg text-muted">{clock.suffix}</span>
            </p>
            <p className="text-sm text-muted mt-1">{clock.dayLabel}</p>
            <p className="text-sm text-muted mt-1">{HINT_COPY[clock.callHint]}</p>
          </div>

          {/* Card B — weather */}
          <div className="rounded-2xl border border-divider bg-card p-5">
            <p className="section-label mb-3">weather</p>
            {data && currentDesc ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-[family-name:var(--font-cormorant)]">
                    {Math.round(data.current.temperature)}°
                  </p>
                  <WeatherIcon sky={currentDesc.watercolor} className="text-xl" />
                </div>
                <p className="text-sm text-muted">{currentDesc.label}</p>
                <p className="text-sm text-muted">
                  feels like {Math.round(data.current.apparentTemperature)}°
                  &nbsp;·&nbsp; UV {data.current.uvIndex}
                </p>
                {today && (
                  <p className="text-sm text-muted">
                    ↑ {formatSunTime(today.sunrise)}
                    &nbsp;·&nbsp;
                    ↓ {formatSunTime(today.sunset)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted">weather loading…</p>
            )}
          </div>
        </div>

        {/* Location-specific modules — full-width card */}
        {location.key === "santaCruz" && (
          <div className="rounded-2xl border border-divider bg-card p-5">
            <SantaCruzMarine />
          </div>
        )}
        {(location.key === "queenstown" || location.key === "whistler") && (
          <div className="rounded-2xl border border-divider bg-card p-5">
            <SnowReport location={location} />
          </div>
        )}

        {/* 7-day forecast — compact horizontal strip */}
        <Section label="next 7 days">
          {data ? (
            <div className="rounded-2xl border border-divider bg-card p-4">
              <div className="grid grid-cols-7 gap-2 text-center">
                {data.daily.map((day) => {
                  const weekday = new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    timeZone: location.timezone,
                  }).format(new Date(day.date + "T12:00:00Z"));
                  const desc = describeWeather(day.weatherCode);
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-muted">{weekday}</span>
                      <WeatherIcon sky={desc.watercolor} className="text-base" />
                      <span className="text-xs tabular-nums">
                        {Math.round(day.tempMax)}°
                      </span>
                      <span className="text-xs text-muted tabular-nums">
                        {Math.round(day.tempMin)}°
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-muted">forecast loading…</p>
          )}
        </Section>
      </div>
    </div>
  );
}
