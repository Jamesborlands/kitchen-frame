import { type Occasion } from "@/lib/occasions";

// Family birthdays, anniversaries and one-off dates to look forward to.
// Fill this in and the dashboard counts down to the next ones. `year` is
// optional — add it to show an age (birthday) or a count (anniversary).
// Until there's at least one entry, the section stays hidden.
//
// Example:
//   export const OCCASIONS: Occasion[] = [
//     { name: "Kate", month: 7, day: 6, kind: "birthday", year: 1998 },
//     { name: "Sam", month: 1, day: 10, kind: "birthday" },
//     { name: "Anne & Peter's anniversary", month: 9, day: 3, kind: "anniversary", year: 1988 },
//     { name: "everyone home for Christmas", month: 12, day: 24, kind: "event", year: 2026 },
//   ];
export const OCCASIONS: Occasion[] = [
  { name: "Anne", month: 3, day: 12, kind: "birthday", year: 1962 },
  { name: "Peter", month: 11, day: 7, kind: "birthday", year: 1960 },
  { name: "Kate", month: 6, day: 18, kind: "birthday", year: 1990 },
  { name: "Tom", month: 2, day: 3, kind: "birthday", year: 1993 },
  { name: "Sam", month: 10, day: 22, kind: "birthday", year: 1988 },
];

