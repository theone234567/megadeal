// Deterministic pseudo-random helpers so "bought today" counts and deal
// deadlines stay stable across renders/reloads instead of jumping around,
// without needing extra backend state for a demo storefront.
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function boughtToday(id: string): number {
  return 20 + (hashString(id) % 180);
}

export function dealEndsAt(id: string): Date {
  const daysFromNow = 1 + (hashString(id + "ends") % 6);
  const now = new Date();
  return new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
}
