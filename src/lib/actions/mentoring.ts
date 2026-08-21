"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextMentoringDateStr } from "@/lib/date";
import type { MentoringTimeSlot, Weekday } from "@/lib/supabase/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");
  return { supabase, user };
}

export async function reserveMentoringSlot(timeSlot: MentoringTimeSlot) {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("mentoring_day")
    .eq("id", user.id)
    .single();
  if (!profile?.mentoring_day) {
    throw new Error("지정된 멘토링 요일이 없어요. 관리자에게 문의하세요.");
  }

  const sessionDate = nextMentoringDateStr(profile.mentoring_day as Weekday);

  const { error } = await supabase.from("mentoring_reservations").insert({
    student_id: user.id,
    session_date: sessionDate,
    time_slot: timeSlot,
  });

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("mentoring_reservations_slot_unique")) {
        throw new Error("이미 마감된 시간이에요. 다른 시간을 선택해주세요.");
      }
      throw new Error("이번 회차 멘토링은 이미 예약했어요.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/student");
}

export async function cancelMentoringReservation(reservationId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("mentoring_reservations")
    .delete()
    .eq("id", reservationId)
    .eq("student_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/student");
}
