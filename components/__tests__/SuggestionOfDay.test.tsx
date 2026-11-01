import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SuggestionOfDay } from "@/components/SuggestionOfDay";
import { suggestionForDate } from "@/lib/content/suggestion";

describe("SuggestionOfDay", () => {
  it("shows the deterministic suggestion for the given date", () => {
    const date = new Date("2026-06-23T08:00:00Z");
    render(<SuggestionOfDay date={date} />);
    expect(screen.getByText(suggestionForDate(date).name)).toBeInTheDocument();
  });
});
