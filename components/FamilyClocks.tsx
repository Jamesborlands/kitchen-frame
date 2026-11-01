"use client";
import { Section } from "@/components/Section";
import { FamilyClockCard } from "@/components/FamilyClockCard";
import { FAMILY_LOCATIONS, type GeoLocation } from "@/lib/config";
import { useNow } from "@/lib/hooks/useNow";

export function FamilyClocks({ onSelect }: { onSelect?: (location: GeoLocation) => void }) {
  const now = useNow();
  return (
    <Section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FAMILY_LOCATIONS.map((loc) => (
          <FamilyClockCard key={loc.key} location={loc} now={now} onSelect={onSelect} />
        ))}
      </div>
    </Section>
  );
}
