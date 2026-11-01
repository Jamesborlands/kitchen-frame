// "updated 2h ago" for data the kitchen is still showing after its feed went quiet
// (Wi-Fi drop, API outage). SWR keeps the last good data on error, so without this
// an old reading looks current. Fresh data (under the threshold) gets no label.

export const STALE_AFTER_MS = 30 * 60_000;

export function staleLabel(fetchedAt: number | undefined, now: number): string | null {
  if (fetchedAt === undefined) return null;
  const age = now - fetchedAt;
  if (age < STALE_AFTER_MS) return null;
  const mins = Math.floor(age / 60_000);
  if (mins < 60) return `updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `updated ${hrs}h ago`;
  return `updated ${Math.floor(hrs / 24)} days ago`;
}
