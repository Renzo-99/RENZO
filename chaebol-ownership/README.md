This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 투자 참고자료 보드 (/reports)

국회입법조사처 발간물·연구보고서 5종을 수집해 투자 트랙(반도체·공급망 / 통상·무역 / 안보·지정학 / 에너지·원자재 / 금융·지배구조)별로 분류해 보여준다. 갱신 주기는 1일 1회(ISR).

### 설정

1. `.env.example`을 참고해 Vercel 환경변수(또는 로컬 `.env.local`)에 인증키를 넣는다.
   - `ASSEMBLY_API_KEY` — 열린국회정보 인증키 (연구보고서 4종)
   - `DATA_GO_KR_API_KEY` — 공공데이터포털 "인코딩" 인증키 (발간물)
2. 열린국회정보 서비스코드 4개를 환경변수로 넣는다. 각 데이터셋의 활용신청 페이지에서
   요청주소 `https://open.assembly.go.kr/portal/openapi/XXXXX`의 `XXXXX` 부분을 복사한다.
   - `ASSEMBLY_SVC_NARS_ANALYSIS` — 연구보고서(NARS 현안분석)
   - `ASSEMBLY_SVC_ISSUE_POINT` — 연구보고서(이슈와 논점)
   - `ASSEMBLY_SVC_POLICY_REPORT` — 연구보고서(입법·정책보고서)
   - `ASSEMBLY_SVC_IMPACT_ANALYSIS` — 연구보고서(입법영향분석보고서)
3. 배포 후 `/api/publications/health`에 접속하면 소스별 연결 상태를 바로 진단할 수 있다.
