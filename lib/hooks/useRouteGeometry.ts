"use client";
import useSWR from "swr";
import type { PremadeRoute } from "@/lib/map/routes";

export interface RouteGeometry {
  coords: [number, number, number][];
  lengthM: number;
  ascentM: number;
}

type BRouterFeature = {
  geometry: { coordinates: number[][] };
  properties: Record<string, string | number>;
};

type BRouterResponse = {
  features: BRouterFeature[];
};

export function parseRouteGeometry(json: BRouterResponse): RouteGeometry | null {
  const feat = json?.features?.[0];
  if (!feat) return null;
  const coords = feat.geometry.coordinates.map(
    (c): [number, number, number] => [c[0] as number, c[1] as number, (c[2] ?? 0) as number]
  );
  const lengthM = Number(feat.properties["track-length"]);
  const ascentM = Math.round(Number(feat.properties["filtered ascend"]));
  return { coords, lengthM, ascentM };
}

async function fetchRouteGeometry(route: PremadeRoute): Promise<RouteGeometry | null> {
  const lonlats = route.waypoints.map(([lat, lng]) => `${lng},${lat}`).join("|");
  const url = `https://brouter.de/brouter?lonlats=${lonlats}&profile=${route.profile}&alternativeidx=0&format=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`brouter ${res.status}`);
  const json = await res.json() as BRouterResponse;
  return parseRouteGeometry(json);
}

export function useRouteGeometry(route: PremadeRoute | null) {
  const key = route ? ["routegeom", route.name] : null;
  const { data, error, isLoading } = useSWR<RouteGeometry | null>(
    key,
    () => fetchRouteGeometry(route!),
    { revalidateOnFocus: false, keepPreviousData: false }
  );
  return { data: data ?? null, error, isLoading };
}
