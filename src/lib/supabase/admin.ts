import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseUrl } from "@/lib/supabase/isConfigured";
import type { Database } from "@/lib/supabase/types";

// service-role 키를 사용하는 관리자 전용 클라이언트입니다.
// 절대 클라이언트 컴포넌트에서 import하지 마세요 (service role 키가 번들에 노출됩니다).
// Route Handler / Server Action 등 서버 전용 코드에서만 사용해야 합니다.
// 신규 학생/멘토 계정 생성, 계정 삭제처럼 auth.users 를 직접 다뤄야 하는
// 작업(RLS로 클라이언트에서 할 수 없는 것)에만 사용하세요.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!isSupabaseConfigured || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. .env.local을 확인하세요.",
    );
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
