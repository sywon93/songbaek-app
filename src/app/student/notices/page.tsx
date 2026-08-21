import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { StudentNoticesListView } from "@/components/student/real/StudentNoticesView";

export default async function StudentNoticesPage() {
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

  const { data: notices } = await supabase
    .from("notices")
    .select("id, title, is_pinned, created_at")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return <StudentNoticesListView profile={profile} notices={notices ?? []} />;
}
