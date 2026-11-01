import { describe, it, expect, beforeEach } from "vitest";
import { POST as familyTodos } from "@/app/api/family/todos/route";
import { POST as frameToggle } from "@/app/api/kitchen/todos/toggle/route";
import { GET as family } from "@/app/api/family/route";
import { getTodos, updateTodos } from "@/lib/family/todos";
import { frameKeyAllows } from "@/lib/kitchen/frameKey";

const post = (fn: (r: Request) => Promise<Response>, body: unknown) =>
  fn(new Request("https://cv.example/x", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

beforeEach(async () => { await updateTodos(() => []); });

describe("to-dos on /family", () => {
  it("adds, ticks, removes; GET /api/family includes them", async () => {
    const added = await (await post(familyTodos, { action: "add", text: "Ring the plumber" })).json();
    const id = added.todos[0].id;
    expect((await (await family()).json()).todos.map((t: { text: string }) => t.text)).toEqual(["Ring the plumber"]);
    await post(familyTodos, { action: "toggle", id });
    expect((await getTodos())[0].done).toBe(true);
    await post(familyTodos, { action: "remove", id });
    expect(await getTodos()).toEqual([]);
  });

  it("rejects nonsense", async () => {
    expect((await post(familyTodos, "{bad")).status).toBe(400);
    expect((await post(familyTodos, { action: "add", text: 4 })).status).toBe(400);
    expect((await post(familyTodos, { action: "nuke" })).status).toBe(400);
  });
});

describe("ticking from the frame", () => {
  it("toggles by id, behind the frame key", async () => {
    expect(frameKeyAllows("/api/kitchen/todos/toggle", "Bearer k", "k")).toBe(true);
    const list = await updateTodos((l) => [...l, { id: "t1", text: "Stamps", done: false, at: 1 }]);
    expect(list).toHaveLength(1);
    expect((await post(frameToggle, { id: "t1" })).status).toBe(200);
    expect((await getTodos())[0].done).toBe(true);
    expect((await post(frameToggle, { id: "nope" })).status).toBe(404);
  });
});
