import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const love = vi.fn();
let photos: Array<Record<string, unknown>> = [];

vi.mock("@/lib/hooks/useFrame", () => ({
  useFrame: () => ({ data: { photos, notes: [] }, love }),
}));

import { PhotoPanel } from "@/components/kitchen/PhotoPanel";

const base = { url: "/a.webp", at: Date.now() - 2 * 3600_000, lovable: false, loved: false };

beforeEach(() => {
  love.mockReset();
  photos = [
    { ...base, id: "1", from: "Kate", lovable: true },
    { ...base, id: "2", from: "Sam" },
  ];
});

describe("PhotoPanel", () => {
  it("shows who sent the photo and when", () => {
    render(<PhotoPanel startIndex={0} />);
    expect(screen.getByText("Kate")).toBeInTheDocument();
    expect(screen.getByText(/2h ago · 1 of 2/)).toBeInTheDocument();
  });

  it("steps through photos with the arrows and by swiping", () => {
    render(<PhotoPanel startIndex={0} />);
    fireEvent.click(screen.getByRole("button", { name: "next photo" }));
    expect(screen.getByText("Sam")).toBeInTheDocument();
    const img = screen.getByAltText("photo from Sam").parentElement!.parentElement!;
    fireEvent.pointerDown(img, { clientX: 300 });
    fireEvent.pointerUp(img, { clientX: 500 });
    expect(screen.getByText("Kate")).toBeInTheDocument();
  });

  it("sends a heart for a lovable photo", async () => {
    love.mockResolvedValue(true);
    render(<PhotoPanel startIndex={0} />);
    fireEvent.click(screen.getByRole("button", { name: /send a heart/ }));
    expect(love).toHaveBeenCalledWith("1");
  });

  it("says when the heart couldn't be sent", async () => {
    love.mockResolvedValue(false);
    render(<PhotoPanel startIndex={0} />);
    fireEvent.click(screen.getByRole("button", { name: /send a heart/ }));
    expect(await screen.findByText(/couldn.t send the heart/)).toBeInTheDocument();
  });

  it("has no heart button when the photo can't be loved, and shows hearts already sent", () => {
    photos[1] = { ...photos[1], loved: true };
    render(<PhotoPanel startIndex={1} />);
    expect(screen.queryByRole("button", { name: /send a heart/ })).toBeNull();
    expect(screen.getByText("❤️ sent to Sam")).toBeInTheDocument();
  });
});
