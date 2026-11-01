"use client";
import Link from "next/link";
import { Section } from "@/components/Section";
import { WatercolorScene } from "@/components/WatercolorScene";
import { SKI_LOCATIONS, type GeoLocation } from "@/lib/config";
import { isSkiSeason, seasonalScene } from "@/lib/time/season";
import { useSnow } from "@/lib/hooks/useSnow";

function SkiDestinationCard({ location, now }: { location: GeoLocation; now: Date }) {
  const { data, isLoading } = useSnow(location);

  const snowLine = isLoading
    ? "checking snow…"
    : data
    ? `${data.snowDepthCm ?? "—"}cm base · ${data.recentSnowfallCm ?? "—"}cm new`
    : "—";

  return (
    <Link
      href={`/${location.slug}`}
      className="flex items-center gap-4 border-b border-divider pb-4 last:border-0 hover:bg-wash/40 rounded-lg -mx-2 px-2 transition-colors"
    >
      <WatercolorScene
        sceneKey={seasonalScene(location.watercolor, now, location.latitude)}
        alt={location.label}
        className="h-16 w-16 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{location.label}</span>
          <span className="text-sage text-xs">in season</span>
        </div>
        <p className="text-xs text-muted">{location.sublabel}</p>
        <p className="text-sm text-muted mt-1">{snowLine}</p>
      </div>
    </Link>
  );
}

export function Skiing({ now = new Date() }: { now?: Date }) {
  const inSeason = SKI_LOCATIONS.filter((l) => isSkiSeason(now, l.latitude));
  if (inSeason.length === 0) return null;
  return (
    <Section label="skiing">
      <div className="space-y-4">
        {inSeason.map((l) => (
          <SkiDestinationCard location={l} now={now} key={l.key} />
        ))}
      </div>
    </Section>
  );
}
