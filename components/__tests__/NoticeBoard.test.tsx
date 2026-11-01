// components/__tests__/NoticeBoard.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseNotice = vi.fn();
vi.mock("@/lib/hooks/useNotice", () => ({ useNotice: () => mockUseNotice() }));

import { NoticeBoard } from "@/components/NoticeBoard";

describe("NoticeBoard", () => {
  it("shows the first card's label and title", () => {
    mockUseNotice.mockReturnValue({ cards: [
      { id: "a", kind: "aurora", label: "northern lights · edinburgh", title: "aurora possible tonight.", priority: 60 },
    ] });
    render(<NoticeBoard />);
    expect(screen.getByText(/northern lights/i)).toBeInTheDocument();
    expect(screen.getByText(/aurora possible tonight/i)).toBeInTheDocument();
  });

  it("renders nothing when there are no cards", () => {
    mockUseNotice.mockReturnValue({ cards: [] });
    const { container } = render(<NoticeBoard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("compact mode hides detail and clamps title to one line", () => {
    mockUseNotice.mockReturnValue({ cards: [
      { id: "b", kind: "poem", label: "a poem", title: "two lines\nof poetry", detail: "— the poet", priority: 50 },
    ] });
    render(<NoticeBoard compact />);
    expect(screen.getByText(/two lines/i)).toBeInTheDocument();
    expect(screen.queryByText(/the poet/i)).not.toBeInTheDocument();
  });

  it("on the kitchen, a tap shows the next card and links are dropped", () => {
    mockUseNotice.mockReturnValue({ cards: [
      { id: "a", kind: "history", label: "on this day", title: "first card", priority: 50, href: "https://example.com" },
      { id: "b", kind: "delight", label: "did you know", title: "second card", priority: 40 },
    ] });
    render(<NoticeBoard compact tapToAdvance />);
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "next card" }));
    expect(screen.getByText("second card")).toBeInTheDocument();
  });
});
