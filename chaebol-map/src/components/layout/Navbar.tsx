"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/components/shared/SearchProvider";

const navItems = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/groups", label: "그룹" },
  { href: "/compare", label: "비교" },
];

export function Navbar() {
  const pathname = usePathname();
  const { setOpen } = useSearch();

  return (
    <header className="sticky top-0 z-50 w-full bg-card/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-screen-2xl mx-auto flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">
              ChaebolMap
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
                  pathname.startsWith(item.href)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 h-9 px-3.5 rounded-xl bg-muted/50 border border-border/50 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>검색</span>
            <kbd className="ml-2 text-[10px] bg-background rounded px-1.5 py-0.5 border border-border">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
}
