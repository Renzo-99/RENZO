"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { usePlanStore, type Plan, type PlanAttachment } from "@/stores/planStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, Trash2, X, Paperclip, Download, FileText, Image, File } from "lucide-react";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const BUILDINGS = [
  "경영대학", "인문사회관C", "제4학관", "제1공학관", "본관", "도서관",
  "학생회관", "과학관", "예술관", "체육관", "기숙사", "연구동",
];

function fileToBase64(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image className="h-3 w-3" />;
  if (type.includes("pdf") || type.includes("document") || type.includes("text")) return <FileText className="h-3 w-3" />;
  return <File className="h-3 w-3" />;
}

export default function PlanTab() {
  const { plans, planFilter, loadPlans, addPlan, deletePlan, togglePlan, setPlanFilter, updatePlan } = usePlanStore();
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formDateEnd, setFormDateEnd] = useState("");
  const [formUseRange, setFormUseRange] = useState(false);
  const [formBuilding, setFormBuilding] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formFiles, setFormFiles] = useState<PlanAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const filtered = useMemo(() => {
    let list = [...plans];
    if (planFilter === "pending") list = list.filter((p) => !p.done);
    if (planFilter === "done") list = list.filter((p) => p.done);
    return list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.date.localeCompare(b.date);
    });
  }, [plans, planFilter]);

  const getDDay = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Today";
    return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: PlanAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`"${file.name}"은(는) 2MB를 초과합니다. (${formatFileSize(file.size)})`);
        continue;
      }
      const data = await fileToBase64(file);
      newAttachments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data,
      });
    }

    setFormFiles((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeFormFile = (index: number) => {
    setFormFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formDate || !formDesc) return;
    addPlan({
      date: formDate,
      dateEnd: formUseRange && formDateEnd ? formDateEnd : null,
      building: formBuilding,
      desc: formDesc,
      note: formNote,
      done: false,
      attachments: formFiles.length > 0 ? formFiles : undefined,
    });
    setShowForm(false);
    setFormDate("");
    setFormDateEnd("");
    setFormUseRange(false);
    setFormBuilding("");
    setFormDesc("");
    setFormNote("");
    setFormFiles([]);
  };

  const handleRemoveAttachment = (planId: number, fileIndex: number) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan?.attachments) return;
    const newAttachments = plan.attachments.filter((_, i) => i !== fileIndex);
    updatePlan(planId, { attachments: newAttachments.length > 0 ? newAttachments : undefined });
  };

  const handleAddAttachment = useCallback(async (planId: number, files: FileList) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const newAttachments: PlanAttachment[] = [...(plan.attachments || [])];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`"${file.name}"은(는) 2MB를 초과합니다. (${formatFileSize(file.size)})`);
        continue;
      }
      const data = await fileToBase64(file);
      newAttachments.push({ name: file.name, type: file.type, size: file.size, data });
    }
    updatePlan(planId, { attachments: newAttachments });
  }, [plans, updatePlan]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter buttons */}
      <div className="flex gap-1 mb-3">
        {([
          ["all", "전체"],
          ["pending", "예정"],
          ["done", "완료"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPlanFilter(key)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              planFilter === key
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex gap-2">
            <Input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="text-xs"
              placeholder="시작일"
            />
            <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
              <input
                type="checkbox"
                checked={formUseRange}
                onChange={(e) => setFormUseRange(e.target.checked)}
              />
              기간
            </label>
          </div>
          {formUseRange && (
            <Input
              type="date"
              value={formDateEnd}
              onChange={(e) => setFormDateEnd(e.target.value)}
              className="text-xs"
              placeholder="종료일"
            />
          )}
          <select
            value={formBuilding}
            onChange={(e) => setFormBuilding(e.target.value)}
            className="w-full border rounded-md px-2 py-1.5 text-xs"
          >
            <option value="">건물 선택 (선택사항)</option>
            {BUILDINGS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <Input
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="작업 내용"
            className="text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <Input
            value={formNote}
            onChange={(e) => setFormNote(e.target.value)}
            placeholder="비고 (선택사항)"
            className="text-xs"
          />

          {/* File attachment */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 hover:border-gray-400 rounded-md px-2.5 py-1.5 w-full transition-colors"
            >
              <Paperclip className="h-3.5 w-3.5" />
              첨부파일 추가 (최대 2MB/파일)
            </button>
            {formFiles.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {formFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-white rounded px-2 py-1 text-[11px]">
                    {getFileIcon(f.type)}
                    <span className="flex-1 truncate text-gray-700">{f.name}</span>
                    <span className="text-gray-400 shrink-0">{formatFileSize(f.size)}</span>
                    <button onClick={() => removeFormFile(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button size="sm" className="w-full" onClick={handleSubmit} disabled={!formDate || !formDesc}>
            저장
          </Button>
        </div>
      )}

      {/* Plan list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            {planFilter === "done" ? "완료된 작업이 없습니다" : "예정된 작업이 없습니다"}
          </p>
        ) : (
          filtered.map((plan) => (
            <PlanItem
              key={plan.id}
              plan={plan}
              onToggle={togglePlan}
              onDelete={deletePlan}
              onRemoveAttachment={handleRemoveAttachment}
              onAddAttachment={handleAddAttachment}
              getDDay={getDDay}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PlanItem({
  plan,
  onToggle,
  onDelete,
  onRemoveAttachment,
  onAddAttachment,
  getDDay,
}: {
  plan: Plan;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onRemoveAttachment: (planId: number, fileIndex: number) => void;
  onAddAttachment: (planId: number, files: FileList) => void;
  getDDay: (d: string) => string;
}) {
  const dday = getDDay(plan.date);
  const isOverdue = dday.startsWith("D+");
  const isToday = dday === "Today";
  const addFileRef = useRef<HTMLInputElement>(null);

  const handleDownload = (att: PlanAttachment) => {
    const a = document.createElement("a");
    a.href = att.data;
    a.download = att.name;
    a.click();
  };

  const handlePreview = (att: PlanAttachment) => {
    if (att.type.startsWith("image/")) {
      const w = window.open("");
      if (w) {
        w.document.write(`<img src="${att.data}" style="max-width:100%;height:auto" />`);
        w.document.title = att.name;
      }
    } else {
      handleDownload(att);
    }
  };

  return (
    <div
      className={`flex items-start gap-2 py-2 px-3 rounded-lg text-sm group ${
        plan.done ? "bg-gray-50 opacity-60" : "hover:bg-gray-50"
      }`}
    >
      <button
        onClick={() => onToggle(plan.id)}
        className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
          plan.done ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-gray-500"
        }`}
      >
        {plan.done && <Check className="h-3 w-3" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-mono ${isOverdue ? "text-red-500" : isToday ? "text-blue-600 font-bold" : "text-gray-400"}`}>
            {dday}
          </span>
          {plan.building && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              {plan.building}
            </Badge>
          )}
        </div>
        <p className={`text-sm ${plan.done ? "line-through text-gray-400" : "text-gray-800"}`}>
          {plan.desc}
        </p>
        {plan.dateEnd && (
          <p className="text-[10px] text-gray-400">
            {plan.date} ~ {plan.dateEnd}
          </p>
        )}
        {plan.note && (
          <p className="text-[10px] text-gray-400 mt-0.5">{plan.note}</p>
        )}

        {/* Attachments */}
        {plan.attachments && plan.attachments.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {plan.attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] bg-blue-50 rounded px-1.5 py-0.5">
                {getFileIcon(att.type)}
                <button
                  onClick={() => handlePreview(att)}
                  className="flex-1 truncate text-blue-700 hover:underline text-left"
                  title={att.name}
                >
                  {att.name}
                </button>
                <span className="text-blue-400 shrink-0">{formatFileSize(att.size)}</span>
                <button onClick={() => handleDownload(att)} className="text-blue-400 hover:text-blue-600 shrink-0" title="다운로드">
                  <Download className="h-2.5 w-2.5" />
                </button>
                <button onClick={() => onRemoveAttachment(plan.id, i)} className="text-blue-400 hover:text-red-500 shrink-0" title="삭제">
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add attachment to existing plan */}
        <input
          ref={addFileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddAttachment(plan.id, e.target.files);
              e.target.value = "";
            }
          }}
        />
        <button
          onClick={() => addFileRef.current?.click()}
          className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Paperclip className="h-2.5 w-2.5" />
          첨부
        </button>
      </div>
      <button
        onClick={() => onDelete(plan.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity mt-0.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
