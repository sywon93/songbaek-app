import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/isConfigured";
import type { Database } from "@/lib/supabase/types";

export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 값을 확인하세요.",
    );
  }
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
