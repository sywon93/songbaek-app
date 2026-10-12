"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadStudyPhoto } from "@/lib/supabase/storage";
import { currentStudyDateStr } from "@/lib/date";
import { OK, fail, type ActionResult } from "@/lib/actions/result";
import type { Database } from "@/lib/supabase/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");
  return { supabase, user };
}

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function startToday(plannerPhotoDataUrl: string) {
  if (!plannerPhotoDataUrl) throw new Error("플래너 사진을 올려주세요.");
  const { supabase, user } = await requireUser();
  const date = currentStudyDateStr();

  const path = await uploadStudyPhoto(supabase, {
    userId: user.id,
    date,
    kind: "planner",
    dataUrl: plannerPhotoDataUrl,
  });

  const { data, error } = await supabase
    .from("study_records")
    .upsert(
      {
        student_id: user.id,
        record_date: date,
        status: "started",
        planner_photo_url: path,
        started_at: new Date().toISOString(),
      },
      { onConflict: "student_id,record_date" },
    )
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("학습 시작 처리에 실패했어요. 다시 시도해주세요.");
  revalidatePath("/student");
}

export async function submitToday(payload: {
  studyPhotoDataUrl: string;
  studyMinutes: number;
  studyContent: string;
  studentNote: string;
}) {
  if (!payload.studyPhotoDataUrl || !payload.studyContent.trim() || payload.studyMinutes <= 0) {
    throw new Error("사진/시간/내용을 모두 입력해주세요.");
  }
  const { supabase, user } = await requireUser();
  const date = currentStudyDateStr();

  const path = await uploadStudyPhoto(supabase, {
    userId: user.id,
    date,
    kind: "study",
    dataUrl: payload.studyPhotoDataUrl,
  });

  const { data, error } = await supabase
    .from("study_records")
    .update({
      status: "submitted",
      study_photo_url: path,
      study_minutes: payload.studyMinutes,
      study_content: payload.studyContent.trim(),
      student_note: payload.studentNote.trim() || null,
      submitted_at: new Date().toISOString(),
    })
    .eq("student_id", user.id)
    .eq("record_date", date)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(
      "학습 마감 제출에 실패했어요. 오늘 학습을 먼저 시작했는지 확인해주세요.",
    );
  }
  revalidatePath("/student");
}

export async function startNextRound(studentId: string) {
  const { supabase, user } = await requireUser();
  if (user.id !== studentId) throw new Error("본인만 다음 회차를 시작할 수 있어요.");

  const { error } = await supabase.rpc("start_next_round", {
    p_student: studentId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/student");
}

export async function approveToday(payload: {
  studentId: string;
  recordDate: string;
  message: string;
}) {
  const message = payload.message.trim();
  // 실제 운영 보완: 응원 한마디 없이는 승인할 수 없도록 서버에서도 강제합니다.
  if (message.length < 2) {
    throw new Error("응원 한마디를 2자 이상 입력해야 승인할 수 있어요.");
  }
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("study_records")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      encouragement_message: message,
    })
    .eq("student_id", payload.studentId)
    .eq("record_date", payload.recordDate)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(
      "승인에 실패했어요. 담당 학생이 맞는지, 이미 처리된 기록은 아닌지 확인해주세요.",
    );
  }
  revalidatePath("/mentor");
  revalidatePath("/student");
}

export type GiftSearchStudent =
  Database["public"]["Functions"]["search_students_for_gift"]["Returns"][number];

export type GiftSearchResult =
  | { ok: true; students: GiftSearchStudent[] }
  | { ok: false; message: string };

// 도장 선물 대상 검색: 담당 여부와 무관하게 전체 학생 중 이름/학번 부분 일치.
// 멘토는 RLS 상 담당이 아닌 학생 프로필을 직접 읽을 수 없어 전용 RPC 를 거칩니다.
export async function searchStudentsForGift(query: string): Promise<GiftSearchResult> {
  const q = query.trim();
  if (!q) return { ok: true, students: [] };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, message: "로그인이 필요해요. 다시 로그인해주세요." };

  const { data, error } = await supabase.rpc("search_students_for_gift", { p_query: q });
  if (error) return { ok: false, message: error.message || "학생 검색에 실패했어요." };
  return { ok: true, students: data ?? [] };
}

// 멘토가 승인(일지) 경로 없이 자율적으로 학생에게 도장을 1개 선물합니다.
// 담당 멘티가 아니어도 멘토/관리자면 누구에게나 줄 수 있습니다.
// DB RPC(mentor_award_free_stamp)가 권한 검증 · 동시성 잠금 · 회차 자동
// 처리 · 이력 기록을 전부 담당하므로, 여기서는 입력값만 다듬어 전달합니다.
// 실패 사유(멘토 권한 없음 등)를 학생/멘토가 그대로 볼 수 있어야 하므로
// throw 대신 ActionResult 를 돌려줍니다.
export async function awardFreeStamp(payload: {
  studentId: string;
  reason: string;
}): Promise<ActionResult> {
  const reason = payload.reason.trim();
  if (reason.length < 2) {
    return fail("선물 사유를 2자 이상 입력해주세요.");
  }

  const { supabase, user } = await getUser();
  if (!user) return fail("로그인이 필요해요. 다시 로그인해주세요.");

  const { error } = await supabase.rpc("mentor_award_free_stamp", {
    p_student: payload.studentId,
    p_reason: reason,
  });
  if (error) {
    return fail(error.message || "도장 선물에 실패했어요. 잠시 후 다시 시도해주세요.");
  }

  revalidatePath("/mentor");
  revalidatePath("/student");
  revalidatePath("/student/records");
  return OK;
}
