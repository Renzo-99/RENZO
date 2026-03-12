import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getWeekDates } from "@/utils/dateUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const week = Number(searchParams.get("week"));

  if (!year || !week) {
    return NextResponse.json({ error: "year와 week 파라미터 필요" }, { status: 400 });
  }

  try {
    // 기존 보고서 조회
    const { data: existing, error: fetchErr } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("year", year)
      .eq("week_number", week)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    let report = existing;

    // 없으면 자동 생성
    if (!report) {
      const { startDate, endDate } = getWeekDates(year, week);
      const { data: newReport, error: insertErr } = await supabase
        .from("weekly_reports")
        .insert({ year, week_number: week, start_date: startDate, end_date: endDate })
        .select()
        .single();

      if (insertErr) throw insertErr;
      report = newReport;
    }

    // 작업 + 자재 + 상품/장소 조회
    const { data: tasks, error: taskErr } = await supabase
      .from("daily_tasks")
      .select("*, task_materials(*, product:products(*), location:locations(id, name))")
      .eq("report_id", report.id)
      .order("day_of_week")
      .order("sort_order");

    if (taskErr) throw taskErr;

    // task_materials → materials 키로 변환 (기존 API 형태 유지)
    const tasksWithMaterials = (tasks || []).map((task) => {
      const { task_materials, ...rest } = task;
      return { ...rest, materials: task_materials || [] };
    });

    return NextResponse.json({ ...report, tasks: tasksWithMaterials });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
