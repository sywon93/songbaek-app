-- =========================================================
-- 멘토 자율 도장 부여 ("도장 선물하기")
--
-- 멘토링 예약 제거(20261007000000)를 대체하는 기능입니다. 멘토가 멘티의
-- 평소 태도/숙제 등을 보고 사유를 남기며 도장을 1개씩 자유롭게 부여할 수
-- 있습니다. 기존 "일지 승인" 경로와는 완전히 독립적으로 동작합니다
-- (같은 날 이미 일지를 승인했어도 보너스 도장을 또 줄 수 있고,
-- study_records 의 student_id+record_date 하루 1건 제약과도 무관합니다).
-- =========================================================

-- ---------------------------------------------------------
-- 1. stamp_awards: 멘토가 자율로 부여한 "보너스 도장" 이력
--    (study_records 와 별개 테이블 - 하루 1건 제약/사진/학습내용 같은
--     일지 전용 필드가 필요 없고, 불변 이력이라 update 정책도 두지 않음)
-- ---------------------------------------------------------
create table public.stamp_awards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  awarded_at timestamptz not null default now(),
  constraint stamp_awards_reason_not_blank check (btrim(reason) <> '')
);

comment on table public.stamp_awards is
  '멘토가 일지 승인 경로 없이 자율적으로 부여한 보너스 도장 이력 ("도장 선물하기")';

create index stamp_awards_student_idx on public.stamp_awards (student_id, awarded_at desc);

alter table public.stamp_awards enable row level security;

create policy "stamp_awards_select_related"
  on public.stamp_awards for select
  using (
    student_id = auth.uid()
    or public.is_admin()
    or public.is_mentor_of(student_id)
  );

-- insert/update/delete 전용 정책은 두지 않습니다: 아래 mentor_award_free_stamp()
-- RPC(security definer)만 이 테이블에 기록을 추가할 수 있고, 수정/삭제 경로는
-- 아예 없습니다(이력은 불변).

-- ---------------------------------------------------------
-- 2. 회차 넘기기 로직을 공용 내부 함수로 분리
--    학생이 직접 누르는 start_next_round() 와, 멘토가 도장을 선물한 뒤
--    자동으로 목표 달성을 확인하는 경로가 동일한 갱신 로직/잠금을
--    공유하도록 내부 함수로 뽑아냅니다. stamp_count >= stamp_goal 조건을
--    UPDATE 의 WHERE 에 그대로 두어, 두 경로가 거의 동시에 호출돼도
--    회차가 중복으로 넘어가지 않도록 방어합니다.
-- ---------------------------------------------------------
create function public.advance_round_internal(p_student uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  perform set_config('app.bypass_profile_protection', 'true', true);

  update public.profiles
  set round = round + 1,
      stamp_count = greatest(stamp_count - stamp_goal, 0)
  where id = p_student
    and stamp_count >= stamp_goal
  returning * into result;

  return result;
end;
$$;

create or replace function public.start_next_round(p_student uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_student then
    raise exception 'not allowed';
  end if;

  return public.advance_round_internal(p_student);
end;
$$;

-- ---------------------------------------------------------
-- 3. mentor_award_free_stamp(student, reason) RPC
--    - 권한 검증: 호출자(auth.uid())가 해당 학생의 담당 멘토인지
--      is_mentor_of() 로 확인합니다.
--    - 동시성: profiles 행을 select ... for update 로 먼저 잠궈, 같은
--      학생에게 몰리는 다른 변경(멘토 승인 트리거, 다른 도장 선물 등)과
--      경쟁하지 않게 합니다. Postgres 는 이 잠금을 함수(=트랜잭션)가
--      끝날 때까지 유지하므로, 뒤이은 +1 갱신과 회차 체크가 하나의
--      원자적 단위로 실행됩니다.
--    - protect_profile_fields 트리거 우회: start_next_round() 와 동일하게
--      app.bypass_profile_protection 세션 플래그를 세팅합니다(멘토는
--      관리자가 아니라 is_admin() 검사를 통과하지 못하기 때문).
--    - 목표 도달 시 advance_round_internal() 로 회차를 자동으로 넘깁니다.
--    - 이력: stamp_awards 에 사유와 함께 기록합니다.
-- ---------------------------------------------------------
create function public.mentor_award_free_stamp(
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

  if not public.is_mentor_of(p_student) then
    raise exception '담당 멘티에게만 도장을 선물할 수 있어요.';
  end if;

  perform set_config('app.bypass_profile_protection', 'true', true);

  -- 행 잠금: 아래 두 문장(도장 +1 / 회차 체크) 사이에 다른 트랜잭션이
  -- 같은 학생의 stamp_count/round 를 바꾸지 못하게 막습니다.
  select stamp_goal into v_goal
  from public.profiles
  where id = p_student
  for update;

  if v_goal is null then
    raise exception '학생 프로필을 찾을 수 없어요.';
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

grant execute on function public.mentor_award_free_stamp(uuid, text) to authenticated;

-- ---------------------------------------------------------
-- 4. recompute_stamp_count 보정: 보너스 도장도 "정답 값"에 포함
--    (관리자가 재계산을 눌러도 멘토가 선물한 도장이 사라지지 않도록.
--     stamp_count 는 일지 승인/보너스 선물을 구분하지 않는 하나의
--     누적치이므로, round 경계를 넘는 차감 로직(- (round-1)*stamp_goal)
--     은 그대로 두고 "정답 값"의 원천에 보너스 도장 수만 더합니다.)
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
    (
      (select count(*) from public.study_records sr
         where sr.student_id = p.id and sr.status = 'approved')
      + (select count(*) from public.stamp_awards sa
         where sa.student_id = p.id)
    ) - (p.round - 1) * p.stamp_goal,
    0)
  where p.id = p_student
  returning * into result;

  return result;
end;
$$;

-- ---------------------------------------------------------
-- 5. 내부 함수 실행 권한 회수
--    Postgres 는 새 함수에 EXECUTE 를 PUBLIC 으로 기본 부여하고, Supabase 는
--    public 스키마 함수를 anon/authenticated 에도 기본 부여합니다. 따라서
--    "grant 하지 않음"만으로는 /rest/v1/rpc 로 누구나 호출할 수 있으므로
--    명시적으로 회수합니다. (security definer 함수 내부 호출은 소유자 권한으로
--    실행되므로 start_next_round / mentor_award_free_stamp / recompute_stamp_count
--    / 백필 스크립트는 영향 없음)
-- ---------------------------------------------------------
revoke execute on function public.advance_round_internal(uuid) from public, anon, authenticated;
revoke execute on function public.recompute_stamp_count_internal(uuid) from public, anon, authenticated;
