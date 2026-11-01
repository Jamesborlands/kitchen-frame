"use client";
import type { PremadeRoute } from "@/lib/map/routes";
import { useRouteGeometry } from "@/lib/hooks/useRouteGeometry";
import { ElevationProfile } from "@/components/ElevationProfile";

const PROFILE_LABEL: Record<string, string> = {
  trekking: "chill ride",
  mtb: "off-road / mtb",
  gravel: "gravel",
  "hiking-mountain": "walk",
};

interface RouteDetailProps {
  route: PremadeRoute | null;
  onClear: () => void;
}

export function RouteDetail({ route, onClear }: RouteDetailProps) {
  const { data, isLoading } = useRouteGeometry(route);

  if (!route) return null;

  const elevations = data?.coords.map((c) => c[2]) ?? [];
  const minElev = elevations.length ? Math.min(...elevations) : null;
  const maxElev = elevations.length ? Math.max(...elevations) : null;

  return (
    <div className="mx-auto max-w-6xl px-6 mt-4">
      <div className="rounded-2xl border border-divider bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl">{route.name}</h2>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-sage/10 text-sage">
              {PROFILE_LABEL[route.profile] ?? route.profile}
            </span>
            <p className="mt-1 text-xs text-muted">
              {route.drive ? "drive to start" : "from the house"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted hover:text-ink transition-colors shrink-0 mt-1"
            aria-label="close route detail"
          >
            × close
          </button>
        </div>

        {isLoading && !data && (
          <p className="mt-4 text-sm text-muted">loading the profile…</p>
        )}

        {data && (
          <div className="mt-4">
            <p className="text-sm text-muted tabular-nums">
              <span className="text-ink font-medium">{(data.lengthM / 1000).toFixed(1)} km</span>
              {" · "}
              <span className="text-ink font-medium">{data.ascentM} m</span>
              {" climb"}
            </p>

            {elevations.length >= 2 && (
              <div className="mt-3">
                <ElevationProfile elevations={elevations} className="rounded-sm" />
                {minElev !== null && maxElev !== null && (
                  <p className="mt-1 text-xs text-muted">
                    low {Math.round(minElev)}m · high {Math.round(maxElev)}m
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
