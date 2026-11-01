import { Section } from "@/components/Section";
import { suggestionForDate } from "@/lib/content/suggestion";

const CATEGORY_VERB: Record<string, string> = {
  walk: "a walk for today", cycle: "a ride for today",
  ski: "if you fancy the slopes", dayout: "a day out idea",
};

export function SuggestionOfDay({ date = new Date() }: { date?: Date }) {
  const place = suggestionForDate(date);
  return (
    <Section label={CATEGORY_VERB[place.category] ?? "today's idea"}>
      <div className="rounded-2xl border border-divider bg-card p-6">
        <h2 className="text-2xl">{place.name}</h2>
        <p className="mt-1 text-muted">{place.note}</p>
        <p className="mt-3 text-xs text-muted">{place.distance}</p>
      </div>
    </Section>
  );
}
