"use client";
import React, { useState, useEffect } from "react";
import { Section } from "@/components/Section";
import { PREMADE_ROUTES, type PremadeRoute } from "@/lib/map/routes";

type RideType = "all" | "chill ride" | "off-road / mtb" | "gravel" | "walk";

const PROFILE_LABEL: Record<string, string> = {
  trekking: "chill ride",
  mtb: "off-road / mtb",
  gravel: "gravel",
  "hiking-mountain": "walk",
};

const FILTER_PILLS: { key: RideType; label: string }[] = [
  { key: "all", label: "all" },
  { key: "chill ride", label: "chill ride" },
  { key: "off-road / mtb", label: "off-road & mtb" },
  { key: "gravel", label: "gravel" },
  { key: "walk", label: "walk" },
];

type RouteStats = Record<string, { distKm: string; ascentM: string }>;

interface SuggestedRoutesProps {
  selected?: PremadeRoute | null;
  onSelect?: (r: PremadeRoute) => void;
}

export function SuggestedRoutes({ selected, onSelect }: SuggestedRoutesProps = {}) {
  const [activeFilter, setActiveFilter] = useState<RideType>("all");
  const [routeStats, setRouteStats] = useState<RouteStats>({});

  useEffect(() => {
    async function fetchAllRoutes() {
      const results: RouteStats = {};
      await Promise.all(
        PREMADE_ROUTES.map(async (route) => {
          try {
            const lonlats = route.waypoints
              .map(([lat, lng]) => `${lng},${lat}`)
              .join("|");
            const url = `https://brouter.de/brouter?lonlats=${lonlats}&profile=${route.profile}&alternativeidx=0&format=geojson`;
            const res = await fetch(url);
            const data = (await res.json()) as {
              features: Array<{
                properties: { "track-length": number; "filtered ascend": number };
              }>;
            };
            const feat = data.features[0];
            if (!feat) throw new Error("no route");
            const props = feat.properties;
            const distKm = (props["track-length"] / 1000).toFixed(1);
            const ascentM = Math.round(props["filtered ascend"]).toString();
            results[route.name] = { distKm, ascentM };
          } catch {
            results[route.name] = { distKm: "—", ascentM: "—" };
          }
        })
      );
      setRouteStats(results);
    }
    void fetchAllRoutes();
  }, []);

  const filtered =
    activeFilter === "all"
      ? PREMADE_ROUTES
      : PREMADE_ROUTES.filter(
          (route) => PROFILE_LABEL[route.profile] === activeFilter
        );

  return (
    <Section label="suggested routes">
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTER_PILLS.map((pill) => (
          <button
            key={pill.key}
            type="button"
            onClick={() => setActiveFilter(pill.key)}
            className={
              activeFilter === pill.key
                ? "px-3 py-1 rounded-full text-xs bg-sage/15 text-sage"
                : "px-3 py-1 rounded-full text-xs text-muted"
            }
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((route) => {
          const isSelected = selected?.name === route.name;
          return (
            <button
              key={route.name}
              type="button"
              onClick={() => onSelect?.(route)}
              className={[
                "rounded-2xl border p-4 text-left w-full transition-colors",
                isSelected
                  ? "border-sage bg-sage/10 ring-1 ring-sage/40"
                  : "border-divider bg-card hover:border-sage/40",
              ].join(" ")}
            >
              <p className="font-medium text-sm">{route.name}</p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-sage/10 text-sage">
                {PROFILE_LABEL[route.profile] ?? route.profile}
              </span>
              <p className="mt-1 text-xs text-muted">
                {route.drive ? "drive to start" : "from the house"}
              </p>
              <p className="mt-2 text-xs text-muted">
                {routeStats[route.name]
                  ? `${routeStats[route.name].distKm} km · ${routeStats[route.name].ascentM} m climb`
                  : "loading…"}
              </p>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
