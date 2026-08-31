-- =========================================================
-- 멘토링 타임슬롯을 "그 요일 세션 인원수"에 따라 동적으로 구성
--
-- 세션 인원 = 학생의 담당 멘토가 맡은 멘티 중, 학생과 같은 멘토링 요일
--            (profiles.mentoring_day)을 배정받은 학생 수.
--
--  - 3명 이하 : 50분 진행 + 10분 휴식  (3타임, 18:00 시작)
--      18:00~18:50 / 19:00~19:50 / 20:00~20:50
--  - 4명       : 기존 4타임 유지
--      18:40~19:10 / 19:15~19:45 / 19:50~20:20 / 20:25~20:55
--  - 5명 이상 : 30분 진행 + 5/10분 휴식 (5타임, 18:00 시작)
--      18:00~18:30 / 18:35~19:05 / 19:15~19:45 / 19:50~20:20 / 20:25~20:55
--
-- ⚠️ 이 파일은 20260901000000_mentoring_add_slot_enum_values.sql 가 먼저
--    커밋된 뒤(=별도 트랜잭션)에 실행되어야 합니다. 새 enum 값을 참조하기 때문.
--    supabase db push 는 파일별로 트랜잭션이 분리되어 그대로 실행하면 됩니다.
--    SQL Editor 에서 수동 실행할 경우: 앞 파일을 먼저 실행(커밋)한 뒤 이 파일을
--    실행하세요. 아래 check_function_bodies=off 는 혹시 두 파일을 한 번에
--    붙여넣더라도 함수 생성이 깨지지 않도록 하는 안전장치입니다(런타임 호출은
--    항상 커밋 이후이므로 정상 동작).
-- =========================================================

set check_function_bodies = off;

-- ---------------------------------------------------------
-- 1. 인원수 -> 슬롯 목록 (표시 순서 유지)
-- ---------------------------------------------------------
create or replace function public.mentoring_slots_for_count(p_count int)
returns public.mentoring_time_slot[]
language sql
immutable
as $$
  select case
    when coalesce(p_count, 0) <= 3 then
      array['slot_1800_1850', 'slot_1900_1950', 'slot_2000_2050']::public.mentoring_time_slot[]
    when p_count = 4 then
      array['slot_1840', 'slot_1915', 'slot_1950', 'slot_2025']::public.mentoring_time_slot[]
    else
      array['slot_1800_1830', 'slot_1835_1905', 'slot_1915', 'slot_1950', 'slot_2025']::public.mentoring_time_slot[]
  end;
$$;

-- ---------------------------------------------------------
-- 2. 학생 기준 "그 요일 세션 인원수" 계산
--    (다른 학생의 요일/매칭 정보를 봐야 하므로 security definer 로 RLS 우회)
-- ---------------------------------------------------------
create or replace function public.mentoring_session_size(p_student uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select l.mentor_id, p.mentoring_day
    from public.mentor_student_links l
    join public.profiles p on p.id = l.student_id
    where l.student_id = p_student
  )
  select count(*)::int
  from public.mentor_student_links l
  join public.profiles p on p.id = l.student_id
  join me on me.mentor_id = l.mentor_id
  where me.mentoring_day is not null
    and p.mentoring_day is not distinct from me.mentoring_day;
$$;

-- ---------------------------------------------------------
-- 3. 슬롯 현황 RPC: 인원수에 맞는 슬롯만 (순서대로) 반환
--    반환 컬럼 구조는 기존과 동일 (time_slot, is_taken, is_mine, reservation_id)
-- ---------------------------------------------------------
create or replace function public.mentoring_slot_status(p_date date)
returns table (time_slot public.mentoring_time_slot, is_taken boolean, is_mine boolean, reservation_id uuid)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_slots public.mentoring_time_slot[];
begin
  -- 담당 멘토가 없으면 예약 가능한 슬롯도 없음
  if not exists (
    select 1 from public.mentor_student_links where student_id = auth.uid()
  ) then
    return;
  end if;

  v_slots := public.mentoring_slots_for_count(public.mentoring_session_size(auth.uid()));

  return query
  select
    s.slot as time_slot,
    r.id is not null as is_taken,
    coalesce(r.student_id = auth.uid(), false) as is_mine,
    case when r.student_id = auth.uid() then r.id else null end as reservation_id
  from unnest(v_slots) with ordinality as s(slot, ord)
  left join public.mentoring_reservations r
    on r.session_date = p_date and r.time_slot = s.slot
  order by s.ord;
end;
$$;

grant execute on function public.mentoring_slot_status(date) to authenticated;

-- ---------------------------------------------------------
-- 4. 예약 검증 트리거: 지정 요일/과거 날짜 + "이 세션에서 유효한 슬롯인지" 확인
-- ---------------------------------------------------------
create or replace function public.check_mentoring_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_day public.weekday;
  expected_isodow int;
  actual_isodow int;
  valid_slots public.mentoring_time_slot[];
begin
  select mentoring_day into student_day
  from public.profiles
  where id = new.student_id;

  if student_day is null then
    raise exception '지정된 멘토링 요일이 없어요. 관리자에게 문의하세요.';
  end if;

  expected_isodow := array_position(enum_range(null::public.weekday), student_day);
  actual_isodow := extract(isodow from new.session_date)::int;

  if expected_isodow <> actual_isodow then
    raise exception '본인의 지정 요일에만 예약할 수 있어요.';
  end if;

  if new.session_date < (now() at time zone 'Asia/Seoul')::date then
    raise exception '지난 날짜는 예약할 수 없어요.';
  end if;

  valid_slots := public.mentoring_slots_for_count(public.mentoring_session_size(new.student_id));
  if not (new.time_slot = any (valid_slots)) then
    raise exception '현재 상담 세션에서 선택할 수 없는 시간대예요. 화면을 새로고침해 주세요.';
  end if;

  return new;
end;
$$;
