import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Section } from "@/components/Section";

describe("Section", () => {
  it("renders an uppercase label and children", () => {
    render(<Section label="today"><p>hello</p></Section>);
    expect(screen.getByText("today")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
