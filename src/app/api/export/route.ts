import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateWeeklyReport } from "@/utils/exportDocx";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reportId = Number(searchParams.get("reportId"));

  if (!reportId) {
    return NextResponse.json({ error: "reportId 필요" }, { status: 400 });
  }

  try {
    // 보고서 조회
    const { data: report, error: reportErr } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportErr) throw reportErr;
    if (!report) {
      return NextResponse.json({ error: "보고서 없음" }, { status: 404 });
    }

    // 작업 + 자재 + 상품 조회
    const { data: tasks, error: taskErr } = await supabase
      .from("daily_tasks")
      .select("*, task_materials(*, product:products(id, code, name, current_stock, unit))")
      .eq("report_id", reportId)
      .order("day_of_week")
      .order("sort_order");

    if (taskErr) throw taskErr;

    // task_materials → materials 키로 변환
    const tasksWithMaterials = (tasks || []).map((task) => {
      const { task_materials, ...rest } = task;
      return { ...rest, materials: task_materials || [] };
    });

    const buffer = await generateWeeklyReport({
      startDate: report.start_date,
      endDate: report.end_date,
      tasks: tasksWithMaterials,
    });

    const uint8 = new Uint8Array(buffer);
    return new NextResponse(uint8, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="weekly_report_${report.year}_W${report.week_number}.docx"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
