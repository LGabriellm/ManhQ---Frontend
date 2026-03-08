import CategoryClient from "./CategoryClient";

export async function generateStaticParams() {
  return [
    { category: "popular" },
    { category: "recent" },
    { category: "updated" },
  ];
}

export default function Page() {
  return <CategoryClient />;
}
