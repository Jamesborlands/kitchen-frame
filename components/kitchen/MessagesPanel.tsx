"use client";
import { useFrame } from "@/lib/hooks/useFrame";
import { NoteCard } from "@/components/PhotoFrame";

export function MessagesPanel() {
  const { data } = useFrame();
  const notes = data?.notes ?? [];
  if (notes.length === 0) {
    return <p className="pt-4 text-muted">no messages in the last day.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 pt-2">
      {notes.map((n) => (
        <li key={n.id} className="text-lg">
          <NoteCard note={n} />
        </li>
      ))}
    </ul>
  );
}
