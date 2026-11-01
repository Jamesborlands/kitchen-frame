import { fetchWaves } from "@/lib/sources/waves";

export const revalidate = 1800;

export async function GET(): Promise<Response> {
  try {
    const reading = await fetchWaves("46236");
    return Response.json(reading);
  } catch {
    return Response.json({ error: "waves unavailable" }, { status: 502 });
  }
}
