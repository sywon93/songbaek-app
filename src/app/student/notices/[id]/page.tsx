import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { StudentNoticeDetailView } from "@/components/student/real/StudentNoticesView";

export default async function StudentNoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) redirect("/");

  const { id } = await params;
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

  const { data: notice } = await supabase
    .from("notices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!notice) notFound();

  return <StudentNoticeDetailView profile={profile} notice={notice} />;
}
