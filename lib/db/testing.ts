// A D1-shaped adapter over node:sqlite for tests: the real migrations, a real
// SQL engine, a fresh in-memory database each call.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import type { D1Like, D1Statement } from "@/lib/db/d1";

const require = createRequire(import.meta.url);

// the bit of node:sqlite we use (its types aren't in this @types/node yet)
interface SqliteStatement { get(...a: never[]): unknown; all(...a: never[]): unknown[]; run(...a: never[]): unknown }
interface SqliteDb { exec(sql: string): void; prepare(sql: string): SqliteStatement }

export function testDb(): D1Like {
  const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (path: string) => SqliteDb };
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const dir = join(process.cwd(), "migrations");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) sqlite.exec(readFileSync(join(dir, f), "utf8"));

  const statement = (sql: string, values: unknown[] = []): D1Statement & { exec(): void } => {
    const args = () => values.map((v) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v)) as never[];
    return {
      bind: (...v: unknown[]) => statement(sql, v),
      first: async <T>() => ((sqlite.prepare(sql).get(...args()) as T | undefined) ?? null),
      all: async <T>() => ({ results: sqlite.prepare(sql).all(...args()) as T[] }),
      run: async () => sqlite.prepare(sql).run(...args()),
      exec: () => { sqlite.prepare(sql).run(...args()); },
    };
  };

  return {
    prepare: (sql) => statement(sql),
    batch: async (stmts) => {
      sqlite.exec("BEGIN");
      try {
        for (const s of stmts) (s as ReturnType<typeof statement>).exec();
        sqlite.exec("COMMIT");
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
      return stmts.map(() => ({ success: true }));
    },
  };
}
