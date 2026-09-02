import type { MentoringTimeSlot } from "@/lib/supabase/types";

// 각 슬롯 enum 값 -> 고정된 시간대 라벨. 슬롯 이름이 시간대와 1:1 이므로
// 인원수 구성과 무관하게 이 표만으로 라벨을 표시할 수 있습니다.
export const MENTORING_SLOT_LABELS: Record<MentoringTimeSlot, string> = {
  // 슬롯 enum -> 시간대 라벨 (1:1). 각 값이 어느 인원 구성에서 쓰이는지는
  // mentoringSlotsForCount() 참고.
  slot_1840: "18:40 ~ 19:10", // (미사용) 과거 4명 구성 잔재
  slot_1915: "19:15 ~ 19:45", // 4명·5명
  slot_1950: "19:50 ~ 20:20", // 4명·5명
  slot_2025: "20:25 ~ 20:55", // 5명
  // 3명 구성 (50분 진행 + 10분 휴식)
  slot_1800_1850: "18:00 ~ 18:50",
  slot_1900_1950: "19:00 ~ 19:50",
  slot_2000_2050: "20:00 ~ 20:50",
  // 4명·5명 구성 앞부분 (30분 진행 + 5/10분 휴식, 18:00 시작)
  slot_1800_1830: "18:00 ~ 18:30",
  slot_1835_1905: "18:35 ~ 19:05",
};

export function mentoringSlotLabel(slot: MentoringTimeSlot): string {
  return MENTORING_SLOT_LABELS[slot] ?? slot;
}

// 세션 인원수 -> 슬롯 목록(표시 순서). DB 의 mentoring_slots_for_count() 와
// 동일한 규칙이며, 멘토 화면에서 요일별 정원을 안내할 때 사용합니다.
export function mentoringSlotsForCount(count: number): MentoringTimeSlot[] {
  if (count <= 0) return [];
  if (count <= 3) return ["slot_1800_1850", "slot_1900_1950", "slot_2000_2050"];
  if (count === 4) return ["slot_1800_1830", "slot_1835_1905", "slot_1915", "slot_1950"];
  return ["slot_1800_1830", "slot_1835_1905", "slot_1915", "slot_1950", "slot_2025"];
}
