-- =========================================================
-- 4명 그룹 멘토링 타임슬롯 시작 시간을 18:40 -> 18:00 으로 변경
--
-- 변경 전 (4명): 18:40~19:10 / 19:15~19:45 / 19:50~20:20 / 20:25~20:55
--   = slot_1840, slot_1915, slot_1950, slot_2025
-- 변경 후 (4명): 18:00~18:30 / 18:35~19:05 / 19:15~19:45 / 19:50~20:20
--   = slot_1800_1830, slot_1835_1905, slot_1915, slot_1950
--
-- 4개 슬롯 모두 이미 존재하는 enum 값(3명/5명 구성에서 사용 중)이라
--   - ALTER TYPE ... ADD VALUE (별도 트랜잭션) 불필요,
--   - slot_1915 (19:15~19:45) · slot_1950 (19:50~20:20) 는 시간대가 동일해
--     기존 4명 예약이 그대로 유효(4->5명 전환 시에도 유지)합니다.
-- 새 4명 구성 = 기존 5명 구성에서 마지막 slot_2025 만 뺀 형태입니다.
--
-- slot_1840 은 이제 어떤 구성에서도 쓰이지 않지만, 과거 예약이 참조할 수 있어
--   enum 값 자체는 남겨 둡니다(제거 불가/불필요).
-- =========================================================

set check_function_bodies = off;

-- ---------------------------------------------------------
-- 1. 인원수 -> 슬롯 목록 (4명 분기만 수정, 나머지 동일)
-- ---------------------------------------------------------
create or replace function public.mentoring_slots_for_count(p_count int)
returns public.mentoring_time_slot[]
language sql
immutable
as $$
  select case
    when coalesce(p_count, 0) <= 0 then
      array[]::public.mentoring_time_slot[]
    when p_count <= 3 then
      array['slot_1800_1850', 'slot_1900_1950', 'slot_2000_2050']::public.mentoring_time_slot[]
    when p_count = 4 then
      array['slot_1800_1830', 'slot_1835_1905', 'slot_1915', 'slot_1950']::public.mentoring_time_slot[]
    else
      array['slot_1800_1830', 'slot_1835_1905', 'slot_1915', 'slot_1950', 'slot_2025']::public.mentoring_time_slot[]
  end;
$$;

-- ---------------------------------------------------------
-- 2. 새 구성에서 더는 유효하지 않은 "미래" 예약 정리
--    (지금 기준으로 각 예약이 그 세션의 유효 슬롯 목록에 없으면 삭제.
--     해당 학생은 화면에서 다시 예약하면 됩니다. 과거 예약은 건드리지 않음.)
--    - 4명 세션의 slot_1840 / slot_2025 예약이 여기서 정리됩니다.
-- ---------------------------------------------------------
delete from public.mentoring_reservations r
where r.session_date >= (now() at time zone 'Asia/Seoul')::date
  and not (
    r.time_slot = any (
      public.mentoring_slots_for_count(public.mentoring_session_size(r.student_id))
    )
  );
