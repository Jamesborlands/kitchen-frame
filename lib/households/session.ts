// Signed cookies (edge-safe, Web Crypto).
//   cv_h     = "<household>.<version>.<sig>" — a family page signed in with its PIN.
//              The version is a prefix of the household's PIN hash, so resetting the
//              PIN signs old phones out (routes compare it with D1; middleware only
//              checks the signature).
//   cv_admin = "<sig>" over a hash of ADMIN_PIN — changing ADMIN_PIN signs the admin out.
const enc = new TextEncoder();

async function sign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  let s = "";
  for (const b of mac) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

function same(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function householdCookie(id: string, version: string, secret: string): Promise<string> {
  return `${id}.${version}.${await sign(`h:${id}:${version}`, secret)}`;
}

/** The household and PIN version a cookie was signed for, or null if it wasn't signed by us. */
export async function readHousehold(cookie: string | undefined, secret: string): Promise<{ id: string; version: string } | null> {
  const m = cookie?.match(/^([a-z0-9-]+)\.([0-9a-f]{1,64})\.([\w-]+)$/);
  if (!m) return null;
  return same(m[3], await sign(`h:${m[1]}:${m[2]}`, secret)) ? { id: m[1], version: m[2] } : null;
}

const adminVersion = async (adminPin: string) => (await sha256Hex(`admin-pin:${adminPin}`)).slice(0, 16);

export async function adminCookie(secret: string, adminPin: string): Promise<string> {
  return sign(`admin:${await adminVersion(adminPin)}`, secret);
}

export async function readAdmin(cookie: string | undefined, secret: string, adminPin: string | undefined): Promise<boolean> {
  return !!cookie && !!adminPin && same(cookie, await adminCookie(secret, adminPin));
}
