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

// 자정(00:00)부터 새벽 4시 전까지는 아직 "전날" 학습일로 취급하는 마감 유예
// 시각입니다. 밤을 새워 공부하는 학생들이 새벽에 인증 사진/일지를 올려도
// 전날 학습 기록으로 저장되도록 하기 위한 규칙이며, 달력상의 실제 오늘 날짜가
// 필요한 곳(예: 상담 요일 계산)에는 영향을 주지 않습니다.
const LATE_NIGHT_GRACE_END_HOUR = 4;

// 학습 기록(record_date) 저장/조회에 사용하는 "현재 학습일"을 계산합니다.
// Asia/Seoul 기준 00:00~04:00 사이에는 하루 전 날짜를 반환합니다.
export function currentStudyDateStr(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));

  const date = new Date(Date.UTC(year, month - 1, day));
  if (hour < LATE_NIGHT_GRACE_END_HOUR) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 타임스탬프(ISO 문자열)를 Asia/Seoul 기준으로 "9월 1일 오후 02:30" 형태로 포맷합니다.
// timeZone 을 고정하지 않으면 서버(UTC)와 브라우저(사용자 로컬)의 렌더 결과가 달라
// React 하이드레이션 불일치 경고가 발생하므로, 표시용 시각 포맷은 항상 이 함수를 씁니다.
export function formatSeoulDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 타임스탬프를 Asia/Seoul 기준 날짜만 "2026. 9. 1." 형태로 포맷합니다. (위와 동일한 이유)
export function formatSeoulDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

// "YYYY-MM-DD" 학습일 문자열을 "8월 31일 (일)" 형태의 한국어 라벨로 변환합니다.
export function studyDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${wd})`;
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
