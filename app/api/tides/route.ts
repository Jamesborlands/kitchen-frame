import { fetchTides } from "@/lib/sources/tides";

export const revalidate = 3600;

function toYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function GET(): Promise<Response> {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const events = await fetchTides("9413745", toYYYYMMDD(now), toYYYYMMDD(tomorrow));
    return Response.json(events);
  } catch {
    return Response.json({ error: "tides unavailable" }, { status: 502 });
  }
}
