// Supabase Auth는 이메일 기반 로그인만 지원하므로, 학생은 이메일 대신 "학번"으로
// 로그인합니다. 학번(4~5자리 숫자, 예: 10101, 20512)은 관리자가 직접 입력한 값을
// 그대로 사용하며, 이메일 로컬파트로 결정적으로 변환됩니다.

const STUDENT_EMAIL_DOMAIN = "student.stampboard.local";

export function isValidStudentId(studentId: string): boolean {
  return /^\d{4,5}$/.test(studentId);
}

export function studentIdToEmail(studentId: string): string {
  return `s${studentId}@${STUDENT_EMAIL_DOMAIN}`;
}
