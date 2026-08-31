import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { StudentRecordsListView } from "@/components/student/real/StudentRecordsView";

export default async function StudentRecordsPage() {
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

  const { data: records } = await supabase
    .from("study_records")
    .select("*")
    .eq("student_id", user.id)
    .order("record_date", { ascending: false });

  return <StudentRecordsListView profile={profile} records={records ?? []} />;
}
