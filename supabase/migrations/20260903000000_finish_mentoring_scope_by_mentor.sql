-- =========================================================
-- 멘토링 예약을 "담당 멘토 세션" 단위로 완결 (통합 · 재실행 안전)
--
-- 배경: 프로덕션에서 20260902100000 이 일부만 적용됨
--   - mentoring_reservations.mentor_id 컬럼은 추가됐으나 백필/NOT NULL/
--     유니크 제약 교체가 안 돼, 전역 unique(session_date, time_slot) 이
--     아직 살아 있음 → 다른 멘토 그룹 학생이 같은 요일·같은 시간대를 먼저
--     잡으면 우리 그룹 학생도 "이미 마감된 시간이에요" 로 막힘.
--
-- 이 파일이 하는 일 (= 20260902100000 + 20260902110000 최종 상태):
--   1. mentor_id 백필 + "담당 멘토 없는" 예약 삭제 + NOT NULL 확정
--   2. 전역 슬롯 유니크 제거 → (mentor_id, session_date, time_slot) 유니크
--   3. mentoring_session_size / mentoring_slots_for_count /
--      mentoring_slot_status / check_mentoring_reservation 를 최종본으로 교체
--      (멘토 세션 단위 집계 + statement_timeout 하드닝 포함,
--       4명 구성은 18:00 시작 slot_1800_1830 / slot_1835_1905 / slot_1915 / slot_1950)
--   4. 새 슬롯 구성에서 더는 유효하지 않은 "미래" 예약 정리
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run.
--   단일 트랜잭션이라 중간 실패 시 전체 롤백됩니다. ALTER TYPE ADD VALUE 가
--   없으므로(모든 enum 값이 이미 존재) 트랜잭션 분리 불필요.
--   여러 번 실행해도 결과가 같도록(idempotent) 작성했습니다.
-- =========================================================

begin;

set local check_function_bodies = off;

-- ---------------------------------------------------------
-- 1. mentor_id 컬럼 + 백필 + "담당 멘토 없는" 예약 삭제 + NOT NULL
-- ---------------------------------------------------------
alter table public.mentoring_reservations
  add column if not exists mentor_id uuid references public.profiles (id) on delete cascade;

comment on column public.mentoring_reservations.mentor_id is
  '예약 시점의 담당 멘토(트리거가 mentor_student_links 에서 자동 기록). 슬롯 정원을 멘토 세션 단위로 분리하기 위한 값.';

-- 아직 mentor_id 가 비어 있는 예약을 현재 매칭으로 채움
update public.mentoring_reservations r
set mentor_id = l.mentor_id
from public.mentor_student_links l
where l.student_id = r.student_id
  and r.mentor_id is null;

-- 담당 멘토가 없는(매칭 해제된) 예약은 실제 상담 세션에 대응되지 않으므로 삭제
delete from public.mentoring_reservations where mentor_id is null;

alter table public.mentoring_reservations
  alter column mentor_id set not null;

-- ---------------------------------------------------------
-- 2. 전역 슬롯 유니크 -> 멘토별 슬롯 유니크
--    (student_id+session_date 유니크는 그대로 유지: 1인 1세션 1건)
-- ---------------------------------------------------------
alter table public.mentoring_reservations
  drop constraint if exists mentoring_reservations_slot_unique;

alter table public.mentoring_reservations
  drop constraint if exists mentoring_reservations_mentor_slot_unique;

alter table public.mentoring_reservations
  add constraint mentoring_reservations_mentor_slot_unique
  unique (mentor_id, session_date, time_slot);

create index if not exists mentoring_reservations_mentor_date_idx
  on public.mentoring_reservations (mentor_id, session_date);

-- ---------------------------------------------------------
-- 3. 인원수 -> 슬롯 목록 (4명: 18:00 시작 / 인원수 0: 빈 목록)
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
-- 4. 세션 인원수: 담당 멘토의 멘티 중 "같은 상담 요일" 배정 인원
-- ---------------------------------------------------------
create or replace function public.mentoring_session_size(p_student uuid)
returns int
language sql
security definer
stable
set search_path = public
set statement_timeout = '4s'
as $$
  with me as (
    select l.mentor_id, p.mentoring_day
    from public.mentor_student_links l
    join public.profiles p on p.id = l.student_id
    where l.student_id = p_student
  )
  select count(distinct l.student_id)::int
  from public.mentor_student_links l
  join public.profiles p on p.id = l.student_id
  join me on me.mentor_id = l.mentor_id
  where me.mentoring_day is not null
    and p.mentoring_day is not distinct from me.mentoring_day;
$$;

-- ---------------------------------------------------------
-- 5. 슬롯 현황 RPC: 인원수에 맞는 슬롯만, 예약 매칭은 "담당 멘토 그룹"으로 한정
--    반환 컬럼 구조/의미 변화 없음 (time_slot, is_taken, is_mine, reservation_id)
-- ---------------------------------------------------------
create or replace function public.mentoring_slot_status(p_date date)
returns table (time_slot public.mentoring_time_slot, is_taken boolean, is_mine boolean, reservation_id uuid)
language plpgsql
security definer
stable
set search_path = public
set statement_timeout = '5s'
as $$
declare
  v_slots public.mentoring_time_slot[];
  v_mentor uuid;
begin
  select mentor_id into v_mentor
  from public.mentor_student_links
  where student_id = auth.uid();

  if v_mentor is null then
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
    on r.session_date = p_date
   and r.time_slot = s.slot
   and r.mentor_id = v_mentor
  order by s.ord;
end;
$$;

grant execute on function public.mentoring_slot_status(date) to authenticated;

-- ---------------------------------------------------------
-- 6. 예약 검증 트리거: mentor_id 자동 기록 + 담당 멘토 필수화
--    (지정 요일 일치 / 과거 날짜 금지 / 세션 유효 슬롯 검증은 그대로)
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
  v_mentor uuid;
begin
  select mentor_id into v_mentor
  from public.mentor_student_links
  where student_id = new.student_id;

  if v_mentor is null then
    raise exception '담당 멘토가 지정되지 않았어요. 관리자에게 문의하세요.';
  end if;
  new.mentor_id := v_mentor;

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

-- ---------------------------------------------------------
-- 7. 새 슬롯 구성에서 더는 유효하지 않은 "미래" 예약 정리
--    (과거 예약은 건드리지 않음. 해당 학생은 화면에서 다시 예약)
-- ---------------------------------------------------------
delete from public.mentoring_reservations r
where r.session_date >= (now() at time zone 'Asia/Seoul')::date
  and not (
    r.time_slot = any (
      public.mentoring_slots_for_count(public.mentoring_session_size(r.student_id))
    )
  );

commit;
