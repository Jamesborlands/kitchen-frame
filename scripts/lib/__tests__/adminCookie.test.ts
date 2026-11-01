import { describe, it, expect } from "vitest";
import { adminCookieValue } from "../adminCookie.mjs";
import { adminCookie, readAdmin } from "@/lib/households/session";

describe("scripts' admin cookie", () => {
  it("is exactly what the server signs and accepts", async () => {
    expect(adminCookieValue("s3cret", "12345678")).toBe(await adminCookie("s3cret", "12345678"));
    expect(await readAdmin(adminCookieValue("s3cret", "12345678"), "s3cret", "12345678")).toBe(true);
    expect(await readAdmin(adminCookieValue("s3cret", "12345678"), "s3cret", "87654321")).toBe(false);
  });
});
