# DESIGN.md — 디자인 시스템

## 디자인 레퍼런스

- **Toss (토스)** — 핵심 레퍼런스. 카드 기반 레이아웃, 넉넉한 여백, 단계적 정보 공개
- **Toss 증권** — 금융 데이터 색상 체계 (상승=빨강, 하락=파랑)
- **네이버 증권** — 소유지분도 정보 구조 참고

### Toss 6대 UX 원칙
1. 1 Thing per 1 Page (한 화면에 하나의 목표)
2. Casual Concept (어려운 금융 개념을 친숙하게)
3. Minimum Features (있으면 좋은 기능은 안 만듦)
4. Clear CTA (명확한 다음 단계)
5. Minimum Policy (알아야 할 것 최소화)
6. Minimum Input (최소한의 입력)

---

## 색상 팔레트

### 기본 색상
| 토큰 | 값 | 용도 |
|------|------|------|
| toss-blue | #0064FF | 주요 액센트 |
| toss-blue-light | #4B93FF | 호버/활성 |
| toss-blue-dark | #0054D9 | 눌린 상태 |

### 그레이스케일
| 토큰 | 값 | 용도 |
|------|------|------|
| gray-50 | #F9FAFB | 배경 |
| gray-100 | #F2F4F6 | 카드 배경 |
| gray-200 | #E5E8EB | 구분선 |
| gray-500 | #8B95A1 | 보조 텍스트 |
| gray-700 | #4E5968 | 본문 텍스트 |
| gray-900 | #191F28 | 제목/강조 |

### 주가 색상 (한국 관행)
| 토큰 | 값 | 의미 |
|------|------|------|
| stock-up | #F04452 | 상승 (빨간) |
| stock-down | #3182F6 | 하락 (파란) |
| stock-flat | #8B95A1 | 보합 (회색) |

### 재벌 그룹별 색상
| 그룹 | 값 |
|------|------|
| 삼성 | #1428A0 |
| SK | #EA002C |
| 현대차 | #002C5F |
| LG | #A50034 |
| 롯데 | #E60012 |

---

## 타이포그래피

- **폰트**: Pretendard (Toss Product Sans 무료 대안)
- CDN: `pretendard@v1.3.9`
- 폴백: -apple-system, BlinkMacSystemFont, system-ui, Noto Sans KR

| 용도 | 크기 | 행간 | 굵기 |
|------|------|------|------|
| 디스플레이 | 36px | 44px | 700 |
| 제목 1 | 26px | 34px | 700 |
| 제목 2 | 22px | 30px | 700 |
| 본문 | 16px | 24px | 400 |
| 캡션 | 14px | 20px | 400 |

---

## UI 컴포넌트

### 사용 라이브러리
- **shadcn/ui** — 주요 UI 컴포넌트 (Card, Button, Badge, Skeleton, Tooltip 등)
- **Radix UI** — shadcn/ui 기반 Headless 접근성 프리미티브
- **Tailwind CSS 4+** — 유틸리티 기반 스타일링
- **Framer Motion** — 페이지 전환, 카드 호버 애니메이션
- **React Flow 내장 UI** — MiniMap, Controls, Background

### shadcn/ui 활용 계획
| 컴포넌트 | 용도 |
|----------|------|
| Card | 재벌 카드, 회사 정보 카드 |
| Button | 레이아웃 전환, 네비게이션 |
| Badge | 지분율 라벨, 섹터 태그 |
| Skeleton | 데이터 로딩 상태 |
| Tooltip | 노드 호버 시 상세 정보 |
| Separator | 섹션 구분선 |

### 핵심 컴포넌트
| 컴포넌트 | 설명 |
|----------|------|
| ChaebolCard | 재벌 그룹 선택 카드 (그룹명, 총수, 자산규모, 테마컬러) |
| CompanyNode | React Flow 커스텀 노드 (회사 정보 카드) |
| OwnershipEdge | React Flow 커스텀 엣지 (지분율 라벨) |
| StockPrice | 주가 표시 (현재가, 등락률, 색상) |

### 카드 스타일
- 배경: white
- 둥글기: 16px
- 그림자: `0 2px 8px rgba(0,0,0,0.08)`
- 패딩: 20px
- 터치 타깃: 최소 7mm, 인접 요소 간 13px

### 그래프 노드 스타일
- entity_type별 테두리 색상: holding=#1a56db, subsidiary=#047857, individual=#9333ea
- 노드 최소 너비: 180px
- 노드 내 정보 계층: 회사명 → 종목코드 → 시총/주가

### 그래프 엣지 스타일
- 50% 초과 지분: 굵은 파란선 (2.5px, #1a56db)
- 50% 이하: 얇은 회색선 (1.5px, #9ca3af)
- 간접 출자: 점선 (`strokeDasharray: '5,5'`)
- 지분율 라벨: 알약형 배지 (11px, bold, white text)
