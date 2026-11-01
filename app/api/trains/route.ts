import { fetchTrains } from "@/lib/sources/trains";

export const revalidate = 60;

export async function GET(): Promise<Response> {
  try {
    const board = await fetchTrains("LUD", "SHR", 6);
    return Response.json(board);
  } catch {
    return Response.json({ services: [], messages: [] }, { status: 502 });
  }
}
