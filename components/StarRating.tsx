export default function StarRating({
  rating,
  reviewCount,
  className = "",
}: {
  rating: number | null;
  reviewCount: number | null;
  className?: string;
}) {
  if (rating === null) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <span aria-hidden className="text-amber-500">
        ★
      </span>
      <span className="font-semibold text-slate-700">{rating.toFixed(1)}</span>
      {reviewCount ? (
        <span className="text-slate-400">
          ({reviewCount} review{reviewCount === 1 ? "" : "s"})
        </span>
      ) : null}
    </span>
  );
}
