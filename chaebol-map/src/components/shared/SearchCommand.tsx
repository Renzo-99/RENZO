"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, Star, ArrowRight } from "lucide-react";
import type { GroupData } from "@/types";
import { getGroupIcon } from "@/lib/constants";

interface SearchCommandProps {
  groups: GroupData[];
  onClose: () => void;
}

interface SearchResult {
  type: "group" | "company";
  id: string;
  name: string;
  description: string;
  href: string;
  icon?: string;
  isListed?: boolean;
}

// 외부에서 open=true일 때만 마운트 → 상태가 자연스럽게 초기화됨
export function SearchCommand({ groups, onClose }: SearchCommandProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  // 모든 검색 가능한 항목 빌드
  const allItems = useMemo(() => {
    const items: SearchResult[] = [];

    groups.forEach((g) => {
      items.push({
        type: "group",
        id: g.group.id,
        name: `${g.group.name}그룹`,
        description: `동일인: ${g.group.controllerName} · ${g.group.totalCompanies}사 · 상장 ${g.group.listedCompanies}사`,
        href: `/groups/${g.group.slug}`,
        icon: getGroupIcon(g.group.slug),
      });

      g.companies
        .filter((c) => !c.isController)
        .forEach((c) => {
          items.push({
            type: "company",
            id: c.id,
            name: c.name,
            description: `${g.group.name}그룹 · ${c.category}${c.isListed ? " · ★ 상장" : ""}`,
            href: `/groups/${g.group.slug}`,
            isListed: c.isListed,
          });
        });
    });

    return items;
  }, [groups]);

  // 검색 필터링
  const results = useMemo(() => {
    if (!query.trim()) {
      return allItems.filter((item) => item.type === "group").slice(0, 10);
    }

    const q = query.toLowerCase().trim();
    const matched = allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );

    matched.sort((a, b) => {
      if (a.type === "group" && b.type !== "group") return -1;
      if (a.type !== "group" && b.type === "group") return 1;
      if (a.isListed && !b.isListed) return -1;
      if (!a.isListed && b.isListed) return 1;
      return 0;
    });

    return matched.slice(0, 12);
  }, [query, allItems]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [router, onClose]
  );

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) navigate(selected.href);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [results, selectedIndex, navigate]);

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-full max-w-[560px] animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-5 border-b border-border">
            <Search className="w-4.5 h-4.5 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="그룹 또는 회사 검색..."
              className="flex-1 h-13 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <kbd className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 border border-border flex-shrink-0">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다
              </div>
            ) : (
              <>
                {/* 그룹 결과 */}
                {results.some((r) => r.type === "group") && (
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
                      그룹
                    </span>
                  </div>
                )}
                {results
                  .filter((r) => r.type === "group")
                  .map((result) => {
                    const globalIdx = results.indexOf(result);
                    return (
                      <button
                        key={result.id}
                        onClick={() => navigate(result.href)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                          selectedIndex === globalIdx
                            ? "bg-primary/10 text-foreground"
                            : "text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{result.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{result.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.description}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      </button>
                    );
                  })}

                {/* 회사 결과 */}
                {results.some((r) => r.type === "company") && (
                  <div className="px-3 py-1.5 mt-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
                      회사
                    </span>
                  </div>
                )}
                {results
                  .filter((r) => r.type === "company")
                  .map((result) => {
                    const globalIdx = results.indexOf(result);
                    return (
                      <button
                        key={result.id}
                        onClick={() => navigate(result.href)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                          selectedIndex === globalIdx
                            ? "bg-primary/10 text-foreground"
                            : "text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          {result.isListed ? (
                            <Star className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{result.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.description}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      </button>
                    );
                  })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-t border-border text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="bg-muted rounded px-1 py-0.5 border border-border">↑↓</kbd>
              이동
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted rounded px-1 py-0.5 border border-border">↵</kbd>
              선택
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted rounded px-1 py-0.5 border border-border">ESC</kbd>
              닫기
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
