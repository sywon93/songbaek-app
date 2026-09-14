-- =========================================================
-- 버그 수정: 멘토 승인 시 도장이 지급되지 않던 문제
--
-- 원인: award_stamp_on_approval() 이 study_records 승인(UPDATE) 뒤
--   profiles.stamp_count 를 +1 하는 UPDATE 를 실행하면, profiles 테이블의
--   BEFORE UPDATE 트리거 protect_profile_fields() 가 다시 실행됩니다.
--   이 트리거는 "호출자(auth.uid())가 admin 인지"를 기준으로
--   role/stamp_count/stamp_goal 변경을 막는데, 멘토 승인 흐름에서는
--   호출자가 멘토(비관리자)이므로 매번 이 조건에 걸려 stamp_count 변경이
--   old 값으로 되돌려집니다 → 일지는 approved 로 정상 저장되지만
--   도장(stamp_count)은 조용히 지급되지 않음.
--
--   20260820050000_rounds_and_next_round_rpc.sql 에서 start_next_round()
--   RPC 는 app.bypass_profile_protection 세션 플래그로 이미 이 문제를
--   우회하고 있었으나, award_stamp_on_approval() 에는 동일 처리가
--   빠져 있었습니다. 관리자 전용 admin_set_stamp() 는 호출자가 admin 이라
--   is_admin() 검사를 그냥 통과해 증상이 드러나지 않았습니다.
-- =========================================================

create or replace function public.award_stamp_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform set_config('app.bypass_profile_protection', 'true', true);
    update public.profiles
    set stamp_count = stamp_count + 1
    where id = new.student_id;
  elsif old.status = 'approved' and new.status is distinct from 'approved' then
    perform set_config('app.bypass_profile_protection', 'true', true);
    update public.profiles
    set stamp_count = greatest(stamp_count - 1, 0)
    where id = new.student_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------
-- 재발 방지: stamp_count 를 실제 승인된 일지 수 기준으로 다시
-- 계산해 맞추는 재계산 함수. 여러 번 호출해도 항상 같은(정답) 값으로
-- 수렴하므로 안전합니다(중복 지급 없음).
--
-- _internal 버전은 is_admin() 검사를 하지 않는 내부용입니다.
-- SQL Editor(슈퍼유저, auth.uid() 없음)에서 백필용으로 직접 호출하거나,
-- 다른 admin 전용 함수 내부에서만 사용하세요. authenticated 롤에는
-- grant 하지 않습니다.
-- ---------------------------------------------------------
create or replace function public.recompute_stamp_count_internal(p_student uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  perform set_config('app.bypass_profile_protection', 'true', true);

  update public.profiles p
  set stamp_count = greatest(
    (select count(*) from public.study_records sr
       where sr.student_id = p.id and sr.status = 'approved')
      - (p.round - 1) * p.stamp_goal,
    0)
  where p.id = p_student
  returning * into result;

  return result;
end;
$$;

-- 앱(관리자 화면)에서 특정 학생 1명을 재계산할 때 쓰는 공개 RPC.
-- is_admin() 검사를 거친 뒤 위 내부 함수를 호출합니다.
create or replace function public.recompute_stamp_count(p_student uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  return public.recompute_stamp_count_internal(p_student);
end;
$$;

grant execute on function public.recompute_stamp_count(uuid) to authenticated;
