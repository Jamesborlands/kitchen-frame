import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StatusView, lastSeenLabel } from "@/app/kitchen/status/StatusView";

const checkin = { versionCode: 3, uptimeS: 7200, lastFeedOkAt: 1000, freeMemMb: 310, wifiRssi: -60, tailscaleUp: true, lastError: null, at: 0 };

describe("lastSeenLabel", () => {
  it("reads naturally", () => {
    expect(lastSeenLabel(null, 0)).toBe("never");
    expect(lastSeenLabel(0, 30_000)).toBe("just now");
    expect(lastSeenLabel(0, 5 * 60_000)).toBe("5 min ago");
    expect(lastSeenLabel(0, 3 * 3_600_000)).toBe("3h ago");
  });
});

describe("StatusView", () => {
  it("shows the last check-in and flags a quiet frame", () => {
    render(<StatusView status={{ checkin, pendingCommand: null, debug: { screenshotAt: null, logsAt: null } }} onCommand={() => {}} now={60 * 60_000} />);
    expect(screen.getByText(/last seen 60 min ago/i)).toBeInTheDocument();
    expect(screen.getByText(/hasn't checked in/i)).toBeInTheDocument();
    expect(screen.getByText(/version 3/i)).toBeInTheDocument();
  });

  it("queues a command when a button is pressed", () => {
    const onCommand = vi.fn();
    render(<StatusView status={{ checkin, pendingCommand: null, debug: { screenshotAt: null, logsAt: null } }} onCommand={onCommand} now={60_000} />);
    fireEvent.click(screen.getByRole("button", { name: "screenshot" }));
    expect(onCommand).toHaveBeenCalledWith("screenshot");
  });

  it("says when a command is waiting", () => {
    render(<StatusView status={{ checkin, pendingCommand: "update", debug: { screenshotAt: null, logsAt: null } }} onCommand={() => {}} now={60_000} />);
    expect(screen.getByText(/waiting: update/i)).toBeInTheDocument();
  });

  it("copes with a frame that has never checked in", () => {
    render(<StatusView status={{ checkin: null, pendingCommand: null, debug: { screenshotAt: null, logsAt: null } }} onCommand={() => {}} now={0} />);
    expect(screen.getByText(/last seen never/i)).toBeInTheDocument();
  });
});
