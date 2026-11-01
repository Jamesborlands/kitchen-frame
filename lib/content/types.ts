export type PlaceCategory = "walk" | "cycle" | "ski" | "dayout" | "court";

export interface Place {
  name: string;
  distance: string;
  note: string;
  category: PlaceCategory;
  url?: string;
}
