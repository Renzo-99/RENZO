# 목공실 관리

주소: https://woodroom-hongik.vercel.app

| 파일 | 역할 |
|---|---|
| `index.html` | 목공실 관리 화면 (주간 보고서, 랜덤 채우기, 캘린더, 재고·입출고, 작업 이력·예정, 공사 의뢰) |
| `purchase.html` | 🛒 구매스펙 사이드 패널 (A-Spec 엑셀, A/B-Spec PDF, 네이버 견적 붙여넣기) |
| `sync.js` | 공유 저장: 입력값을 서버와 자동으로 맞춤 (다른 사람 변경은 몇 초 안에 반영) |
| `api/sync.mjs` | 공유 저장 API (Vercel Blob, private). `api/_lib/blob.mjs`는 @vercel/blob 2.8.0 번들 |
| `vendor/` | ExcelJS |
| `vercel.json` | 함수 리전(서울), 캐시 설정 |
| `tests/purchase` | 구매스펙 테스트 (`cd tests/purchase && npm install && npm test`) |
| `tests/sync/server.mjs` | 공유 저장 로컬 테스트 서버 (실제 API + 메모리 저장소) |
| `.github/` | 다른 프로젝트(주식 대시보드)의 자동 작업 — 목공실과 무관, 지우지 말 것 |

예전 GitHub Pages 주소(renzo-99.github.io/RENZO)로 열어도 같은 서버에 저장되어 함께 보입니다.
