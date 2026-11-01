// GET /api/kitchen/panels — everything the frame's tap-to-open panels draw,
// already worded and formatted (the app keeps no weather logic). Additive to the
// feed contract: older app versions never ask for it.

export interface PanelHour { label: string; tempC: number; rainPct: number | null; icon: string }
export interface PanelDay { label: string; maxC: number; minC: number; icon: string }

export interface PanelNow {
  tempC: number;
  condition: string;
  feelsC: number;
  uv: number;
  sunrise: string; // "7:23am", the place's own clock
  sunset: string;
  icon: string;
}

export interface PanelPlace {
  key: string;
  label: string;
  sublabel: string;
  timeZone: string;
  sceneUrl?: string; // absent: no painting of this place
  now: PanelNow | null;
  days: PanelDay[];
  extra: { title: string; lines: string[] } | null; // Santa Cruz's sea & surf, Queenstown's snow
}

export interface PanelNote { id: string; text: string; from: string; at: number }

export interface PanelRides {
  days: { label: string; verdict: "great" | "good" | "ok" | "poor"; tempC: number; rainMm: number }[];
  best: string | null; // label of the best day, if any is at least "good"
  suggestion: { name: string; distance: string; note: string };
  routes: { id: number; name: string; kind: "chill ride" | "off-road" | "gravel" | "walk"; drive: boolean }[];
}

export interface KitchenPanels {
  generatedAt: number;
  calendar: import("@/lib/kitchen/feed/today").AgendaDay[]; // the next two weeks, days with something on
  rides: PanelRides | null;
  weather: { hours: PanelHour[]; days: PanelDay[] } | null; // home (Ludlow)
  places: PanelPlace[];
  notes: PanelNote[];
}
