import { Building2, Star, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GroupCard } from "@/components/shared/GroupCard";
import { getAllGroups } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

export default async function DashboardPage() {
  const groups = await getAllGroups();

  const totalCompanies = groups.reduce(
    (sum, g) => sum + g.group.totalCompanies,
    0
  );
  const totalListed = groups.reduce(
    (sum, g) => sum + g.group.listedCompanies,
    0
  );

  // Collect all listed companies for stock overview
  const allStocks = groups
    .flatMap((g) =>
      g.companies
        .filter((c) => c.isListed && !c.isController && c.stockPrice)
        .map((c) => ({ ...c, groupName: g.group.name }))
    )
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));

  const topGainers = [...allStocks]
    .sort((a, b) => (b.priceChangePercent ?? 0) - (a.priceChangePercent ?? 0))
    .slice(0, 5);

  const topLosers = [...allStocks]
    .sort((a, b) => (a.priceChangePercent ?? 0) - (b.priceChangePercent ?? 0))
    .slice(0, 5);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">
          한국 29대 그룹 소유지분도 한눈에 보기
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{groups.length}</p>
              <p className="text-xs text-muted-foreground">대기업 그룹</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCompanies}</p>
              <p className="text-xs text-muted-foreground">총 계열사</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalListed}</p>
              <p className="text-xs text-muted-foreground">상장사</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allStocks.length}</p>
              <p className="text-xs text-muted-foreground">종목 추적</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Gainers */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold">상승 TOP 5</h2>
            </div>
            <div className="space-y-1">
              {topGainers.map((stock) => (
                <div
                  key={stock.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{stock.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {stock.groupName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {(stock.stockPrice ?? 0).toLocaleString()}원
                    </p>
                    <Badge variant="up">
                      +{(stock.priceChangePercent ?? 0).toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Losers */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold">하락 TOP 5</h2>
            </div>
            <div className="space-y-1">
              {topLosers.map((stock) => (
                <div
                  key={stock.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{stock.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {stock.groupName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {(stock.stockPrice ?? 0).toLocaleString()}원
                    </p>
                    <Badge variant="down">
                      {(stock.priceChangePercent ?? 0).toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Market Cap Leaders */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold">시가총액 TOP 5</h2>
            </div>
            <div className="space-y-1">
              {allStocks.slice(0, 5).map((stock, i) => (
                <div
                  key={stock.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{stock.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stock.groupName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {formatNumber(stock.marketCap ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stock.sector}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Group Cards */}
      <h2 className="text-lg font-bold mb-4">그룹별 소유지분도</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((g) => (
          <GroupCard key={g.group.id} data={g} />
        ))}
      </div>
    </div>
  );
}
