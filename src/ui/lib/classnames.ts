// Conditional-class helper used by every shadcn-style primitive. Lightweight stand-in
// for `clsx` so the UI layer doesn't pull a dep just for this.

export type ClassValue = string | number | null | false | undefined | ClassValue[] | { [key: string]: unknown };

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string' || typeof input === 'number') {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) out.push(inner);
    } else if (typeof input === 'object') {
      for (const [k, v] of Object.entries(input)) {
        if (v) out.push(k);
      }
    }
  }
  return out.join(' ');
}
