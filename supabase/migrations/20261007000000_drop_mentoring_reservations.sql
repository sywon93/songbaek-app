-- =========================================================
-- 멘토링 현장 상담 "예약" 시스템 완전 제거
--
-- 배경: 멘티 수가 크게 늘어날 예정입니다. 슬롯 1개당 1명 예약
--   (unique 제약 + 트리거 검증)으로 동작하던 기존 방식은 인원이 늘수록
--   동시 예약 경쟁(23505 충돌, "이미 마감된 시간" 안내)이 더 자주
--   발생할 수밖에 없는 구조였습니다. 예약 자체를 없애고 "멘토 자율
--   도장 부여"로 대체합니다 (20261007000001_mentor_free_stamp_awards.sql).
--
-- 제거 대상: mentoring_reservations 테이블 + 전용 함수/트리거/enum 타입.
--   트리거(mentoring_reservations_check)와 테이블의 RLS 정책들은
--   `drop table`에 자동으로 cascade 되므로 별도로 지우지 않습니다.
--
-- 이번에 건드리지 않는 것: profiles.mentoring_day 컬럼, weekday enum,
--   관리자 화면의 "지정 요일" 배정 기능(assignMentoringDay). 이 값들은
--   예약 슬롯 계산에만 쓰였을 뿐 예약 테이블 자체에 대한 FK/제약이
--   없어 안전하게 남겨둘 수 있고, 학생별 상담 요일을 기록해 두는
--   용도로 계속 쓰일 수 있어 이번 "예약 시스템 제거" 범위에서는
--   제외했습니다. 이 필드까지 지우고 싶다면 별도로 요청해주세요.
-- =========================================================

drop function if exists public.mentoring_slot_status(date);
drop function if exists public.mentoring_session_size(uuid);
drop function if exists public.mentoring_slots_for_count(int);

drop table if exists public.mentoring_reservations;

drop function if exists public.check_mentoring_reservation();

drop type if exists public.mentoring_time_slot;
