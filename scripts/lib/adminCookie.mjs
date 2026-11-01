// The admin cookie the server expects (lib/households/session.ts): HMAC-SHA256 of
// "admin:<first 16 hex of sha256('admin-pin:' + ADMIN_PIN)>" with SESSION_SECRET,
// base64url without padding.
import { createHash, createHmac } from "node:crypto";

export function adminCookieValue(secret, adminPin) {
  const version = createHash("sha256").update(`admin-pin:${adminPin}`).digest("hex").slice(0, 16);
  return createHmac("sha256", secret).update(`admin:${version}`).digest("base64url");
}
