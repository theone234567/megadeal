/**
 * Truncates free text for a meta description without cutting mid-word.
 * Google displays roughly the first 155-160 characters and appends its
 * own ellipsis when it truncates further — but a hard slice(0, n) lands
 * wherever the character count happens to fall, usually mid-word, and
 * that's what actually ends up in the <meta name="description"> tag
 * search engines read, not just what's shown on screen.
 */
export function truncateForMeta(text: string, maxLength = 155): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const cut = trimmed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function formatMoney(amount: number, currency: string, formatted?: string | null) {
  if (formatted) return formatted;
  try {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
