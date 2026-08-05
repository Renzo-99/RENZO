/**
 * 국회입법조사처 발간물/연구보고서 수집 + 투자 트랙 분류 (서버 전용)
 *
 * 데이터 소스 (2계열):
 * 1) 공공데이터포털(data.go.kr) — 국회입법조사처_발간물
 *    End Point: http://apis.data.go.kr/9735000/PublicationService
 *    인증키: DATA_GO_KR_API_KEY (포털에서 발급된 "인코딩" 키를 그대로 사용)
 * 2) 열린국회정보(open.assembly.go.kr) — 연구보고서 4종
 *    패턴: https://open.assembly.go.kr/portal/openapi/{서비스코드}?KEY=...&Type=json
 *    인증키: ASSEMBLY_API_KEY
 *    서비스코드: 데이터셋별로 다르며 활용신청 페이지의 "요청주소"에서 확인해
 *    아래 환경변수에 넣는다 (코드 수정 없이 Vercel 환경변수로 관리).
 */

export type TrackId =
  | "semiconductor"
  | "trade"
  | "security"
  | "energy"
  | "finance";

/** 투자 트랙 정의 — 제목 키워드 매칭으로 자동 분류 */
export const TRACKS: Record<TrackId, { label: string; keywords: string[] }> = {
  semiconductor: {
    label: "반도체·공급망",
    keywords: ["반도체", "HBM", "공급망", "핵심광물", "수출통제", "팍스 실리카"],
  },
  trade: {
    label: "통상·무역",
    keywords: ["통상", "관세", "FTA", "대미투자", "무역법"],
  },
  security: {
    label: "안보·지정학",
    keywords: ["북한", "중국", "한미동맹", "방위산업", "안보"],
  },
  energy: {
    label: "에너지·원자재",
    keywords: ["전력", "원전", "재생에너지", "에너지", "원자재", "유류"],
  },
  finance: {
    label: "금융·지배구조",
    keywords: ["자본시장", "기업지배구조", "금융", "세제"],
  },
};

export interface Publication {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  date: string; // YYYY-MM-DD (파싱 실패 시 원문 유지)
  /** 호수·저자 등 부가 정보 (정적 수집 데이터에만 존재) */
  meta?: string;
  link: string;
  tracks: TrackId[];
}

export interface SourceStatus {
  id: string;
  name: string;
  ok: boolean;
  count: number;
  /** 실패/미설정 사유 (사용자 안내용, 키 값은 절대 포함하지 않음) */
  error?: string;
}

export interface PublicationFeed {
  updatedAt: string;
  items: Publication[];
  statuses: SourceStatus[];
}

interface AssemblySource {
  id: string;
  name: string;
  type: "assembly";
  /** 열린국회정보 서비스코드가 담긴 환경변수 이름 */
  codeEnv: string;
}

interface DataGoSource {
  id: string;
  name: string;
  type: "datago";
  endpoint: string;
}

type Source = AssemblySource | DataGoSource;

const SOURCES: Source[] = [
  {
    id: "publication",
    name: "국회입법조사처_발간물",
    type: "datago",
    endpoint:
      "http://apis.data.go.kr/9735000/PublicationService/getResearchReportList",
  },
  {
    id: "nars-analysis",
    name: "연구보고서(NARS 현안분석)",
    type: "assembly",
    codeEnv: "ASSEMBLY_SVC_NARS_ANALYSIS",
  },
  {
    id: "issue-point",
    name: "연구보고서(이슈와 논점)",
    type: "assembly",
    codeEnv: "ASSEMBLY_SVC_ISSUE_POINT",
  },
  {
    id: "policy-report",
    name: "연구보고서(입법·정책보고서)",
    type: "assembly",
    codeEnv: "ASSEMBLY_SVC_POLICY_REPORT",
  },
  {
    id: "impact-analysis",
    name: "연구보고서(입법영향분석보고서)",
    type: "assembly",
    codeEnv: "ASSEMBLY_SVC_IMPACT_ANALYSIS",
  },
];

const PAGE_SIZE = 30;
const FETCH_TIMEOUT_MS = 10000;

/** 제목 키워드 매칭으로 투자 트랙 분류 (복수 트랙 허용) */
export function classifyTracks(title: string): TrackId[] {
  const matched: TrackId[] = [];
  for (const [trackId, track] of Object.entries(TRACKS)) {
    if (track.keywords.some((kw) => title.includes(kw))) {
      matched.push(trackId as TrackId);
    }
  }
  return matched;
}

/** 다양한 날짜 표기(YYYY-MM-DD, YYYY.MM.DD, YYYYMMDD)를 YYYY-MM-DD로 정규화 */
export function normalizeDate(raw: string): string {
  const m = raw.match(/(\d{4})[-./년\s]*(\d{1,2})[-./월\s]*(\d{1,2})/);
  if (!m) return raw;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/**
 * 응답 레코드에서 제목/날짜/링크를 휴리스틱으로 추출.
 * 공공 API마다 필드명이 제각각이라(TITLE, SJ, reprtNm, pblcatDe 등)
 * 필드명 패턴 + 값 형태를 함께 보고 판단한다.
 */
export function extractFields(
  row: Record<string, unknown>
): { title: string; date: string; link: string } | null {
  let title = "";
  let date = "";
  let link = "";
  let longestText = "";

  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const v = String(value).trim();
    if (!v) continue;

    if (!link && /^https?:\/\//.test(v)) {
      link = v;
      continue;
    }
    if (/(TITLE|SUBJECT|^SJ$|_SJ$|TTL|NM$|명$)/i.test(key) && v.length > title.length) {
      title = v;
      continue;
    }
    if (
      /(DT$|DATE|YMD|_DE$|일자|날짜)/i.test(key) &&
      /\d{4}/.test(v) &&
      !date
    ) {
      date = normalizeDate(v);
      continue;
    }
    // 필드명으로 못 찾을 때를 대비해 가장 긴 텍스트를 제목 후보로 보관
    if (v.length > longestText.length && !/^\d+$/.test(v)) longestText = v;
  }

  if (!title) title = longestText;
  if (!title) return null;
  return { title, date, link };
}

/** fetch + 타임아웃 공통 처리 */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      // 상위 라우트의 revalidate(1일)를 따르므로 여기서는 캐시 무효화하지 않음
    });
  } finally {
    clearTimeout(timer);
  }
}

/** 열린국회정보 표준 응답에서 row 배열 추출 */
export function parseAssemblyRows(json: unknown): Record<string, unknown>[] {
  if (!json || typeof json !== "object") return [];
  const root = json as Record<string, unknown>;

  // 오류 응답: { RESULT: { CODE: "INFO-200", ... } }
  const topResult = root.RESULT as Record<string, unknown> | undefined;
  if (topResult?.CODE && String(topResult.CODE) !== "INFO-000") {
    throw new Error(`API 오류: ${topResult.CODE} ${topResult.MESSAGE ?? ""}`);
  }

  // 정상 응답: { {서비스코드}: [ { head: [...] }, { row: [...] } ] }
  for (const value of Object.values(root)) {
    if (!Array.isArray(value)) continue;
    for (const part of value) {
      const rows = (part as Record<string, unknown>)?.row;
      if (Array.isArray(rows)) return rows as Record<string, unknown>[];
    }
  }
  return [];
}

/** 간이 XML 파서 — data.go.kr 기본(XML) 응답의 <item> 목록을 객체로 변환 */
export function parseXmlItems(xml: string): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRe.exec(xml)) !== null) {
    // 바깥 <item> 태그를 제외한 내부 내용만 필드 단위로 파싱한다
    const inner = itemMatch[1];
    const obj: Record<string, unknown> = {};
    const fieldRe = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let m: RegExpExecArray | null;
    while ((m = fieldRe.exec(inner)) !== null) {
      obj[m[1]] = m[2]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim();
    }
    items.push(obj);
  }
  return items;
}

/** data.go.kr XML 오류 응답(resultCode 등) 검사 */
function checkDataGoError(xml: string): void {
  const code = xml.match(/<resultCode>(.*?)<\/resultCode>/)?.[1];
  const msg = xml.match(/<resultMsg>(.*?)<\/resultMsg>/)?.[1];
  const authMsg = xml.match(/<returnAuthMsg>(.*?)<\/returnAuthMsg>/)?.[1];
  if (authMsg) throw new Error(`인증 오류: ${authMsg}`);
  if (code && code !== "00" && code !== "0") {
    throw new Error(`API 오류: ${code} ${msg ?? ""}`);
  }
}

/** 소스 1개 수집 → Publication 목록 */
async function fetchSource(source: Source): Promise<Publication[]> {
  let rows: Record<string, unknown>[] = [];

  if (source.type === "assembly") {
    const key = process.env.ASSEMBLY_API_KEY;
    if (!key) throw new Error("ASSEMBLY_API_KEY 환경변수가 설정되지 않았습니다");
    const code = process.env[source.codeEnv];
    if (!code) {
      throw new Error(
        `${source.codeEnv} 환경변수(열린국회정보 서비스코드)가 설정되지 않았습니다. ` +
          `활용신청 페이지의 요청주소(portal/openapi/ 뒤 문자열)를 넣어주세요`
      );
    }
    const url =
      `https://open.assembly.go.kr/portal/openapi/${code}` +
      `?KEY=${encodeURIComponent(key)}&Type=json&pIndex=1&pSize=${PAGE_SIZE}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rows = parseAssemblyRows(await res.json());
  } else {
    const key = process.env.DATA_GO_KR_API_KEY;
    if (!key) throw new Error("DATA_GO_KR_API_KEY 환경변수가 설정되지 않았습니다");
    // 주의: 공공데이터포털 "인코딩" 키는 이미 URL 인코딩된 상태이므로
    // 재인코딩 없이 그대로 이어붙인다.
    const url =
      `${source.endpoint}?serviceKey=${key}` +
      `&pageNo=1&numOfRows=${PAGE_SIZE}&resultType=json`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.trimStart().startsWith("<")) {
      checkDataGoError(text);
      rows = parseXmlItems(text);
    } else {
      const json = JSON.parse(text) as Record<string, unknown>;
      // 표준 구조: response.body.items.item / 변형 대비 재귀 탐색
      rows = findItemArray(json);
    }
  }

  const items: Publication[] = [];
  rows.forEach((row, i) => {
    const fields = extractFields(row);
    if (!fields) return;
    items.push({
      id: `${source.id}-${i}-${fields.date}`,
      sourceId: source.id,
      sourceName: source.name,
      title: fields.title,
      date: fields.date,
      link: fields.link,
      tracks: classifyTracks(fields.title),
    });
  });
  return items;
}

/** JSON 응답에서 레코드 배열을 재귀적으로 탐색 (item/items/list 등 변형 대응) */
function findItemArray(json: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 5 || !json || typeof json !== "object") return [];
  if (Array.isArray(json)) {
    return json.filter(
      (x): x is Record<string, unknown> => !!x && typeof x === "object"
    );
  }
  for (const value of Object.values(json as Record<string, unknown>)) {
    const found = findItemArray(value, depth + 1);
    if (found.length) return found;
  }
  return [];
}

/** 전체 소스 수집 + 날짜 내림차순 정렬. 일부 소스 실패는 statuses로 보고 */
export async function fetchAllPublications(): Promise<PublicationFeed> {
  const results = await Promise.allSettled(SOURCES.map(fetchSource));

  const items: Publication[] = [];
  const statuses: SourceStatus[] = results.map((result, i) => {
    const source = SOURCES[i];
    if (result.status === "fulfilled") {
      items.push(...result.value);
      return {
        id: source.id,
        name: source.name,
        ok: true,
        count: result.value.length,
      };
    }
    const message =
      result.reason instanceof Error ? result.reason.message : "알 수 없는 오류";
    return { id: source.id, name: source.name, ok: false, count: 0, error: message };
  });

  items.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  return { updatedAt: new Date().toISOString(), items, statuses };
}
