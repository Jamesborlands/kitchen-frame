import { type BinSchedule } from "@/lib/bins";

// The demo household's collections (a simple configured rule, no council
// scraping). Set this once with the real collection day + fortnightly rotation
// and the dashboard computes the next collection forever. Set it to null and
// the "bin day" section stays hidden.
//
// Example (Tuesday collections, general one week / recycling the next, garden weekly):
//   export const BIN_SCHEDULE: BinSchedule | null = {
//     weekday: 2,                 // 0=Sun … 6=Sat
//     anchor: "2026-06-23",       // a date that is a known "general waste" (week A) Tuesday
//     types: [
//       { name: "general waste", week: "A" },
//       { name: "recycling", week: "B" },
//       { name: "garden", week: "every" },
//     ],
//   };
export const BIN_SCHEDULE: BinSchedule | null = {
  weekday: 4, // Thursday
  anchor: "2026-06-25", // a "general waste" (week A) Thursday
  types: [
    { name: "general waste", week: "A" },
    { name: "recycling", week: "B" },
    { name: "garden", week: "B" },
  ],
};
