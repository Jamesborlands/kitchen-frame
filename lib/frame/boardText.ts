// Text layout for the split-flap board: word-wrap to a fixed column width and
// paginate into board-sized pages. Shared by the board renderer
// (text-flipping-board) and the message feeder (FamilyMessageBoard) so the
// wrap that paginate() reasons about is exactly the wrap that renders.

// Default board dimensions — the full departure board. The kitchen passes a
// smaller rows/cols.
export const BOARD_ROWS = 6;
export const BOARD_COLS = 22;

function wrapParagraph(paragraph: string, maxCols: number): string[] {
  const lines: string[] = [];
  const words = paragraph.split(/[ \t]+/).filter(Boolean);
  let currentLine = "";
  for (const word of words) {
    if (word.length > maxCols) {
      // a single word longer than the board: hard-break it across lines
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      let rest = word;
      while (rest.length > maxCols) {
        lines.push(rest.slice(0, maxCols));
        rest = rest.slice(maxCols);
      }
      currentLine = rest;
      continue;
    }
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxCols) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/** Wrap text into lines no wider than maxCols, honouring explicit newlines. */
export function wrapText(input: string, maxCols: number): string[] {
  return input
    .split("\n")
    .flatMap((paragraph) =>
      paragraph.trim() === "" ? [""] : wrapParagraph(paragraph, maxCols),
    );
}

/**
 * Split text into board-sized pages (each up to `rows` wrapped lines). A
 * message longer than one board flips through several pages in sequence rather
 * than being silently cut off. If it would exceed `maxPages`, the final page
 * ends with an ellipsis so the truncation is visible, never silent.
 */
export function paginate(
  text: string,
  cols: number,
  rows: number,
  maxPages = 4,
): string[] {
  const lines = wrapText(text, cols);
  const pageLines: string[][] = [];
  for (let i = 0; i < lines.length && pageLines.length < maxPages; i += rows) {
    pageLines.push(lines.slice(i, i + rows));
  }

  // Widow control: never leave a single trailing line (e.g. a lone "- Sam")
  // by itself on the last page — pull the line above it down for company.
  const last = pageLines[pageLines.length - 1];
  if (rows >= 2 && pageLines.length >= 2 && last && last.length === 1) {
    const prev = pageLines[pageLines.length - 2];
    if (prev.length > 1) {
      last.unshift(prev.pop() as string);
    }
  }

  const pages = pageLines.map((pl) => pl.join("\n"));
  if (lines.length > maxPages * rows && pages.length > 0) {
    const tailLines = pages[pages.length - 1].split("\n");
    const tail = tailLines[tailLines.length - 1] ?? "";
    tailLines[tailLines.length - 1] = `${tail.slice(0, Math.max(0, cols - 1)).trimEnd()}…`;
    pages[pages.length - 1] = tailLines.join("\n");
  }
  return pages.length > 0 ? pages : [""];
}
