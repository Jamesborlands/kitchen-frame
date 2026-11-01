export type CallHint = "good" | "maybe" | "asleep";

export function wallClockMinutes(timezone: string, at: Date): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(at)) parts[p.type] = p.value;
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);
  return hour * 60 + Number(parts.minute);
}

export interface ClockReading {
  time: string;     // "1:00"
  suffix: string;   // "am" | "pm"
  dayLabel: string; // "Tue"
  hour24: number;
  callHint: CallHint;
}

function partsFor(timezone: string, at: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "numeric", minute: "2-digit", hour12: false,
    weekday: "short",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(at)) out[p.type] = p.value;
  return out;
}

// Hours (local to the clock) when the kitchen shows a small moon — "probably asleep".
export const ASLEEP_HOURS = { startHour: 23, endHour: 7 } as const;

function classify(hour24: number): CallHint {
  if (hour24 >= 9 && hour24 < 21) return "good";
  if (
    (hour24 >= ASLEEP_HOURS.endHour && hour24 < 9) ||
    (hour24 >= 21 && hour24 < ASLEEP_HOURS.startHour)
  ) return "maybe";
  return "asleep";
}

export function readClock(timezone: string, at: Date): ClockReading {
  const parts = partsFor(timezone, at);
  const hour24 = Number(parts.hour === "24" ? "0" : parts.hour);
  const minute = parts.minute;
  const suffix = hour24 < 12 ? "am" : "pm";
  let h12 = hour24 % 12;
  if (h12 === 0) h12 = 12;
  return {
    time: `${h12}:${minute}`,
    suffix,
    dayLabel: parts.weekday,
    hour24,
    callHint: classify(hour24),
  };
}

export const HINT_COPY: Record<CallHint, string> = {
  good: "good time to call",
  maybe: "maybe early or late",
  asleep: "probably asleep",
};
