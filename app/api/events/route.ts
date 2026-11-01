import { fetchEvents } from "@/lib/sources/events";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  try {
    const items = await fetchEvents();
    return Response.json(items);
  } catch {
    return Response.json([], { status: 502 });
  }
}
