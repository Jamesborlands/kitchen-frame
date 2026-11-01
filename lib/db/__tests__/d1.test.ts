import { describe, expect, it } from "vitest";
import { testDb } from "@/lib/db/testing";

describe("the D1 test adapter (node:sqlite + our migrations)", () => {
  it("has the schema and speaks D1's API: bind, run, first, all, batch", async () => {
    const db = testDb();
    await db.prepare("INSERT INTO households (id, name, created_at) VALUES (?, ?, ?)").bind("ludlow", "Anne & Peter", 1).run();
    expect(await db.prepare("SELECT name FROM households WHERE id = ?").bind("ludlow").first()).toEqual({ name: "Anne & Peter" });
    await db.batch([
      db.prepare("INSERT INTO todos (id, household_id, text, at) VALUES (?, ?, ?, ?)").bind("t1", "ludlow", "a", 1),
      db.prepare("INSERT INTO todos (id, household_id, text, at) VALUES (?, ?, ?, ?)").bind("t2", "ludlow", "b", 2),
    ]);
    const { results } = await db.prepare("SELECT id FROM todos WHERE household_id = ? ORDER BY at").bind("ludlow").all();
    expect(results).toEqual([{ id: "t1" }, { id: "t2" }]);
    expect(await db.prepare("SELECT 1 AS x WHERE 0").first()).toBeNull();
  });

  it("each test db is fresh", async () => {
    const db = testDb();
    expect((await db.prepare("SELECT count(*) AS n FROM households").first())).toEqual({ n: 0 });
  });

  it("a failing statement in a batch rolls the whole batch back", async () => {
    const db = testDb();
    await expect(db.batch([
      db.prepare("INSERT INTO households (id, name, created_at) VALUES ('a', 'A', 1)"),
      db.prepare("INSERT INTO households (id, name, created_at) VALUES ('a', 'dup', 1)"),
    ])).rejects.toThrow();
    expect(await db.prepare("SELECT count(*) AS n FROM households").first()).toEqual({ n: 0 });
  });
});
