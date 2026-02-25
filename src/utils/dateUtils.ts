import { startOfISOWeek, endOfISOWeek, addDays, format, getISOWeek, getISOWeekYear } from "date-fns";
import { ko } from "date-fns/locale";

const DAY_NAMES = ["월요일", "화요일", "수요일", "목요일", "금요일"];

export function getCurrentWeek() {
  const now = new Date();
  return {
    year: getISOWeekYear(now),
    week: getISOWeek(now),
  };
}

export function getWeekDates(year: number, week: number) {
  const jan4 = new Date(year, 0, 4);
  const startOfFirstWeek = startOfISOWeek(jan4);
  const weekStart = addDays(startOfFirstWeek, (week - 1) * 7);
  const weekEnd = addDays(weekStart, 4); // 금요일

  return {
    startDate: format(weekStart, "yyyy-MM-dd"),
    endDate: format(weekEnd, "yyyy-MM-dd"),
  };
}

export function getDayInfo(startDate: string, dayOfWeek: number) {
  const start = new Date(startDate);
  const date = addDays(start, dayOfWeek);

  return {
    dayOfWeek,
    dayName: DAY_NAMES[dayOfWeek],
    date: format(date, "M월 d일"),
    fullDate: format(date, "yyyy-MM-dd"),
  };
}

export function formatWeekRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${format(start, "yyyy.MM.dd")} ~ ${format(end, "MM.dd")}`;
}

export function formatWeekRangeWithDay(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${format(start, "M.dd", { locale: ko })}(${format(start, "EEE", { locale: ko })}) ~ ${format(end, "M.dd", { locale: ko })}(${format(end, "EEE", { locale: ko })})`;
}
