import type { MentoringTimeSlot } from "@/lib/supabase/types";

export const MENTORING_TIME_SLOTS: { id: MentoringTimeSlot; label: string }[] = [
  { id: "slot_1840", label: "18:40 ~ 19:10" },
  { id: "slot_1915", label: "19:15 ~ 19:45" },
  { id: "slot_1950", label: "19:50 ~ 20:20" },
  { id: "slot_2025", label: "20:25 ~ 20:55" },
];

export function mentoringSlotLabel(slot: MentoringTimeSlot): string {
  return MENTORING_TIME_SLOTS.find((s) => s.id === slot)?.label ?? slot;
}
