import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateWeeklyReport } from "@/utils/exportDocx";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reportId = Number(searchParams.get("reportId"));

  if (!reportId) {
    return NextResponse.json({ error: "reportId 필요" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const { rows: [report] } = await client.query(
      "SELECT * FROM weekly_reports WHERE id = $1", [reportId]
    );

    if (!report) {
      return NextResponse.json({ error: "보고서 없음" }, { status: 404 });
    }

    const { rows: tasks } = await client.query(
      "SELECT * FROM daily_tasks WHERE report_id = $1 ORDER BY day_of_week, sort_order",
      [reportId]
    );

    for (const task of tasks) {
      const { rows: materials } = await client.query(
        `SELECT tm.*,
          json_build_object('id', p.id, 'code', p.code, 'name', p.name, 'current_stock', p.current_stock, 'unit', p.unit) as product
        FROM task_materials tm
        LEFT JOIN products p ON tm.product_id = p.id
        WHERE tm.task_id = $1`,
        [task.id]
      );
      task.materials = materials;
    }

    // PostgreSQL DATE → "YYYY-MM-DD" 문자열 변환
    const toDateStr = (d: Date | string) =>
      d instanceof Date ? d.toISOString().split("T")[0] : String(d);

    const buffer = await generateWeeklyReport({
      startDate: toDateStr(report.start_date),
      endDate: toDateStr(report.end_date),
      tasks,
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
  } finally {
    client.release();
  }
}
