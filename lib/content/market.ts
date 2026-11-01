export interface MarketStatus {
  onToday: boolean;
  todayLabel: string | null;
  nextLabel: string;
}

// Ludlow Market's regular days in Castle Square (9am–4pm), per ludlowmarket.co.uk.
const MARKET_DAYS = ["Mon", "Wed", "Fri", "Sat"];
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL: Record<string, string> = { Mon: "Monday", Wed: "Wednesday", Fri: "Friday", Sat: "Saturday" };

export function marketStatus(now: Date): MarketStatus {
  const weekday = Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    timeZone: "Europe/London",
  }).format(now);

  // The next market day strictly after today
  const i = WEEK.indexOf(weekday);
  let next = "Mon";
  for (let d = 1; d <= 7; d++) {
    const w = WEEK[(i + d) % 7];
    if (MARKET_DAYS.includes(w)) { next = w; break; }
  }
  const nextLabel = `next: ${FULL[next]}`;

  if (MARKET_DAYS.includes(weekday)) {
    return { onToday: true, todayLabel: "today, til 4pm", nextLabel };
  }

  return {
    onToday: false,
    todayLabel: null,
    nextLabel,
  };
}
