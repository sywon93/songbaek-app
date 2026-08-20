import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { todaySeoulDateStr } from "@/lib/date";
import { RealStudentView } from "@/components/student/real/RealStudentView";

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

  const date = todaySeoulDateStr();
  const { data: record } = await supabase
    .from("study_records")
    .select("*")
    .eq("student_id", user.id)
    .eq("record_date", date)
    .maybeSingle();

  const [plannerPhotoUrl, studyPhotoUrl] = await Promise.all([
    getSignedPhotoUrl(supabase, record?.planner_photo_url),
    getSignedPhotoUrl(supabase, record?.study_photo_url),
  ]);

  return (
    <RealStudentView
      profile={profile}
      record={record ?? null}
      plannerPhotoUrl={plannerPhotoUrl}
      studyPhotoUrl={studyPhotoUrl}
    />
  );
}
