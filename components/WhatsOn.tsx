"use client";
import { Section } from "@/components/Section";
import { useEvents } from "@/lib/hooks/useEvents";
import { VENUES } from "@/lib/content/venues";

function VenueLinks() {
  return (
    <div className="mt-5 pt-3 border-t border-divider">
      <p className="section-label mb-2">at the local venues</p>
      <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5">
        {VENUES.map((v) => (
          <li key={v.name} className="text-sm leading-snug">
            <a
              href={v.url}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {v.name}
            </a>
            <span className="text-xs text-muted"> — {v.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WhatsOn() {
  const { items, error } = useEvents();

  return (
    <Section label="what's on">
      {!items ? (
        <p className="text-muted">
          {error ? "couldn't load what's on right now." : "loading…"}
        </p>
      ) : items.length === 0 ? (
        <p className="text-muted">nothing local listed just now.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          {items.slice(0, 6).map((item, i) => {
            const date = new Date(item.published);
            const formattedDate = isNaN(date.getTime())
              ? null
              : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
            return (
              <li key={i} className="flex gap-3 items-start">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    className="rounded w-14 h-14 object-cover flex-shrink-0"
                  />
                )}
                <div>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline text-sm leading-snug"
                  >
                    {item.title}
                  </a>
                  {item.description && (
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  {formattedDate && (
                    <p className="text-xs text-muted mt-0.5">{formattedDate}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <VenueLinks />
    </Section>
  );
}
