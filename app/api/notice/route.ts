import { aggregateNotices } from "@/lib/notice/aggregate";
import { buildContext } from "@/lib/notice/card";

export const revalidate = 1800; // 30 min

export async function GET(): Promise<Response> {
  try {
    const cards = await aggregateNotices(buildContext());
    return Response.json(cards);
  } catch {
    return Response.json([], { status: 502 });
  }
}
