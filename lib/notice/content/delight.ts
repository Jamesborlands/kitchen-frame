export interface DelightItem {
  label: "a poem" | "did you know";
  title: string;   // the poem lines (use \n) or the trivia line
  detail?: string; // attribution or follow-up
}

// A small curated pool — calm, family/seasonal/local in flavour. Extend freely.
export const DELIGHT: DelightItem[] = [
  { label: "a poem", title: "and all at once, summer collapsed into fall.", detail: "Oscar Wilde" },
  { label: "a poem", title: "the woods are lovely, dark and deep,\nbut I have promises to keep.", detail: "Robert Frost" },
  { label: "a poem", title: "to see a world in a grain of sand,\nand a heaven in a wild flower.", detail: "William Blake" },
  { label: "did you know", title: "Prince Arthur, Henry VIII's elder brother, died at Ludlow Castle in 1502." },
  { label: "did you know", title: "the Broad Gate, at the bottom of Broad Street, is the last of Ludlow's medieval town gates still standing." },
  { label: "did you know", title: "the Feathers Hotel's carved timber-framed front dates from the early 1600s." },
  { label: "did you know", title: "St Laurence's in Ludlow is one of the largest parish churches in England — the poet A. E. Housman's ashes are buried there." },
  { label: "did you know", title: "Ludford Bridge has carried the road over the Teme since the 15th century." },
  { label: "did you know", title: "Mortimer Forest, just west of Ludlow, is home to a rare herd of long-haired fallow deer." },
  { label: "did you know", title: "Ludlow Food Festival, held in the castle grounds each September, began in 1995." },
  { label: "did you know", title: "Queenstown sits on the shore of Lake Wakatipu, beneath the peaks of the Remarkables." },
  { label: "did you know", title: "the Giant Dipper on the Santa Cruz boardwalk has been running since 1924." },
];
