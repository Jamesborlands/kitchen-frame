import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseNews = vi.fn();

vi.mock("@/lib/hooks/useNews", () => ({
  useNews: () => mockUseNews(),
}));

import { News } from "@/components/News";

const SAMPLE_ITEMS = [
  {
    title: "Ludlow council approves new development",
    link: "https://www.ludlowadvertiser.co.uk/article1",
    published: "Mon, 22 Jun 2026 12:00:00 GMT",
    image: undefined,
  },
  {
    title: "Road closures on A36 this week",
    link: "https://www.ludlowadvertiser.co.uk/article2",
    published: "Sun, 21 Jun 2026 10:00:00 GMT",
    image: undefined,
  },
];

describe("News with items", () => {
  it("renders the section label", () => {
    mockUseNews.mockReturnValue({ items: SAMPLE_ITEMS, error: undefined, isLoading: false });
    render(<News />);
    expect(screen.getByText(/ludlow news/i)).toBeInTheDocument();
  });

  it("shows each news headline", () => {
    mockUseNews.mockReturnValue({ items: SAMPLE_ITEMS, error: undefined, isLoading: false });
    render(<News />);
    expect(screen.getByText(/ludlow council approves/i)).toBeInTheDocument();
    expect(screen.getByText(/road closures/i)).toBeInTheDocument();
  });

  it("shows formatted published dates", () => {
    mockUseNews.mockReturnValue({ items: SAMPLE_ITEMS, error: undefined, isLoading: false });
    render(<News />);
    expect(screen.getByText(/22 Jun/i)).toBeInTheDocument();
  });

  it("renders links with correct href", () => {
    mockUseNews.mockReturnValue({ items: SAMPLE_ITEMS, error: undefined, isLoading: false });
    render(<News />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "https://www.ludlowadvertiser.co.uk/article1");
  });
});

describe("News with empty list", () => {
  it("renders the section label with empty list", () => {
    mockUseNews.mockReturnValue({ items: [], error: undefined, isLoading: false });
    render(<News />);
    expect(screen.getByText(/ludlow news/i)).toBeInTheDocument();
  });
});

describe("News loading state", () => {
  it("shows loading text when items is undefined", () => {
    mockUseNews.mockReturnValue({ items: undefined, error: undefined, isLoading: true });
    render(<News />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows error text on failure", () => {
    mockUseNews.mockReturnValue({ items: undefined, error: new Error("fail"), isLoading: false });
    render(<News />);
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
  });
});
