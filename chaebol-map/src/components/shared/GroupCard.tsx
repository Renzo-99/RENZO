"use client";

import Link from "next/link";
import { ArrowRight, Building2, Star, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GroupData } from "@/types";
import { getGroupIcon } from "@/lib/constants";

interface GroupCardProps {
  data: GroupData;
}

export function GroupCard({ data }: GroupCardProps) {
  const { group, companies } = data;
  const listedCompanies = companies.filter((c) => c.isListed && !c.isController);

  // Top 3 listed companies by market cap
  const topCompanies = listedCompanies
    .filter((c) => c.marketCap)
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, 3);

  return (
    <Link href={`/groups/${group.slug}`}>
      <Card className="hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer group">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {getGroupIcon(group.slug)}
              </span>
              <div>
                <h3 className="text-base font-bold">{group.name}그룹</h3>
                <p className="text-xs text-muted-foreground">
                  동일인: {group.controllerName}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span>
                계열사 <strong className="text-foreground">{group.totalCompanies}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star className="w-3.5 h-3.5" />
              <span>
                상장 <strong className="text-foreground">{group.listedCompanies}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{group.dataDate} 기준</span>
            </div>
          </div>

          {/* Top listed companies */}
          {topCompanies.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                주요 상장사
              </p>
              {topCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-sm">{company.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {company.priceChangePercent !== undefined && (
                      <Badge
                        variant={
                          company.priceChangePercent > 0
                            ? "up"
                            : company.priceChangePercent < 0
                            ? "down"
                            : "flat"
                        }
                      >
                        {company.priceChangePercent > 0 ? "+" : ""}
                        {company.priceChangePercent.toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
