// Supabase Auth는 이메일 기반 로그인만 지원하므로, 학생/멘토 모두 실제 이메일
// 대신 "아이디"로 로그인합니다. 아이디 <-> 내부 이메일은 아래 규칙으로
// 결정적으로 변환됩니다: {아이디}@songbaek.app

const USERNAME_EMAIL_DOMAIN = "songbaek.app";

// 아이디 공통 형식: 영문 소문자/숫자/밑줄 3~20자 (멘토 등 일반 아이디)
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

// 학생 전용: 아이디 = 학번(4~5자리 숫자)
export function isValidStudentUsername(username: string): boolean {
  return /^\d{4,5}$/.test(username);
}

export function usernameToEmail(username: string): string {
  return `${username}@${USERNAME_EMAIL_DOMAIN}`;
}
