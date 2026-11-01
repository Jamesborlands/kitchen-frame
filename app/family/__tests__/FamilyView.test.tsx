import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { FamilyView, type FamilyData } from "@/app/family/FamilyView";
import { defaultSettings, type SettingsPatch } from "@/lib/family/settings";
import type { CalendarCheck } from "@/lib/family/calendars";

const NOW = Date.UTC(2026, 9, 12, 9, 0);
const data = (over: Partial<FamilyData> = {}): FamilyData => ({
  photos: [
    { id: "p1", url: "/api/photo?k=a.jpg", from: "Kate", caption: "beach day", at: NOW - 3_600_000 },
    { id: "p2", url: "/api/photo?k=b.jpg", from: "Tom", at: NOW - 86_400_000, hidden: true },
  ],
  notes: [{ id: "n1", text: "see you sunday", from: "Tom", at: NOW - 600_000 }],
  trash: [{ kind: "note", item: { id: "n0", text: "oops", from: "Peter", at: NOW - 7_200_000 }, deletedAt: NOW - 3_600_000 }],
  log: [
    { id: "n1", at: NOW - 600_000, kind: "note", from: "Tom", text: "see you sunday" },
    { id: "p1", at: NOW - 3_600_000, kind: "photo", from: "Kate", text: "beach day", url: "/api/photo?k=a.jpg" },
  ],
  settings: defaultSettings(),
  todos: [],
  frameLastSeen: NOW - 5 * 60_000,
  ...over,
});

function setup(over: Partial<FamilyData> = {}) {
  const actions = {
    onItem: vi.fn<(a: string, k: string, id: string) => Promise<void>>(async () => {}),
    onPatchSettings: vi.fn<(p: SettingsPatch) => Promise<void>>(async () => {}),
    onTodo: vi.fn<(action: "add" | "toggle" | "remove", value: string) => Promise<void>>(async () => {}),
    onSearchPlaces: vi.fn(async () => [{ name: "Bristol", where: "England, United Kingdom", latitude: 51.45, longitude: -2.59, timezone: "Europe/London" }]),
    onCheckCalendar: vi.fn<(url: string) => Promise<CalendarCheck>>(async () => ({ ok: true as const, events: [{ title: "Dentist", start: "2026-10-12T13:30:00.000Z", allDay: false }] })),
  };
  render(<FamilyView data={data(over)} now={NOW} {...actions} />);
  return actions;
}
const tab = (name: RegExp) => fireEvent.click(screen.getByRole("tab", { name }));

describe("FamilyView", () => {
  it("says when the frame was last seen", () => {
    setup();
    expect(screen.getByText(/frame last seen 5 min ago/i)).toBeInTheDocument();
  });

  it("warns when the frame has gone quiet", () => {
    setup({ frameLastSeen: NOW - 3 * 3_600_000 });
    expect(screen.getByText(/hasn't been in touch/i)).toBeInTheDocument();
  });

  describe("photos", () => {
    it("shows who sent each photo and when, and marks hidden ones", () => {
      setup();
      expect(screen.getByText(/from Kate/)).toBeInTheDocument();
      expect(screen.getByText("beach day")).toBeInTheDocument();
      expect(screen.getByText(/not on the frame/i)).toBeInTheDocument();
    });

    it("shows 60 at a time, with a button for older ones", () => {
      const photos = Array.from({ length: 130 }, (_, i) => ({ id: `p${i}`, url: `/api/photo?k=${i}.jpg`, from: "Kate", at: NOW - i * 60_000 }));
      setup({ photos });
      expect(screen.getAllByRole("button", { name: /hide from frame/i })).toHaveLength(60);
      fireEvent.click(screen.getByRole("button", { name: /show older photos/i }));
      expect(screen.getAllByRole("button", { name: /hide from frame/i })).toHaveLength(120);
      fireEvent.click(screen.getByRole("button", { name: /show older photos/i }));
      expect(screen.getAllByRole("button", { name: /hide from frame/i })).toHaveLength(130);
      expect(screen.queryByRole("button", { name: /show older photos/i })).toBeNull();
    }, 20_000); // renders 130 photo cards: slow under a full parallel run

    it("a photo with no known sender just shows when it came", () => {
      setup({ photos: [{ id: "x", url: "/u", from: "", at: NOW - 3_600_000 }] });
      expect(screen.queryByText(/^from\b/)).toBeNull();
      expect(screen.getByText(/12 Oct/)).toBeInTheDocument();
    });

    it("asks who sent a photo when nobody knows", async () => {
      const a = setup({ photos: [{ id: "x", url: "/u", from: "", at: NOW - 3_600_000 }] });
      fireEvent.change(screen.getByLabelText(/who sent this/i), { target: { value: "Kate" } });
      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
      await waitFor(() => expect(a.onItem).toHaveBeenCalledWith("setFrom", "photo", "x", "Kate"));
    });

    it("offers the family's names as one-tap buttons for who sent a photo", async () => {
      const a = setup({
        photos: [{ id: "x", url: "/u", from: "", at: NOW - 3_600_000 }, { id: "y", url: "/v", from: "Sophie", at: NOW - 7_200_000 }],
        notes: [{ id: "n1", text: "hi", from: "Tom", at: NOW }],
      });
      // from other photos and messages, and the people on the family clocks ("Anne & Peter" is two people)
      for (const n of ["Sophie", "Tom", "Kate", "Sam", "Anne", "Peter"]) expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Kate" }));
      await waitFor(() => expect(a.onItem).toHaveBeenCalledWith("setFrom", "photo", "x", "Kate"));
    });

    it("hide and show", () => {
      const a = setup();
      fireEvent.click(screen.getAllByRole("button", { name: /hide from frame/i })[0]);
      expect(a.onItem).toHaveBeenCalledWith("hide", "photo", "p1");
      fireEvent.click(screen.getByRole("button", { name: /show on frame/i }));
      expect(a.onItem).toHaveBeenCalledWith("show", "photo", "p2");
    });
  });

  describe("messages", () => {
    it("lists who sent what", () => {
      setup();
      tab(/messages/i);
      const log = screen.getByRole("list", { name: /who sent what/i });
      expect(within(log).getByText(/see you sunday/)).toBeInTheDocument();
      expect(within(log).getByText(/Kate/)).toBeInTheDocument();
    });
  });

  describe("messages after a delete", () => {
    it("shows who sent it, without what it was", () => {
      setup({ log: [{ id: "x", at: NOW - 60_000, kind: "photo", from: "Peter", deleted: true }] });
      tab(/messages/i);
      const log = screen.getByRole("list", { name: /who sent what/i });
      expect(within(log).getByText(/Peter/)).toBeInTheDocument();
      expect(within(log).getByText(/deleted/i)).toBeInTheDocument();
      expect(within(log).queryByRole("img")).toBeNull();
    });
  });

  describe("bin", () => {
    it("puts things back", () => {
      const a = setup();
      tab(/bin/i);
      fireEvent.click(screen.getByRole("button", { name: /put back/i }));
      expect(a.onItem).toHaveBeenCalledWith("restore", "note", "n0");
    });
  });

  describe("settings", () => {
    it("saves a new photo speed straight away", async () => {
      const a = setup();
      tab(/settings/i);
      fireEvent.change(screen.getByLabelText(/each photo stays/i), { target: { value: "60" } });
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalledWith({ photoSlideSec: 60 }));
      expect(await screen.findByText(/saved/i)).toBeInTheDocument();
    });

    it("adds a birthday straight away", async () => {
      const a = setup();
      tab(/settings/i);
      fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Gran" } });
      fireEvent.change(screen.getByLabelText(/^month$/i), { target: { value: "3" } });
      fireEvent.change(screen.getByLabelText(/^day$/i), { target: { value: "4" } });
      fireEvent.click(screen.getByRole("button", { name: /add date/i }));
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalledWith({ addOccasion: { name: "Gran", day: 4, month: 3, kind: "birthday" } }));
    });

    it("removes a birthday straight away", async () => {
      const a = setup();
      tab(/settings/i);
      const first = defaultSettings().occasions[0];
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`remove ${first.name}`, "i") }));
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalledWith({ removeOccasion: first }));
    });

    it("only offers days that exist in the chosen month", () => {
      setup();
      tab(/settings/i);
      fireEvent.change(screen.getByLabelText(/^month$/i), { target: { value: "2" } });
      const days = within(screen.getByLabelText(/^day$/i)).getAllByRole("option").map((o) => o.textContent);
      expect(days.at(-1)).toBe("29");
    });

    it("says so when a change couldn't be saved", async () => {
      const a = setup();
      a.onPatchSettings.mockRejectedValueOnce(new Error("offline"));
      tab(/settings/i);
      fireEvent.change(screen.getByLabelText(/each photo stays/i), { target: { value: "60" } });
      expect(await screen.findByText(/couldn't save/i)).toBeInTheDocument();
    });
  });

  describe("when something fails", () => {
    it("tells you, instead of doing nothing", async () => {
      const a = setup();
      a.onItem.mockRejectedValueOnce(new Error("offline"));
      fireEvent.click(screen.getAllByRole("button", { name: /hide from frame/i })[0]);
      expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't do that/i);
    });

    it("shows the button is working while it waits", async () => {
      const a = setup();
      let finish: () => void = () => {};
      a.onItem.mockImplementationOnce(() => new Promise<void>((r) => { finish = r; }));
      fireEvent.click(screen.getAllByRole("button", { name: /hide from frame/i })[0]);
      expect(await screen.findByRole("button", { name: /working/i })).toBeDisabled();
      finish();
      await waitFor(() => expect(screen.queryByRole("button", { name: /working/i })).toBeNull());
    });
  });

  describe("calendars", () => {
    it("checks a link, shows what's coming up, then adds it", async () => {
      const a = setup();
      tab(/calendars/i);
      fireEvent.change(screen.getByLabelText(/calendar name/i), { target: { value: "Mum" } });
      fireEvent.change(screen.getByLabelText(/calendar link/i), { target: { value: "webcal://p01-caldav.icloud.com/x" } });
      expect(screen.getByRole("button", { name: /add this calendar/i })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: /check it/i }));
      expect(await screen.findByText(/Dentist/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /add this calendar/i }));
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalledWith({
        addCalendar: { name: "Mum", url: "webcal://p01-caldav.icloud.com/x", color: expect.any(String) },
      }));
    });

    it("shows the reason a link didn't work", async () => {
      const a = setup();
      a.onCheckCalendar.mockResolvedValueOnce({ ok: false, error: "That link opens a web page, not a calendar." });
      tab(/calendars/i);
      fireEvent.change(screen.getByLabelText(/calendar link/i), { target: { value: "https://example.com" } });
      fireEvent.click(screen.getByRole("button", { name: /check it/i }));
      expect(await screen.findByText(/web page, not a calendar/)).toBeInTheDocument();
    });

    it("has step-by-step help for Google and Apple", () => {
      setup();
      tab(/calendars/i);
      expect(screen.getByText(/google calendar: how to get the link/i)).toBeInTheDocument();
      expect(screen.getByText(/iphone or ipad: how to get the link/i)).toBeInTheDocument();
    });
  });

  describe("reminders", () => {
    const tennis = { id: "r1", text: "Mum — tennis", time: "11:00", color: "#B0607A", repeat: { kind: "weekly" as const, days: [2], everyWeeks: 1 as const, from: "2026-10-13" } };

    it("lists them in plain words", () => {
      setup({ settings: { ...defaultSettings(), reminders: [tennis] } });
      tab(/reminders/i);
      expect(screen.getByText("Mum — tennis")).toBeInTheDocument();
      expect(screen.getByText(/tuesdays at 11am/i)).toBeInTheDocument();
    });

    it("adds a weekly one", async () => {
      const a = setup();
      tab(/reminders/i);
      fireEvent.change(screen.getByLabelText(/^what$/i), { target: { value: "Mum — tennis" } });
      fireEvent.click(screen.getByRole("radio", { name: /every week/i }));
      fireEvent.click(screen.getByRole("checkbox", { name: /^tue$/i }));
      fireEvent.change(screen.getByLabelText(/^time/i), { target: { value: "11:00" } });
      fireEvent.click(screen.getByRole("button", { name: /add reminder/i }));
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalledWith({
        addReminder: expect.objectContaining({ text: "Mum — tennis", time: "11:00", repeat: expect.objectContaining({ kind: "weekly", days: [2], everyWeeks: 1 }) }),
      }));
    });

    it("adds an every-other-week one (bins) from its first date", async () => {
      const a = setup();
      tab(/reminders/i);
      fireEvent.change(screen.getByLabelText(/^what$/i), { target: { value: "Bin day" } });
      fireEvent.click(screen.getByRole("radio", { name: /every other week/i }));
      fireEvent.change(screen.getByLabelText(/^(first )?date$/i), { target: { value: "2026-10-15" } });
      fireEvent.click(screen.getByRole("button", { name: /add reminder/i }));
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalledWith({
        addReminder: expect.objectContaining({ text: "Bin day", time: null, repeat: { kind: "weekly", days: [4], everyWeeks: 2, from: "2026-10-15" } }),
      }));
    });

    it("adds a one-off", async () => {
      const a = setup();
      tab(/reminders/i);
      fireEvent.change(screen.getByLabelText(/^what$/i), { target: { value: "Tom in town" } });
      fireEvent.click(screen.getByRole("radio", { name: /one day/i }));
      fireEvent.change(screen.getByLabelText(/^(first )?date$/i), { target: { value: "2026-10-17" } });
      fireEvent.click(screen.getByRole("button", { name: /add reminder/i }));
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalledWith({
        addReminder: expect.objectContaining({ repeat: { kind: "once", date: "2026-10-17" } }),
      }));
    });
  });

  describe("to-do", () => {
    it("adds and ticks", async () => {
      const a = setup({ todos: [{ id: "t1", text: "Ring the plumber", done: false, at: 1 }] });
      tab(/to-do/i);
      fireEvent.click(screen.getByRole("checkbox", { name: /ring the plumber/i }));
      await waitFor(() => expect(a.onTodo).toHaveBeenCalledWith("toggle", "t1"));
      fireEvent.change(screen.getByLabelText(/add to the list/i), { target: { value: "Buy stamps" } });
      fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
      await waitFor(() => expect(a.onTodo).toHaveBeenCalledWith("add", "Buy stamps"));
    });
  });

  describe("news switch", () => {
    it("turns headlines on for the frame", async () => {
      const a = setup();
      tab(/settings/i);
      fireEvent.click(screen.getByRole("checkbox", { name: /show news headlines/i }));
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalledWith({ showNews: true }));
    });
  });

  describe("settings: what's on the frame, and where", () => {
    it("switches a part of the frame off", async () => {
      const a = setup();
      tab(/settings/i);
      fireEvent.click(screen.getByRole("checkbox", { name: /photos/i }));
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalledWith({ modules: { ...defaultSettings().modules, photos: false } }));
    });

    it("lists the family clocks and removes one", async () => {
      const a = setup();
      tab(/settings/i);
      const places = screen.getByRole("list", { name: /family clocks/i });
      expect(within(places).getByText(/Edinburgh/)).toBeInTheDocument();
      fireEvent.click(within(places).getByRole("button", { name: /remove Edinburgh/i }));
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalledWith({ places: defaultSettings().places.filter((p) => p.label !== "Edinburgh") }));
    });

    it("adds a place found by name, with who's there", async () => {
      const a = setup({ settings: { ...defaultSettings(), places: [] } });
      tab(/settings/i);
      fireEvent.change(screen.getByLabelText(/^find a place$/i), { target: { value: "Bristol" } });
      fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
      fireEvent.change(screen.getByLabelText(/who's there/i), { target: { value: "Sophie" } });
      fireEvent.click(await screen.findByRole("button", { name: /add Bristol/i }));
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalledWith({
        places: [expect.objectContaining({ label: "Bristol", sublabel: "Sophie", timezone: "Europe/London" })],
      }));
    });
  });

  describe("moving someone", () => {
    it("Move → find the new town → pick it: same person, new place", async () => {
      const a = setup();
      tab(/settings/i);
      const places = screen.getByRole("list", { name: /family clocks/i });
      fireEvent.click(within(places).getByRole("button", { name: /move Kate/i }));
      fireEvent.change(screen.getByLabelText(/where to\?/i), { target: { value: "Bristol" } });
      fireEvent.click(screen.getByRole("button", { name: /^find$/i }));
      fireEvent.click(await screen.findByRole("button", { name: /move to Bristol/i }));
      await waitFor(() => expect(a.onPatchSettings).toHaveBeenCalled());
      const sent = (a.onPatchSettings.mock.calls.at(-1)![0] as { places: { label: string; sublabel: string; key: string }[] }).places;
      const kate = defaultSettings().places.find((p) => p.sublabel === "Kate")!;
      expect(sent.find((p) => p.key === kate.key)).toMatchObject({ label: "Bristol", sublabel: "Kate" });
      expect(sent).toHaveLength(defaultSettings().places.length);
    });
  });
});

