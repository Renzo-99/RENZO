# DESIGN.md — ChaebolMap UI/UX 디자인 가이드

> **Toss Design System (TDS) 기반 + shadcn/ui 활용**

---

## 1. 디자인 철학

### 1.1 핵심 원칙

ChaebolMap의 디자인은 **토스(Toss)**의 디자인 언어를 기반으로 합니다.

| 원칙 | 설명 |
|------|------|
| **명료함 (Clarity)** | 복잡한 금융 데이터를 직관적이고 명료하게 전달 |
| **일관성 (Consistency)** | 컬러, 타이포그래피, 간격, 컴포넌트 전반에 일관된 규칙 적용 |
| **집중 (Focus)** | 핵심 정보에 시선을 유도하고, 불필요한 장식 배제 |
| **접근성 (Accessibility)** | 충분한 명도 대비, 색각 이상자 고려, 키보드 네비게이션 |

### 1.2 디자인 키워드

```
Data-driven · Professional · Clean · Minimal · Trustworthy · Interactive
```

### 1.3 Toss 디자인 참조

토스 디자인 시스템(TDS)의 핵심 특징을 ChaebolMap에 적용:

- **다크 모드 기본**: 금융 데이터 시각화에 최적화된 어두운 배경
- **토스 블루**: 브랜드 컬러 `#3182F6`를 Primary로 채택
- **라운드 코너**: 부드러운 모서리 (8~16px)로 친근한 인상
- **글래스모피즘**: 반투명 배경 + `backdrop-blur`로 깊이감 표현
- **미니멀 테두리**: 얇은 보더로 콘텐츠 영역 구분
- **의미 있는 색상**: 상승=빨강, 하락=파랑 (한국 주식시장 관행)
- **부드러운 전환**: 150~300ms transition으로 자연스러운 인터랙션

---

## 2. 컬러 시스템

### 2.1 CSS 변수 (Semantic Tokens)

모든 컬러는 CSS 변수로 정의되어, 다크/라이트 모드 전환을 지원합니다.

#### 다크 모드 (기본)

```css
:root {
  --background: #191F28;          /* 앱 배경 */
  --foreground: #F2F4F6;          /* 주요 텍스트 */
  --card: #212830;                /* 카드/패널 배경 */
  --card-foreground: #F2F4F6;     /* 카드 내 텍스트 */
  --muted: #2C3542;               /* 비활성 배경, 구분선 */
  --muted-foreground: #8B95A1;    /* 보조 텍스트 */
  --border: #2C3542;              /* 테두리 */
  --primary: #3182F6;             /* 토스 블루 (Primary) */
  --primary-foreground: #FFFFFF;  /* Primary 위 텍스트 */
  --accent: #2C3542;              /* 액센트 배경 */
  --accent-foreground: #F2F4F6;   /* 액센트 텍스트 */
  --ring: #3182F6;                /* 포커스 링 */
  --stock-up: #F04452;            /* 상승 (빨강) */
  --stock-down: #3182F6;          /* 하락 (파랑) */
}
```

#### 라이트 모드

```css
.light {
  --background: #F2F4F6;
  --foreground: #191F28;
  --card: #FFFFFF;
  --card-foreground: #191F28;
  --muted: #F2F4F6;
  --muted-foreground: #6B7684;
  --border: #E5E8EB;
  --primary: #3182F6;
  --primary-foreground: #FFFFFF;
  --accent: #F2F4F6;
  --accent-foreground: #191F28;
  --ring: #3182F6;
  --stock-up: #F04452;
  --stock-down: #3182F6;
}
```

### 2.2 컬러 팔레트 상세

#### 브랜드 컬러

| 이름 | 코드 | 용도 |
|------|------|------|
| **Toss Blue** | `#3182F6` | Primary 액션, 링크, 포커스 링, 상장사 보더, 하락 표시 |
| **Toss Blue Light** | `#60A5FA` | 호버 상태, 엣지 라벨 (20%+ 지분) |

#### 배경/표면 계층

| 이름 | 다크 모드 | 용도 |
|------|----------|------|
| Background | `#191F28` | 앱 전체 배경, 그래프 캔버스 |
| Card / Surface | `#212830` | 카드, 사이드 패널, 노드 배경 |
| Muted / Elevated | `#2C3542` | 호버 배경, 구분선, 태그 배경 |
| Deep Surface | `#333D4B` | 노드 보더, 강조 구분선 |

#### 텍스트 계층

| 이름 | 다크 모드 | 용도 |
|------|----------|------|
| Primary Text | `#F2F4F6` | 본문 텍스트, 제목, 회사명 |
| Secondary Text | `#8B95A1` | 보조 설명, 주가 |
| Muted Text | `#6B7684` | 비활성 텍스트, 범례 타이틀 |
| Disabled Text | `#4B5563` | 비활성 요소 |

#### 시맨틱 컬러

| 이름 | 코드 | 용도 |
|------|------|------|
| **Stock Up** | `#F04452` | 주가 상승, 양수 변동 |
| **Stock Down** | `#3182F6` | 주가 하락, 음수 변동 |
| **Success / Holding** | `#22C55E` | 지주회사, 성공 상태 |
| **Warning / Controller** | `#F59E0B` | 동일인(총수), 지배적 지분, 경고 |
| **Amber Light** | `#FCD34D` | 동일인 보더, 상장★ 아이콘 |
| **Holding Dark** | `#1C2E24` | 지주회사 노드 배경 |
| **Holding Light** | `#4ADE80` | 지주회사 배지 텍스트, 호버 보더 |

### 2.3 그래프 노드 컬러

| 노드 타입 | 배경 | 보더 | 텍스트 |
|-----------|------|------|--------|
| 동일인(총수) | gradient `#F59E0B→#D97706` | `#FCD34D` 1.5px | `#000` (이름), `rgba(0,0,0,0.5)` (라벨) |
| 상장회사(★) | `#212830` | left `#3182F6` 3px | `#F2F4F6` (이름), `#8B95A1` (주가) |
| 지주회사 | `#1C2E24` | left `#22C55E` 3px | `#F2F4F6` (이름), `#4ADE80` (배지) |
| 비상장 | `#212830` | `#2C3542` 1px | `#F2F4F6` |
| 선택 상태 | - | box-shadow `0 0 0 2px #3182F6` | - |

### 2.4 엣지(지분 관계) 컬러

| 지분율 범위 | 선 색상 | 라벨 텍스트 | 라벨 배경 | 라벨 보더 |
|------------|---------|-----------|----------|----------|
| 50%+ | `#F59E0B` | `#F59E0B` | `rgba(245,158,11,0.1)` | `rgba(245,158,11,0.2)` |
| 20~50% | `#3182F6` | `#60A5FA` | `rgba(59,130,246,0.1)` | `rgba(59,130,246,0.2)` |
| 5~20% | `#64748B` | `#94A3B8` | `rgba(100,116,139,0.08)` | `rgba(100,116,139,0.15)` |
| <5% | `#4B5563` | `#94A3B8` | `rgba(100,116,139,0.08)` | `rgba(100,116,139,0.15)` |
| 동일인 직접 | `#F59E0B` | `#FCD34D` | `rgba(245,158,11,0.12)` | `rgba(245,158,11,0.3)` |

---

## 3. 타이포그래피

### 3.1 폰트 스택

```css
/* 한글 + 영문 통합 */
--font-sans: var(--font-geist-sans), -apple-system, BlinkMacSystemFont,
  "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR",
  sans-serif;

/* 모노스페이스 (지분율, 주가 숫자) */
--font-mono: var(--font-geist-mono), "JetBrains Mono",
  "Fira Code", monospace;
```

| 폰트 | 용도 | 비고 |
|------|------|------|
| **Geist Sans** | 기본 UI 폰트 | Next.js 내장, Vercel 디자인 시스템 |
| **Pretendard** | 한글 폴백 | 토스 스타일 한글 폰트 |
| **Geist Mono** | 숫자 데이터 | 지분율(%), 주가, 시가총액 |
| **JetBrains Mono** | 모노 폴백 | 코드, tabular nums |

### 3.2 크기 스케일 (Tailwind CSS 기준)

| 이름 | Tailwind | 크기 | 용도 |
|------|----------|------|------|
| Hero Display | `text-4xl ~ text-6xl` | 36~60px | 랜딩 히어로 타이틀 |
| Page Title | `text-2xl` | 24px | 페이지 제목 |
| Section Title | `text-lg` | 18px | 섹션 타이틀, 그룹명 |
| Card Title | `text-base` | 16px | 카드 제목 |
| Body | `text-sm` | 14px | 본문, 회사 목록 |
| Node Name | `12px` | - | 그래프 노드 회사명 |
| Small | `text-xs` | 12px | 보조 텍스트, 라벨 |
| Edge Label | `10px` | - | 엣지 지분율 라벨 |
| Micro | `10px` | - | 범례, 동일인 라벨 |

### 3.3 폰트 가중치

| 가중치 | Tailwind | 용도 |
|--------|----------|------|
| 400 (Regular) | `font-normal` | 일반 본문 |
| 500 (Medium) | `font-medium` | 배지, 태그 |
| 600 (Semibold) | `font-semibold` | 가격, 숫자 데이터, 보조 항목 |
| 700 (Bold) | `font-bold` | 제목, 노드 이름, 엣지 라벨 |
| 800 (Extrabold) | `font-extrabold` | 통계 숫자, 필터 값, 동일인 이름 |

### 3.4 숫자 표기

```css
/* 지분율, 주가 등 숫자 정렬을 위한 tabular nums */
font-variant-numeric: tabular-nums;
```

- 지분율: `XX.X%` (소수점 1자리, 100%는 정수)
- 주가: `XXX,XXX원` (천 단위 콤마, 원 단위)
- 시가총액: `XX.X조`, `XX억`, `XX만` (자동 단위 변환)
- 변동률: `+X.XX%` / `-X.XX%` (소수점 2자리)

---

## 4. 간격 시스템 (Spacing)

### 4.1 기본 단위

Tailwind CSS의 4px 단위 체계를 사용합니다.

```
4px  → 1    (gap-1, p-1)
8px  → 2    (gap-2, p-2)
12px → 3    (gap-3, p-3)
16px → 4    (gap-4, p-4)
20px → 5    (gap-5, p-5)
24px → 6    (gap-6, p-6)
32px → 8    (gap-8, p-8)
```

### 4.2 페이지 레이아웃 간격

| 요소 | 간격 |
|------|------|
| 페이지 수평 패딩 | `px-6` (24px) |
| 섹션 수직 패딩 | `py-8 ~ py-20` (32~80px) |
| 최대 너비 | `max-w-screen-xl` (1280px) / `max-w-screen-2xl` (1536px) |
| 네비게이션 높이 | `h-14` (56px) |

### 4.3 카드 내부 간격

| 요소 | 간격 |
|------|------|
| 카드 패딩 | `p-6` (24px) |
| 사이드 패널 패딩 | `p-5` (20px) |
| 카드 내 섹션 간격 | `space-y-6` (24px) |
| 리스트 아이템 패딩 | `py-2.5 px-3` |

### 4.4 그래프 노드 내부 간격

| 요소 | 간격 |
|------|------|
| 이름 행 패딩 | `6px 10px 2px` |
| 주가 행 패딩 | `0 10px 6px` |
| 아이콘-이름 갭 | `3px` |
| 주가-변동률 갭 | `6px` |
| 동일인 노드 패딩 | `8px 18px` |

---

## 5. 보더 & 그림자

### 5.1 Border Radius

| 용도 | 값 | Tailwind |
|------|-----|----------|
| 카드, 패널 | `16px` | `rounded-2xl` |
| 노드 | `10px` | - |
| 동일인 노드 | `12px` | `rounded-xl` |
| 버튼, 입력필드 | `12px` | `rounded-xl` |
| 배지, 태그 | `8px` | `rounded-lg` |
| 엣지 라벨 | `5px` | - |
| 스크롤바 | `3px` | - |

### 5.2 Box Shadow

| 용도 | 값 |
|------|-----|
| 카드 호버 | `hover:shadow-lg hover:shadow-primary/5` |
| 상장사 노드 호버 | `0 4px 16px rgba(49, 130, 246, 0.2)` |
| 지주사 노드 호버 | `0 4px 16px rgba(34, 197, 94, 0.2)` |
| 동일인 노드 | `0 4px 20px rgba(245, 158, 11, 0.3)` |
| 동일인 호버 | `0 6px 28px rgba(245, 158, 11, 0.45)` |
| 선택 상태 | `0 0 0 2px #3182F6, 0 4px 16px rgba(49, 130, 246, 0.25)` |
| 글래스모피즘 패널 | `0 2px 8px rgba(0,0,0,0.15)` |
| React Flow 컨트롤 | `0 2px 8px rgba(0,0,0,0.2)` |

### 5.3 Border

| 용도 | 값 |
|------|-----|
| 카드 기본 | `1px solid var(--border)` / `border-border/50` |
| 카드 호버 | `border-primary/30` |
| 노드 기본 | `1px solid #333D4B` |
| 노드 좌측 (상장) | `3px solid #3182F6` |
| 노드 좌측 (지주) | `3px solid #22C55E` |
| 글래스모피즘 | `1px solid rgba(44, 53, 66, 0.6)` |
| 구분선 (미약) | `border-border/30` |

---

## 6. 글래스모피즘 (Glassmorphism)

토스 스타일의 핵심 요소 중 하나인 글래스모피즘을 그래프 오버레이에 적용합니다.

```css
/* 필터 바, 범례 등 그래프 위 오버레이 */
.glass-overlay {
  background: rgba(33, 40, 48, 0.92);   /* 카드 색상, 92% 불투명 */
  backdrop-filter: blur(12px);
  border: 1px solid rgba(44, 53, 66, 0.6);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 네비게이션 바 */
.nav-glass {
  background: var(--background) / 80%;   /* bg-background/80 */
  backdrop-filter: blur(24px);           /* backdrop-blur-xl */
}

/* 사이드 패널 헤더 */
.panel-header-glass {
  background: var(--card) / 95%;
  backdrop-filter: blur(4px);            /* backdrop-blur-sm */
}
```

---

## 7. 레이아웃

### 7.1 전체 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  Top Navigation (fixed, h-14, glass)                     │
│  [Logo+Name]   [Dashboard] [Groups] [Compare]   [Start]  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│               Main Content Area                           │
│           (페이지별 다른 콘텐츠)                             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 7.2 소유지분도 페이지 (핵심)

```
┌─────────────────────────────────────────────────────────┐
│  Nav (fixed)                                              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐                          ┌──────────────┐  │
│  │ Filter   │                          │ Legend       │  │
│  │ (glass)  │                          │ (glass)      │  │
│  │ 지분율 ━━● │                          │ ● 동일인      │  │
│  │ XX%+     │                          │ ● 상장회사    │  │
│  └──────────┘                          │ ● 지주회사    │  │
│                                        │ ● 비상장      │  │
│      Interactive Graph Canvas          │ ── 50%+ 지분  │  │
│      (React Flow, full viewport)       │ ── 20%+ 지분  │  │
│                                        │ -- <5% 지분   │  │
│                                        └──────────────┘  │
│                                                           │
│                                  ┌─────────┐              │
│                                  │ MiniMap │              │
│  ┌──────┐                        └─────────┘              │
│  │ Ctrl │                                                 │
│  └──────┘                                                 │
├─────────────────────────────────────────────────────────┤
│                         (노드 클릭 시)                      │
│                         ┌───────────────────────┐         │
│                         │ Company Detail Panel  │         │
│                         │ (slide-in, w-380px)   │         │
│                         │                       │         │
│                         │ ★ 삼성전자          ✕ │         │
│                         │ 68,300원              │         │
│                         │ +1.5% ▲               │         │
│                         │                       │         │
│                         │ ── 주요 주주 ──       │         │
│                         │ 삼성물산    4.4%       │         │
│                         │ 삼성생명   10.4%       │         │
│                         │                       │         │
│                         │ ── 출자 현황 ──       │         │
│                         │ → 삼성디스플레이 84.8% │         │
│                         │ → 삼성SDI    19.1%    │         │
│                         └───────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### 7.3 그리드 시스템

| 페이지 | 그리드 | 비고 |
|--------|--------|------|
| 랜딩 (그룹 카드) | `grid-cols-1 md:2 lg:3` | `gap-4` |
| 대시보드 (통계) | `grid-cols-2 lg:4` | `gap-4` |
| 대시보드 (그룹) | `grid-cols-1 md:2 lg:3` | `gap-4` |
| 기능 소개 | `grid-cols-1 md:3` | `gap-6` |

---

## 8. 애니메이션 & 트랜지션

### 8.1 일반 트랜지션

| 요소 | 속성 | 속도 | 이징 |
|------|------|------|------|
| 카드 호버 | border-color, shadow | 300ms | ease |
| 노드 호버 | transform, box-shadow, border-color | 150ms | ease |
| 버튼 호버 | background, color | 150ms | ease |
| 사이드 패널 진입 | slide-in-from-right | 300ms | ease |
| 리스트 아이템 호버 | background-color | 150ms | ease |
| 링크 화살표 호버 | transform, color | 200ms | ease |

### 8.2 그래프 전용

| 요소 | 효과 |
|------|------|
| 노드 호버 | `translateY(-1px)` + 타입별 그림자 |
| 동일인 호버 | `translateY(-2px)` + 앰버 강화 그림자 |
| 핸들 (연결점) | `opacity: 0 → 0.6` on 노드 호버 |
| fitView | `padding: 0.12` |

### 8.3 주가 변동 표시

| 상태 | 색상 | 아이콘 | 배경 |
|------|------|--------|------|
| 상승 | `text-red-400` | `TrendingUp` | `bg-red-500/10` |
| 하락 | `text-blue-400` | `TrendingDown` | `bg-blue-500/10` |
| 보합 | `text-gray-400` | `Minus` | `bg-gray-500/10` |

---

## 9. shadcn/ui 컴포넌트 활용

### 9.1 현재 사용 중

| 컴포넌트 | 위치 | 커스텀 Variant |
|----------|------|---------------|
| **Button** | 랜딩, 네비게이션, 패널 | `default`, `secondary`, `sm`, `lg` |
| **Card + CardContent** | 대시보드, 비교 페이지, 랜딩 | - |
| **Badge** | 회사 상세 패널 | `listed`, `unlisted`, `sector`, `outline` |

### 9.2 추가 도입 계획

| 컴포넌트 | 용도 | 우선순위 |
|----------|------|---------|
| **Command** | 통합 검색 (Cmd+K) | 높음 |
| **Dialog** | 모달 (회사 상세, 확인) | 높음 |
| **Sheet** | 모바일 사이드 패널 대체 | 높음 |
| **Select** | 그룹 선택, 필터 옵션 | 중간 |
| **Slider** | 지분율 필터 (shadcn 버전 교체) | 중간 |
| **Table** | 계열사 목록 테이블 뷰 | 중간 |
| **Tabs** | 상세 정보 패널 탭 (주주/출자/정보) | 중간 |
| **Tooltip** | 노드/엣지 호버 툴팁 | 중간 |
| **NavigationMenu** | 네비게이션 드롭다운 | 낮음 |
| **Toggle / Switch** | 필터 토글 (상장사만 등) | 낮음 |
| **Skeleton** | 로딩 상태 | 낮음 |
| **ScrollArea** | 사이드 패널 스크롤 | 낮음 |
| **Breadcrumb** | 경로 표시 | 낮음 |
| **DropdownMenu** | 더보기 메뉴 | 낮음 |
| **Avatar** | 사용자 프로필 | Phase 2 |
| **ThemeToggle** | 다크/라이트 전환 | Phase 3 |

### 9.3 shadcn/ui 테마 설정

`components.json`에서 다음을 설정:

```json
{
  "style": "new-york",
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### 9.4 Badge 커스텀 Variant

```typescript
// 주식/금융 데이터에 맞는 Badge variant
const badgeVariants = cva("...", {
  variants: {
    variant: {
      listed: "bg-primary/10 text-primary border-primary/20",       // 상장
      unlisted: "bg-muted text-muted-foreground border-muted",      // 비상장
      sector: "bg-muted text-muted-foreground",                     // 업종
      outline: "border border-border text-muted-foreground",        // 종목코드
      up: "bg-red-500/10 text-red-400",                            // 상승
      down: "bg-blue-500/10 text-blue-400",                        // 하락
    }
  }
});
```

---

## 10. 반응형 브레이크포인트

| 브레이크포인트 | Tailwind | 크기 | 레이아웃 변화 |
|--------------|----------|------|-------------|
| **Desktop XL** | `xl:` | 1280px+ | 전체 레이아웃, 3열 카드 그리드 |
| **Desktop** | `lg:` | 1024~1279px | 2~3열 카드, 사이드 패널 오버레이 |
| **Tablet** | `md:` | 768~1023px | 2열 카드, 필터 접힘 |
| **Mobile** | 기본 | ~767px | 1열 카드, 그래프는 제한적 |

### 그래프 반응형 전략

| 항목 | 데스크탑 | 태블릿 | 모바일 |
|------|---------|--------|--------|
| 그래프 캔버스 | 전체 뷰포트 | 전체 뷰포트 | 전체 뷰포트 |
| 사이드 패널 | 오버레이 (380px) | 오버레이 (320px) | 시트 (하단) |
| 필터 바 | 상단 좌측 | 상단 좌측 | 상단 중앙 |
| 범례 | 상단 우측 | 상단 우측 | 접힘 |
| 미니맵 | 우측 하단 | 우측 하단 | 숨김 |
| 컨트롤 | 좌측 하단 | 좌측 하단 | 좌측 하단 |

---

## 11. 아이콘 시스템

### 11.1 라이브러리

**Lucide React** (shadcn/ui 기본, `lucide-react@0.575.0`)

### 11.2 주요 아이콘 매핑

| 아이콘 | Lucide | 용도 |
|--------|--------|------|
| ★ | `Star` (fill) | 상장회사 표시 |
| 회사 | `Building2` | 계열사 아이콘 |
| 그래프 | `GitBranch` | 앱 로고, 지분 관계 |
| 상승 | `TrendingUp` | 주가 상승 |
| 하락 | `TrendingDown` | 주가 하락 |
| 보합 | `Minus` | 주가 보합 |
| 검색 | `Search` | 검색 |
| 닫기 | `X` | 패널 닫기 |
| 화살표 | `ArrowRight` | CTA, 링크 |

### 11.3 그룹 이모지 아이콘

| 그룹 | 이모지 | 비고 |
|------|--------|------|
| 삼성 | 🏢 | 건물 (대기업) |
| SK | ⚡ | 에너지/ICT |
| 현대자동차 | 🚗 | 자동차 |
| LG | 📱 | 전자/가전 |
| 롯데 | 🏬 | 유통/백화점 |
| 포스코 | 🏭 | 철강/제조 |
| 한화 | 🚀 | 방산/우주 |
| HD현대 | 🚢 | 조선/해양 |
| GS | ⛽ | 에너지/주유 |
| 기타 | 🏢 | 기본값 |

---

## 12. 스크롤바 스타일

토스 스타일의 미니멀한 커스텀 스크롤바:

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--muted);   /* #2C3542 */
  border-radius: 3px;
}
```

---

## 13. React Flow 테마 커스텀

### 13.1 캔버스

```css
.react-flow__background {
  background: var(--background) !important;  /* #191F28 */
}

/* 배경 도트 */
<Background
  variant="dots"
  gap={24}
  size={1}
  color="#2C3542"
/>
```

### 13.2 미니맵

```css
.react-flow__minimap {
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  background: #212830;
}

/* 미니맵 노드 색상 */
nodeColor: (node) => {
  if (isController) return "#F59E0B";  // 앰버
  if (isHolding) return "#22C55E";     // 그린
  if (isListed) return "#3182F6";      // 블루
  return "#475569";                     // 슬레이트
}
maskColor: "rgba(25, 31, 40, 0.7)"
```

### 13.3 컨트롤 버튼

```css
.react-flow__controls {
  border-radius: 10px !important;
  border: 1px solid var(--border) !important;
  background: var(--card) !important;  /* #212830 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.react-flow__controls-button {
  background: var(--card) !important;
  border-bottom: 1px solid var(--border) !important;
  fill: var(--foreground) !important;
}

.react-flow__controls-button:hover {
  background: var(--muted) !important;
}
```

---

## 14. 접근성

### 14.1 색상 대비

| 텍스트/배경 조합 | 대비비 | WCAG AA |
|----------------|--------|---------|
| #F2F4F6 / #191F28 | 13.5:1 | ✅ Pass |
| #8B95A1 / #191F28 | 5.8:1 | ✅ Pass |
| #3182F6 / #191F28 | 5.2:1 | ✅ Pass |
| #F04452 / #191F28 | 5.0:1 | ✅ Pass |
| #F59E0B / #000000 | 10.3:1 | ✅ Pass |

### 14.2 인터랙션 접근성

- 포커스 링: `--ring: #3182F6` (2px outline)
- 호버 + 포커스 상태 모두 시각적 피드백
- 키보드 네비게이션: Tab으로 노드/버튼 이동
- 스크린리더: 시맨틱 HTML, ARIA labels

---

## 15. 디자인 참고 자료

### Toss Design System (TDS)

| 자료 | URL |
|------|-----|
| 토스 브랜드 리소스 센터 | https://brand.toss.im/ |
| TDS 컬러 시스템 업데이트 | https://toss.tech/article/tds-color-system-update |
| 토스 디자인 시스템 소개 | https://toss.tech/article/toss-design-system |
| TDS 가이드 개선 | https://toss.tech/article/toss-design-system-guide |
| TDS Mobile 문서 | https://tossmini-docs.toss.im/tds-mobile/ |
| SLASH 21 - TDS로 UI 쌓기 | https://toss.im/slash-21/sessions/3-4 |
| 토스피드 | https://toss.im/tossfeed |

### shadcn/ui

| 자료 | URL |
|------|-----|
| 공식 문서 | https://ui.shadcn.com/ |
| 테마 커스터마이징 | https://ui.shadcn.com/docs/theming |
| 컴포넌트 목록 | https://ui.shadcn.com/docs/components |

### 기타

| 자료 | URL |
|------|-----|
| React Flow (@xyflow/react) | https://reactflow.dev/ |
| Tailwind CSS 4.0 | https://tailwindcss.com/ |
| Lucide Icons | https://lucide.dev/ |
| Geist Font | https://vercel.com/font |

---

## 부록: Toss 컬러 스케일 레퍼런스

### A.1 Toss Blue Scale

| 토큰 | HEX | 용도 |
|------|-----|------|
| blue-50 | `#E8F3FF` | 선택 상태 배경, 라이트 블루 |
| blue-100 | `#C9E2FF` | 연한 블루 채움 |
| blue-200 | `#90C2FF` | 호버/활성 블루 배경 |
| blue-400 | `#3182F6` | **TDS Primary 블루** (UI 컴포넌트) |
| blue-500 | `#0064FF` | **브랜드 블루** (로고, 공식 브랜드) |
| blue-600 | `#0054D1` | 눌린/활성 블루 |

> **참고**: `#0064FF` (브랜드 블루)와 `#3182F6` (UI Primary 블루)는 용도가 다릅니다.
> ChaebolMap은 UI Primary인 `#3182F6`를 사용합니다.

### A.2 Toss Cool Gray Scale

| 토큰 | HEX | 용도 |
|------|-----|------|
| gray-50 | `#F2F4F6` | 최연한 배경, 라이트 모드 앱 배경 |
| gray-100 | `#E5E8EB` | 라이트 보더, 구분선 |
| gray-200 | `#D1D6DB` | 비활성 상태, 보조 보더 |
| gray-300 | `#B0B8C1` | 플레이스홀더 텍스트 |
| gray-400 | `#8B95A1` | 3차 텍스트, 캡션 |
| gray-500 | `#6B7684` | 보조 텍스트 |
| gray-600 | `#4E5968` | 본문 (보조) |
| gray-700 | `#333D4B` | 본문 (주요), 다크 보더 |
| gray-800 | `#191F28` | **다크 모드 배경**, 헤딩 |
| gray-900 | `#111111` | 가장 어두운 표면 |

### A.3 Toss Product Sans 폰트

토스 자체 개발 프로프라이어터리 폰트. 산돌과 협업 (2020-2021):

```css
/* 웹 폰트 로드 (라이선스 필요) */
@import url('https://static.toss.im/tps/main.css');
@import url('https://static.toss.im/tps/others.css');
```

- 금융 기호 (%, 콤마, +, -, 화살표)의 크기/여백 최적화
- 숫자·라틴 문자가 한글보다 약간 두껍게 디자인
- 7가지 폰트 가중치 지원
- **오픈소스 대안**: Pretendard

### A.4 OKLCH 컬러 시스템

TDS는 7년 만에 컬러 시스템을 전면 개편하며 **OKLCH 색공간**을 도입:

- 인지적으로 균일한 색공간으로 시각적 일관성 확보
- 밝기·채도·색상 변화가 서로 간섭하지 않음
- 라이트/다크 모드 간 명도 기준 통일
- 다양한 플랫폼(iOS, Android, Web) 대응
