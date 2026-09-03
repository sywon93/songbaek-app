"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextMentoringDateStr } from "@/lib/date";
import type { MentoringTimeSlot, Weekday } from "@/lib/supabase/types";

// 서버 액션 결과. 프로덕션 Next.js 는 Server Action 에서 throw 된 에러 메시지를
// 가려버려(클라이언트에는 "Minified React error #441" 로만 전달됨) 학생이
// 원인을 볼 수 없으므로, 예상 가능한 실패는 던지지 않고 이 형태로 돌려줍니다.
export type ActionResult = { ok: true } | { ok: false; message: string };

const OK: ActionResult = { ok: true };
const fail = (message: string): ActionResult => ({ ok: false, message });

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function reserveMentoringSlot(
  timeSlot: MentoringTimeSlot,
): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return fail("로그인이 필요해요. 다시 로그인해주세요.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("mentoring_day")
    .eq("id", user.id)
    .single();
  if (!profile?.mentoring_day) {
    return fail("지정된 멘토링 요일이 없어요. 담당 선생님(관리자)에게 문의해주세요.");
  }

  let sessionDate: string;
  try {
    sessionDate = nextMentoringDateStr(profile.mentoring_day as Weekday);
  } catch {
    return fail("멘토링 요일 정보가 올바르지 않아요. 관리자에게 문의해주세요.");
  }

  const { error } = await supabase.from("mentoring_reservations").insert({
    student_id: user.id,
    session_date: sessionDate,
    time_slot: timeSlot,
  });

  if (error) {
    if (error.code === "23505") {
      // 슬롯 중복(멘토별 정원 마감). 구/신 제약 이름 모두 대비.
      if (
        error.message.includes("mentoring_reservations_mentor_slot_unique") ||
        error.message.includes("mentoring_reservations_slot_unique")
      ) {
        return fail("이미 마감된 시간이에요. 다른 시간을 선택해주세요.");
      }
      return fail("이번 회차 멘토링은 이미 예약했어요.");
    }
    // 트리거 raise exception 메시지는 이미 학생용 안내 문구입니다.
    return fail(error.message || "예약에 실패했어요. 잠시 후 다시 시도해주세요.");
  }

  revalidatePath("/student");
  return OK;
}

export async function cancelMentoringReservation(
  reservationId: string,
): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return fail("로그인이 필요해요. 다시 로그인해주세요.");

  const { error } = await supabase
    .from("mentoring_reservations")
    .delete()
    .eq("id", reservationId)
    .eq("student_id", user.id);
  if (error) {
    return fail(error.message || "예약 취소에 실패했어요. 잠시 후 다시 시도해주세요.");
  }

  revalidatePath("/student");
  return OK;
}
