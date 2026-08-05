# stock1 — 주식 관련 프로젝트 모음

주식/지분 관련 프로젝트를 한 곳에서 관리하는 저장소입니다.

## 구성

| 폴더 | 프로젝트 | 설명 |
|------|----------|------|
| [`chaebol-ownership/`](./chaebol-ownership) | 재벌 소유지분도 | 한국 5대 재벌(삼성·SK·현대차·LG·롯데) 소유지분 구조 인터랙티브 그래프 + 실시간 주가 (Next.js, Supabase, Yahoo Finance) |
| [`chaebol-map/`](./chaebol-map) | ChaebolMap | 대기업 그룹 소유지분도 시각화 이전 버전 |

각 폴더는 원래 별도 저장소([chaebol-ownership](https://github.com/Renzo-99/chaebol-ownership), [chaebol-map](https://github.com/Renzo-99/chaebol-map))였으며, 커밋 히스토리를 보존한 채 이 저장소로 이관했습니다.

## 개발

각 프로젝트 폴더로 이동해서 개별적으로 실행합니다:

```bash
cd chaebol-ownership
npm install
npm run dev
```

## Vercel 배포

Vercel 프로젝트 설정에서 **Root Directory**를 해당 폴더(`chaebol-ownership` 등)로 지정하면 모노레포 하위 폴더 단위로 배포할 수 있습니다.
