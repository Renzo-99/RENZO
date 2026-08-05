# PRD.md — 한국 재벌 소유지분도 인터랙티브 웹사이트

## 프로젝트 개요

한국 5대 재벌(삼성, SK, 현대차, LG, 롯데)의 소유지분 구조를 인터랙티브 그래프로 시각화하는 웹사이트. Toss 스타일 UI에 shadcn/ui 컴포넌트를 적극 활용하며, Vercel에 배포한다.

---

## 기술 스택

| 분류 | 기술 | 용도 |
|------|------|------|
| 프레임워크 | Next.js 15+ (App Router) | SSR/SSG, Vercel 배포 |
| 언어 | TypeScript (strict) | 전체 코드베이스 |
| UI 컴포넌트 | shadcn/ui + Radix UI | 접근성 보장 UI 프리미티브 |
| 그래프 시각화 | @xyflow/react 12+ | 소유구조 노드/엣지 렌더링 |
| 자동 레이아웃 | @dagrejs/dagre | 계층적 노드 배치 |
| 애니메이션 | Framer Motion | Toss 스타일 트랜지션 |
| 스타일링 | Tailwind CSS 4+ | Toss 디자인 시스템 구현 |
| DB | Supabase (PostgreSQL) | 재벌/계열사/소유지분 데이터 저장 |
| 주가 API | KIS OpenAPI REST | 실시간 주가/시가총액 (30~60초 폴링) |
| 배포 | Vercel | 자동 배포 (git push → 프로덕션) |

---

## 데이터 아키텍처

### Supabase 테이블

**chaebols** — 재벌 그룹
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | 고유 식별자 |
| name | text | 그룹명 |
| name_en | text | 영문명 |
| rank | int | 재계 순위 |
| total_assets_trillion | numeric | 총 자산(조원) |
| holding_company | text | 지주회사명 |
| chairman | text | 총수 |
| color | text | 테마 컬러(hex) |

**companies** — 계열사
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | 고유 식별자 |
| chaebol_id | uuid FK→chaebols | 소속 그룹 |
| name | text | 회사명 |
| ticker | text | 종목 약어 |
| stock_code | text | 종목코드(6자리) |
| entity_type | enum | holding/subsidiary/individual |
| krx_sector | text | KRX 업종 |
| gics_sector | text | GICS 섹터 |
| market_cap_billion | numeric | 시가총액(억원) |
| stock_price | numeric | 현재가 |
| price_change_percent | numeric | 전일 대비율(%) |
| is_listed | boolean | 상장 여부 |

**ownership_links** — 소유지분 관계
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | 고유 식별자 |
| chaebol_id | uuid FK→chaebols | 소속 그룹 |
| source_company_id | uuid FK→companies | 출자 주체 |
| target_company_id | uuid FK→companies | 출자 대상 |
| ownership_percent | numeric | 지분율(%) |
| ownership_type | enum | direct/indirect |

### 데이터 흐름

1. 소유지분 데이터: Supabase → React Flow 노드/엣지 변환
2. 주가 데이터: KIS REST API 클라이언트 폴링(30~60초) → 노드 실시간 반영
3. 데이터 출처: 공정거래위원회, DART OpenAPI, KRX 정보데이터시스템

---

## 핵심 기능

### 1. 그래프 시각화
- React Flow 인터랙티브 그래프 (줌/팬/드래그)
- 커스텀 노드: 회사 카드 (회사명, 종목코드, 주가, 시가총액)
- 커스텀 엣지: 지분율 라벨 (50% 초과=굵은 파란, 간접=점선)
- dagre 자동 레이아웃 (TB, 계층 배치)
- MiniMap, Controls 내장

### 2. 재벌 그룹 선택
- 메인 페이지: 5대 재벌 카드 → 선택 시 그래프 렌더링

### 3. 주가 실시간 반영
- KIS REST API (`tr_id: FHKST01010100`)
- 상승=#F04452, 하락=#3182F6, 보합=#8B95A1

---

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # 메인 (재벌 목록)
│   ├── globals.css
│   └── group/[id]/page.tsx   # 소유지분 그래프
├── components/
│   ├── graph/
│   │   ├── CompanyNode.tsx
│   │   ├── OwnershipEdge.tsx
│   │   └── OwnershipGraph.tsx
│   └── ui/
│       ├── ChaebolCard.tsx
│       └── StockPrice.tsx
├── hooks/
│   └── useChaebolData.ts
├── lib/
│   ├── supabase.ts
│   └── layout.ts
├── types/
│   └── database.ts
└── data/
    └── seed.sql
```

---

## 배포 설정

- **Vercel** 배포 (git push → 자동 프로덕션 반영)
- GitHub 저장소 연결 → Vercel 프로젝트 자동 배포
- 환경변수: Vercel Dashboard → Settings → Environment Variables에서 설정
- SSR/SSG/API Routes/Middleware 모두 사용 가능 (Vercel에서는 제한 없음)

---

## 5대 재벌 핵심 계열사

| 그룹 | 주요 계열사 (종목코드) |
|------|----------------------|
| 삼성 | 삼성전자(005930), 삼성SDI(006400), 삼성바이오로직스(207940), 삼성물산(028260), 삼성생명(032830), 삼성화재(000810), 삼성SDS(018260) |
| SK | SK하이닉스(000660), SK이노베이션(096770), SK텔레콤(017670), SK스퀘어(402340), SK바이오팜(326030) |
| 현대차 | 현대자동차(005380), 기아(000270), 현대모비스(012330), 현대글로비스(086280), 현대제철(004020) |
| LG | LG에너지솔루션(373220), LG화학(051910), LG전자(066570), LG유플러스(032640) |
| 롯데 | 롯데케미칼(011170), 롯데쇼핑(023530), 롯데칠성음료(005300) |
