"use client";
import Link from "next/link";
import { Section } from "@/components/Section";
import { WeatherIcon } from "@/components/WeatherIcon";
import { useWeather } from "@/lib/hooks/useWeather";
import { HOME } from "@/lib/config";
import { bestRideDay } from "@/lib/cycle/rideability";
import { describeWeather } from "@/lib/weather/codes";

export function RidingConditions() {
  const { data, error } = useWeather(HOME);

  if (!data) {
    return (
      <Section label="conditions">
        <p className="text-muted text-sm">
          {error ? "couldn't load conditions." : "loading…"}
        </p>
      </Section>
    );
  }

  const { current, daily } = data;
  const desc = describeWeather(current.weatherCode);
  const best = bestRideDay(daily);

  return (
    <Section label="conditions">
      {/* current temp + condition line */}
      <div className="flex items-center gap-2 mb-3">
        <WeatherIcon sky={desc.watercolor} className="w-5 h-5 text-muted" />
        <span className="text-sm">
          {Math.round(current.temperature)}° — {desc.label}
        </span>
      </div>

      {/* best day to ride */}
      {best && (
        <p className="text-sm text-muted">
          best day to ride:{" "}
          <strong className="text-ink font-medium">
            {best.weekday}
          </strong>{" "}
          — {Math.round(best.tempMax)}°, {best.precip === 0 ? "dry" : "mostly dry"}{" "}
          <Link href="/ride" className="text-sage underline-offset-2 hover:underline ml-1">
            plan it ↗
          </Link>
        </p>
      )}
    </Section>
  );
}
