import { Section } from "@/components/Section";
import { marketStatus } from "@/lib/content/market";

export function Market() {
  const m = marketStatus(new Date());
  return (
    <Section label="ludlow market">
      <p className="text-muted">
        {m.onToday ? `on today — ${m.todayLabel}` : m.nextLabel}
      </p>
    </Section>
  );
}
