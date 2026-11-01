import type { TideEvent } from "@/lib/sources/tides";

export function nextTides(
  events: TideEvent[],
  now: Date,
): { nextHigh?: TideEvent; nextLow?: TideEvent } {
  let nextHigh: TideEvent | undefined;
  let nextLow: TideEvent | undefined;

  for (const event of events) {
    const eventTime = new Date(event.time.replace(" ", "T"));
    if (eventTime < now) continue;

    if (event.type === "high" && nextHigh === undefined) {
      nextHigh = event;
    } else if (event.type === "low" && nextLow === undefined) {
      nextLow = event;
    }

    if (nextHigh !== undefined && nextLow !== undefined) break;
  }

  return { ...(nextHigh !== undefined ? { nextHigh } : {}), ...(nextLow !== undefined ? { nextLow } : {}) };
}
