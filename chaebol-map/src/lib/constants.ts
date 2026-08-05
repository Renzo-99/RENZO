/** 그룹 slug → 아이콘 이모지 매핑 */
export const GROUP_ICONS: Record<string, string> = {
  samsung: "🏢",
  sk: "⚡",
  hyundai: "🚗",
  lg: "📱",
  lotte: "🏬",
  posco: "🔩",
  hanwha: "🚀",
  "hd-hyundai": "🚢",
  gs: "⛽",
  shinsegae: "🛍️",
  hanjin: "✈️",
  kt: "📡",
  cj: "🎬",
  ls: "🔌",
  kakao: "💬",
  doosan: "⚙️",
  dl: "🏗️",
  jungheung: "🏠",
  celltrion: "💊",
  naver: "🌐",
  "mirae-asset": "📊",
  coupang: "📦",
  hankook: "🛞",
  booyoung: "🏘️",
  youngpoong: "⛏️",
  harim: "🐔",
  hyosung: "🧵",
  sm: "🚢",
  hdc: "🏙️",
};

/** 그룹 아이콘 조회 (기본값: 🏢) */
export function getGroupIcon(slug: string): string {
  return GROUP_ICONS[slug] ?? "🏢";
}
