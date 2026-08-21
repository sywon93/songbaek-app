import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { AdminNoticesView } from "@/components/admin/real/AdminNoticesView";

export default async function AdminNoticesPage() {
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

  const { data: notices } = await supabase
    .from("notices")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return <AdminNoticesView admin={profile} notices={notices ?? []} />;
}
