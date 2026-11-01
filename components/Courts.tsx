import { Section } from "@/components/Section";
import { COURTS } from "@/lib/content/courts";

export function Courts() {
  return (
    <Section label="tennis & pickleball">
      <div className="grid gap-4 sm:grid-cols-2">
        {COURTS.map((c) => (
          <div key={c.name} className="rounded-2xl border border-divider bg-card p-4">
            <p className="font-medium">
              {c.url ? (
                <a href={c.url} className="underline-offset-2 hover:underline">
                  {c.name}
                </a>
              ) : (
                c.name
              )}
            </p>
            <p className="mt-1 text-sm text-muted">{c.note}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
