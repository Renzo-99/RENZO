import Link from "next/link";
import { ArrowRight, GitBranch, Star, Building2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllGroups } from "@/lib/data";
import { getGroupIcon } from "@/lib/constants";

export default async function LandingPage() {
  const groups = await getAllGroups();

  const totalCompanies = groups.reduce(
    (sum, g) => sum + g.group.totalCompanies,
    0
  );
  const totalListed = groups.reduce(
    (sum, g) => sum + g.group.listedCompanies,
    0
  );

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-screen-xl mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold">ChaebolMap</span>
          </div>
          <Link href="/dashboard">
            <Button size="sm">시작하기</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-screen-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Star className="w-3.5 h-3.5" />
            2025.5.1 공정위 데이터 기준
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
            한국 대기업 그룹의
            <br />
            <span className="text-primary">소유 구조</span>를 한눈에
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            삼성, SK, 현대자동차, LG 등 29대 그룹.
            <br />
            복잡한 재벌 소유지분도를 인터랙티브 그래프로 탐색하고,
            <br />
            실시간 주가와 함께 한눈에 파악하세요.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                지분도 살펴보기
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/compare">
              <Button variant="secondary" size="lg">
                그룹 비교
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-border/30">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{groups.length}</p>
              <p className="text-sm text-muted-foreground mt-1">대기업 그룹</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{totalCompanies}</p>
              <p className="text-sm text-muted-foreground mt-1">총 계열사</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">{totalListed}</p>
              <p className="text-sm text-muted-foreground mt-1">상장사</p>
            </div>
          </div>
        </div>
      </section>

      {/* Group Cards */}
      <section className="py-20 px-6">
        <div className="max-w-screen-xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            주요 그룹 소유지분도
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => {
              const topStocks = g.companies
                .filter((c) => c.isListed && !c.isController && c.marketCap)
                .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
                .slice(0, 3);

              return (
                <Link
                  key={g.group.id}
                  href={`/groups/${g.group.slug}`}
                  className="group"
                >
                  <div className="rounded-2xl bg-card border border-border/50 p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {getGroupIcon(g.group.slug)}
                        </span>
                        <div>
                          <h3 className="text-lg font-bold">
                            {g.group.name}그룹
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {g.group.controllerName}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>

                    <div className="flex items-center gap-6 mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        <span>{g.group.totalCompanies}사</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4" />
                        <span>상장 {g.group.listedCompanies}사</span>
                      </div>
                    </div>

                    {/* Top stocks mini list */}
                    {topStocks.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-border/30">
                        {topStocks.map((stock) => (
                          <div
                            key={stock.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground truncate mr-2">
                              {stock.name}
                            </span>
                            <span
                              className={`font-semibold text-xs px-2 py-0.5 rounded-md ${
                                (stock.priceChangePercent ?? 0) > 0
                                  ? "text-red-400 bg-red-500/10"
                                  : (stock.priceChangePercent ?? 0) < 0
                                  ? "text-blue-400 bg-blue-500/10"
                                  : "text-gray-400 bg-gray-500/10"
                              }`}
                            >
                              {(stock.priceChangePercent ?? 0) > 0 ? "+" : ""}
                              {(stock.priceChangePercent ?? 0).toFixed(2)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-card/50 border-t border-border/30">
        <div className="max-w-screen-xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">주요 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-4">
                <GitBranch className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold mb-2">인터랙티브 지분도</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                줌, 패닝, 필터링으로 복잡한 소유 구조를 자유롭게 탐색하세요.
                노드를 클릭하면 상세 정보를 확인할 수 있습니다.
              </p>
            </div>
            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-bold mb-2">실시간 주가 정보</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                상장 계열사의 현재 주가, 등락률, 시가총액, 섹터 정보를
                함께 제공합니다.
              </p>
            </div>
            <div className="rounded-2xl bg-card border border-border/50 p-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-4">
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-bold mb-2">그룹 비교 분석</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                29대 그룹의 구조를 비교하고, 계열사 수, 상장사 비율 등을
                한눈에 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/30">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>ChaebolMap — 공정거래위원회 대기업집단 소유지분도 데이터 기반</p>
          <p>2025.5.1 기준, 발행주식총수 기준 지분율(%)</p>
        </div>
      </footer>
    </div>
  );
}
