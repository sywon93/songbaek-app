import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

// 이미 로그인된 사용자가 로그인 화면(/login, /login/admin)에 다시 들어오면
// 곧바로 자신의 역할별 메인 화면으로 보냅니다. (로그인 폼이 인증된 사용자에게
// 노출되는 것을 막는 접근 제어 보완)
export async function redirectIfAuthenticated() {
  if (!isSupabaseConfigured) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile) redirect(`/${profile.role}`);
}
