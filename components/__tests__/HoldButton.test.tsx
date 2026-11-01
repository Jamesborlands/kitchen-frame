import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { HoldButton } from "@/components/HoldButton";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("HoldButton", () => {
  it("only fires after being held for the full time", () => {
    const onConfirm = vi.fn();
    render(<HoldButton onConfirm={onConfirm}>Delete</HoldButton>);
    const b = screen.getByRole("button", { name: /delete/i });
    fireEvent.pointerDown(b);
    act(() => { vi.advanceTimersByTime(900); });
    expect(onConfirm).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("letting go early cancels", () => {
    const onConfirm = vi.fn();
    render(<HoldButton onConfirm={onConfirm}>Delete</HoldButton>);
    const b = screen.getByRole("button", { name: /delete/i });
    fireEvent.pointerDown(b);
    act(() => { vi.advanceTimersByTime(500); });
    fireEvent.pointerUp(b);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("a quick tap explains what to do", () => {
    render(<HoldButton onConfirm={() => {}}>Delete</HoldButton>);
    const b = screen.getByRole("button", { name: /delete/i });
    fireEvent.pointerDown(b);
    fireEvent.pointerUp(b);
    expect(screen.getByText(/keep holding/i)).toBeInTheDocument();
  });

  it("works from the keyboard by holding Enter", () => {
    const onConfirm = vi.fn();
    render(<HoldButton onConfirm={onConfirm}>Delete</HoldButton>);
    const b = screen.getByRole("button", { name: /delete/i });
    fireEvent.keyDown(b, { key: "Enter" });
    act(() => { vi.advanceTimersByTime(1100); });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("lets the page scroll when a swipe starts on it", () => {
    render(<HoldButton onConfirm={() => {}}>Delete</HoldButton>);
    expect(screen.getByRole("button", { name: /delete/i }).style.touchAction).toBe("manipulation");
  });

  it("a finger that moves (scrolling) cancels the hold", () => {
    const onConfirm = vi.fn();
    render(<HoldButton onConfirm={onConfirm}>Delete</HoldButton>);
    const b = screen.getByRole("button", { name: /delete/i });
    fireEvent.pointerDown(b, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(b, { clientX: 10, clientY: 40 });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("screen readers: activate, then activate again to confirm", () => {
    const onConfirm = vi.fn();
    render(<HoldButton onConfirm={onConfirm}>Delete</HoldButton>);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }), { detail: 0 });
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }), { detail: 0 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

