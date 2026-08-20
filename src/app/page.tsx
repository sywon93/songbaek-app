import { redirect } from "next/navigation";
import { ClientOnlyAppShell } from "@/app/ClientOnlyAppShell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

export default async function Home() {
  // Supabase 프로젝트가 아직 연결되지 않은 경우 Mock 데모 화면을 그대로 보여줍니다.
  if (!isSupabaseConfigured) {
    return <ClientOnlyAppShell />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  redirect(`/${profile.role}`);
}
