import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WatercolorScene } from "@/components/WatercolorScene";

describe("WatercolorScene", () => {
  it("renders the img with the correct src and alt", () => {
    render(<WatercolorScene sceneKey="clear" alt="clear sky" />);
    const img = screen.getByAltText("clear sky") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/watercolor/clear.webp");
  });

  it("shows the wash fallback by default (before load)", () => {
    render(<WatercolorScene sceneKey="clear" alt="clear sky" />);
    expect(screen.getByTestId("watercolor-fallback")).toBeInTheDocument();
  });

  it("hides the wash fallback after a successful load", () => {
    render(<WatercolorScene sceneKey="clear" alt="clear sky" />);
    const img = screen.getByAltText("clear sky");
    fireEvent.load(img);
    expect(screen.queryByTestId("watercolor-fallback")).not.toBeInTheDocument();
  });

  it("keeps the wash fallback visible after an error", () => {
    render(<WatercolorScene sceneKey="missing" alt="missing scene" />);
    const img = screen.getByAltText("missing scene");
    fireEvent.error(img);
    expect(screen.getByTestId("watercolor-fallback")).toBeInTheDocument();
  });

  it("reveals the image with no wash when it is already cached/complete on mount", () => {
    // Cached/fast images finish loading before React attaches onLoad, so the
    // load event never fires. The ref callback must detect complete-on-mount.
    const completeSpy = vi
      .spyOn(HTMLImageElement.prototype, "complete", "get")
      .mockReturnValue(true);
    const naturalWidthSpy = vi
      .spyOn(HTMLImageElement.prototype, "naturalWidth", "get")
      .mockReturnValue(800);
    try {
      render(<WatercolorScene sceneKey="clear" alt="clear sky" />);
      expect(screen.queryByTestId("watercolor-fallback")).not.toBeInTheDocument();
    } finally {
      completeSpy.mockRestore();
      naturalWidthSpy.mockRestore();
    }
  });
});
