"use client";

import type { DealRecord } from "./DealManageCard";

const COLUMNS: { header: string; get: (d: DealRecord) => string | number }[] = [
  { header: "Deal name", get: (d) => d.dealName || "" },
  { header: "Status", get: (d) => d.status || "Live" },
  { header: "Price now", get: (d) => (d.priceNow ?? "") as string | number },
  { header: "Price was", get: (d) => (d.priceWas ?? "") as string | number },
  { header: "Quantity available", get: (d) => (d.quantityAvailable ?? "") as string | number },
  { header: "Views", get: (d) => d.viewCount || 0 },
  { header: "Clicks", get: (d) => d.clickCount || 0 },
  { header: "Expires", get: (d) => (d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : "") },
];

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export default function ExportDealsButton({ deals }: { deals: DealRecord[] }) {
  function handleExport() {
    const rows = [
      COLUMNS.map((c) => c.header),
      ...deals.map((d) => COLUMNS.map((c) => csvEscape(c.get(d)))),
    ];
    const csv = rows.map((row) => row.join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `megadeal-deals-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (deals.length === 0) return null;

  return (
    <button
      type="button"
      onClick={handleExport}
      className="text-xs font-semibold text-brand-600 hover:underline"
    >
      Export CSV ↓
    </button>
  );
}
