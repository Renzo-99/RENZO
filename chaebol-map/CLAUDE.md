# CLAUDE.md — ChaebolMap 프로젝트 가이드

## 프로젝트 개요
한국 대기업 그룹(재벌) 소유지분도를 인터랙티브하게 시각화하는 Next.js 웹 애플리케이션.

## 기술 스택
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: shadcn/ui + Tailwind CSS
- **Graph**: React Flow (@xyflow/react)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Deploy**: Vercel
- **State**: Zustand
- **Charts**: Recharts

## 프로젝트 구조
```
src/
├── app/                    # Next.js App Router 페이지
│   ├── (auth)/             # 인증 관련 (로그인, 회원가입)
│   ├── (main)/             # 메인 레이아웃 (네비게이션 포함)
│   │   ├── dashboard/      # 대시보드
│   │   ├── groups/         # 그룹 목록 및 지분도
│   │   ├── companies/      # 회사 상세
│   │   ├── compare/        # 그룹 비교
│   │   └── settings/       # 설정
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 랜딩 페이지
│   └── globals.css         # 전역 스타일
├── components/
│   ├── ui/                 # shadcn/ui 컴포넌트
│   ├── graph/              # React Flow 관련 컴포넌트
│   │   ├── OwnershipGraph.tsx    # 메인 그래프 컴포넌트
│   │   ├── CompanyNode.tsx       # 회사 커스텀 노드
│   │   ├── ControllerNode.tsx    # 동일인 커스텀 노드
│   │   ├── OwnershipEdge.tsx     # 지분 관계 커스텀 엣지
│   │   └── GraphControls.tsx     # 줌/패닝 컨트롤
│   ├── layout/             # 레이아웃 컴포넌트 (Nav, Sidebar 등)
│   └── shared/             # 공통 컴포넌트
├── lib/
│   ├── supabase/           # Supabase 클라이언트 설정
│   ├── utils.ts            # 유틸리티 함수
│   └── constants.ts        # 상수 정의
├── hooks/                  # 커스텀 훅
├── stores/                 # Zustand 스토어
├── types/                  # TypeScript 타입 정의
└── data/                   # 시드 데이터 (JSON) — 29개 그룹
    ├── samsung.json        # 삼성
    ├── sk.json             # SK
    ├── hyundai.json        # 현대자동차
    ├── lg.json             # LG
    ├── lotte.json          # 롯데
    ├── posco.json          # 포스코
    ├── hanwha.json         # 한화
    ├── hd-hyundai.json     # HD현대
    ├── gs.json             # GS
    ├── shinsegae.json      # 신세계
    ├── hanjin.json         # 한진
    ├── kt.json             # KT
    ├── cj.json             # CJ
    ├── ls.json             # LS
    ├── kakao.json          # 카카오
    ├── doosan.json         # 두산
    ├── dl.json             # DL
    ├── jungheung.json      # 중흥건설
    ├── celltrion.json      # 셀트리온
    ├── naver.json          # 네이버
    ├── mirae-asset.json    # 미래에셋
    ├── coupang.json        # 쿠팡
    ├── hankook.json        # 한국앤컴퍼니
    ├── booyoung.json       # 부영
    ├── youngpoong.json     # 영풍
    ├── harim.json          # 하림
    ├── hyosung.json        # 효성
    ├── sm.json             # SM(삼라마이다스)
    └── hdc.json            # HDC
```

## 코딩 컨벤션

### 일반
- TypeScript strict mode 사용
- ESLint + Prettier 설정 준수
- 함수형 컴포넌트 + hooks 패턴
- 파일명: PascalCase (컴포넌트), camelCase (유틸/훅)
- 한국어 주석 허용, 변수/함수명은 영문

### 컴포넌트
- `'use client'` 지시어는 필요한 컴포넌트에만 사용
- Props 타입은 컴포넌트 파일 내에 정의
- 서버 컴포넌트 우선, 클라이언트 컴포넌트 최소화

### 데이터
- Supabase RLS(Row Level Security) 활성화
- API는 Next.js Route Handler 사용
- 데이터 페칭은 서버 컴포넌트에서 수행

### 스타일
- Tailwind CSS utility-first
- shadcn/ui 컴포넌트 적극 활용
- 커스텀 CSS는 최소화
- 다크 모드 기본, 라이트 모드 지원

## 주요 명령어
```bash
npm run dev          # 개발 서버 (localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint 실행
npm run type-check   # TypeScript 타입 체크
```

## 환경 변수
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 참고 문서
- PRD.md — 제품 요구사항
- DESIGN.md — UI/UX 디자인 가이드
