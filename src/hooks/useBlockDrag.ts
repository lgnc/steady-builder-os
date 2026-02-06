import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const HOUR_HEIGHT = 48;
const SNAP_MINUTES = 15;

export interface ScheduleBlock {
  id: string;
  block_type: string;
  title: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  is_locked: boolean;
  training_day_id: string | null;
}

// --- Time helpers ---

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

function shiftTime(time: string, deltaMinutes: number): string {
  return minutesToTimeString(parseTimeToMinutes(time) + deltaMinutes);
}

// --- Linked-group logic ---

function getLinkedGroup(block: ScheduleBlock, dayBlocks: ScheduleBlock[]): string[] {
  const ids = new Set<string>([block.id]);

  if (block.block_type === "training") {
    // Adjacent commute blocks
    dayBlocks.forEach((b) => {
      if (b.block_type === "commute") {
        if (b.end_time === block.start_time || b.start_time === block.end_time) {
          ids.add(b.id);
        }
      }
    });
  } else if (block.block_type === "commute") {
    // Find the linked training block → then gather full training group
    dayBlocks.forEach((t) => {
      if (t.block_type === "training") {
        if (block.end_time === t.start_time || block.start_time === t.end_time) {
          ids.add(t.id);
          // Find the other commute block around this training
          dayBlocks.forEach((c) => {
            if (c.block_type === "commute" && c.id !== block.id) {
              if (c.end_time === t.start_time || c.start_time === t.end_time) {
                ids.add(c.id);
              }
            }
          });
        }
      }
    });
  } else if (block.block_type === "reading" || block.block_type === "evening_routine") {
    // Evening group always moves together
    dayBlocks.forEach((b) => {
      if (
        (b.block_type === "reading" || b.block_type === "evening_routine") &&
        b.id !== block.id
      ) {
        ids.add(b.id);
      }
    });
  }
  // morning_routine and work move solo

  return Array.from(ids);
}

// --- Main hook ---

export function useBlockDrag(
  blocks: ScheduleBlock[],
  setBlocks: React.Dispatch<React.SetStateAction<ScheduleBlock[]>>,
  userId: string | undefined
) {
  const [activeDrag, setActiveDrag] = useState<{
    linkedBlockIds: string[];
    deltaMinutes: number;
  } | null>(null);

  // Refs for data the document-level handlers need
  const dragRef = useRef<{
    blockId: string;
    linkedBlockIds: string[];
    startY: number;
    dayOfWeek: number;
  } | null>(null);

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const setBlocksRef = useRef(setBlocks);
  setBlocksRef.current = setBlocks;

  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const latestDelta = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // --- Touch start on individual block ---
  const onBlockTouchStart = useCallback(
    (blockId: string, e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };

      longPressTimer.current = setTimeout(() => {
        const block = blocksRef.current.find((b) => b.id === blockId);
        if (!block) return;

        const dayBlocks = blocksRef.current.filter(
          (b) => b.day_of_week === block.day_of_week
        );
        const linkedIds = getLinkedGroup(block, dayBlocks);

        dragRef.current = {
          blockId,
          linkedBlockIds: linkedIds,
          startY: touch.clientY,
          dayOfWeek: block.day_of_week,
        };

        latestDelta.current = 0;

        setActiveDrag({
          linkedBlockIds: linkedIds,
          deltaMinutes: 0,
        });

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    },
    []
  );

  // Cancel long press if user moves finger early (scrolling)
  const onBlockTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (activeDrag) return; // Already dragging; document listener handles it

      if (touchStartPos.current) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        if (dx > 8 || dy > 8) {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
      }
    },
    [activeDrag]
  );

  // Cancel long press on early touch end (regular tap)
  const onBlockTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // --- Document-level listeners during active drag ---
  const isActive = activeDrag !== null;

  useEffect(() => {
    if (!isActive) return;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scroll (works because passive: false)
      const drag = dragRef.current;
      if (!drag) return;

      const touch = e.touches[0];
      const pixelDelta = touch.clientY - drag.startY;
      const rawMinutes = (pixelDelta / HOUR_HEIGHT) * 60;
      const snappedMinutes =
        Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;

      latestDelta.current = snappedMinutes;
      setActiveDrag((prev) =>
        prev ? { ...prev, deltaMinutes: snappedMinutes } : null
      );
    };

    const handleTouchEnd = async () => {
      const drag = dragRef.current;
      const delta = latestDelta.current;

      // No movement → cancel
      if (!drag || delta === 0) {
        dragRef.current = null;
        setActiveDrag(null);
        return;
      }

      const currentBlocks = blocksRef.current;
      const linkedIds = drag.linkedBlockIds;

      // Compute new times
      const updatedBlocks = currentBlocks.map((b) => {
        if (!linkedIds.includes(b.id)) return b;
        return {
          ...b,
          start_time: shiftTime(b.start_time, delta),
          end_time: shiftTime(b.end_time, delta),
        };
      });

      const movedBlocks = updatedBlocks.filter((b) =>
        linkedIds.includes(b.id)
      );

      // Bounds check: keep within 5 AM – 11 PM visible window
      const outOfBounds = movedBlocks.some((b) => {
        const start = parseTimeToMinutes(b.start_time);
        const end = parseTimeToMinutes(b.end_time);
        return start < 5 * 60 || end > 23 * 60;
      });

      if (outOfBounds) {
        dragRef.current = null;
        setActiveDrag(null);
        return;
      }

      // Overlap check against other blocks on the same day (excluding sleep)
      const dayOtherBlocks = updatedBlocks.filter(
        (b) =>
          b.day_of_week === drag.dayOfWeek &&
          !linkedIds.includes(b.id) &&
          b.block_type !== "sleep"
      );

      const hasOverlap = movedBlocks.some((moved) => {
        const mStart = parseTimeToMinutes(moved.start_time);
        const mEnd = parseTimeToMinutes(moved.end_time);
        return dayOtherBlocks.some((other) => {
          const oStart = parseTimeToMinutes(other.start_time);
          const oEnd = parseTimeToMinutes(other.end_time);
          return mStart < oEnd && mEnd > oStart;
        });
      });

      if (hasOverlap) {
        dragRef.current = null;
        setActiveDrag(null);
        return;
      }

      // ✅ Apply changes locally
      setBlocksRef.current(updatedBlocks);
      dragRef.current = null;
      setActiveDrag(null);

      // ✅ Persist to database
      const uid = userIdRef.current;
      if (uid) {
        const dbUpdates = movedBlocks.map((b) =>
          supabase
            .from("schedule_blocks")
            .update({ start_time: b.start_time, end_time: b.end_time })
            .eq("id", b.id)
        );
        await Promise.all(dbUpdates);

        // Sync profile: wake_time / bedtime
        const movedTypes = movedBlocks.map((b) => b.block_type);

        if (movedTypes.includes("morning_routine")) {
          const mr = movedBlocks.find(
            (b) => b.block_type === "morning_routine"
          );
          if (mr) {
            await supabase
              .from("onboarding_data")
              .update({ wake_time: mr.start_time })
              .eq("user_id", uid);
          }
        }

        if (movedTypes.includes("evening_routine")) {
          const er = movedBlocks.find(
            (b) => b.block_type === "evening_routine"
          );
          if (er) {
            await supabase
              .from("onboarding_data")
              .update({ bedtime: er.end_time })
              .eq("user_id", uid);
          }
        }
      }
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
    // Only fires when drag starts / stops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // --- Public helpers ---

  const getDragOffset = useCallback(
    (blockId: string): number => {
      if (!activeDrag || !activeDrag.linkedBlockIds.includes(blockId)) return 0;
      return (activeDrag.deltaMinutes / 60) * HOUR_HEIGHT;
    },
    [activeDrag]
  );

  const isDragging = useCallback(
    (blockId: string): boolean => {
      return activeDrag?.linkedBlockIds.includes(blockId) ?? false;
    },
    [activeDrag]
  );

  return {
    onBlockTouchStart,
    onBlockTouchMove,
    onBlockTouchEnd,
    getDragOffset,
    isDragging,
    isAnyDragging: isActive,
  };
}
