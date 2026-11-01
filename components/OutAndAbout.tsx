import { Section } from "@/components/Section";
import { WALKS, CYCLING, DAYS_OUT, type Place } from "@/lib/content/suggestion";

function PlaceList({ places }: { places: Place[] }) {
  return (
    <ul className="space-y-1.5">
      {places.map((p) => (
        <li key={p.name} className="border-b border-divider pb-1.5 last:border-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm">
              {p.url ? <a href={p.url} className="underline-offset-2 hover:underline">{p.name}</a> : p.name}
            </span>
            <span className="shrink-0 text-xs text-muted">{p.distance}</span>
          </div>
          <p className="text-xs text-muted leading-snug">{p.note}</p>
        </li>
      ))}
    </ul>
  );
}

export function OutAndAbout() {
  return (
    <Section label="out & about">
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
        <div><h3 className="text-lg mb-2">walks</h3><PlaceList places={WALKS} /></div>
        <div><h3 className="text-lg mb-2">cycling</h3><PlaceList places={CYCLING} /></div>
        <div><h3 className="text-lg mb-2">local life</h3><PlaceList places={DAYS_OUT} /></div>
      </div>
    </Section>
  );
}
