// Supabase 프로젝트가 아직 연결되지 않았거나(.env.local 미설정), 배포 환경에
// URL/키 값이 비어있거나 손상된 형태로 들어온 경우 앱은 Mock 데모 모드로
// 동작합니다. 값이 있어도 형식이 올바르지 않으면(프로토콜 누락, 붙여넣기 시
// 섞여든 공백/개행 등) @supabase/supabase-js가 "Invalid supabaseUrl"을 던지며
// 미들웨어 전체가 죽어버리므로, 여기서 미리 검증해 안전하게 "미설정" 취급합니다.
function sanitize(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isValidHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const rawUrl = sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL);
const rawAnonKey = sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = isValidHttpUrl(rawUrl) && rawAnonKey.length > 0;

// 공백/개행을 제거한 값입니다. isSupabaseConfigured가 true일 때만 유효합니다.
export const supabaseUrl = rawUrl;
export const supabaseAnonKey = rawAnonKey;
