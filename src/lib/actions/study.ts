"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadStudyPhoto } from "@/lib/supabase/storage";
import { currentStudyDateStr } from "@/lib/date";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");
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
