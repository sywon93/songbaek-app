import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { currentStudyDateStr } from "@/lib/date";
import { HOME_QUERY_TIMEOUT_MS, withTimeout } from "@/lib/async/withTimeout";
import { RealAdminView } from "@/components/admin/real/RealAdminView";
import type { RecordStatus } from "@/lib/mock/types";

export default async function AdminPage() {
  if (!isSupabaseConfigured) redirect("/");

  const supabase = await createClient();
  const userRes = await withTimeout(
    supabase.auth.getUser(),
    HOME_QUERY_TIMEOUT_MS,
    null,
  );
  const user = userRes?.data.user ?? null;
  if (!user) redirect("/login/admin");

  const profileRes = await withTimeout(
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    HOME_QUERY_TIMEOUT_MS,
    null,
  );
  const profile = profileRes?.data ?? null;
  if (!profile) redirect("/login/admin");
  if (profile.role !== "admin") redirect(`/${profile.role}`);

  const date = currentStudyDateStr();
  const [studentsRes, mentorsRes, linksRes, recordsRes] = await Promise.all([
    withTimeout(
      supabase.from("profiles").select("*").eq("role", "student").order("username"),
      HOME_QUERY_TIMEOUT_MS,
      { data: null },
    ),
    withTimeout(
      supabase.from("profiles").select("*").eq("role", "mentor").order("name"),
      HOME_QUERY_TIMEOUT_MS,
      { data: null },
    ),
    withTimeout(
      supabase.from("mentor_student_links").select("*"),
      HOME_QUERY_TIMEOUT_MS,
      { data: null },
    ),
    withTimeout(
      supabase.from("study_records").select("student_id, status").eq("record_date", date),
      HOME_QUERY_TIMEOUT_MS,
      { data: null },
    ),
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
