"use client";

import { Section } from "@/components/Section";
import { useTides } from "@/lib/hooks/useTides";
import { useWaves } from "@/lib/hooks/useWaves";
import { useNow } from "@/lib/hooks/useNow";
import { nextTides } from "@/lib/time/tides";

function formatTideTime(time: string): string {
  // time is "YYYY-MM-DD HH:MM"
  const [, hhmm] = time.split(" ");
  const [hhStr, mmStr] = (hhmm ?? "00:00").split(":");
  const hh = parseInt(hhStr ?? "0", 10);
  const mm = mmStr ?? "00";
  const suffix = hh >= 12 ? "pm" : "am";
  const h = hh % 12 === 0 ? 12 : hh % 12;
  return `${h}:${mm}${suffix}`;
}

function compassDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx];
}

export function SantaCruzMarine() {
  const now = useNow();
  const { events } = useTides();
  const { data: waves } = useWaves();

  const { nextHigh, nextLow } = events ? nextTides(events, now) : {};

  return (
    <Section label="sea & surf">
      <div className="space-y-4">
        {/* Tides */}
        <div className="space-y-1">
          {nextHigh ? (
            <p className="text-sm text-muted">
              next high — {formatTideTime(nextHigh.time)} · {nextHigh.heightFt.toFixed(1)}ft
            </p>
          ) : (
            <p className="text-sm text-muted">next high — no data</p>
          )}
          {nextLow ? (
            <p className="text-sm text-muted">
              next low — {formatTideTime(nextLow.time)} · {nextLow.heightFt.toFixed(1)}ft
            </p>
          ) : (
            <p className="text-sm text-muted">next low — no data</p>
          )}
        </div>

        {/* Surf */}
        {waves ? (
          <div className="space-y-1">
            <p className="text-sm text-muted">
              waves —{" "}
              {waves.waveHeightFt !== null ? `${waves.waveHeightFt}ft` : "—"}{" "}
              @{" "}
              {waves.periodSec !== null ? `${waves.periodSec}s` : "—"}
              {waves.directionDeg !== null ? ` · ${compassDir(waves.directionDeg)}` : ""}
            </p>
            <p className="text-sm text-muted">
              water —{" "}
              {waves.waterTempF !== null ? `${waves.waterTempF}°F` : "—"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">surf data unavailable</p>
        )}
      </div>
    </Section>
  );
}
