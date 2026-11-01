import { PREMADE_ROUTES, HOUSE } from "@/lib/map/routes";

describe("PREMADE_ROUTES", () => {
  it("is non-empty", () => {
    expect(PREMADE_ROUTES.length).toBeGreaterThan(0);
  });

  it("each entry has a non-empty name", () => {
    for (const route of PREMADE_ROUTES) {
      expect(typeof route.name).toBe("string");
      expect(route.name.length).toBeGreaterThan(0);
    }
  });

  it("each entry has a non-empty profile", () => {
    for (const route of PREMADE_ROUTES) {
      expect(typeof route.profile).toBe("string");
      expect(route.profile.length).toBeGreaterThan(0);
    }
  });

  it("each entry has at least 2 waypoints", () => {
    for (const route of PREMADE_ROUTES) {
      expect(route.waypoints.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("HOUSE is exported as [lat, lon] tuple", () => {
    expect(HOUSE).toEqual([52.369, -2.7165]);
  });

  it("local routes start from HOUSE", () => {
    const LOCAL_NAMES = [
      "Whitcliffe Common loop",
      "Teme riverside & Ludford Bridge",
      "Ludlow town circular",
      "Teme valley to Tenbury Wells",
      "Clee Hill climb",
    ];
    for (const name of LOCAL_NAMES) {
      const route = PREMADE_ROUTES.find((r) => r.name === name);
      expect(route, `route not found: ${name}`).toBeDefined();
      expect(route!.waypoints[0]).toEqual(HOUSE);
    }
  });

  it("drive routes have drive === true", () => {
    const DRIVE_NAMES = [
      "Mortimer Forest (off-road)",
      "Titterstone Clee Hill",
      "Long Mynd: Carding Mill Valley",
      "Hopton Titterhill MTB",
      "Corve Dale lanes",
    ];
    for (const name of DRIVE_NAMES) {
      const route = PREMADE_ROUTES.find((r) => r.name === name);
      expect(route, `route not found: ${name}`).toBeDefined();
      expect(route!.drive).toBe(true);
    }
  });
});
