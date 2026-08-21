import type { Weekday } from "@/lib/supabase/types";

// DB의 study_records.record_date 는 Asia/Seoul 기준 날짜(default (now() at time zone
// 'Asia/Seoul')::date)를 사용하므로, 클라이언트/서버 어디서 실행되든 동일한 "오늘"을
// 계산하기 위해 타임존을 고정해서 구합니다.
export function todaySeoulDateStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const WEEKDAY_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "월요일",
  tue: "화요일",
  wed: "수요일",
  thu: "목요일",
  fri: "금요일",
};

export function weekdayLabel(day: Weekday): string {
  return WEEKDAY_LABEL[day];
}

// profiles.mentoring_day(요일)에 해당하는 다음 세션 날짜(오늘 포함, Asia/Seoul 기준)를
// "YYYY-MM-DD" 문자열로 계산합니다. DB의 check_mentoring_reservation 트리거가 이
// 계산과 동일한 규칙(isodow 일치)으로 한 번 더 검증합니다.
export function nextMentoringDateStr(day: Weekday): string {
  const [y, m, d] = todaySeoulDateStr().split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const todayIsodow = date.getDay() === 0 ? 7 : date.getDay();
  const targetIsodow = WEEKDAY_ORDER.indexOf(day) + 1;
  const diff = (targetIsodow - todayIsodow + 7) % 7;
  date.setDate(date.getDate() + diff);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
