import { describe, expect, it } from "vitest";
import { addTodo, liveTodos, removeTodo, toggleTodo, DONE_KEEP_MS, MAX_TODOS, type Todo } from "@/lib/family/todos";

const T = 1_800_000_000_000;

describe("to-dos", () => {
  it("adds, newest last, trimmed; empty text is ignored", () => {
    let list: Todo[] = [];
    list = addTodo(list, "  Ring the plumber ", T);
    list = addTodo(list, "Buy stamps", T + 1);
    list = addTodo(list, "   ", T + 2);
    expect(list.map((t) => t.text)).toEqual(["Ring the plumber", "Buy stamps"]);
    expect(list[0]).toMatchObject({ done: false, at: T });
    expect(list[0].id).toMatch(/^todo-/);
  });

  it("ticks and unticks", () => {
    const [a] = addTodo([], "Buy stamps", T);
    const ticked = toggleTodo([a], a.id, T + 5);
    expect(ticked[0]).toMatchObject({ done: true, doneAt: T + 5 });
    expect(toggleTodo(ticked, a.id, T + 6)[0]).toMatchObject({ done: false });
    expect(toggleTodo(ticked, a.id, T + 6)[0].doneAt).toBeUndefined();
  });

  it("ticked ones stay a day, then drop off; open ones stay", () => {
    let list = addTodo(addTodo([], "a", T), "b", T);
    list = toggleTodo(list, list[0].id, T);
    expect(liveTodos(list, T + DONE_KEEP_MS - 1).map((t) => t.text)).toEqual(["a", "b"]);
    expect(liveTodos(list, T + DONE_KEEP_MS + 1).map((t) => t.text)).toEqual(["b"]);
  });

  it("removes", () => {
    const list = addTodo([], "a", T);
    expect(removeTodo(list, list[0].id)).toEqual([]);
  });

  it("keeps the list a sensible length", () => {
    let list: Todo[] = [];
    for (let i = 0; i < MAX_TODOS + 5; i++) list = addTodo(list, `t${i}`, T + i);
    expect(list).toHaveLength(MAX_TODOS);
  });
});
