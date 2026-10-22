-- =========================================================
-- 선물 수령 체크
--   reward_claims : 학생이 어느 회차의 몇 차 보상(도장 7/15/20개)을 받아 갔는지 기록
--   관리자만 체크/해제, 학생은 자기 기록만 읽기
-- 재실행 안전
-- =========================================================

create table if not exists public.reward_claims (
  student_id uuid not null references public.profiles (id) on delete cascade,
  round int not null check (round >= 1),
  stage smallint not null check (stage between 1 and 3),
  claimed_at timestamptz not null default now(),
  claimed_by uuid default auth.uid() references public.profiles (id) on delete set null,
  primary key (student_id, round, stage)
);

comment on table public.reward_claims is '학생이 회차별 1~3차 보상 선물을 받아 간 기록 (관리자 체크)';

alter table public.reward_claims enable row level security;

drop policy if exists "reward_claims_select_admin_or_own" on public.reward_claims;
create policy "reward_claims_select_admin_or_own"
  on public.reward_claims for select
  to authenticated
  using (public.is_admin() or student_id = auth.uid());

drop policy if exists "reward_claims_insert_admin" on public.reward_claims;
create policy "reward_claims_insert_admin"
  on public.reward_claims for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "reward_claims_delete_admin" on public.reward_claims;
create policy "reward_claims_delete_admin"
  on public.reward_claims for delete
  to authenticated
  using (public.is_admin());
