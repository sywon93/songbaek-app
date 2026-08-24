import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { currentStudyDateStr } from "@/lib/date";
import { AdminRecordsView, type AdminRecordEntry } from "@/components/admin/real/AdminRecordsView";

export default async function AdminRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  if (!isSupabaseConfigured) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login/admin");
  if (profile.role !== "admin") redirect(`/${profile.role}`);

  const { date: rawDate } = await searchParams;
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : currentStudyDateStr();

  const [studentsRes, mentorsRes, linksRes, recordsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student").order("username"),
    supabase.from("profiles").select("*").eq("role", "mentor").order("name"),
    supabase.from("mentor_student_links").select("*"),
    supabase.from("study_records").select("*").eq("record_date", date),
  ]);

  const mentorNameById = new Map((mentorsRes.data ?? []).map((m) => [m.id, m.name]));
  const mentorIdByStudent = new Map((linksRes.data ?? []).map((l) => [l.student_id, l.mentor_id]));
  const records = recordsRes.data ?? [];

  const entries: AdminRecordEntry[] = await Promise.all(
    (studentsRes.data ?? []).map(async (s) => {
      const record = records.find((r) => r.student_id === s.id) ?? null;
      const [plannerPhotoUrl, studyPhotoUrl] = await Promise.all([
        getSignedPhotoUrl(supabase, record?.planner_photo_url),
        getSignedPhotoUrl(supabase, record?.study_photo_url),
      ]);
      const mentorId = mentorIdByStudent.get(s.id);
      return {
        profile: s,
        record,
        mentorName: mentorId ? mentorNameById.get(mentorId) ?? null : null,
        plannerPhotoUrl,
        studyPhotoUrl,
      };
    }),
  );

  return <AdminRecordsView admin={profile} date={date} entries={entries} />;
}
