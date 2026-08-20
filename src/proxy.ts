import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

export async function proxy(request: NextRequest) {
  // Supabase 프로젝트를 아직 연결하지 않은 경우(Mock UI 테스트 단계)에는
  // 세션 갱신을 건너뛰어 앱이 정상적으로 동작하도록 합니다.
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
