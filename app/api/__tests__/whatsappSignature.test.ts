import { describe, it, expect, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";
import { POST } from "@/app/api/whatsapp/route";
import { __resetFrameForTest, getFrame } from "@/lib/frame/store";

const body = JSON.stringify({ entry: [{ changes: [{ value: {
  contacts: [{ profile: { name: "Kate" }, wa_id: "44" }],
  messages: [{ type: "text", from: "44", id: "wamid.sig", text: { body: "signed hello" } }],
} }] }] });
const sig = (secret: string, raw = body) => `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
const post = (headers: Record<string, string>) => POST(new Request("https://cv.example/api/whatsapp", { method: "POST", body, headers }));
const notes = async () => (await getFrame()).notes.map((n) => n.text);

afterEach(async () => { vi.unstubAllEnvs(); await __resetFrameForTest(); });

describe("WhatsApp webhook signature (X-Hub-Signature-256)", () => {
  it("with the app secret set, a correctly signed message is taken", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "app-secret");
    expect((await post({ "x-hub-signature-256": sig("app-secret") })).status).toBe(200);
    expect(await notes()).toContain("signed hello");
  });

  it("an unsigned or wrongly signed message is refused and not stored", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "app-secret");
    expect((await post({})).status).toBe(401);
    expect((await post({ "x-hub-signature-256": sig("someone-else") })).status).toBe(401);
    expect(await notes()).not.toContain("signed hello");
  });
});
