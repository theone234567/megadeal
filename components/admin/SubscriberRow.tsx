export interface AdminSubscriber {
  _id: string;
  email?: string;
  audience?: string;
  source?: string;
  verified?: boolean;
  unsubscribed?: boolean;
  _createdDate?: string;
  [key: string]: any;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function SubscriberRow({ subscriber }: { subscriber: AdminSubscriber }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-4">{subscriber.email}</td>
      <td className="py-2 pr-4 capitalize text-slate-500">{subscriber.audience || "—"}</td>
      <td className="py-2 pr-4 text-slate-500">{subscriber.source || "—"}</td>
      <td className="py-2 pr-4">
        {subscriber.unsubscribed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            Unsubscribed
          </span>
        ) : subscriber.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
            ✓ Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            ⏳ Pending
          </span>
        )}
      </td>
      <td className="py-2 text-xs text-slate-400">{formatDate(subscriber._createdDate)}</td>
    </tr>
  );
}
