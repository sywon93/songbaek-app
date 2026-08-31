import { redirect } from "next/navigation";
import { ClientOnlyAppShell } from "@/app/ClientOnlyAppShell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { HOME_QUERY_TIMEOUT_MS, withTimeout } from "@/lib/async/withTimeout";

export default async function Home() {
  // Supabase 프로젝트가 아직 연결되지 않은 경우 Mock 데모 화면을 그대로 보여줍니다.
  if (!isSupabaseConfigured) {
    return <ClientOnlyAppShell />;
  }

  const supabase = await createClient();
  const userRes = await withTimeout(
    supabase.auth.getUser(),
    HOME_QUERY_TIMEOUT_MS,
    null,
  );
  const user = userRes?.data.user ?? null;

  if (!user) {
    redirect("/login");
  }

  const profileRes = await withTimeout(
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    HOME_QUERY_TIMEOUT_MS,
    null,
  );
  const profile = profileRes?.data ?? null;

  if (!profile) {
    redirect("/login");
  }

  redirect(`/${profile.role}`);
}
