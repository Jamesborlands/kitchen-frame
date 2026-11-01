export interface Sighting {
  id: number;       // iNaturalist observation ID
  name: string;
  scientific: string;
  taxon: string;
  photo?: string;
  lat: number;
  lng: number;
  when?: string;
}

export function buildWildlifeUrl(lat: number, lng: number, radiusKm: number): string {
  return `https://api.inaturalist.org/v1/observations?lat=${lat}&lng=${lng}&radius=${radiusKm}&per_page=48&order_by=observed_on&photos=true&geo=true&quality_grade=research`;
}

export function parseWildlife(json: unknown): Sighting[] {
  const data = json as { results?: unknown[] };
  const results = Array.isArray(data?.results) ? data.results : [];

  return results
    .slice(0, 48)
    .filter((r) => {
      const result = r as { geojson?: { coordinates?: unknown[] } | null; taxon?: unknown };
      return result.taxon && result.geojson && Array.isArray(result.geojson.coordinates);
    })
    .map((r) => {
      const result = r as {
        id: number;                          // ← add this line
        taxon: {
          name: string;
          preferred_common_name?: string;
          iconic_taxon_name?: string;
        };
        geojson: { coordinates: [number, number] };
        photos?: { url: string }[];
        observed_on_string?: string;
      };

      const coords = result.geojson.coordinates;
      const rawPhotoUrl = result.photos?.[0]?.url;
      const photo = rawPhotoUrl ? rawPhotoUrl.replace(/\/square\./, "/small.") : undefined;

      return {
        id: result.id,
        name: result.taxon.preferred_common_name ?? result.taxon.name,
        scientific: result.taxon.name,
        taxon: result.taxon.iconic_taxon_name ?? "",
        photo,
        lat: coords[1],
        lng: coords[0],
        when: result.observed_on_string,
      };
    });
}

export async function fetchWildlife(lat: number, lng: number, radiusKm: number): Promise<Sighting[]> {
  const res = await fetch(buildWildlifeUrl(lat, lng, radiusKm));
  if (!res.ok) throw new Error(`wildlife ${res.status}`);
  const json: unknown = await res.json();
  return parseWildlife(json);
}
