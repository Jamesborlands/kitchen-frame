"use client";
import Link from "next/link";
import { WatercolorScene } from "@/components/WatercolorScene";
import { WeatherIcon } from "@/components/WeatherIcon";
import { useWeather } from "@/lib/hooks/useWeather";
import { readClock } from "@/lib/time/clocks";
import { seasonalScene } from "@/lib/time/season";
import { describeWeather } from "@/lib/weather/codes";
import type { GeoLocation } from "@/lib/config";


// Links to the location's page on the site; on the kitchen screen `onSelect`
// opens it in a panel instead, since the kiosk has no way back from a new page.
export function FamilyClockCard({
  location, now, onSelect,
}: { location: GeoLocation; now: Date; onSelect?: (location: GeoLocation) => void }) {
  const clock = readClock(location.timezone, now);
  const { data } = useWeather(location);
  const temp = data ? `${Math.round(data.current.temperature)}°` : "—";
  const desc = data ? describeWeather(data.current.weatherCode) : null;
  const cond = desc ? desc.label : "";
  const sky = desc ? desc.watercolor : null;

  const frame = "block w-full text-left rounded-2xl overflow-hidden border border-divider transition-colors hover:border-sage/40";
  const body = (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3">
      <WatercolorScene sceneKey={seasonalScene(location.watercolor, now, location.latitude)} alt={location.label} className="h-14 w-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate leading-tight">{location.label}</p>
        <p className="text-xs text-muted">{location.sublabel}</p>
        <p className="flex items-center gap-1.5 text-2xl font-[family-name:var(--font-cormorant)] leading-tight">
          <span>
            {clock.time}<span className="ml-1 text-sm text-muted">{clock.suffix}</span>
          </span>
          {/* quiet night cue — a small moon when it's sleeping hours there */}
          {clock.callHint === "asleep" && (
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-muted/70"
              role="img"
              aria-label="night there"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </p>
      </div>
      <div className="text-right text-sm text-muted">
        <div>{temp}</div>
        <div className="flex items-center justify-end gap-1 text-xs">
          {sky && <WeatherIcon sky={sky} className="text-base text-muted" />}
          {cond}
        </div>
      </div>
    </div>
  );

  return onSelect ? (
    <button type="button" onClick={() => onSelect(location)} className={`${frame} active:border-sage/60`}>
      {body}
    </button>
  ) : (
    <Link href={`/${location.slug}`} className={frame}>
      {body}
    </Link>
  );
}
