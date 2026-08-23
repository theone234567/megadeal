import DealDetail from "./DealDetail";

export default function DealPage({ params }: { params: { slug: string } }) {
  return <DealDetail slug={params.slug} />;
}
