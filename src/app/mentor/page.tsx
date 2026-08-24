import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { nextMentoringDateStr, todaySeoulDateStr } from "@/lib/date";
import {
  RealMentorView,
  type StudentScheduleEntry,
  type StudentWithRecord,
} from "@/components/mentor/real/RealMentorView";
import type { Weekday } from "@/lib/supabase/types";

export default async function MentorPage() {
  if (!isSupabaseConfigured) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (profile.role !== "mentor") redirect(`/${profile.role}`);

  const { data: links } = await supabase
    .from("mentor_student_links")
    .select("student_id")
    .eq("mentor_id", user.id);
  const studentIds = (links ?? []).map((l) => l.student_id);

  const date = todaySeoulDateStr();
  const [studentsRes, recordsRes] = await Promise.all([
    studentIds.length
      ? supabase
          .from("profiles")
          .select("*")
          .in("id", studentIds)
          .order("username")
      : Promise.resolve({ data: [] as (typeof profile)[] }),
    studentIds.length
      ? supabase
          .from("study_records")
          .select("*")
          .in("student_id", studentIds)
          .eq("record_date", date)
      : Promise.resolve({ data: [] }),
  ]);

  const records = recordsRes.data ?? [];
  const students: StudentWithRecord[] = await Promise.all(
    (studentsRes.data ?? []).map(async (s) => {
      const record = records.find((r) => r.student_id === s.id) ?? null;
      const [plannerPhotoUrl, studyPhotoUrl] = await Promise.all([
        getSignedPhotoUrl(supabase, record?.planner_photo_url),
        getSignedPhotoUrl(supabase, record?.study_photo_url),
      ]);
      return { profile: s, record, plannerPhotoUrl, studyPhotoUrl };
    }),
  );

  // 담당 학생 중 상담 요일이 지정된 학생들의 "다음 상담일" 예약 현황을 모아
  // 요일별 시간표 형태로 보여주기 위한 데이터입니다. (기존 예약 테이블 조회만
  // 추가하며 스키마 변경은 없습니다.)
  const studentsWithDay = (studentsRes.data ?? []).filter((s) => s.mentoring_day);
  const reservationsRes = studentIds.length
    ? await supabase
        .from("mentoring_reservations")
        .select("student_id, session_date, time_slot")
        .in("student_id", studentIds)
    : { data: [] };
  const reservationByStudentDate = new Map(
    (reservationsRes.data ?? []).map((r) => [`${r.student_id}_${r.session_date}`, r.time_slot]),
  );

  const scheduleEntries: StudentScheduleEntry[] = studentsWithDay.map((s) => {
    const mentoringDay = s.mentoring_day as Weekday;
    const nextSessionDate = nextMentoringDateStr(mentoringDay);
    const reservedSlot = reservationByStudentDate.get(`${s.id}_${nextSessionDate}`) ?? null;
    return { profile: s, mentoringDay, nextSessionDate, reservedSlot };
  });

  return (
    <RealMentorView
      mentor={profile}
      students={students}
      date={date}
      scheduleEntries={scheduleEntries}
    />
  );
}
