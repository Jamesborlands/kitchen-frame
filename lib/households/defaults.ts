// Starting settings for a household. The original household's (ludlow) are exactly what
// the frame shows today; a new household starts with just its own home.
import { defaultSettings, sanitizePlace, type FamilySettings } from "@/lib/family/settings";

export const LUDLOW_DEFAULTS = (): FamilySettings => defaultSettings();

export function defaultSettingsFor(home: { label: string; latitude: number; longitude: number; timezone: string; sublabel?: string }): FamilySettings {
  const place = sanitizePlace({ key: "home", sublabel: "", watercolor: "", extra: null, ...home });
  if (!place) throw new Error("home needs a name, coordinates and a time zone");
  return {
    ...defaultSettings(),
    occasions: [],
    calendars: [],
    reminders: [],
    home: place,
    places: [place],
    modules: { clocks: true, today: true, todos: true, rides: false, board: true, photos: true },
  };
}
