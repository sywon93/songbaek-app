// Supabase 프로젝트가 아직 연결되지 않은 경우(.env.local 미설정) 앱은 Mock 데모 모드로
// 동작합니다. 실제 프로젝트를 연결하면 이 값이 true 가 되어 실제 로그인/데이터 흐름이 켜집니다.
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
