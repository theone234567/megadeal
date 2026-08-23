import CategoryNav from "@/components/CategoryNav";
import CategoryDeals from "./CategoryDeals";

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = decodeURIComponent(params.category);

  return (
    <main>
      <CategoryNav active={category} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-5 text-2xl font-extrabold text-slate-900">{category}</h1>
        <CategoryDeals category={category} />
      </div>
    </main>
  );
}
