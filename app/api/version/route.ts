// The deployed commit, so an always-on kitchen screen can notice a new deploy and
// reload itself. Null locally (no commit sha at build), which turns that check off.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json(
    { version: process.env.APP_VERSION || null },
    { headers: { "cache-control": "no-store" } },
  );
}
