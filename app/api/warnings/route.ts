import { fetchWarnings } from "@/lib/sources/warnings";

export const revalidate = 900; // 15 min

export async function GET(): Promise<Response> {
  try {
    return Response.json(await fetchWarnings());
  } catch {
    return Response.json([], { status: 502 });
  }
}
