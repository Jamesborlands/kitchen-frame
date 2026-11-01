import { fetchFloodWarnings, fetchRiverLevels } from "@/lib/sources/flood";

export const revalidate = 900;

const LAT = 52.3675;
const LONG = -2.7181;

export async function GET(): Promise<Response> {
  try {
    const [warnings, rivers] = await Promise.all([
      fetchFloodWarnings(LAT, LONG, 15),
      fetchRiverLevels(LAT, LONG, 8),
    ]);
    return Response.json({ warnings, rivers });
  } catch {
    return Response.json({ warnings: [], rivers: [] }, { status: 502 });
  }
}
