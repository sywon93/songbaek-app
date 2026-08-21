import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { todaySeoulDateStr } from "@/lib/date";
import { RealMentorView, type StudentWithRecord } from "@/components/mentor/real/RealMentorView";

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
          .order("student_id_number")
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

  return <RealMentorView mentor={profile} students={students} date={date} />;
}
