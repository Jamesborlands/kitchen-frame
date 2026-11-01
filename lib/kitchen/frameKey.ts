// The kitchen frame app authenticates with its own key (FRAME_KEY) rather than
// the family PIN: it never expires, and it can be revoked without changing the
// PIN. It opens only the frame's own endpoints — everything else stays PIN-only.
// Runs in edge middleware, so no node:crypto; the compare is constant-time by hand.

export const FRAME_KEY_PATHS = [
  "/api/kitchen/feed",
  "/api/kitchen/checkin",
  "/api/kitchen/upload",
  "/api/kitchen/release",
  "/api/kitchen/release/apk",
  "/api/photo",
  "/api/kitchen/photos",
  "/api/kitchen/photos/remove",
  "/api/kitchen/photos/love",
  "/api/kitchen/panels",
  "/api/kitchen/todos/toggle",
  "/api/kitchen/todos/add",
  "/api/kitchen/latest",
  "/api/kitchen/calendar",
  "/api/kitchen/route",
  "/api/kitchen/tile",
] as const;

export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function isFramePath(pathname: string): boolean {
  return (FRAME_KEY_PATHS as readonly string[]).includes(pathname);
}

export function frameKeyAllows(
  pathname: string,
  authorization: string | null,
  key: string | undefined,
): boolean {
  if (!key) return false;
  if (!isFramePath(pathname)) return false;
  if (!authorization?.startsWith("Bearer ")) return false;
  return safeEqual(authorization.slice("Bearer ".length), key);
}
