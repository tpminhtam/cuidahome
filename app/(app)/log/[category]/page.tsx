import { CATEGORIES, Category } from "@/lib/types";
import LogClient from "./LogClient";

// server wrapper so the static (GitHub Pages) export can pre-render all 9 forms
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.key }));
}

export default async function LogPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return <LogClient category={category as Category} />;
}
