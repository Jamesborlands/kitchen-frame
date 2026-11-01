import { describe, it, expect, afterEach } from "vitest";
import { bindings, __setBindingsForTest } from "@/lib/cloudflare/bindings";

afterEach(() => __setBindingsForTest(null));

describe("bindings", () => {
  it("is empty outside Cloudflare", () => {
    expect(bindings()).toEqual({});
  });
  it("can be faked in tests", () => {
    const fake = { FRAME: { get: async () => null, put: async () => {}, delete: async () => {} } };
    __setBindingsForTest(fake);
    expect(bindings()).toBe(fake);
  });
});
