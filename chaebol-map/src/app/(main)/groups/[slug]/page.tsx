import { notFound } from "next/navigation";
import { getGroupData, groupSlugs } from "@/lib/data";
import { GroupDetailClient } from "./GroupDetailClient";

export function generateStaticParams() {
  return groupSlugs.map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getGroupData(slug);

  if (!data) {
    notFound();
  }

  return <GroupDetailClient data={data} />;
}
