export interface WaveReading {
  waveHeightFt: number | null;
  periodSec: number | null;
  directionDeg: number | null;
  waterTempF: number | null;
}

export function buildWavesUrl(station: string): string {
  return `https://www.ndbc.noaa.gov/data/realtime2/${station}.txt`;
}

function parseMaybeNumber(value: string): number | null {
  if (value === "MM" || value.trim() === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

export function parseWaves(text: string): WaveReading {
  const lines = text.split("\n");
  const dataLines = lines.filter((l) => l.trim().length > 0 && !l.startsWith("#"));

  if (dataLines.length === 0) {
    return { waveHeightFt: null, periodSec: null, directionDeg: null, waterTempF: null };
  }

  // Columns (0-based):
  // 0:YY 1:MM 2:DD 3:hh 4:mm 5:WDIR 6:WSPD 7:GST 8:WVHT 9:DPD 10:APD 11:MWD 12:PRES 13:ATMP 14:WTMP
  const cols = dataLines[0].trim().split(/\s+/);

  const wvhtRaw = cols[8] ?? "MM";
  const dpdRaw = cols[9] ?? "MM";
  const mwdRaw = cols[11] ?? "MM";
  const wtmpRaw = cols[14] ?? "MM";

  const wvhtM = parseMaybeNumber(wvhtRaw);
  const dpd = parseMaybeNumber(dpdRaw);
  const mwd = parseMaybeNumber(mwdRaw);
  const wtmpC = parseMaybeNumber(wtmpRaw);

  return {
    waveHeightFt: wvhtM !== null ? Math.round(wvhtM * 3.28084 * 10) / 10 : null,
    periodSec: dpd,
    directionDeg: mwd,
    waterTempF: wtmpC !== null ? Math.round((wtmpC * 9 / 5 + 32) * 10) / 10 : null,
  };
}

export async function fetchWaves(station: string): Promise<WaveReading> {
  const res = await fetch(buildWavesUrl(station));
  if (!res.ok) throw new Error(`waves ${res.status}`);
  return parseWaves(await res.text());
}
