import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getWeekDates } from "@/utils/dateUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const week = Number(searchParams.get("week"));

  if (!year || !week) {
    return NextResponse.json({ error: "year와 week 파라미터 필요" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // 기존 보고서 조회
    let { rows: [report] } = await client.query(
      "SELECT * FROM weekly_reports WHERE year = $1 AND week_number = $2",
      [year, week]
    );

    // 없으면 자동 생성
    if (!report) {
      const { startDate, endDate } = getWeekDates(year, week);
      const { rows: [newReport] } = await client.query(
        "INSERT INTO weekly_reports (year, week_number, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *",
        [year, week, startDate, endDate]
      );
      report = newReport;
    }

    // 작업 조회
    const { rows: tasks } = await client.query(
      "SELECT * FROM daily_tasks WHERE report_id = $1 ORDER BY day_of_week, sort_order",
      [report.id]
    );

    // 각 작업의 자재 조회
    for (const task of tasks) {
      const { rows: materials } = await client.query(
        `SELECT tm.*,
          json_build_object('id', p.id, 'code', p.code, 'name', p.name, 'category', p.category, 'unit', p.unit, 'current_stock', p.current_stock, 'total_in', p.total_in, 'total_out', p.total_out, 'min_stock', p.min_stock, 'is_active', p.is_active) as product,
          CASE WHEN l.id IS NOT NULL THEN json_build_object('id', l.id, 'name', l.name) ELSE NULL END as location
        FROM task_materials tm
        LEFT JOIN products p ON tm.product_id = p.id
        LEFT JOIN locations l ON tm.location_id = l.id
        WHERE tm.task_id = $1`,
        [task.id]
      );
      task.materials = materials;
    }

    return NextResponse.json({ ...report, tasks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서버 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}
