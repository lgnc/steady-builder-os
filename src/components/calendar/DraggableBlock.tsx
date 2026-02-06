import { Lock, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleBlock } from "@/hooks/useBlockDrag";

interface DraggableBlockProps {
  block: ScheduleBlock;
  style: { top: number; height: number };
  colorClass: string;
  isDragging: boolean;
  dragOffset: number;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onClick: () => void;
}

export function DraggableBlock({
  block,
  style,
  colorClass,
  isDragging,
  dragOffset,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onClick,
}: DraggableBlockProps) {
  return (
    <div
      className={cn(
        "absolute left-0.5 right-0.5 rounded-sm border-l-2 px-0.5 py-0.5 overflow-hidden cursor-pointer",
        colorClass,
        isDragging
          ? "z-50 shadow-2xl ring-2 ring-primary/50 scale-[1.03]"
          : "hover:z-10 hover:shadow-lg animate-scale-in"
      )}
      style={{
        top: style.top + dragOffset,
        height: style.height,
        transition: isDragging ? "none" : "top 0.2s ease-out",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={isDragging ? undefined : onClick}
    >
      <div className="flex items-start gap-0.5">
        {block.is_locked && (
          <Lock className="h-2 w-2 shrink-0 mt-0.5 opacity-60" />
        )}
        <span className="text-[9px] font-medium leading-tight line-clamp-2">
          {block.title}
        </span>
      </div>
      {/* Drag grip indicator (visible on hover / during drag) */}
      {isDragging && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-0.5">
          <GripVertical className="h-2.5 w-2.5 text-current opacity-50" />
        </div>
      )}
    </div>
  );
}
