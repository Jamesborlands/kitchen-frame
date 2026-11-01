import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KitchenPanel } from "@/components/kitchen/KitchenPanel";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function open(onClose = vi.fn()) {
  render(
    <KitchenPanel title="weather in ludlow" onClose={onClose} idleMs={45_000}>
      <p>forecast</p>
    </KitchenPanel>,
  );
  return onClose;
}

describe("KitchenPanel", () => {
  it("shows its content in a dialog", () => {
    open();
    expect(screen.getByRole("dialog", { name: "weather in ludlow" })).toHaveTextContent("forecast");
  });

  it("closes from the close button or a tap outside", () => {
    const onClose = open();
    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("doesn't close on a tap inside", () => {
    const onClose = open();
    fireEvent.click(screen.getByText("forecast"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes itself when nobody touches it", () => {
    const onClose = open();
    act(() => { vi.advanceTimersByTime(44_000); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("a touch restarts the idle timer", () => {
    const onClose = open();
    act(() => { vi.advanceTimersByTime(40_000); });
    fireEvent.pointerDown(screen.getByText("forecast"));
    act(() => { vi.advanceTimersByTime(40_000); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

function Broken(): never {
  throw new Error("boom");
}

describe("KitchenPanel errors", () => {
  it("keeps a broken card inside the panel", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <KitchenPanel title="santa cruz" onClose={vi.fn()}>
        <Broken />
      </KitchenPanel>,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(/couldn.t load this just now/);
    spy.mockRestore();
  });
});
