import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle,
} from "docx";
import type { DailyTask } from "@/types";

const DAY_NAMES = ["월요일", "화요일", "수요일", "목요일", "금요일"];

interface ExportData {
  startDate: string;
  endDate: string;
  tasks: DailyTask[];
}

function formatDateRange(startDate: string, endDate: string) {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [, , ed] = endDate.split("-").map(Number);
  return `${sy}년 ${sm}월 ${sd}일~${ed}일`;
}

function getDayDate(startDate: string, dayOfWeek: number) {
  const [y, m, d] = startDate.split("-").map(Number);
  const date = new Date(y, m - 1, d + dayOfWeek);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
};

function createHeaderRow() {
  const headers = ["순번", "작업 사항", "자재 품목", "사용", "재고", "비고"];
  const widths = [800, 4500, 2800, 700, 700, 700];

  return new TableRow({
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        borders: BORDER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: h, bold: true, size: 20, font: "맑은 고딕" })],
          }),
        ],
      })
    ),
  });
}

function createTaskRows(task: DailyTask, idx: number): TableRow[] {
  const materials = task.materials || [];
  const widths = [800, 4500, 2800, 700, 700, 700];

  if (materials.length === 0) {
    const cells = [String(idx + 1), task.description, "", "", "", ""];
    return [new TableRow({
      children: cells.map((text, i) =>
        new TableCell({
          width: { size: widths[i], type: WidthType.DXA },
          borders: BORDER,
          children: [
            new Paragraph({
              alignment: i === 0 || i >= 3 ? AlignmentType.CENTER : AlignmentType.LEFT,
              children: [new TextRun({ text, size: 20, font: "맑은 고딕" })],
            }),
          ],
        })
      ),
    })];
  }

  return materials.map((mat, mi) => {
    const cells = [
      mi === 0 ? String(idx + 1) : "",
      mi === 0 ? task.description : "",
      mat.product?.name || "",
      String(mat.quantity),
      mat.product ? String(mat.product.current_stock) : "",
      "",
    ];
    return new TableRow({
      children: cells.map((text, i) =>
        new TableCell({
          width: { size: widths[i], type: WidthType.DXA },
          borders: BORDER,
          children: [
            new Paragraph({
              alignment: i === 0 || i >= 3 ? AlignmentType.CENTER : AlignmentType.LEFT,
              children: [new TextRun({ text, size: 20, font: "맑은 고딕" })],
            }),
          ],
        })
      ),
    });
  });
}

export async function generateWeeklyReport(data: ExportData): Promise<Buffer> {
  const { startDate, endDate, tasks } = data;

  const sections: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "<주간 업무 보고>", bold: true, size: 32, font: "맑은 고딕" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: "― 목 공 실 ―", size: 24, font: "맑은 고딕" }),
        new TextRun({ text: `    ${formatDateRange(startDate, endDate)}`, size: 24, font: "맑은 고딕" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({ text: "< 작업 사항 및 자재 사용 내역>", bold: true, size: 24, font: "맑은 고딕" }),
      ],
    }),
  ];

  // 요일별 테이블 생성
  for (let day = 0; day < 5; day++) {
    const dayTasks = tasks.filter((t) => t.day_of_week === day).sort((a, b) => a.sort_order - b.sort_order);

    sections.push(
      new Paragraph({
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text: `  ${DAY_NAMES[day]} (${getDayDate(startDate, day)})`,
            bold: true,
            size: 22,
            font: "맑은 고딕",
          }),
        ],
      })
    );

    if (dayTasks.length > 0) {
      sections.push(
        new Table({
          width: { size: 10200, type: WidthType.DXA },
          rows: [
            createHeaderRow(),
            ...dayTasks.flatMap((t, i) => createTaskRows(t, i)),
          ],
        })
      );
    } else {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: "  (작업 없음)", size: 20, font: "맑은 고딕", color: "999999" })],
        })
      );
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
        },
      },
      children: sections,
    }],
  });

  return await Packer.toBuffer(doc) as unknown as Buffer;
}
