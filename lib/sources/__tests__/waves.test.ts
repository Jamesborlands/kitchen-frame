import { describe, it, expect } from "vitest";
import { buildWavesUrl, parseWaves } from "@/lib/sources/waves";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fixtureText = readFileSync(
  resolve(__dirname, "../__fixtures__/ndbc-46236.txt"),
  "utf-8"
);

describe("buildWavesUrl", () => {
  it("builds the correct NDBC realtime URL for a given station", () => {
    const url = buildWavesUrl("46236");
    expect(url).toBe("https://www.ndbc.noaa.gov/data/realtime2/46236.txt");
  });
});

describe("parseWaves", () => {
  it("reads the FIRST data row (not the second)", () => {
    const reading = parseWaves(fixtureText);
    // First data row has WVHT=1.2m → 1.2*3.28084 ≈ 3.9 ft
    expect(reading.waveHeightFt).toBeCloseTo(3.9, 0);
  });

  it("converts wave height from metres to feet (1 dp)", () => {
    const reading = parseWaves(fixtureText);
    expect(reading.waveHeightFt).toBeCloseTo(1.2 * 3.28084, 1);
  });

  it("reads period in seconds as a number", () => {
    const reading = parseWaves(fixtureText);
    expect(reading.periodSec).toBe(12);
  });

  it("reads direction in degrees as a number", () => {
    const reading = parseWaves(fixtureText);
    expect(reading.directionDeg).toBe(270);
  });

  it("converts water temperature from °C to °F (1 dp)", () => {
    const reading = parseWaves(fixtureText);
    // WTMP=18.5°C → 18.5*9/5+32 = 65.3°F
    expect(reading.waterTempF).toBeCloseTo(18.5 * 9 / 5 + 32, 1);
  });

  it("returns null for MM (missing) fields", () => {
    // Craft a reading with MM in WVHT (index 8)
    const mmText = `#YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE
#yr  mo dy hr mn degT m/s  m/s     m   sec   sec degT   hPa  degC  degC  degC  nmi  hPa    ft
2026 06 23 12 00  280  5.0  6.0    MM  12.0   8.5 270 1013.5  20.0  18.5  14.0   MM   MM    MM\n`;
    const r = parseWaves(mmText);
    expect(r.waveHeightFt).toBeNull();
  });

  it("returns all-null WaveReading when there are no data lines", () => {
    const headerOnly = `#YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE\n#yr  mo dy hr mn degT m/s  m/s     m   sec   sec degT   hPa  degC  degC  degC  nmi  hPa    ft\n`;
    const r = parseWaves(headerOnly);
    expect(r.waveHeightFt).toBeNull();
    expect(r.periodSec).toBeNull();
    expect(r.directionDeg).toBeNull();
    expect(r.waterTempF).toBeNull();
  });
});
