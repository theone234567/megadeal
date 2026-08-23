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
