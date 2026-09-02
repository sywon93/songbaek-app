-- =========================================================
-- 멘토링 슬롯 현황을 "담당 멘토 세션" 단위로 정확히 계산하도록 수정
--
-- 증상: 학생 예약 화면에서 자리가 남아있는데도 모든 타임슬롯이 '마감'으로
--       표시됨. 멘토 화면에서는 3명만 예약한 상태로 정상 표시.
--
-- 원인:
--   1) mentoring_reservations 에 전역 unique(session_date, time_slot) 제약이
--      걸려 있어, 같은 요일에 상담하는 "다른 멘토의 멘티"가 슬롯을 잡으면
--      우리 세션의 같은 시간대까지 마감으로 잠겼다.
--   2) mentoring_slot_status() 의 left join 이 예약 행을 "담당 멘토 그룹"으로
--      한정하지 않고 (session_date, time_slot) 만으로 매칭했다. 그래서
--      - 다른 멘토 그룹의 예약,
--      - 매칭이 바뀌었거나 상담 요일이 변경돼 더는 이 세션에 속하지 않는
--        학생의 과거 예약
--      까지 is_taken=true 로 집계됐다.
--
-- 해결:
--   - mentoring_reservations.mentor_id 컬럼 추가(예약 시점의 담당 멘토를
--     트리거가 자동 기록). 전역 유니크 제약을 (mentor_id, session_date,
--     time_slot) 로 교체 → 멘토별로 슬롯 풀이 분리된다.
--   - mentoring_slot_status() 의 join 을 호출자의 담당 멘토(mentor_id)로 한정.
--   - check_mentoring_reservation() 이 mentor_id 를 채우고, 담당 멘토가 없으면
--     예약을 거부하도록 보강.
--
-- 안전성: 컬럼/인덱스는 IF (NOT) EXISTS, 함수는 시그니처/반환형 동일.
--   이 파일은 20260901000001 · 20260902000000 의 함수 정의를 대체하므로,
--   20260902000000 적용 여부와 무관하게 마지막에 실행되면 됩니다
--   (statement_timeout 등 성능 하드닝 설정도 그대로 포함).
-- =========================================================

set check_function_bodies = off;

-- ---------------------------------------------------------
-- 1. mentor_id 컬럼 + 백필 + 멘토별 유니크 제약
-- ---------------------------------------------------------
alter table public.mentoring_reservations
  add column if not exists mentor_id uuid references public.profiles (id) on delete cascade;

comment on column public.mentoring_reservations.mentor_id is
  '예약 시점의 담당 멘토(트리거가 mentor_student_links 에서 자동 기록). 슬롯 정원을 멘토 세션 단위로 분리하기 위한 값.';

update public.mentoring_reservations r
set mentor_id = l.mentor_id
from public.mentor_student_links l
where l.student_id = r.student_id
  and r.mentor_id is null;

-- 담당 멘토가 사라진(매칭 해제) 예약은 실제 상담 세션에 대응되지 않으므로 정리합니다.
delete from public.mentoring_reservations where mentor_id is null;

alter table public.mentoring_reservations
  alter column mentor_id set not null;

-- 전역 슬롯 유니크 -> 멘토별 슬롯 유니크
alter table public.mentoring_reservations
  drop constraint if exists mentoring_reservations_slot_unique;

alter table public.mentoring_reservations
  add constraint mentoring_reservations_mentor_slot_unique
  unique (mentor_id, session_date, time_slot);

create index if not exists mentoring_reservations_mentor_date_idx
  on public.mentoring_reservations (mentor_id, session_date);

-- ---------------------------------------------------------
-- 2. 세션 인원수: 담당 멘토의 멘티 중 "같은 상담 요일"을 배정받은 인원.
--    (멘토 화면의 요일별 명단 인원수와 동일한 정의. 로직 동일 + 하드닝 유지)
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
-- 3. 슬롯 현황 RPC: 인원수에 맞는 슬롯만, 예약 매칭은 "담당 멘토 그룹"으로 한정
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
  -- 담당 멘토가 없으면 예약 가능한 슬롯도 없음
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
-- 4. 예약 검증 트리거: mentor_id 자동 기록 + 담당 멘토 필수화.
--    기존 검증(지정 요일 일치 / 과거 날짜 금지 / 세션 유효 슬롯)은 그대로.
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
