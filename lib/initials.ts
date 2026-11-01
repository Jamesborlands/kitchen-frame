/** Sender initials for a name, e.g. "Sam Hart" → "SH", "Kate" → "KA". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Initials that agree across the frame: a first name on its own ("Sam", named on
 * the family page) takes the initials of the one full name starting with it
 * ("Sam Hart", from WhatsApp). With two such full names it stays as it was.
 */
export function initialsAmong(names: string[]): (name: string) => string {
  const full = names.map((n) => n.trim()).filter((n) => n.split(/\s+/).length > 1);
  return (name: string) => {
    const t = name.trim();
    if (t && !/\s/.test(t)) {
      const matches = [...new Set(full.filter((f) => f.split(/\s+/)[0].toLowerCase() === t.toLowerCase()).map((f) => f.toLowerCase()))];
      if (matches.length === 1) return initials(full.find((f) => f.toLowerCase() === matches[0])!);
    }
    return initials(t);
  };
}
