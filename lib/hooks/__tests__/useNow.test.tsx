import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useNow } from "@/lib/hooks/useNow";

describe("useNow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("advances on the interval", () => {
    const { result } = renderHook(() => useNow(1000));
    const first = result.current.getTime();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.getTime()).toBeGreaterThanOrEqual(first);
  });
});
