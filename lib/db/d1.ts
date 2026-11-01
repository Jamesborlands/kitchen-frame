// The slice of Cloudflare D1 we use, typed so tests can pass a node:sqlite
// adapter (lib/db/testing.ts). Bound as DB in wrangler.jsonc.
import { bindings } from "@/lib/cloudflare/bindings";

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1Like {
  prepare(sql: string): D1Statement;
  /** Runs the statements in one transaction: all or nothing. */
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

let override: D1Like | null = null;

/** Tests: use this database (null to go back to the bound one). */
export function __setDbForTest(db: D1Like | null): void {
  override = db;
}

export function db(): D1Like {
  if (override) return override;
  const d = bindings().DB;
  if (!d) throw new Error("D1 database DB is not bound");
  return d;
}
