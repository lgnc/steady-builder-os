import { Lock, GripVertical, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleBlock } from "@/hooks/useBlockDrag";

interface ResizePreview {
  topDelta: number;
  heightDelta: number;
}

interface DraggableBlockProps {
  block: ScheduleBlock;
  style: { top: number; height: number };
  colorClass: string;
  isDragging: boolean;
  dragOffset: number;
  isResizing?: boolean;
  resizePreview?: ResizePreview | null;
  resizable?: boolean;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeMouseDown?: (edge: "top" | "bottom", e: React.MouseEvent) => void;
  onResizeTouchStart?: (edge: "top" | "bottom", e: React.TouchEvent) => void;
  onClick: () => void;
}

export function DraggableBlock({
  block,
  style,
  colorClass,
  isDragging,
  dragOffset,
  isResizing = false,
  resizePreview,
  resizable = false,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMouseDown,
  onResizeMouseDown,
  onResizeTouchStart,
  onClick,
}: DraggableBlockProps) {
  const topDelta = resizePreview?.topDelta ?? 0;
  const heightDelta = resizePreview?.heightDelta ?? 0;
  const finalTop = style.top + dragOffset + topDelta;
  const finalHeight = Math.max(style.height + heightDelta, 3);
  const showText = finalHeight >= 18;

  return (
    <div
      className={cn(
        "absolute left-0.5 right-0.5 rounded-md border-l-2 px-1 py-0.5 overflow-hidden cursor-pointer select-none group",
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        colorClass,
        isDragging
          ? "z-50 shadow-2xl ring-1 ring-white/20 scale-[1.03] brightness-110"
          : isResizing
          ? "z-50 shadow-2xl ring-1 ring-white/20"
          : "hover:z-10 hover:brightness-105 animate-scale-in"
      )}
      style={{
        top: finalTop,
        height: finalHeight,
        minHeight: 3,
        transition: isDragging || isResizing ? "none" : "top 0.2s ease-out, height 0.2s ease-out",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onClick={isDragging || isResizing ? undefined : onClick}
    >
      {/* Top resize handle */}
      {resizable && !isDragging && (
        <div
          className="absolute top-0 left-0 right-0 h-3 flex items-center justify-center cursor-ns-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          onMouseDown={(e) => onResizeMouseDown?.("top", e)}
          onTouchStart={(e) => onResizeTouchStart?.("top", e)}
        >
          <ChevronsUpDown className="h-2.5 w-2.5 text-current opacity-70" />
        </div>
      )}

      {showText && (
        <div className="flex items-start gap-0.5">
          {block.is_locked && (
            <Lock className="h-2 w-2 shrink-0 mt-0.5 opacity-60" />
          )}
          <span className="text-[9px] font-medium leading-tight line-clamp-2">
            {block.title}
          </span>
        </div>
      )}

      {isDragging && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-0.5">
          <GripVertical className="h-2.5 w-2.5 text-current opacity-50" />
        </div>
      )}

      {/* Bottom resize handle */}
      {resizable && !isDragging && (
        <div
          className="absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center cursor-ns-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          onMouseDown={(e) => onResizeMouseDown?.("bottom", e)}
          onTouchStart={(e) => onResizeTouchStart?.("bottom", e)}
        >
          <ChevronsUpDown className="h-2.5 w-2.5 text-current opacity-70" />
        </div>
      )}
    </div>
  );
}
