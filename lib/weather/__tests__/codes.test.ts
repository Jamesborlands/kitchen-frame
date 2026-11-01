import { describe, it, expect } from "vitest";
import { describeWeather, isGoldenHour, isNight, skyKey, lightPhase } from "@/lib/weather/codes";
import { wallClockMinutes } from "@/lib/time/clocks";

describe("describeWeather", () => {
  it("maps clear sky", () => {
    expect(describeWeather(0)).toEqual({ label: "clear sky", watercolor: "clear" });
  });
  it("maps overcast", () => {
    expect(describeWeather(3).watercolor).toBe("overcast");
  });
  it("maps fog", () => {
    expect(describeWeather(45).watercolor).toBe("fog");
  });
  it("maps drizzle and rain to rain", () => {
    expect(describeWeather(53).watercolor).toBe("rain");
    expect(describeWeather(65).watercolor).toBe("rain");
    expect(describeWeather(81).watercolor).toBe("rain");
  });
  it("maps snow", () => {
    expect(describeWeather(73).watercolor).toBe("snow");
    expect(describeWeather(85).watercolor).toBe("snow");
  });
  it("maps thunderstorm to storm", () => {
    expect(describeWeather(95).watercolor).toBe("storm");
    expect(describeWeather(99).watercolor).toBe("storm");
  });
  it("falls back gracefully for unknown codes", () => {
    expect(describeWeather(1234)).toEqual({ label: "unsettled", watercolor: "cloud" });
  });
});

describe("isGoldenHour", () => {
  // Sunrise at 05:00 = 300 min, sunset at 20:00 = 1200 min
  const sunriseMin = 5 * 60;   // 300
  const sunsetMin = 20 * 60;   // 1200
  it("is true within 40 min before sunset", () => {
    expect(isGoldenHour(19 * 60 + 30, sunriseMin, sunsetMin)).toBe(true); // 1170, delta=30
  });
  it("is true within 40 min after sunrise", () => {
    expect(isGoldenHour(5 * 60 + 20, sunriseMin, sunsetMin)).toBe(true);  // 320, delta=20
  });
  it("is false at midday", () => {
    expect(isGoldenHour(12 * 60, sunriseMin, sunsetMin)).toBe(false);      // 720, far from both
  });
  it("is false just outside the 40-min window", () => {
    expect(isGoldenHour(5 * 60 + 41, sunriseMin, sunsetMin)).toBe(false);  // 341, delta=41
  });
  it("is true at exactly the 40-min boundary", () => {
    expect(isGoldenHour(5 * 60 + 40, sunriseMin, sunsetMin)).toBe(true);   // 340, delta=40
  });
});

describe("wallClockMinutes + isGoldenHour integration", () => {
  // Ludlow sunset on 2026-06-23 is "2026-06-23T21:24" (BST = UTC+1 → 20:24 UTC).
  // A US viewer at 20:10 UTC is mid-afternoon local time but only 14 min before Ludlow sunset.
  // Parsing the naive string: sunsetMin = 21*60+24 = 1284.
  // wallClockMinutes("Europe/London", 20:10 UTC) = 21:10 BST = 21*60+10 = 1270. delta = 14 → golden.
  it("detects golden near Ludlow sunset for a US viewer mid-afternoon UTC", () => {
    const nowUTC = new Date("2026-06-23T20:10:00Z"); // mid-afternoon for US, near Ludlow sunset
    const sunriseStr = "2026-06-23T04:51";
    const sunsetStr  = "2026-06-23T21:24";
    const sunriseMin = Number(sunriseStr.slice(11, 13)) * 60 + Number(sunriseStr.slice(14, 16));
    const sunsetMin  = Number(sunsetStr.slice(11, 13)) * 60 + Number(sunsetStr.slice(14, 16));
    const nowMin = wallClockMinutes("Europe/London", nowUTC);
    expect(nowMin).toBe(21 * 60 + 10); // 1270 BST
    expect(isGoldenHour(nowMin, sunriseMin, sunsetMin)).toBe(true);
  });

  it("correctly rejects midday UTC as non-golden for Ludlow", () => {
    const nowUTC = new Date("2026-06-23T12:00:00Z"); // 13:00 BST, far from sunrise/sunset
    const sunriseMin = 4 * 60 + 51;  // "04:51" from naive string
    const sunsetMin  = 21 * 60 + 24; // "21:24" from naive string
    const nowMin = wallClockMinutes("Europe/London", nowUTC);
    expect(isGoldenHour(nowMin, sunriseMin, sunsetMin)).toBe(false);
  });
});

describe("isNight", () => {
  // Sunrise 05:30 = 330 min, sunset 21:30 = 1290 min
  it("returns true before sunrise (05:00 < 05:30)", () => {
    expect(isNight(300, 330, 1290)).toBe(true);
  });
  it("returns true after sunset (21:40 > 21:30)", () => {
    expect(isNight(1300, 330, 1290)).toBe(true);
  });
  it("returns false at midday (12:00)", () => {
    expect(isNight(720, 330, 1290)).toBe(false);
  });
});

describe("lightPhase", () => {
  // sunrise 05:00 = 300, sunset 20:00 = 1200
  const sr = 300, ss = 1200;
  it("is sunrise within the golden window around sunrise", () => {
    expect(lightPhase(320, sr, ss)).toBe("sunrise"); // 20 min after
    expect(lightPhase(270, sr, ss)).toBe("sunrise"); // 30 min before
  });
  it("is sunset within the golden window around sunset", () => {
    expect(lightPhase(1180, sr, ss)).toBe("sunset"); // 20 min before
  });
  it("is twilight just outside golden on the night side", () => {
    expect(lightPhase(230, sr, ss)).toBe("twilight"); // 70 min before sunrise (within 40+35)
    expect(lightPhase(1265, sr, ss)).toBe("twilight"); // 65 min after sunset
  });
  it("is day in the middle", () => {
    expect(lightPhase(720, sr, ss)).toBe("day");
  });
  it("is night well before sunrise and well after sunset", () => {
    expect(lightPhase(120, sr, ss)).toBe("night");
    expect(lightPhase(1350, sr, ss)).toBe("night");
  });
});

describe("skyKey", () => {
  it("uses the light-phase scene when the sky is clear/cloud", () => {
    expect(skyKey(0, "sunrise")).toBe("sunrise");
    expect(skyKey(2, "sunset")).toBe("sunset");
    expect(skyKey(0, "twilight")).toBe("twilight");
  });
  it("returns night regardless of weather at night", () => {
    expect(skyKey(0, "night")).toBe("night");
    expect(skyKey(65, "night")).toBe("night");
  });
  it("does not override rain/storm with a light-phase scene", () => {
    expect(skyKey(65, "sunset")).toBe("rain");
    expect(skyKey(95, "sunrise")).toBe("storm");
  });
  it("defaults to the plain weather scene in daytime", () => {
    expect(skyKey(0, "day")).toBe("clear");
    expect(skyKey(3)).toBe("overcast");
  });
});
