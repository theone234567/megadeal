"use client";

import { useEffect, useState } from "react";

interface ActivityItem {
  _id: string;
  type: "credit" | "deal";
  amount?: number | null;
  description?: string;
  _createdDate?: string;
}

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/merchants/activity")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then(({ items }) => {
        if (!cancelled) setItems(items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <h2 className="text-lg font-bold text-slate-900">Recent activity</h2>
      <ul className="mt-3 divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item._id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
            <div className="flex items-start gap-2">
              <span aria-hidden>{item.type === "credit" ? "💳" : "📋"}</span>
              <div>
                <p className="text-slate-700">{item.description}</p>
                {item._createdDate && (
                  <p className="text-xs text-slate-400">
                    {new Date(item._createdDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            {item.type === "credit" && typeof item.amount === "number" && item.amount !== 0 && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                  item.amount > 0 ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.amount > 0 ? `+${item.amount}` : item.amount}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
