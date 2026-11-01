import { describe, it, expect, beforeEach } from "vitest";
import { testDb } from "@/lib/db/testing";
import { __setDbForTest, type D1Like } from "@/lib/db/d1";
import { todosFor } from "@/lib/family/todosD1";
import { DONE_KEEP_MS } from "@/lib/family/todos";

const T = 1_800_000_000_000;
let db: D1Like;

beforeEach(async () => {
  db = testDb();
  __setDbForTest(db);
  for (const id of ["ludlow", "bristol"]) await db.prepare("INSERT INTO households (id, name, created_at) VALUES (?, ?, 1)").bind(id, id).run();
});

describe("to-dos on D1", () => {
  it("three quick adds all land (the KV version lost one)", async () => {
    const t = todosFor("ludlow");
    await Promise.all([t.add("Ring the plumber", T), t.add("Buy stamps", T + 1), t.add("Book the boiler service", T + 2)]);
    expect((await t.list(T + 3)).map((x) => x.text).sort()).toEqual(["Book the boiler service", "Buy stamps", "Ring the plumber"]);
  });

  it("tick, untick, remove; ticked ones go after a day; households are separate", async () => {
    const t = todosFor("ludlow");
    await t.add("Stamps", T);
    const [s] = await t.list(T);
    expect(await t.toggle(s.id, T + 1)).toBe(true);
    expect((await t.list(T + 2))[0]).toMatchObject({ done: true, doneAt: T + 1 });
    expect((await t.list(T + 1 + DONE_KEEP_MS + 1))).toEqual([]);
    expect(await todosFor("bristol").toggle(s.id, T)).toBe(false);
    await t.toggle(s.id, T + 3);
    expect((await t.list(T + 4))[0].done).toBe(false);
    expect(await t.remove(s.id)).toBe(true);
    expect(await t.list(T + 5)).toEqual([]);
  });

  it("ignores blank text", async () => {
    const t = todosFor("ludlow");
    await t.add("   ", T);
    expect(await t.list(T)).toEqual([]);
  });
});
