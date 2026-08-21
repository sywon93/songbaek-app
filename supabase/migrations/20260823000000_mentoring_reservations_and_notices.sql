-- =========================================================
-- 멘토링 현장 만남 예약 + 공지사항
-- 1) profiles.mentoring_day : 멘티별 지정 요일(학교 등교일 기준 월~금)
-- 2) mentoring_reservations : 지정 요일의 4개 타임슬롯 중 하나를 예약
--    (슬롯 1개당 1명만 예약 가능 -> 마감 처리, 학생당 회차 중복 예약 방지)
-- 3) notices : 관리자(선생님)가 작성하는 공지사항, 중요 공지 상단 고정
-- =========================================================

-- ---------------------------------------------------------
-- 1. weekday enum + profiles.mentoring_day
-- ---------------------------------------------------------
create type public.weekday as enum ('mon', 'tue', 'wed', 'thu', 'fri');

alter table public.profiles
  add column mentoring_day public.weekday;

comment on column public.profiles.mentoring_day is '멘티가 현장 멘토링을 위해 등교하는 지정 요일';

-- ---------------------------------------------------------
-- 2. mentoring_time_slot enum + mentoring_reservations
-- ---------------------------------------------------------
create type public.mentoring_time_slot as enum ('slot_1840', 'slot_1915', 'slot_1950', 'slot_2025');

create table public.mentoring_reservations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  session_date date not null,
  time_slot public.mentoring_time_slot not null,
  created_at timestamptz not null default now(),
  constraint mentoring_reservations_slot_unique unique (session_date, time_slot),
  constraint mentoring_reservations_student_date_unique unique (student_id, session_date)
);

comment on table public.mentoring_reservations is '멘티의 현장 멘토링 타임슬롯 예약 (슬롯당 1명, 세션 날짜당 1명 1건)';

create index mentoring_reservations_student_idx on public.mentoring_reservations (student_id);
create index mentoring_reservations_date_idx on public.mentoring_reservations (session_date);

-- 예약 생성 시: 학생 본인의 지정 요일과 예약 날짜의 요일이 일치하는지,
-- 과거 날짜는 아닌지 서버 측에서 강제로 검증합니다(클라이언트 우회 방지).
create function public.check_mentoring_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_day public.weekday;
  expected_isodow int;
  actual_isodow int;
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

  return new;
end;
$$;

create trigger mentoring_reservations_check
  before insert on public.mentoring_reservations
  for each row execute function public.check_mentoring_reservation();

alter table public.mentoring_reservations enable row level security;

create policy "mentoring_reservations_select_related"
  on public.mentoring_reservations for select
  using (
    student_id = auth.uid()
    or public.is_admin()
    or public.is_mentor_of(student_id)
  );

create policy "mentoring_reservations_insert_self"
  on public.mentoring_reservations for insert
  with check (student_id = auth.uid());

create policy "mentoring_reservations_delete_self_or_admin"
  on public.mentoring_reservations for delete
  using (student_id = auth.uid() or public.is_admin());

-- 특정 날짜의 슬롯별 예약 현황(마감 여부, 본인 예약 여부)을 조회하는 RPC.
-- 다른 학생의 신원을 노출하지 않고 "마감" 표시만 가능하게 하기 위해
-- security definer 로 우회합니다(RLS로는 타인의 예약 존재 여부만 알 수 없음).
create function public.mentoring_slot_status(p_date date)
returns table (time_slot public.mentoring_time_slot, is_taken boolean, is_mine boolean, reservation_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select
    t.slot as time_slot,
    r.id is not null as is_taken,
    coalesce(r.student_id = auth.uid(), false) as is_mine,
    case when r.student_id = auth.uid() then r.id else null end as reservation_id
  from (select unnest(enum_range(null::public.mentoring_time_slot)) as slot) t
  left join public.mentoring_reservations r
    on r.session_date = p_date and r.time_slot = t.slot
  order by t.slot;
$$;

grant execute on function public.mentoring_slot_status(date) to authenticated;

-- ---------------------------------------------------------
-- 3. notices
-- ---------------------------------------------------------
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  is_pinned boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notices_title_not_blank check (btrim(title) <> ''),
  constraint notices_content_not_blank check (btrim(content) <> '')
);

comment on table public.notices is '관리자(선생님)가 작성하는 공지사항';

create index notices_pinned_created_idx on public.notices (is_pinned desc, created_at desc);

create trigger set_notices_updated_at
  before update on public.notices
  for each row execute function public.set_updated_at();

alter table public.notices enable row level security;

create policy "notices_select_authenticated"
  on public.notices for select
  to authenticated
  using (true);

create policy "notices_insert_admin"
  on public.notices for insert
  with check (public.is_admin());

create policy "notices_update_admin"
  on public.notices for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "notices_delete_admin"
  on public.notices for delete
  using (public.is_admin());
