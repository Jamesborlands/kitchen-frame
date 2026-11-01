import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { testDb } from "@/lib/db/testing";
import { __setDbForTest } from "@/lib/db/d1";
import { __useD1ForTest, frameStore, householdTodos } from "@/lib/households/data";
import { addFrame, createHousehold } from "@/lib/households/repo";
import { LUDLOW_DEFAULTS } from "@/lib/households/defaults";
import { GET as photos } from "@/app/api/kitchen/photos/route";
import { POST as removePhoto } from "@/app/api/kitchen/photos/remove/route";
import { POST as toggleTodo } from "@/app/api/kitchen/todos/toggle/route";

const as = (key: string, body?: unknown) => new Request("https://cv.example/x", {
  method: body ? "POST" : "GET",
  headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
  body: body ? JSON.stringify(body) : undefined,
});

beforeEach(async () => {
  __setDbForTest(testDb());
  __useD1ForTest(true);
  vi.stubEnv("FRAME_KEY", "parents-key");
  vi.stubEnv("SESSION_SECRET", "s");
  for (const id of ["ludlow", "bristol"]) await createHousehold({ id, name: id, settings: LUDLOW_DEFAULTS() }, 1);
  await addFrame("bristol", "bristol-key", "kitchen", 1);
  await frameStore("ludlow").addPhoto({ url: "/p/parents.jpg", from: "Mum" });
  await frameStore("bristol").addPhoto({ url: "/p/sophie.jpg", from: "Sophie" });
  await householdTodos("ludlow").add("Ring the plumber");
});
afterEach(() => { __useD1ForTest(null); vi.unstubAllEnvs(); });

describe("each frame sees only its own household", () => {
  it("photos", async () => {
    const urls = async (key: string) => ((await (await photos(as(key))).json()) as { photos: { url: string }[] }).photos.map((p) => p.url);
    expect(await urls("parents-key")).toEqual(["/p/parents.jpg"]);
    expect(await urls("bristol-key")).toEqual(["/p/sophie.jpg"]);
    expect((await photos(as("nobodys-key"))).status).toBe(401);
  });

  it("can't remove another household's photo or tick its to-do", async () => {
    const [parents] = (await frameStore("ludlow").getFrame(Date.now())).photos;
    expect((await removePhoto(as("bristol-key", { id: parents.id }))).status).toBe(404);
    expect((await frameStore("ludlow").getFrame(Date.now())).photos).toHaveLength(1);
    const [todo] = await householdTodos("ludlow").list();
    expect((await toggleTodo(as("bristol-key", { id: todo.id }))).status).toBe(404);
    expect((await toggleTodo(as("parents-key", { id: todo.id }))).status).toBe(200);
  });
});
