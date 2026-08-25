// Deterministic pseudo-random fallback so a deal missing a real expiresAt
// still gets a stable-looking deadline instead of one that jumps around on
// every render/reload.
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function dealEndsAt(id: string): Date {
  const daysFromNow = 1 + (hashString(id + "ends") % 6);
  const now = new Date();
  return new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
}
