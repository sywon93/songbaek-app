import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { currentStudyDateStr, nextMentoringDateStr } from "@/lib/date";
import { HOME_QUERY_TIMEOUT_MS, withTimeout } from "@/lib/async/withTimeout";
import {
  RealMentorView,
  type StudentScheduleEntry,
  type StudentWithRecord,
} from "@/components/mentor/real/RealMentorView";
import type { Database, Weekday } from "@/lib/supabase/types";

type StudyRecord = Database["public"]["Tables"]["study_records"]["Row"];

export default async function MentorPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
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
  if (profile.role !== "mentor") redirect(`/${profile.role}`);

  const linksRes = await withTimeout(
    supabase.from("mentor_student_links").select("student_id").eq("mentor_id", user.id),
    HOME_QUERY_TIMEOUT_MS,
    { data: null },
  );
  const links = linksRes.data;
  const studentIds = (links ?? []).map((l) => l.student_id);

  const date = currentStudyDateStr();

  const { date: rawBrowseDate } = await searchParams;
  const browseDate =
    rawBrowseDate && /^\d{4}-\d{2}-\d{2}$/.test(rawBrowseDate) ? rawBrowseDate : null;

  const [studentsRes, recordsRes, pastPendingRes, browseRecordsRes] = await Promise.all([
    withTimeout(
      Promise.resolve(
        studentIds.length
          ? supabase.from("profiles").select("*").in("id", studentIds).order("username")
          : { data: [] as (typeof profile)[] },
      ),
      HOME_QUERY_TIMEOUT_MS,
      { data: [] as (typeof profile)[] },
    ),
    withTimeout(
      Promise.resolve(
        studentIds.length
          ? supabase
              .from("study_records")
              .select("*")
              .in("student_id", studentIds)
              .eq("record_date", date)
          : { data: [] as StudyRecord[] },
      ),
      HOME_QUERY_TIMEOUT_MS,
      { data: [] as StudyRecord[] },
    ),
    // 지난 날짜 중 아직 '승인 대기(submitted)'인 기록 = 멘토가 도장을 못 찍고 넘어간 것들
    withTimeout(
      Promise.resolve(
        studentIds.length
          ? supabase
              .from("study_records")
              .select("*")
              .in("student_id", studentIds)
              .eq("status", "submitted")
              .lt("record_date", date)
              .order("record_date", { ascending: false })
          : { data: [] as StudyRecord[] },
      ),
      HOME_QUERY_TIMEOUT_MS,
      { data: [] as StudyRecord[] },
    ),
    // 날짜별 조회: ?date= 로 지정한 특정 날짜의 담당 학생 전체 기록
    withTimeout(
      Promise.resolve(
        browseDate && studentIds.length
          ? supabase
              .from("study_records")
              .select("*")
              .in("student_id", studentIds)
              .eq("record_date", browseDate)
          : { data: [] as StudyRecord[] },
      ),
      HOME_QUERY_TIMEOUT_MS,
      { data: [] as StudyRecord[] },
    ),
  ]);

  const studentProfiles = studentsRes.data ?? [];
  const studentById = new Map(studentProfiles.map((s) => [s.id, s]));

  async function toEntry(record: StudyRecord, fallbackProfileId: string): Promise<StudentWithRecord | null> {
    const student = studentById.get(record.student_id) ?? studentById.get(fallbackProfileId);
    if (!student) return null;
    const [plannerPhotoUrl, studyPhotoUrl] = await Promise.all([
      getSignedPhotoUrl(supabase, record.planner_photo_url),
      getSignedPhotoUrl(supabase, record.study_photo_url),
    ]);
    return { profile: student, record, plannerPhotoUrl, studyPhotoUrl };
  }

  const records = recordsRes.data ?? [];
  const students: StudentWithRecord[] = await Promise.all(
    studentProfiles.map(async (s) => {
      const record = records.find((r) => r.student_id === s.id) ?? null;
      const [plannerPhotoUrl, studyPhotoUrl] = await Promise.all([
        getSignedPhotoUrl(supabase, record?.planner_photo_url),
        getSignedPhotoUrl(supabase, record?.study_photo_url),
      ]);
      return { profile: s, record, plannerPhotoUrl, studyPhotoUrl };
    }),
  );

  const pastPendingRaw = await Promise.all(
    (pastPendingRes.data ?? []).map((r) => toEntry(r, r.student_id)),
  );
  const pastPending = pastPendingRaw
    .filter((e): e is StudentWithRecord => e !== null)
    .sort((a, b) => {
      const d = (b.record?.record_date ?? "").localeCompare(a.record?.record_date ?? "");
      return d !== 0 ? d : a.profile.name.localeCompare(b.profile.name);
    });

  let browseEntries: StudentWithRecord[] = [];
  if (browseDate) {
    const browseRecords = browseRecordsRes.data ?? [];
    browseEntries = await Promise.all(
      studentProfiles.map(async (s) => {
        const record = browseRecords.find((r) => r.student_id === s.id) ?? null;
        const [plannerPhotoUrl, studyPhotoUrl] = await Promise.all([
          getSignedPhotoUrl(supabase, record?.planner_photo_url),
          getSignedPhotoUrl(supabase, record?.study_photo_url),
        ]);
        return { profile: s, record, plannerPhotoUrl, studyPhotoUrl };
      }),
    );
  }

  // 담당 학생 중 상담 요일이 지정된 학생들의 "다음 상담일" 예약 현황을 모아
  // 요일별 시간표 형태로 보여주기 위한 데이터입니다. (기존 예약 테이블 조회만
  // 추가하며 스키마 변경은 없습니다.)
  const studentsWithDay = studentProfiles.filter((s) => s.mentoring_day);
  const reservationsRes = studentIds.length
    ? await withTimeout(
        supabase
          .from("mentoring_reservations")
          .select("student_id, session_date, time_slot")
          .in("student_id", studentIds),
        HOME_QUERY_TIMEOUT_MS,
        { data: null },
      )
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
      pastPending={pastPending}
      browseDate={browseDate}
      browseEntries={browseEntries}
    />
  );
}
