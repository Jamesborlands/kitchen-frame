// The household's to-do list: added on /family, ticked off on the frame. Its own
// KV key (family:todos) — it changes daily, from two places, so it mustn't share
// a record with the settings.
import { bindings } from "@/lib/cloudflare/bindings";

export interface Todo { id: string; text: string; done: boolean; at: number; doneAt?: number }

export const DONE_KEEP_MS = 24 * 60 * 60_000; // a ticked item stays a day (so a mis-tap can be undone)
export const MAX_TODOS = 50;
const KEY = "family:todos";

export function addTodo(list: Todo[], text: string, now: number): Todo[] {
  const t = text.trim().slice(0, 120);
  if (!t) return list;
  const todo: Todo = { id: `todo-${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, text: t, done: false, at: now };
  return [...list, todo].slice(-MAX_TODOS);
}

export function toggleTodo(list: Todo[], id: string, now: number): Todo[] {
  return list.map((t) => {
    if (t.id !== id) return t;
    if (t.done) { const back: Todo = { ...t, done: false }; delete back.doneAt; return back; }
    return { ...t, done: true, doneAt: now };
  });
}

export const removeTodo = (list: Todo[], id: string): Todo[] => list.filter((t) => t.id !== id);

export const liveTodos = (list: Todo[], now: number): Todo[] =>
  list.filter((t) => !t.done || now - (t.doneAt ?? now) <= DONE_KEEP_MS);

// ---- storage: KV when bound, else memory (seeded with a demo list for local dev) ----
const seedAt = Date.now();
let memory: Todo[] = [
  ["Book the chimney sweep", false], ["Birthday card for Kate", false], ["Pick up the sourdough flour", true], ["Ring the garage about the MOT", false],
].map(([text, done], i) => ({ id: `todo-demo${i}`, text: String(text), done: Boolean(done), at: seedAt - i * 3_600_000, ...(done ? { doneAt: seedAt } : {}) }));

export async function getTodos(now: number = Date.now()): Promise<Todo[]> {
  const kv = bindings().FRAME;
  const raw = kv ? ((await kv.get(KEY, "json")) as Todo[] | null) ?? [] : memory;
  return liveTodos(raw, now);
}

/** Read, change, write — every change goes through here. */
export async function updateTodos(change: (list: Todo[]) => Todo[], now: number = Date.now()): Promise<Todo[]> {
  const next = liveTodos(change(await getTodos(now)), now);
  const kv = bindings().FRAME;
  if (kv) await kv.put(KEY, JSON.stringify(next));
  else memory = next;
  return next;
}
