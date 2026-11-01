import { fetchAllNews } from "@/lib/sources/news";

export const revalidate = 1800;

export async function GET(): Promise<Response> {
  try {
    const items = await fetchAllNews();
    return Response.json(items);
  } catch {
    return Response.json([], { status: 502 });
  }
}
