"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as LType from "leaflet";
import { PREMADE_ROUTES, HOUSE, type PremadeRoute } from "@/lib/map/routes";
import { useRouteGeometry } from "@/lib/hooks/useRouteGeometry";

type LatLng = [number, number]; // [lat, lng]

type Profile = "trekking" | "mtb" | "gravel" | "hiking-mountain";

const PROFILES: { id: Profile; label: string }[] = [
  { id: "trekking", label: "chill ride" },
  { id: "mtb", label: "off-road / mtb" },
  { id: "gravel", label: "gravel" },
  { id: "hiking-mountain", label: "walk" },
];

type BRouterFeature = {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: number[][] };
  properties: Record<string, string | number>;
};

type BRouterResponse = {
  type: "FeatureCollection";
  features: BRouterFeature[];
};

interface FullMapProps {
  selectedRoute?: PremadeRoute | null;
}

export function FullMap({ selectedRoute }: FullMapProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);
  const routeLayerRef = useRef<LType.GeoJSON | null>(null);
  const markersGroupRef = useRef<LType.LayerGroup | null>(null);
  const highlightRef = useRef<LType.Polyline | null>(null);

  const [profile, setProfile] = useState<Profile>("trekking");
  const [waypoints, setWaypoints] = useState<LatLng[]>([]);
  const [summary, setSummary] = useState<{ km: number; ascent: number } | null>(null);

  const { data: routeGeom } = useRouteGeometry(selectedRoute ?? null);

  // Init effect — runs once, sets up the Leaflet map with all existing layers
  useEffect(() => {
    let map: LType.Map | undefined;
    let cancelled = false;
    (async () => {
      try {
        const L = await import("leaflet");
        if (cancelled || !containerRef.current || containerRef.current.dataset.init) return;
        containerRef.current.dataset.init = "1";

        const osKey = process.env.NEXT_PUBLIC_OS_API_KEY;

        const base: Record<string, LType.Layer> = {};
        base["topographic"] = L.tileLayer(
          "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
          {
            subdomains: "abc",
            maxZoom: 17,
            attribution: "© OpenTopoMap (CC-BY-SA) · © OpenStreetMap contributors · SRTM",
          }
        );
        if (osKey) {
          base["OS Outdoor"] = L.tileLayer(
            `https://api.os.uk/maps/raster/v1/zxy/Outdoor_3857/{z}/{x}/{y}.png?key=${osKey}`,
            {
              maxZoom: 16,
              attribution: "Contains OS data &copy; Crown copyright and database right 2026",
            }
          );
        }
        base["CyclOSM"] = L.tileLayer(
          "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
          {
            subdomains: "abc",
            maxZoom: 18,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &middot; <a href="https://www.cyclosm.org">CyclOSM</a>',
          }
        );

        const overlays: Record<string, LType.Layer> = {
          "walking routes": L.tileLayer(
            "https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png",
            {
              maxZoom: 18,
              attribution: '<a href="https://waymarkedtrails.org">waymarkedtrails.org</a> (CC-BY-SA)',
            }
          ),
          "cycle routes": L.tileLayer(
            "https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png",
            {
              maxZoom: 18,
              attribution: '<a href="https://waymarkedtrails.org">waymarkedtrails.org</a> (CC-BY-SA)',
            }
          ),
          "off-road / mtb": L.tileLayer(
            "https://tile.waymarkedtrails.org/mtb/{z}/{x}/{y}.png",
            {
              maxZoom: 18,
              attribution: '<a href="https://waymarkedtrails.org">waymarkedtrails.org</a> (CC-BY-SA)',
            }
          ),
        };

        type FloodResponse = { items?: Array<{ floodArea?: { polygon?: string } }> };

        const floodGroup = L.layerGroup();
        try {
          const floods = await fetch("https://environment.data.gov.uk/flood-monitoring/id/floods?lat=52.3675&long=-2.7181&dist=40")
            .then(r => { if (!r.ok) throw new Error(`flood api ${r.status}`); return r.json(); }) as FloodResponse;
          for (const f of (floods?.items ?? []).slice(0, 25)) {
            const polyUrl = f?.floodArea?.polygon;
            if (!polyUrl) continue;
            try {
              const gj = await fetch(String(polyUrl).replace(/^http:/, "https:"))
                .then(r => { if (!r.ok) throw new Error(`polygon ${r.status}`); return r.json(); }) as Parameters<typeof L.geoJSON>[0];
              L.geoJSON(gj, { style: { color: "#B07A78", weight: 1, fillColor: "#B07A78", fillOpacity: 0.18 } }).addTo(floodGroup);
            } catch { /* skip one area */ }
          }
        } catch { /* none */ }
        overlays["flood warnings"] = floodGroup;

        const suggestedGroup = L.layerGroup();
        type BRouterSuggestedResponse = {
          type: "FeatureCollection";
          features: Array<{
            type: "Feature";
            geometry: { type: "LineString"; coordinates: number[][] };
            properties: Record<string, string | number>;
          }>;
        };
        await Promise.all(
          PREMADE_ROUTES.map(async ({ name, profile: routeProfile, waypoints }) => {
            const lonlats = waypoints.map(([lat, lng]) => `${lng},${lat}`).join("|");
            const url = `https://brouter.de/brouter?lonlats=${lonlats}&profile=${routeProfile}&alternativeidx=0&format=geojson`;
            try {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`brouter ${res.status}`);
              const gj = await res.json() as BRouterSuggestedResponse;
              const feat = gj?.features?.[0];
              if (!feat) return;
              const km = (Number(feat.properties["track-length"]) / 1000).toFixed(1);
              L.geoJSON(feat as Parameters<typeof L.geoJSON>[0], {
                style: { color: "#6B7C6B", weight: 3, opacity: 0.8, dashArray: "1" },
              }).bindPopup(`${name} · ${km} km`).addTo(suggestedGroup);
            } catch { /* one failing route should not break others */ }
          })
        );
        overlays["suggested routes"] = suggestedGroup;

        type InatObservation = {
          taxon?: {
            preferred_common_name?: string;
            name: string;
            iconic_taxon_name?: string;
          };
          geojson?: { coordinates: [number, number] } | null;
          photos?: Array<{ url: string }>;
        };
        type InatResponse = { results: InatObservation[] };

        const TAXON_COLORS: Record<string, string> = {
          Plantae: "#6B7C6B",
          Aves: "#6B8CA3",
          Insecta: "#C09A6B",
          Mammalia: "#8B6F5C",
          Amphibia: "#7C9B6B",
          Reptilia: "#7C9B6B",
          Fungi: "#B07A78",
          Mollusca: "#9A8C7C",
          Arachnida: "#9A8C7C",
        };
        const DEFAULT_TAXON_COLOR = "#78716C";

        const wildlifeGroup = L.layerGroup();
        try {
          const inat = await fetch(
            "https://api.inaturalist.org/v1/observations?lat=52.3675&lng=-2.7181&radius=12&per_page=60&order_by=observed_on&photos=true&geo=true&quality_grade=research"
          ).then(r => { if (!r.ok) throw new Error(`inat ${r.status}`); return r.json(); }) as InatResponse;
          for (const obs of (inat?.results ?? [])) {
            const coords = obs?.geojson?.coordinates;
            if (!coords || coords.length < 2) continue;
            const [lng, lat] = coords;
            const taxon = obs.taxon;
            const iconicName = taxon?.iconic_taxon_name ?? "";
            const color = TAXON_COLORS[iconicName] ?? DEFAULT_TAXON_COLOR;
            const commonName = taxon?.preferred_common_name ?? taxon?.name ?? "unknown";
            const sciName = taxon?.name ?? "";
            const photoUrl = obs.photos?.[0]?.url?.replace("square", "small");

            // Build popup with DOM nodes — never innerHTML with external text (XSS guard)
            const el = document.createElement("div");
            el.style.maxWidth = "150px";
            if (photoUrl && /^https:\/\//.test(photoUrl)) {
              const img = document.createElement("img");
              img.src = photoUrl; // property assignment — browser URL-parses, no markup injection
              img.loading = "lazy";
              img.style.width = "100%";
              img.style.borderRadius = "8px";
              el.appendChild(img);
            }
            const nameEl = document.createElement("div");
            nameEl.textContent = commonName; // textContent escapes all markup
            el.appendChild(nameEl);
            const sciEl = document.createElement("div");
            sciEl.textContent = sciName;
            sciEl.style.color = "#78716C";
            sciEl.style.fontStyle = "italic";
            sciEl.style.fontSize = "12px";
            el.appendChild(sciEl);

            const marker = L.circleMarker([lat, lng] as LType.LatLngExpression, {
              radius: 5,
              color,
              fillColor: color,
              fillOpacity: 0.85,
              weight: 1,
            });
            marker.bindPopup(el).addTo(wildlifeGroup);
          }
        } catch { /* iNaturalist optional */ }
        overlays["plants & wildlife"] = wildlifeGroup;

        const firstBase = base["topographic"];
        map = L.map(containerRef.current, {
          center: [52.3675, -2.7181],
          zoom: 12,
          layers: [firstBase, overlays["off-road / mtb"], suggestedGroup],
        });
        L.control.layers(base, overlays, { collapsed: false }).addTo(map);

        // House marker — always visible, on top of everything
        const houseIcon = L.divIcon({
          className: "",
          html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#FDF9F5;border:2px solid #6B7C6B;box-shadow:0 1px 4px rgba(0,0,0,0.2)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6B7C6B" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9h14v-9"/><path d="M10 19v-5h4v5"/></svg></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([HOUSE[0], HOUSE[1]], { icon: houseIcon, title: "home", zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup("home");

        // Waypoint markers layer group
        const markersGroup = L.layerGroup().addTo(map);
        markersGroupRef.current = markersGroup;

        // Click handler — stable functional update so the closure never captures stale waypoints
        map.on("click", (e: LType.LeafletMouseEvent) => {
          setWaypoints((w) => [...w, [e.latlng.lat, e.latlng.lng]]);
        });

        leafletRef.current = L as unknown as typeof LType;
        mapRef.current = map;
      } catch {
        /* leaflet unavailable (e.g. jsdom) — leave the placeholder */
      }
    })();
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, []);

  // Routing effect — re-runs when waypoints or profile changes
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!L || !map || !markersGroup) return;

    // Clear previous route layer
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    // Clear waypoint markers
    markersGroup.clearLayers();

    // Draw waypoint markers
    for (const [lat, lng] of waypoints) {
      L.circleMarker([lat, lng] as LType.LatLngExpression, {
        radius: 5,
        color: "#6B7C6B",
        fillColor: "#6B7C6B",
        fillOpacity: 1,
      }).addTo(markersGroup);
    }

    if (waypoints.length < 2) return; // summary is hidden below two points

    // Build BRouter URL — note lon,lat order (not lat,lon)
    const lonlats = waypoints.map(([lat, lng]) => `${lng},${lat}`).join("|");
    const url = `https://brouter.de/brouter?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`brouter ${res.status}`);
        const gj = await res.json() as BRouterResponse;
        const feature = gj?.features?.[0];
        if (!feature) return;

        const props = feature.properties;
        const trackLength = Number(props["track-length"]);
        const ascend = Number(props["filtered ascend"]);

        const routeLayer = L.geoJSON(feature as Parameters<typeof L.geoJSON>[0], {
          style: { color: "#6B7C6B", weight: 4, opacity: 0.85 },
        }).addTo(map);
        routeLayerRef.current = routeLayer;

        setSummary({
          km: +(trackLength / 1000).toFixed(1),
          ascent: Math.round(ascend),
        });
      } catch {
        /* BRouter fetch failed — silently skip */
      }
    })();
  }, [waypoints, profile]);

  // Highlight effect — draws/removes highlight polyline when selectedRoute geometry changes
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;

    // Remove previous highlight
    if (highlightRef.current) {
      highlightRef.current.remove();
      highlightRef.current = null;
    }

    if (!L || !map || !routeGeom) return;

    // coords are [lon, lat, elev] — Leaflet wants [lat, lng]
    const latlngs = routeGeom.coords.map(
      ([lng, lat]): LType.LatLngExpression => [lat, lng]
    );

    const highlight = L.polyline(latlngs, {
      color: "#B07A78",
      weight: 5,
      opacity: 0.95,
    }).addTo(map);

    highlightRef.current = highlight;
    map.fitBounds(highlight.getBounds(), { padding: [40, 40] });
  }, [routeGeom]);

  const handleClear = () => {
    setWaypoints([]);
    setSummary(null);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <p className="text-xs text-muted lowercase tracking-wide shrink-0">
          tap the map to drop points and plan a route — switch the style below.
        </p>

        {/* Profile segmented row */}
        <div className="flex items-center gap-1 rounded-xl border border-divider p-0.5">
          {PROFILES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setProfile(id)}
              className={[
                "rounded-lg px-2.5 py-1 text-xs lowercase transition-colors",
                profile === id
                  ? "bg-sage/15 text-sage font-medium"
                  : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Summary */}
        {summary && waypoints.length >= 2 && (
          <span className="text-xs text-sage lowercase tabular-nums">
            {summary.km} km · {summary.ascent} m climb
          </span>
        )}

        {/* Clear button */}
        <button
          onClick={handleClear}
          className="ml-auto text-xs text-muted lowercase hover:text-ink transition-colors"
        >
          clear
        </button>
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        role="img"
        aria-label="interactive map of Ludlow walks and cycle routes"
        className="h-[72vh] w-full overflow-hidden rounded-2xl border border-divider bg-card"
      />
    </div>
  );
}
