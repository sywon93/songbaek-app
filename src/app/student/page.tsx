import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { currentStudyDateStr, nextMentoringDateStr } from "@/lib/date";
import { HOME_QUERY_TIMEOUT_MS, withTimeout } from "@/lib/async/withTimeout";
import { RealStudentView } from "@/components/student/real/RealStudentView";
import type { Weekday } from "@/lib/supabase/types";

export default async function StudentPage() {
  if (!isSupabaseConfigured) redirect("/");

  const supabase = await createClient();
  const userRes = await withTimeout(
    supabase.auth.getUser(),
    HOME_QUERY_TIMEOUT_MS,
    null,
  );
  const user = userRes?.data.user ?? null;
  if (!user) redirect("/login");

  const profileRes = await withTimeout(
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    HOME_QUERY_TIMEOUT_MS,
    null,
  );
  const profile = profileRes?.data ?? null;
  if (!profile) redirect("/login");
  if (profile.role !== "student") redirect(`/${profile.role}`);

  const date = currentStudyDateStr();
  const recordRes = await withTimeout(
    supabase
      .from("study_records")
      .select("*")
      .eq("student_id", user.id)
      .eq("record_date", date)
      .maybeSingle(),
    HOME_QUERY_TIMEOUT_MS,
    { data: null },
  );
  const record = recordRes.data ?? null;

  // 요일 문자열이 예상 밖의 값이어도(마이그레이션 중 enum 변경 등) 홈 화면 전체가
  // 죽지 않도록 방어합니다. 계산에 실패하면 예약 영역만 "요일 미지정"으로 표시됩니다.
  let mentoringDate: string | null = null;
  if (profile.mentoring_day) {
    try {
      mentoringDate = nextMentoringDateStr(profile.mentoring_day as Weekday);
    } catch {
      mentoringDate = null;
    }
  }

  // 부가 조회들: 하나라도 느리거나 실패해도 홈 화면은 뜨도록 각각 timeout + 빈 값 처리.
  const [plannerPhotoUrl, studyPhotoUrl, slotStatusRes, noticesRes, reviewerRes] =
    await Promise.all([
      withTimeout(getSignedPhotoUrl(supabase, record?.planner_photo_url), HOME_QUERY_TIMEOUT_MS, null),
      withTimeout(getSignedPhotoUrl(supabase, record?.study_photo_url), HOME_QUERY_TIMEOUT_MS, null),
      withTimeout(
        Promise.resolve(
          mentoringDate
            ? supabase.rpc("mentoring_slot_status", { p_date: mentoringDate })
            : { data: null },
        ),
        HOME_QUERY_TIMEOUT_MS,
        { data: null },
      ),
      withTimeout(
        supabase
          .from("notices")
          .select("id, title, is_pinned, created_at")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(3),
        HOME_QUERY_TIMEOUT_MS,
        { data: null },
      ),
      withTimeout(
        Promise.resolve(
          record?.reviewed_by
            ? supabase.from("profiles").select("name").eq("id", record.reviewed_by).maybeSingle()
            : { data: null },
        ),
        HOME_QUERY_TIMEOUT_MS,
        { data: null },
      ),
    ]);

  // RPC/조회 결과가 실패·타임아웃하면 data 가 null 이거나 예상 밖의 형태일 수
  // 있으므로, 클라이언트 컴포넌트에 넘기기 전에 항상 배열로 정규화합니다.
  const slotStatus = Array.isArray(slotStatusRes?.data) ? slotStatusRes.data : [];
  const notices = Array.isArray(noticesRes?.data) ? noticesRes.data : [];

  return (
    <RealStudentView
      profile={profile}
      record={record ?? null}
      plannerPhotoUrl={plannerPhotoUrl}
      studyPhotoUrl={studyPhotoUrl}
      mentoringDate={mentoringDate}
      slotStatus={slotStatus}
      notices={notices}
      reviewerName={reviewerRes.data?.name ?? null}
    />
  );
}
