"use client";
import { Section } from "@/components/Section";
import { useWildlife } from "@/lib/hooks/useWildlife";
import type { Sighting } from "@/lib/sources/wildlife";

const TAXON_COLOR: Record<string, string> = {
  Plantae:  "#6B7C6B",
  Aves:     "#6B8CA3",
  Insecta:  "#C09A6B",
  Mammalia: "#8B6F5C",
  Amphibia: "#7C9B6B",
  Reptilia: "#7C9B6B",
  Fungi:    "#B07A78",
};
const DEFAULT_TAXON_COLOR = "#78716C";

export function Wildlife() {
  const { data, error, isLoading } = useWildlife();

  const visible = (data ?? []).filter((s: Sighting) => s.photo).slice(0, 12);

  return (
    <Section label="plants & wildlife nearby">
      <p className="text-xs text-muted mb-4">recent sightings around Ludlow, via iNaturalist</p>
      {isLoading && !data && (
        <p className="text-muted text-sm">loading sightings…</p>
      )}
      {error && (
        <p className="text-muted text-sm">couldn&apos;t load wildlife data just now.</p>
      )}
      {!isLoading && !error && data && visible.length === 0 && (
        <p className="text-muted text-sm">no recent sightings found.</p>
      )}
      {data && visible.length > 0 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((sighting) => (
            <div key={sighting.id} className="rounded-2xl overflow-hidden border border-divider bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sighting.photo}
                alt={sighting.name}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <div className="p-2">
                <p className="text-xs font-medium leading-tight">{sighting.name}</p>
                <p className="text-xs text-muted italic leading-tight">{sighting.scientific}</p>
                {sighting.taxon && (
                  <span
                    className="inline-block mt-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: TAXON_COLOR[sighting.taxon] ?? DEFAULT_TAXON_COLOR }}
                    title={sighting.taxon}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
