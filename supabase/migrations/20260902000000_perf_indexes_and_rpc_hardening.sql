-- =========================================================
-- 성능/안정성 하드닝 (스키마 동작 변화 없음)
--
-- 배경: "마이그레이션 적용 + 배포 후 홈 화면이 느리거나 안 열림" 신고.
--   RLS 무한 재귀나 구조적 버그는 확인되지 않았고(모든 헬퍼가 security definer),
--   가장 유력한 원인은 무료 플랜의 순간 리소스 한계 + 저녁 상담시간대 동시 접속.
--   여기서는 그 상황에서 조회가 무한정 매달리지 않도록 방어막만 추가합니다.
--
-- 안전성: 모든 인덱스는 IF NOT EXISTS, 함수는 시그니처/반환형/로직 동일
--   (예외: mentoring_slots_for_count 의 "인원수 0" 처리 보정, 아래 주석 참고).
--   대상 테이블이 소규모라 CREATE INDEX 잠금은 사실상 순간입니다.
-- =========================================================

-- ---------------------------------------------------------
-- 1. study_records: record_date 단독 조회용 인덱스
--    관리자 대시보드(/admin)와 관리자 기록 화면은 학생 조건 없이
--    record_date 만으로 필터합니다. 기존 (student_id, record_date desc)
--    복합 인덱스는 선두 컬럼이 student_id 라 이 조회를 커버하지 못해,
--    학기 내내 레코드가 쌓이면 순차 스캔 비용이 커집니다.
-- ---------------------------------------------------------
create index if not exists study_records_record_date_idx
  on public.study_records (record_date);

-- ---------------------------------------------------------
-- 2. study_records: 멘토 화면 '밀린 승인(submitted 상태의 지난 날짜)' 조회용
--    부분 인덱스. 승인 대기 건만 담아 작게 유지됩니다.
-- ---------------------------------------------------------
create index if not exists study_records_submitted_date_idx
  on public.study_records (record_date)
  where status = 'submitted';

-- ---------------------------------------------------------
-- 3. mentoring_slots_for_count: 인원수 0 방어
--    담당 멘토는 있으나 상담 요일 미지정 등으로 세션 인원이 0으로
--    계산되는 경우, 기존 로직은 "3명 이하" 분기로 빠져 슬롯 3개를
--    보여줬습니다. 이제 0 이하이면 빈 목록을 반환합니다.
--    (student 홈은 mentoring_day 가 있어야 이 RPC 를 호출하므로
--     실사용 화면에는 영향이 거의 없고, 방어적 보정입니다.)
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
      array['slot_1840', 'slot_1915', 'slot_1950', 'slot_2025']::public.mentoring_time_slot[]
    else
      array['slot_1800_1830', 'slot_1835_1905', 'slot_1915', 'slot_1950', 'slot_2025']::public.mentoring_time_slot[]
  end;
$$;

-- ---------------------------------------------------------
-- 4. mentoring_session_size: 로직 동일 + 함수 실행 중 statement_timeout 제한
--    (호출이 병적으로 오래 걸릴 때 커넥션을 붙잡지 않고 즉시 실패하도록)
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
  select count(*)::int
  from public.mentor_student_links l
  join public.profiles p on p.id = l.student_id
  join me on me.mentor_id = l.mentor_id
  where me.mentoring_day is not null
    and p.mentoring_day is not distinct from me.mentoring_day;
$$;

-- ---------------------------------------------------------
-- 5. mentoring_slot_status: 로직 동일 + statement_timeout 제한
--    반환 컬럼 구조/의미 변화 없음.
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
