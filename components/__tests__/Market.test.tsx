import { render, screen } from "@testing-library/react";
import { Market } from "@/components/Market";

test("renders ludlow market label", () => {
  render(<Market />);
  expect(screen.getByText(/market/i)).toBeInTheDocument();
});
