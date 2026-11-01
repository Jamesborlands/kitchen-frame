import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PhotoFrame } from "@/components/PhotoFrame";

// Mock the useFrame hook
vi.mock("@/lib/hooks/useFrame", () => ({
  useFrame: () => ({
    data: {
      photos: [
        {
          id: "1",
          url: "/watercolor/bramble.webp",
          from: "Sam",
          caption: "morning swim",
          at: Date.now(),
        },
        {
          id: "2",
          url: "/watercolor/place-ludlow.webp",
          from: "Kate",
          caption: "thinking of home",
          at: Date.now() - 3600_000,
        },
      ],
      notes: [
        {
          id: "3",
          text: "thinking of you all x",
          from: "Kate",
          at: Date.now(),
        },
      ],
    },
  }),
}));

describe("PhotoFrame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a photo img with the first photo src", () => {
    render(<PhotoFrame />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/watercolor/bramble.webp");
  });

  it("shows the sender via the initials badge (no full-name strip)", () => {
    render(<PhotoFrame />);
    // sender is the top-right badge (title = full name), not a bottom name line
    expect(screen.getByTitle("Sam")).toBeInTheDocument();
  });

  it("renders note text", () => {
    render(<PhotoFrame />);
    expect(screen.getByText(/thinking of you all x/i)).toBeInTheDocument();
  });

  it("renders note sender name", () => {
    render(<PhotoFrame />);
    // Note card renders "Kate"
    const kateEls = screen.getAllByText(/kate/i);
    expect(kateEls.length).toBeGreaterThan(0);
  });

  it("on the kitchen, a swipe steps to the next photo and a tap opens it", () => {
    const onOpenPhoto = vi.fn();
    render(<PhotoFrame fill onOpenPhoto={onOpenPhoto} />);
    const photo = screen.getByTestId("photo-frame-photo");
    fireEvent.pointerDown(photo, { clientX: 500 });
    fireEvent.pointerUp(photo, { clientX: 300 });
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.getByAltText("thinking of home")).toBeInTheDocument();
    expect(onOpenPhoto).not.toHaveBeenCalled();

    fireEvent.pointerDown(photo, { clientX: 300 });
    fireEvent.pointerUp(photo, { clientX: 305 });
    expect(onOpenPhoto).toHaveBeenCalledWith(1);
  });
});

import { initials } from "@/lib/initials";

describe("initials", () => {
  it("makes sender initials from a name", () => {
    expect(initials("Sam Hart")).toBe("SH");
    expect(initials("Anne Hart")).toBe("AH");
    expect(initials("Tom")).toBe("TO");
    expect(initials("  ")).toBe("·");
  });
});
