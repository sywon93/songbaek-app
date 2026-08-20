import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/isConfigured";

export async function updateSession(request: NextRequest) {
  const supabaseResponse0 = NextResponse.next({ request });

  // proxy.ts가 호출 전에 이미 isSupabaseConfigured를 확인하지만, 값이 배포
  // 환경에 따라 실행 중 바뀔 수 있으므로 여기서도 한 번 더 방어합니다.
  // 잘못된 값으로 createServerClient를 호출하면 "Invalid supabaseUrl"
  // 예외가 던져져 미들웨어 전체가 죽어버리므로, 미설정 상태로 조용히
  // 넘어갑니다.
  if (!isSupabaseConfigured) {
    return supabaseResponse0;
  }

  let supabaseResponse = supabaseResponse0;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the auth token if needed. Do not remove this call.
  await supabase.auth.getUser();

  return supabaseResponse;
}
