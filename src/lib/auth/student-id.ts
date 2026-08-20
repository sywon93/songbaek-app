// Supabase Auth는 이메일 기반 로그인만 지원하므로, 학생은 이메일 대신 "학번"으로
// 로그인합니다. 학번 <-> 내부 이메일은 아래 규칙으로 결정적으로 변환됩니다.
//   학번 = 학년(1자리) + 반(2자리) + 번호(2자리) = 총 5자리
//   예) 1학년 3반 5번 -> "10305"
// 학번 자체에는 의미 있는 정보가 없으므로(모두 1학년) 이메일 로컬파트로 그대로 사용합니다.

const STUDENT_EMAIL_DOMAIN = "student.stampboard.local";

export function formatStudentId(classNo: number, studentNo: number): string {
  return `1${String(classNo).padStart(2, "0")}${String(studentNo).padStart(2, "0")}`;
}

export function isValidStudentId(studentId: string): boolean {
  return /^\d{5}$/.test(studentId);
}

export function studentIdToEmail(studentId: string): string {
  return `s${studentId}@${STUDENT_EMAIL_DOMAIN}`;
}

export function parseStudentId(studentId: string): { classNo: number; studentNo: number } | null {
  if (!isValidStudentId(studentId)) return null;
  return {
    classNo: Number(studentId.slice(1, 3)),
    studentNo: Number(studentId.slice(3, 5)),
  };
}
