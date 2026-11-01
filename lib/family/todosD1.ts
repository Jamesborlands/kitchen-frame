// The household's to-do list on D1: each change is one statement, so quick
// successive adds (or a tick from the frame while someone adds on the site)
// can't overwrite each other.
import { db } from "@/lib/db/d1";
import { DONE_KEEP_MS, MAX_TODOS, type Todo } from "@/lib/family/todos";

const changed = (res: unknown) => {
  const r = res as { meta?: { changes?: number }; changes?: number };
  return (r.meta?.changes ?? r.changes ?? 0) > 0;
};

export function todosFor(h: string) {
  return {
    async list(now: number = Date.now()): Promise<Todo[]> {
      const rows = (await db().prepare("SELECT id, text, done, at, done_at FROM todos WHERE household_id = ? AND (done = 0 OR done_at > ?) ORDER BY at")
        .bind(h, now - DONE_KEEP_MS).all<{ id: string; text: string; done: number; at: number; done_at: number | null }>()).results;
      return rows.slice(-MAX_TODOS).map((r) => {
        const t: Todo = { id: r.id, text: r.text, done: r.done === 1, at: r.at };
        if (r.done_at) t.doneAt = r.done_at;
        return t;
      });
    },
    async add(text: string, now: number = Date.now()): Promise<void> {
      const t = text.trim().slice(0, 120);
      if (!t) return;
      const id = `todo-${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      await db().prepare("INSERT INTO todos (id, household_id, text, at) VALUES (?, ?, ?, ?)").bind(id, h, t, now).run();
    },
    async toggle(id: string, now: number = Date.now()): Promise<boolean> {
      return changed(await db().prepare(
        "UPDATE todos SET done = 1 - done, done_at = CASE WHEN done = 0 THEN ? ELSE NULL END WHERE id = ? AND household_id = ?",
      ).bind(now, id, h).run());
    },
    async remove(id: string): Promise<boolean> {
      return changed(await db().prepare("DELETE FROM todos WHERE id = ? AND household_id = ?").bind(id, h).run());
    },
  };
}
