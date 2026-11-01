"use client";
import { Section } from "@/components/Section";
import { useTrains } from "@/lib/hooks/useTrains";

export function Trains() {
  const { data, error } = useTrains();

  if (!data) {
    return (
      <Section label="trains to london">
        <p className="text-muted text-sm">
          {error ? "couldn't load trains." : "loading…"}
        </p>
      </Section>
    );
  }

  const { services, messages } = data;

  const strikeMessages = messages.filter((m) =>
    /strike/i.test(m),
  );
  const otherMessages = messages.filter((m) =>
    !/strike/i.test(m),
  );
  const displayMessages = [...strikeMessages, ...otherMessages].slice(0, 2);

  return (
    <Section label="trains to london">
      <p className="section-label mb-3 text-muted">ludlow → shrewsbury</p>

      {services.length === 0 ? (
        <p className="text-muted text-sm">no departures found.</p>
      ) : (
        <ul className="space-y-1">
          {services.slice(0, 4).map((s, i) => {
            const isOnTime = s.etd === "On time";
            return (
              <li key={i} className="flex items-baseline gap-2 text-sm">
                <span className="font-medium tabular-nums">{s.std}</span>
                <span className="text-muted">→</span>
                {isOnTime ? (
                  <span className="text-muted">on time</span>
                ) : (
                  <span className="text-sage">{s.etd.toLowerCase()}</span>
                )}
                {s.platform !== "—" && (
                  <span className="text-muted">· plat {s.platform}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {displayMessages.length > 0 && (
        <div className="mt-4 rounded border border-divider bg-card px-3 py-2 space-y-1">
          {displayMessages.map((m, i) => {
            const isStrike = /strike/i.test(m);
            return (
              <p key={i} className="text-muted text-xs leading-relaxed">
                {isStrike && (
                  <span className="text-sage font-medium mr-1">⚠ strike action —</span>
                )}
                {m}
              </p>
            );
          })}
        </div>
      )}
    </Section>
  );
}
