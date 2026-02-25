"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReportStore } from "@/stores/reportStore";
import MaterialPicker from "./MaterialPicker";
import type { DailyTask } from "@/types";

interface TaskCardProps {
  task: DailyTask;
  index: number;
}

export default memo(function TaskCard({ task, index }: TaskCardProps) {
  const { updateTask, deleteTask, removeMaterial } = useReportStore();
  const [isEditing, setIsEditing] = useState(!task.description);
  const [desc, setDesc] = useState(task.description);
  const [showPicker, setShowPicker] = useState(false);
  const closePicker = useCallback(() => setShowPicker(false), []);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasMaterials = task.materials && task.materials.length > 0;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (desc !== task.description) {
      updateTask(task.id, desc);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  return (
    <>
      <div
        className={`group bg-white rounded-[12px] border border-gray-200 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow ${
          hasMaterials ? "border-l-[3px] border-l-toss-blue" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-[22px] h-[22px] rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center mt-0.5">
            {index}
          </span>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={inputRef}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full text-sm text-gray-700 bg-transparent border-none outline-none placeholder:text-gray-400"
                placeholder="작업 내용을 입력하세요..."
              />
            ) : (
              <p
                className="text-sm text-gray-700 cursor-text"
                onClick={() => setIsEditing(true)}
              >
                {task.description || "작업 내용을 입력하세요..."}
              </p>
            )}

            {hasMaterials && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {task.materials!.map((m) => (
                  <Badge key={m.id} variant="default" className="gap-1 pr-1">
                    <span>{m.product?.name || `품목#${m.product_id}`}</span>
                    <span className="bg-toss-blue text-white text-[10px] px-1.5 py-0.5 rounded-full ml-0.5">
                      ×{m.quantity}
                    </span>
                    <button
                      onClick={() => removeMaterial(m.id)}
                      className="ml-0.5 hover:bg-toss-blue/20 rounded-full p-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-toss-blue"
              onClick={() => setShowPicker(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-toss-red"
              onClick={() => deleteTask(task.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {showPicker && (
        <MaterialPicker
          taskId={task.id}
          onClose={closePicker}
        />
      )}
    </>
  );
});
