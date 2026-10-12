-- =========================================================
-- 도장 선물하기: "담당 멘티 한정" → "모든 멘토가 전체 학생에게"
--
-- 1. mentor_award_free_stamp: is_mentor_of() 담당 관계 검사를 없애고,
--    호출자의 role 이 mentor/admin 이기만 하면 어떤 학생에게든 선물 가능.
--    대상이 실제 학생(role='student')인지는 잠금과 동시에 확인합니다.
-- 2. search_students_for_gift: 멘토는 RLS(profiles_select_self_or_related)상
--    담당이 아닌 학생 프로필을 읽을 수 없으므로, 이름/학번 검색 전용
--    security definer RPC 를 추가합니다. 노출 컬럼은 선물에 필요한 최소
--    정보(id, 이름, 학번, 도장 현황)로 한정하고 전화번호 등은 내보내지
--    않습니다.
-- 3. stamp_awards 조회 정책: 담당이 아닌 학생에게 선물한 멘토도 자신이
--    준 이력은 볼 수 있도록 mentor_id = auth.uid() 조건 추가.
--
-- 기존 profiles RLS 는 그대로 둡니다(멘토가 다른 학생의 일지/사진까지
-- 보게 되지는 않음).
-- =========================================================

-- ---------------------------------------------------------
-- 1. mentor_award_free_stamp 권한 조건 변경
-- ---------------------------------------------------------
create or replace function public.mentor_award_free_stamp(
  p_student uuid,
  p_reason text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal int;
  v_count int;
  v_reason text;
  result public.profiles;
begin
  v_reason := btrim(coalesce(p_reason, ''));
  if v_reason = '' then
    raise exception '도장을 선물하는 이유를 입력해주세요.';
  end if;

  if public.current_role() is distinct from 'mentor'
     and public.current_role() is distinct from 'admin' then
    raise exception '멘토 또는 선생님만 도장을 선물할 수 있어요.';
  end if;

  perform set_config('app.bypass_profile_protection', 'true', true);

  -- 행 잠금 + 대상이 학생인지 확인. 같은 학생에게 여러 멘토가 동시에
  -- 선물해도 이 잠금에서 순서대로 처리되어 +1/회차 넘기기가 꼬이지 않습니다.
  select stamp_goal into v_goal
  from public.profiles
  where id = p_student
    and role = 'student'
  for update;

  if v_goal is null then
    raise exception '학생을 찾을 수 없어요.';
  end if;

  update public.profiles
  set stamp_count = stamp_count + 1
  where id = p_student
  returning stamp_count into v_count;

  insert into public.stamp_awards (student_id, mentor_id, reason)
  values (p_student, auth.uid(), v_reason);

  if v_count >= v_goal then
    perform public.advance_round_internal(p_student);
  end if;

  select * into result from public.profiles where id = p_student;
  return result;
end;
$$;

-- ---------------------------------------------------------
-- 2. 전체 학생 검색 RPC (멘토/관리자 전용)
--    이름 또는 학번(username) 부분 일치. 와일드카드(% _ \)는 이스케이프해
--    검색어로 전체 목록을 덤프할 수 없게 하고, 결과는 최대 20명.
-- ---------------------------------------------------------
create function public.search_students_for_gift(p_query text)
returns table (
  id uuid,
  name text,
  username text,
  stamp_count int,
  stamp_goal int,
  round int
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_q text;
begin
  if public.current_role() is distinct from 'mentor'
     and public.current_role() is distinct from 'admin' then
    raise exception '멘토 또는 선생님만 학생을 검색할 수 있어요.';
  end if;

  v_q := btrim(coalesce(p_query, ''));
  if v_q = '' then
    return;
  end if;
  v_q := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');

  return query
    select p.id, p.name, p.username, p.stamp_count, p.stamp_goal, p.round
    from public.profiles p
    where p.role = 'student'
      and (p.name ilike '%' || v_q || '%' or p.username ilike '%' || v_q || '%')
    order by p.name, p.username
    limit 20;
end;
$$;

revoke execute on function public.search_students_for_gift(text) from public, anon;
grant execute on function public.search_students_for_gift(text) to authenticated;

-- ---------------------------------------------------------
-- 3. stamp_awards 조회 정책: 선물한 멘토 본인도 조회 가능
-- ---------------------------------------------------------
drop policy if exists "stamp_awards_select_related" on public.stamp_awards;

create policy "stamp_awards_select_related"
  on public.stamp_awards for select
  using (
    student_id = auth.uid()
    or mentor_id = auth.uid()
    or public.is_admin()
    or public.is_mentor_of(student_id)
  );
