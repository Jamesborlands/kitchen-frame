/** Muted colours that sit with the notice card palette (calendars, reminders); the first is the default. */
export const CALENDAR_COLORS = ["#4E6A8E", "#B0607A", "#5E7E5E", "#A0703A", "#7A5E8E", "#5E6E7E"] as const;

export function pickColor(x: unknown): string {
  return (CALENDAR_COLORS as readonly string[]).includes(x as string) ? (x as string) : CALENDAR_COLORS[0];
}
