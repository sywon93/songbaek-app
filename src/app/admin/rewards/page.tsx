import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { AdminRewardsView } from "@/components/admin/real/AdminRewardsView";

export default async function AdminRewardsPage() {
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

  const [studentsRes, claimsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, username, round, stamp_count, stamp_goal")
      .eq("role", "student")
      .order("username"),
    supabase.from("reward_claims").select("student_id, round, stage, claimed_at"),
  ]);

  return (
    <AdminRewardsView
      admin={profile}
      students={studentsRes.data ?? []}
      claims={claimsRes.data ?? []}
      loadError={claimsRes.error ? "선물 수령 기록을 불러오지 못했어요. 새로고침해 주세요." : null}
    />
  );
}
