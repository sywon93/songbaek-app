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
