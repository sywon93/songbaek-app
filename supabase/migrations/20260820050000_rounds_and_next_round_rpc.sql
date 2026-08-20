-- =========================================================
-- 도장판 N회차(회차 반복) 지원
-- =========================================================

-- ---------------------------------------------------------
-- 1. profiles.round : 학생이 현재 몇 회차 도장판을 진행 중인지
-- ---------------------------------------------------------
alter table public.profiles
  add column round int not null default 1 check (round >= 1);

-- ---------------------------------------------------------
-- 2. protect_profile_fields 에 세션 단위 우회 플래그 추가
--    (start_next_round RPC 안에서만 stamp_count 변경을 허용하기 위함)
-- ---------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin()
     and coalesce(current_setting('app.bypass_profile_protection', true), 'false') <> 'true' then
    new.role = old.role;
    new.stamp_count = old.stamp_count;
    new.stamp_goal = old.stamp_goal;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------
-- 3. start_next_round(student_id) RPC
--    - 본인 확인 후 round +1, stamp_count 는 목표치만큼 차감(이월분은 유지)
--    - security definer 로 실행되지만 auth.uid() 는 호출자 기준이므로
--      본인 프로필만 변경 가능
-- ---------------------------------------------------------
create function public.start_next_round(p_student uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is distinct from p_student then
    raise exception 'not allowed';
  end if;

  perform set_config('app.bypass_profile_protection', 'true', true);

  update public.profiles
  set round = round + 1,
      stamp_count = greatest(stamp_count - stamp_goal, 0)
  where id = p_student
  returning * into result;

  return result;
end;
$$;

grant execute on function public.start_next_round(uuid) to authenticated;
