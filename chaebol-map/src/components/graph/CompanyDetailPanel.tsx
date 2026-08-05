"use client";

import { X, Star, TrendingUp, TrendingDown, Minus, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Company, OwnershipRelation, ControllerHolding } from "@/types";
import { formatNumber, formatPercent, formatPrice } from "@/lib/utils";

interface CompanyDetailPanelProps {
  company: Company;
  relations: OwnershipRelation[];
  companies: Company[];
  controllerHoldings: ControllerHolding[];
  controllerName: string;
  onClose: () => void;
}

export function CompanyDetailPanel({
  company,
  relations,
  companies,
  controllerHoldings,
  controllerName,
  onClose,
}: CompanyDetailPanelProps) {
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // Shareholders (who owns this company)
  const shareholders = relations
    .filter((r) => r.toCompanyId === company.id)
    .map((r) => ({
      name: companyMap.get(r.fromCompanyId)?.name ?? "알 수 없음",
      pct: r.ownershipPct,
    }));

  // Controller holding
  const ctrlHolding = controllerHoldings.find(
    (h) => h.companyId === company.id
  );
  if (ctrlHolding) {
    shareholders.unshift({
      name: `${controllerName} (동일인)`,
      pct: ctrlHolding.ownershipPct,
    });
  }

  shareholders.sort((a, b) => b.pct - a.pct);

  // Investments (what this company owns)
  const investments = relations
    .filter((r) => r.fromCompanyId === company.id)
    .map((r) => ({
      name: companyMap.get(r.toCompanyId)?.name ?? "알 수 없음",
      pct: r.ownershipPct,
    }))
    .sort((a, b) => b.pct - a.pct);

  const PriceIcon =
    (company.priceChange ?? 0) > 0
      ? TrendingUp
      : (company.priceChange ?? 0) < 0
      ? TrendingDown
      : Minus;

  const priceColor =
    (company.priceChange ?? 0) > 0
      ? "text-red-400"
      : (company.priceChange ?? 0) < 0
      ? "text-blue-400"
      : "text-gray-400";

  return (
    <div className="absolute top-0 right-0 h-full w-[380px] bg-card border-l border-border z-20 overflow-y-auto animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {company.isListed && (
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            )}
            <h2 className="text-lg font-bold">{company.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={company.isListed ? "listed" : "unlisted"}>
            {company.isListed ? "상장" : "비상장"}
          </Badge>
          <Badge variant="sector">{company.category}</Badge>
          {company.stockCode && (
            <Badge variant="outline">{company.stockCode}</Badge>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Stock info (Toss-style) */}
        {company.isListed && company.stockPrice && (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {formatPrice(company.stockPrice)}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 ${priceColor}`}>
              <PriceIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {(company.priceChange ?? 0) > 0 ? "+" : ""}
                {formatPrice(company.priceChange ?? 0)}
              </span>
              <span className="text-sm font-semibold">
                ({(company.priceChangePercent ?? 0) > 0 ? "+" : ""}
                {formatPercent(company.priceChangePercent ?? 0)})
              </span>
            </div>
            {company.marketCap && (
              <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
                <span>시가총액</span>
                <span className="font-semibold text-foreground">
                  {formatNumber(company.marketCap)}
                </span>
              </div>
            )}
            {company.sector && (
              <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
                <span>섹터</span>
                <span className="font-semibold text-foreground">
                  {company.sector}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Shareholders */}
        {shareholders.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-muted-foreground mb-3">
              주요 주주
            </h3>
            <div className="space-y-1">
              {shareholders.map((sh, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{sh.name}</span>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {formatPercent(sh.pct)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investments */}
        {investments.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-muted-foreground mb-3">
              출자 현황
            </h3>
            <div className="space-y-1">
              {investments.map((inv, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">→</span>
                    <span className="text-sm">{inv.name}</span>
                  </div>
                  <span className="text-sm font-bold text-amber-400">
                    {formatPercent(inv.pct)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
