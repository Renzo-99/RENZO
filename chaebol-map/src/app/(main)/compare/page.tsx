import { Building2, Star, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAllGroups } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

export default async function ComparePage() {
  const groups = await getAllGroups();

  const groupStats = groups.map((g) => {
    const listed = g.companies.filter((c) => c.isListed && !c.isController);
    const totalMarketCap = listed.reduce((sum, c) => sum + (c.marketCap ?? 0), 0);
    const topCompany = listed.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))[0];

    return {
      ...g.group,
      totalMarketCap,
      topCompanyName: topCompany?.name ?? "-",
      topCompanyMarketCap: topCompany?.marketCap ?? 0,
      relationsCount: g.relations.length,
    };
  }).sort((a, b) => b.totalMarketCap - a.totalMarketCap);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">그룹 비교</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {groups.length}개 그룹의 구조를 한눈에 비교합니다
        </p>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">그룹</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">동일인</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">계열사</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">상장사</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">지분관계</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">합산 시총</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">최대 계열사</th>
                </tr>
              </thead>
              <tbody>
                {groupStats.map((g, i) => (
                  <tr key={g.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                        <span className="font-semibold">{g.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{g.controllerName}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-semibold">{g.totalCompanies}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold">{g.listedCompanies}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-muted-foreground">
                      {g.relationsCount}건
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-primary">{formatNumber(g.totalMarketCap)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm">{g.topCompanyName}</span>
                        {g.topCompanyMarketCap > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({formatNumber(g.topCompanyMarketCap)})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
