import { createClient } from "@supabase/supabase-js";
import GroupDetail from "@/components/group/GroupDetail";

export async function generateStaticParams() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://irdcmmuhidoenhaujzkm.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyZGNtbXVoaWRvZW5oYXVqemttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTEzNjMsImV4cCI6MjA4NzkyNzM2M30.rzXWOyIUpTf3wkJHhiHlij4UZ1XQJMz4GZL25loxmu4";

  const supabase = createClient(url, key);
  const { data } = await supabase.from("chaebols").select("id");

  return (data ?? []).map((row: { id: string }) => ({ id: row.id }));
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GroupDetail id={id} />;
}
