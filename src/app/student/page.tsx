import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { currentStudyDateStr, nextMentoringDateStr } from "@/lib/date";
import { RealStudentView } from "@/components/student/real/RealStudentView";
import type { Weekday } from "@/lib/supabase/types";

export default async function StudentPage() {
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
  if (profile.role !== "student") redirect(`/${profile.role}`);

  const date = currentStudyDateStr();
  const { data: record } = await supabase
    .from("study_records")
    .select("*")
    .eq("student_id", user.id)
    .eq("record_date", date)
    .maybeSingle();

  const mentoringDate = profile.mentoring_day
    ? nextMentoringDateStr(profile.mentoring_day as Weekday)
    : null;

  const [plannerPhotoUrl, studyPhotoUrl, slotStatusRes, noticesRes] = await Promise.all([
    getSignedPhotoUrl(supabase, record?.planner_photo_url),
    getSignedPhotoUrl(supabase, record?.study_photo_url),
    mentoringDate
      ? supabase.rpc("mentoring_slot_status", { p_date: mentoringDate })
      : Promise.resolve({ data: null }),
    supabase
      .from("notices")
      .select("id, title, is_pinned, created_at")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  return (
    <RealStudentView
      profile={profile}
      record={record ?? null}
      plannerPhotoUrl={plannerPhotoUrl}
      studyPhotoUrl={studyPhotoUrl}
      mentoringDate={mentoringDate}
      slotStatus={slotStatusRes.data ?? []}
      notices={noticesRes.data ?? []}
    />
  );
}
