import { DELIGHT } from "@/lib/notice/content/delight";

// Shown on the message board when there are no family messages — the curated
// poems & trivia, so the board always has something lovely to flip through.
// Poems carry their attribution; trivia stands alone.
export const BOARD_FILLERS: string[] = DELIGHT.map((d) =>
  d.label === "a poem" && d.detail ? `${d.title}\n- ${d.detail}` : d.title,
);
