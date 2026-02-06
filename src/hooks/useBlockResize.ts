import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ScheduleBlock } from "./useBlockDrag";

const HOUR_HEIGHT = 48;
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 30; // minimum block size

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeString(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

type ResizeEdge = "top" | "bottom";

interface ActiveResize {
  blockId: string;
  edge: ResizeEdge;
  deltaMinutes: number;
}

export function useBlockResize(
  blocks: ScheduleBlock[],
  setBlocks: React.Dispatch<React.SetStateAction<ScheduleBlock[]>>,
  userId: string | undefined
) {
  const [activeResize, setActiveResize] = useState<ActiveResize | null>(null);

  const resizeRef = useRef<{
    blockId: string;
    edge: ResizeEdge;
    startY: number;
    originalStartMinutes: number;
    originalEndMinutes: number;
    dayOfWeek: number;
  } | null>(null);

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const setBlocksRef = useRef(setBlocks);
  setBlocksRef.current = setBlocks;

  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const latestDelta = useRef(0);
  const justResized = useRef(false);

  const initiateResize = useCallback(
    (blockId: string, edge: ResizeEdge, clientY: number) => {
      const block = blocksRef.current.find((b) => b.id === blockId);
      if (!block) return;

      resizeRef.current = {
        blockId,
        edge,
        startY: clientY,
        originalStartMinutes: parseTimeToMinutes(block.start_time),
        originalEndMinutes: parseTimeToMinutes(block.end_time),
        dayOfWeek: block.day_of_week,
      };

      latestDelta.current = 0;

      setActiveResize({ blockId, edge, deltaMinutes: 0 });
    },
    []
  );

  // Start resize via mouse
  const onResizeMouseDown = useCallback(
    (blockId: string, edge: ResizeEdge, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      initiateResize(blockId, edge, e.clientY);
    },
    [initiateResize]
  );

  // Start resize via touch
  const onResizeTouchStart = useCallback(
    (blockId: string, edge: ResizeEdge, e: React.TouchEvent) => {
      e.stopPropagation();
      const touch = e.touches[0];
      initiateResize(blockId, edge, touch.clientY);
    },
    [initiateResize]
  );

  const isActive = activeResize !== null;

  useEffect(() => {
    if (!isActive) return;

    const handlePointerMove = (clientY: number, preventDefault?: () => void) => {
      preventDefault?.();
      const resize = resizeRef.current;
      if (!resize) return;

      const pixelDelta = clientY - resize.startY;
      const rawMinutes = (pixelDelta / HOUR_HEIGHT) * 60;
      const snappedMinutes =
        Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;

      latestDelta.current = snappedMinutes;
      setActiveResize((prev) =>
        prev ? { ...prev, deltaMinutes: snappedMinutes } : null
      );
    };

    const handleResizeEnd = async () => {
      const resize = resizeRef.current;
      const delta = latestDelta.current;

      if (!resize || delta === 0) {
        resizeRef.current = null;
        setActiveResize(null);
        justResized.current = true;
        setTimeout(() => { justResized.current = false; }, 50);
        return;
      }

      let newStartMinutes = resize.originalStartMinutes;
      let newEndMinutes = resize.originalEndMinutes;

      if (resize.edge === "top") {
        newStartMinutes = resize.originalStartMinutes + delta;
      } else {
        newEndMinutes = resize.originalEndMinutes + delta;
      }

      // Enforce minimum duration
      if (newEndMinutes - newStartMinutes < MIN_DURATION_MINUTES) {
        resizeRef.current = null;
        setActiveResize(null);
        justResized.current = true;
        setTimeout(() => { justResized.current = false; }, 50);
        return;
      }

      // Bounds check: 5 AM – 11 PM
      if (newStartMinutes < 5 * 60 || newEndMinutes > 23 * 60) {
        resizeRef.current = null;
        setActiveResize(null);
        justResized.current = true;
        setTimeout(() => { justResized.current = false; }, 50);
        return;
      }

      const newStartTime = minutesToTimeString(newStartMinutes);
      const newEndTime = minutesToTimeString(newEndMinutes);

      // Overlap check against other blocks on the same day
      const currentBlocks = blocksRef.current;
      const dayOtherBlocks = currentBlocks.filter(
        (b) =>
          b.day_of_week === resize.dayOfWeek &&
          b.id !== resize.blockId &&
          b.block_type !== "sleep"
      );

      const hasOverlap = dayOtherBlocks.some((other) => {
        const oStart = parseTimeToMinutes(other.start_time);
        const oEnd = parseTimeToMinutes(other.end_time);
        return newStartMinutes < oEnd && newEndMinutes > oStart;
      });

      if (hasOverlap) {
        resizeRef.current = null;
        setActiveResize(null);
        justResized.current = true;
        setTimeout(() => { justResized.current = false; }, 50);
        return;
      }

      // Apply
      setBlocksRef.current((prev) =>
        prev.map((b) =>
          b.id === resize.blockId
            ? { ...b, start_time: newStartTime, end_time: newEndTime }
            : b
        )
      );

      resizeRef.current = null;
      setActiveResize(null);
      justResized.current = true;
      setTimeout(() => { justResized.current = false; }, 50);

      // Persist
      const uid = userIdRef.current;
      if (uid) {
        await supabase
          .from("schedule_blocks")
          .update({ start_time: newStartTime, end_time: newEndTime })
          .eq("id", resize.blockId);

        // Update onboarding work times if work block
        const block = blocksRef.current.find((b) => b.id === resize.blockId);
        if (block?.block_type === "work") {
          await supabase
            .from("onboarding_data")
            .update({ work_start: newStartTime, work_end: newEndTime })
            .eq("user_id", uid);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      handlePointerMove(e.touches[0].clientY, () => e.preventDefault());
    };
    const handleTouchEnd = () => handleResizeEnd();
    const handleMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientY, () => e.preventDefault());
    };
    const handleMouseUp = () => handleResizeEnd();

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Get the pixel adjustment for preview during resize
  const getResizePreview = useCallback(
    (blockId: string): { topDelta: number; heightDelta: number } | null => {
      if (!activeResize || activeResize.blockId !== blockId) return null;
      const pxDelta = (activeResize.deltaMinutes / 60) * HOUR_HEIGHT;
      if (activeResize.edge === "top") {
        return { topDelta: pxDelta, heightDelta: -pxDelta };
      } else {
        return { topDelta: 0, heightDelta: pxDelta };
      }
    },
    [activeResize]
  );

  const isResizing = useCallback(
    (blockId: string): boolean => {
      return activeResize?.blockId === blockId;
    },
    [activeResize]
  );

  const wasJustResized = useCallback(() => justResized.current, []);

  return {
    onResizeMouseDown,
    onResizeTouchStart,
    getResizePreview,
    isResizing,
    isAnyResizing: isActive,
    wasJustResized,
  };
}
