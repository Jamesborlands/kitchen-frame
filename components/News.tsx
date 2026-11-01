"use client";
import { Section } from "@/components/Section";
import { useNews } from "@/lib/hooks/useNews";

export function News() {
  const { items, error } = useNews();

  if (!items) {
    return (
      <Section label="ludlow news">
        <p className="text-muted">
          {error ? "couldn't load the news right now." : "loading…"}
        </p>
      </Section>
    );
  }

  return (
    <Section label="ludlow news">
      <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
        {items.slice(0, 4).map((item, i) => {
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
                {formattedDate && (
                  <p className="text-xs text-muted mt-0.5">{formattedDate}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
