import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { todaySeoulDateStr } from "@/lib/date";
import { RealAdminView } from "@/components/admin/real/RealAdminView";
import type { RecordStatus } from "@/lib/mock/types";

export default async function AdminPage() {
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

  const date = todaySeoulDateStr();
  const [studentsRes, mentorsRes, linksRes, recordsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student").order("class_no").order("student_no"),
    supabase.from("profiles").select("*").eq("role", "mentor").order("name"),
    supabase.from("mentor_student_links").select("*"),
    supabase.from("study_records").select("student_id, status").eq("record_date", date),
  ]);

  const todayStatus = new Map<string, RecordStatus>(
    (recordsRes.data ?? []).map((r) => [r.student_id, r.status as RecordStatus]),
  );

  return (
    <RealAdminView
      admin={profile}
      students={studentsRes.data ?? []}
      mentors={mentorsRes.data ?? []}
      links={linksRes.data ?? []}
      todayStatus={todayStatus}
    />
  );
}
