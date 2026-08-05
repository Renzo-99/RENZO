"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TRACKS,
  type Publication,
  type PublicationFeed,
  type TrackId,
} from "@/lib/publications";

/** 투자 참고자료 보드 — 국회입법조사처 발간물/연구보고서 (1일 1회 갱신) */

const TRACK_IDS = Object.keys(TRACKS) as TrackId[];

const TRACK_COLORS: Record<TrackId, string> = {
  semiconductor: "bg-blue-500/15 text-blue-300",
  trade: "bg-emerald-500/15 text-emerald-300",
  security: "bg-red-500/15 text-red-300",
  energy: "bg-amber-500/15 text-amber-300",
  finance: "bg-violet-500/15 text-violet-300",
};

export default function ReportsPage() {
  const [feed, setFeed] = useState<PublicationFeed | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [trackFilter, setTrackFilter] = useState<TrackId | "all">("all");

  useEffect(() => {
    // 1순위: GitHub Actions가 매일 갱신하는 정적 publications.json
    // 2순위: 서버 API(/api/publications, 열린국회정보·공공데이터포털 직접 호출)
    const load = async (): Promise<PublicationFeed> => {
      const staticRes = await fetch("/publications.json").catch(() => null);
      if (staticRes?.ok) return staticRes.json();
      const apiRes = await fetch("/api/publications");
      if (!apiRes.ok) throw new Error(`HTTP ${apiRes.status}`);
      return apiRes.json();
    };
    load()
      .then(setFeed)
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!feed) return [];
    return feed.items.filter((item) => {
      if (sourceFilter !== "all" && item.sourceId !== sourceFilter) return false;
      if (trackFilter !== "all" && !item.tracks.includes(trackFilter))
        return false;
      return true;
    });
  }, [feed, sourceFilter, trackFilter]);

  const failedSources = feed?.statuses.filter((s) => !s.ok) ?? [];

  return (
    <main className="min-h-screen bg-[#111318] text-gray-200 flex">
      {/* 좌측 사이드바 — 자료 소스 */}
      <aside className="w-64 shrink-0 bg-[#181b21] border-r border-white/5 p-4 hidden md:block">
        <h2 className="text-[13px] font-semibold text-gray-400 mb-3 px-2">
          국회입법조사처 자료
        </h2>
        <nav className="flex flex-col gap-1">
          <SidebarItem
            label="전체 보기"
            active={sourceFilter === "all"}
            onClick={() => setSourceFilter("all")}
          />
          {feed?.statuses.map((s) => (
            <SidebarItem
              key={s.id}
              label={s.name}
              active={sourceFilter === s.id}
              count={s.ok ? s.count : undefined}
              warn={!s.ok}
              onClick={() => setSourceFilter(s.id)}
            />
          ))}
        </nav>
        <p className="text-[11px] text-gray-500 mt-6 px-2 leading-relaxed">
          매일 1회 자동 갱신
          {feed && (
            <>
              <br />
              최근 수집:{" "}
              {new Date(feed.updatedAt).toLocaleString("ko-KR", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          )}
        </p>
      </aside>

      {/* 본문 */}
      <section className="flex-1 min-w-0 p-5 md:p-8 max-w-4xl">
        <header className="mb-5">
          <h1 className="text-[20px] font-bold text-white">투자 참고자료 보드</h1>
          <p className="text-[13px] text-gray-400 mt-1">
            국회입법조사처 발간물·연구보고서를 투자 트랙별로 분류해 보여줍니다
          </p>
        </header>

        {/* 트랙 필터 */}
        <div className="flex flex-wrap gap-2 mb-5">
          <FilterChip
            label="전체"
            active={trackFilter === "all"}
            onClick={() => setTrackFilter("all")}
          />
          {TRACK_IDS.map((id) => (
            <FilterChip
              key={id}
              label={TRACKS[id].label}
              active={trackFilter === id}
              onClick={() => setTrackFilter(id)}
            />
          ))}
        </div>

        {/* 소스 오류 안내 */}
        {failedSources.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-xl p-3 mb-5 text-[12px] leading-relaxed">
            <b>{failedSources.length}개 소스 연결 안 됨</b> —{" "}
            {failedSources.map((s) => s.name).join(", ")}
            <br />
            <span className="text-amber-200/70">
              /api/publications/health 에서 상세 원인을 확인할 수 있습니다
            </span>
          </div>
        )}

        {/* 목록 */}
        {loadError && (
          <div className="bg-red-500/10 text-red-300 rounded-xl p-4 text-[13px]">
            자료를 불러올 수 없습니다: {loadError}
          </div>
        )}
        {!feed && !loadError && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[64px] rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}
        {feed && filtered.length === 0 && (
          <p className="text-gray-500 text-[13px] py-10 text-center">
            조건에 맞는 자료가 없습니다
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => (
            <PublicationRow key={item.id} item={item} />
          ))}
        </ul>
      </section>
    </main>
  );
}

function SidebarItem({
  label,
  active,
  count,
  warn,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  warn?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-3 py-2 rounded-lg text-[13px] transition-colors flex items-center justify-between gap-2 ${
        active
          ? "bg-white/10 text-white font-medium"
          : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
      }`}
    >
      <span className="truncate">{label}</span>
      {warn ? (
        <span title="연결 안 됨">⚠️</span>
      ) : count !== undefined ? (
        <span className="text-[11px] text-gray-500">{count}</span>
      ) : null}
    </button>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] transition-colors ${
        active
          ? "bg-white text-gray-900 font-semibold"
          : "bg-white/5 text-gray-300 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function PublicationRow({ item }: { item: Publication }) {
  const inner = (
    <div className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl px-4 py-3 transition-colors">
      <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1">
        <span className="bg-white/5 rounded px-1.5 py-0.5">{item.sourceName}</span>
        {item.date && <span>{item.date}</span>}
        {item.meta && <span className="truncate">{item.meta}</span>}
        {item.tracks.map((t) => (
          <span key={t} className={`rounded px-1.5 py-0.5 ${TRACK_COLORS[t]}`}>
            {TRACKS[t].label}
          </span>
        ))}
      </div>
      <p className="text-[14px] text-gray-100 leading-snug">{item.title}</p>
    </div>
  );
  return (
    <li>
      {item.link ? (
        <a href={item.link} target="_blank" rel="noreferrer noopener">
          {inner}
        </a>
      ) : (
        inner
      )}
    </li>
  );
}
