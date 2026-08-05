import { Navbar } from "@/components/layout/Navbar";
import { SearchProvider } from "@/components/shared/SearchProvider";
import { getAllGroups } from "@/lib/data";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const groups = await getAllGroups();

  return (
    <SearchProvider groups={groups}>
      <div className="min-h-screen">
        <Navbar />
        <main>{children}</main>
      </div>
    </SearchProvider>
  );
}
