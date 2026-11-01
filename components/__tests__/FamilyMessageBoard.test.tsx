import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseFrame = vi.fn();
vi.mock("@/lib/hooks/useFrame", () => ({ useFrame: () => mockUseFrame() }));
// stub the animated board with a plain element that exposes the text
vi.mock("@/components/ui/text-flipping-board", () => ({
  TextFlippingBoard: ({ text }: { text: string }) => <div data-testid="board">{text}</div>,
}));

import { FamilyMessageBoard } from "@/components/FamilyMessageBoard";

describe("FamilyMessageBoard", () => {
  it("shows the latest family note and the sender as a badge (not a text line)", () => {
    mockUseFrame.mockReturnValue({
      data: { photos: [], notes: [{ id: "2", text: "miss you all x", from: "Kate Hart", at: 2 }] },
    });
    render(<FamilyMessageBoard />);
    expect(screen.getByTestId("board").textContent).toBe("miss you all x");
    // the sender is a small badge, not a "- Kate" line on the board
    const badge = screen.getByTitle("Kate Hart");
    expect(badge.textContent).toBe("KH");
  });

  it("drifts through curated poems/trivia when there are no notes", async () => {
    const { BOARD_FILLERS } = await import("@/lib/frame/boardMessages");
    const { paginate, BOARD_ROWS, BOARD_COLS } = await import("@/lib/frame/boardText");
    mockUseFrame.mockReturnValue({ data: { photos: [], notes: [] } });
    render(<FamilyMessageBoard />);
    expect(BOARD_FILLERS.length).toBeGreaterThan(0);
    // the board shows the first page of the first filler, wrapped to fit
    expect(screen.getByTestId("board").textContent).toBe(
      paginate(BOARD_FILLERS[0], BOARD_COLS, BOARD_ROWS)[0],
    );
  });

  it("paginates a long message so nothing is silently dropped, sig kept", () => {
    const long =
      "thinking of you both, hope the garden is looking lovely this week and the roses have come through xx";
    mockUseFrame.mockReturnValue({
      data: { photos: [], notes: [{ id: "9", text: long, from: "Kate Hart", at: 9 }] },
    });
    render(<FamilyMessageBoard rowCount={2} cols={18} />);
    // first page shows the start of the message (not the whole thing on 2x18)
    expect(screen.getByTestId("board").textContent).toContain("thinking of");
  });
});
