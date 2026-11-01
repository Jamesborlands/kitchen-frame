
// Curated local theatres & venues. Live show-listing feeds don't exist for
// these, so we link to each venue's own what's-on page — always reliable, and
// it covers the shows the news feed doesn't catch.

export interface Venue {
  name: string;
  note: string;
  url: string;
}

export const VENUES: Venue[] = [
  {
    name: "Ludlow Assembly Rooms",
    note: "cinema, live music, comedy & theatre",
    url: "https://www.ludlowassemblyrooms.co.uk/",
  },
  {
    name: "Ludlow Castle",
    note: "summer concerts, open-air theatre & festivals",
    url: "https://www.ludlowcastle.com/",
  },
  {
    name: "Ludlow Food Festival",
    note: "the September food festival in the castle",
    url: "https://www.foodfestival.co.uk/",
  },
  {
    name: "Ludlow Market",
    note: "specialist markets — producers, antiques & crafts",
    url: "https://www.ludlowmarket.co.uk/",
  },
];
