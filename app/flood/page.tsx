"use client";

import Link from "next/link";
import { useFlood } from "@/lib/hooks/useFlood";
import { useWeather } from "@/lib/hooks/useWeather";
import { HOME } from "@/lib/config";
import { describeWeather } from "@/lib/weather/codes";
import { Section } from "@/components/Section";
import { Sparkline } from "@/components/Sparkline";

function weekday(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/London" });
}

function RainBar({ mm }: { mm: number }) {
  // max ~20mm for visual scale
  const pct = Math.min(100, (mm / 20) * 100);
  return (
    <span
      className="inline-block h-2 rounded-full bg-current opacity-40 align-middle"
      style={{ width: `${Math.max(4, pct * 0.6)}px` }}
      aria-hidden="true"
    />
  );
}

export default function FloodPage() {
  const { data: floodData, error: floodError, isLoading: floodLoading } = useFlood();
  const { data: weatherData, isLoading: weatherLoading } = useWeather(HOME);

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24">
      <div className="pt-8 pb-4">
        <Link href="/" className="section-label hover:underline">← home</Link>
      </div>

      <h1 className="text-3xl mb-2">flood watch</h1>
      <p className="text-muted text-sm mb-8">
        Ludlow’s rivers — the Teme, the Corve and their brooks — at a glance.
      </p>

      {/* Warnings */}
      <Section label="warnings">
        {floodLoading && !floodData ? (
          <p className="text-muted text-sm">checking warnings…</p>
        ) : floodError && !floodData ? (
          <p className="text-muted text-sm">couldn’t load flood warnings.</p>
        ) : !floodData ? (
          <p className="text-muted text-sm">checking warnings…</p>
        ) : floodData.warnings.length > 0 ? (
          <ul className="space-y-3">
            {floodData.warnings.map((w, i) => (
              <li key={i} className="text-sm leading-relaxed">
                <span className="text-sage font-medium">{w.severity}</span>
                {w.area ? <span className="text-muted"> — {w.area}</span> : null}
                {w.message ? <span className="text-muted"> — {w.message}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-sm">no flood warnings right now.</p>
        )}
      </Section>

      {/* Rivers */}
      <Section label="river levels — last 24 hours">
        {floodLoading && !floodData ? (
          <p className="text-muted text-sm">loading river data…</p>
        ) : floodError && !floodData ? (
          <p className="text-muted text-sm">couldn’t load river levels.</p>
        ) : !floodData || floodData.rivers.length === 0 ? (
          <p className="text-muted text-sm">no river stations found nearby.</p>
        ) : (
          <div className="space-y-4">
            {floodData.rivers.map((r, i) => {
              const hasHistory = (r.history?.length ?? 0) >= 2;
              const histMin = hasHistory ? Math.min(...r.history) : null;
              const histMax = hasHistory ? Math.max(...r.history) : null;

              return (
                <div
                  key={i}
                  className="rounded-2xl border border-divider bg-card px-5 py-4"
                >
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-base">{r.river}</span>
                    <span className="text-sm text-muted">
                      {r.level !== null
                        ? `${r.level.toFixed(2)} ${r.unit}`
                        : "—"}
                    </span>
                  </div>

                  {hasHistory ? (
                    <>
                      {/* Wider sparkline for the drill-down */}
                      <div className="w-[120px] h-[28px] text-sage">
                        <Sparkline
                          values={r.history}
                          className="text-sage w-full h-full"
                        />
                      </div>
                      {histMin !== null && histMax !== null && (
                        <p className="text-xs text-muted mt-1">
                          24h range: {histMin.toFixed(2)}–{histMax.toFixed(2)} {r.unit}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted">no trend data available.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Rain ahead */}
      <Section label="rain ahead">
        {weatherLoading && !weatherData ? (
          <p className="text-muted text-sm">loading forecast…</p>
        ) : !weatherData ? (
          <p className="text-muted text-sm">forecast unavailable.</p>
        ) : (
          <ul className="space-y-2">
            {weatherData.daily.slice(0, 6).map((day, i) => {
              const label = describeWeather(day.weatherCode).label;
              const precip = day.precipitationSum;
              return (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-10 text-muted">{weekday(day.date)}</span>
                  <RainBar mm={precip} />
                  <span className="text-ink">
                    {precip > 0 ? `${precip.toFixed(1)} mm` : "dry"}
                  </span>
                  <span className="text-muted hidden sm:inline">{label}</span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted mt-4">
          rain drains into the rivers within hours — a wet day upstream means higher
          levels at Ludford Bridge and the Corve by evening.
        </p>
      </Section>
    </main>
  );
}
