"use client";
import { useState } from "react";
import type { Todo } from "@/lib/family/todos";
import { HoldButton } from "@/components/HoldButton";
import { ActionButton, Card, fieldClass, OFFLINE } from "@/app/family/ui";

export type TodoAction = "add" | "toggle" | "remove";

/** The household's list: added here, ticked off here or by tapping the frame. */
export function TodoTab({ todos, onTodo }: { todos: Todo[]; onTodo: (a: TodoAction, value: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const run = async (a: TodoAction, v: string) => {
    setFailed(false);
    try { await onTodo(a, v); } catch { setFailed(true); throw new Error("not saved"); }
  };
  const open = todos.filter((t) => !t.done), done = todos.filter((t) => t.done);
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="pb-1 text-xl">To-do</h2>
        <p className="pb-3 text-base text-muted">Shows on the frame — tap an item there to tick it off. Ticked things disappear after a day.</p>
        {todos.length === 0 && <p className="text-base text-muted">Nothing on the list.</p>}
        <ul className="divide-y divide-divider">
          {[...open, ...done].map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 py-2">
              <label className="flex min-h-12 flex-1 items-center gap-3 text-lg">
                <input type="checkbox" className="h-6 w-6" checked={t.done} aria-label={t.text}
                  onChange={() => void run("toggle", t.id).catch(() => undefined)} />
                <span className={t.done ? "text-muted line-through" : ""}>{t.text}</span>
              </label>
              <HoldButton onConfirm={() => void run("remove", t.id).catch(() => undefined)}>Hold to remove</HoldButton>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-end gap-2">
          <label className="flex-1 text-base">Add to the list
            <input className={fieldClass} value={text} placeholder="e.g. Ring the plumber" onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) void run("add", text.trim()).then(() => setText(""), () => undefined); }} />
          </label>
          <ActionButton run={async () => { await run("add", text.trim()); setText(""); }} disabled={!text.trim()}>Add</ActionButton>
        </div>
        {failed && <p role="alert" className="pt-2 text-base text-[#7E3A33]">{OFFLINE}</p>}
      </Card>
    </div>
  );
}
