"use client";
import Link from "next/link";
import { useWeather } from "@/lib/hooks/useWeather";
import { HOME } from "@/lib/config";
import { bestRideDay } from "@/lib/cycle/rideability";
import { CYCLING } from "@/lib/content/cycling";
import { describeWeather } from "@/lib/weather/codes";
import { Section } from "@/components/Section";

function cycleForDate(date: string): { name: string; note: string } {
  // Deterministic pick by day-of-year from the date string
  const d = new Date(`${date}T12:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const current = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const doy = Math.floor((current - start) / 86_400_000);
  return CYCLING[doy % CYCLING.length];
}

export function GoodRide() {
  const { data, isLoading } = useWeather(HOME);

  if (isLoading || !data) {
    return (
      <Section label="a good ride">
        <p className="text-muted text-sm">checking the forecast…</p>
      </Section>
    );
  }

  const best = bestRideDay(data.daily);
  const isRideable = best && (best.verdict === "great" || best.verdict === "good");

  if (!isRideable) {
    return (
      <Section label="a good ride">
        <p className="text-muted text-sm">
          no standout ride days this week — maybe one for the turbo.
        </p>
      </Section>
    );
  }

  const ride = cycleForDate(best.date);
  const condition = describeWeather(
    data.daily.find((d) => d.date === best.date)?.weatherCode ?? 0
  ).label;

  return (
    <Section label="a good ride">
      <div className="rounded-2xl border border-divider bg-card p-5">
        <p className="text-sm text-muted mb-1">
          <span className="font-medium text-ink">{best.weekday}</span>{" "}
          looks good for a ride — {best.tempMax}°,{" "}
          {best.precip === 0 ? "dry" : "a bit showery"}, {condition}
        </p>
        <h3 className="text-lg mt-2">{ride.name}</h3>
        <p className="text-sm text-muted mt-1">{ride.note}</p>
        <Link
          href="/ride"
          className="section-label mt-3 inline-block text-sage hover:underline"
        >
          plan it on the map ↗
        </Link>
      </div>
    </Section>
  );
}
