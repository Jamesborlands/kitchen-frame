import { describe, it, expect, beforeEach } from "vitest";
import { testDb } from "@/lib/db/testing";
import { __setDbForTest } from "@/lib/db/d1";
import {
  addFrame, createHousehold, getHousehold, householdForFrameKey, householdForPhoneNumberId, householdForPin,
  listHouseholds, setPin, setWhatsApp, updateHouseholdSettings,
} from "@/lib/households/repo";
import { LUDLOW_DEFAULTS, defaultSettingsFor } from "@/lib/households/defaults";

const SECRET = "test-session-secret";

beforeEach(() => { __setDbForTest(testDb()); });

describe("households", () => {
  it("creates one with its settings and reads it back", async () => {
    await createHousehold({ id: "ludlow", name: "Anne & Peter", settings: LUDLOW_DEFAULTS() }, 1);
    const h = await getHousehold("ludlow");
    expect(h).toMatchObject({ id: "ludlow", name: "Anne & Peter", waPhoneNumberId: null });
    expect(h!.settings.home.label).toBe("Ludlow");
    expect(h!.settings.places.map((p) => p.label)).toEqual(["Ludlow", "Edinburgh", "Santa Cruz", "Queenstown"]);
    expect(h!.settings.places.find((p) => p.key === "santaCruz")!.extra).toBe("marine");
    expect(h!.settings.modules).toEqual({ clocks: true, today: true, todos: true, rides: true, board: true, photos: true });
    expect(await listHouseholds()).toEqual([{ id: "ludlow", name: "Anne & Peter" }]);
  });

  it("a new household starts with just its home and every module on except rides", async () => {
    const s = defaultSettingsFor({ label: "Bristol", latitude: 51.45, longitude: -2.59, timezone: "Europe/London" });
    expect(s.places.map((p) => p.label)).toEqual(["Bristol"]);
    expect(s.modules.rides).toBe(false); // the rides content is Ludlow's for now
    expect(s.occasions).toEqual([]);
  });

  it("refuses a bad or duplicate id", async () => {
    await createHousehold({ id: "ludlow", name: "A", settings: LUDLOW_DEFAULTS() }, 1);
    await expect(createHousehold({ id: "ludlow", name: "B", settings: LUDLOW_DEFAULTS() }, 1)).rejects.toThrow();
    await expect(createHousehold({ id: "Not OK!", name: "B", settings: LUDLOW_DEFAULTS() }, 1)).rejects.toThrow(/id/);
  });

  it("finds a household by its PIN, and PINs must differ between households", async () => {
    await createHousehold({ id: "ludlow", name: "A", settings: LUDLOW_DEFAULTS() }, 1);
    await createHousehold({ id: "bristol", name: "B", settings: LUDLOW_DEFAULTS() }, 1);
    await setPin("ludlow", "4321", SECRET);
    expect(await householdForPin("4321", SECRET)).toBe("ludlow");
    expect(await householdForPin("0000", SECRET)).toBeNull();
    await expect(setPin("bristol", "4321", SECRET)).rejects.toThrow(/in use/);
    const row = await (await import("@/lib/db/d1")).db().prepare("SELECT pin_hash FROM households WHERE id='ludlow'").first<{ pin_hash: string }>();
    expect(row!.pin_hash).not.toContain("4321"); // only a hash is kept
  });

  it("finds a household by frame key and by WhatsApp number", async () => {
    await createHousehold({ id: "ludlow", name: "A", settings: LUDLOW_DEFAULTS() }, 1);
    await addFrame("ludlow", "frame-key-1", "kitchen", 1);
    expect(await householdForFrameKey("frame-key-1")).toBe("ludlow");
    expect(await householdForFrameKey("nope")).toBeNull();
    await setWhatsApp("ludlow", "123456789");
    expect(await householdForPhoneNumberId("123456789")).toBe("ludlow");
    expect((await getHousehold("ludlow"))!.waPhoneNumberId).toBe("123456789");
  });

  it("settings changes are merged and sanitized", async () => {
    await createHousehold({ id: "ludlow", name: "A", settings: LUDLOW_DEFAULTS() }, 1);
    const s = await updateHouseholdSettings("ludlow", { photoSlideSec: 45, modules: { clocks: false } });
    expect(s.photoSlideSec).toBe(45);
    expect(s.modules.clocks).toBe(false);
    expect(s.modules.today).toBe(true);
    expect((await getHousehold("ludlow"))!.settings.photoSlideSec).toBe(45);
  });
});
