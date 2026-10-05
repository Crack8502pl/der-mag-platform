export const RESERVED_FORM_KEYS = [...Object.getOwnPropertyNames(Object.prototype), 'prototype'];
const reserved = new Set(RESERVED_FORM_KEYS);

export function hasUnsafeFormJson(payload: unknown): boolean {
  const pending: Array<{ value: unknown; depth: number }> = [{ value: payload, depth: 0 }];
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (value === null || typeof value !== 'object') continue;
    if (depth > 50) return true;
    for (const [key, child] of Object.entries(value)) {
      if (reserved.has(key)) return true;
      if (child !== null && typeof child === 'object') pending.push({ value: child, depth: depth + 1 });
    }
  }
  return false;
}
