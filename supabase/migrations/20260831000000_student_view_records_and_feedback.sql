-- =========================================================
-- 학생이 '내 학습 기록 + 멘토 피드백'을 직접 조회하도록 RLS 보완
--
-- 배경:
--  - study_records 는 이미 "records_select_related" 정책으로 학생 본인
--    (student_id = auth.uid())이 자신의 모든 기록(started/submitted/approved)을
--    SELECT 할 수 있습니다. 멘토의 피드백은 별도 테이블이 아니라
--    study_records.encouragement_message / reviewed_by / reviewed_at 컬럼에
--    저장되므로, 학생은 자신의 기록을 읽을 때 피드백 본문/작성일시도 함께
--    읽을 수 있습니다. (여기서는 추가 변경 없음, 주석으로만 확인)
--  - 다만 "멘토 이름"을 표시하려면 reviewed_by(= 멘토 profiles.id) 행을
--    읽어야 하는데, 기존 "profiles_select_self_or_related" 정책은
--    본인 / 관리자 / (내가 멘토인 학생) 만 허용하여 학생이 자신의 담당
--    멘토 프로필을 읽지 못했습니다. 이 마이그레이션에서 "학생 -> 담당 멘토"
--    방향을 추가로 허용합니다.
-- =========================================================

-- ---------------------------------------------------------
-- 1. 헬퍼: 대상 프로필이 "나(학생)의 담당 멘토"인지 확인
--    (RLS 재귀 방지를 위해 security definer)
-- ---------------------------------------------------------
create function public.is_my_mentor(target_mentor uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.mentor_student_links
    where student_id = auth.uid() and mentor_id = target_mentor
  );
$$;

grant execute on function public.is_my_mentor(uuid) to authenticated;

-- ---------------------------------------------------------
-- 2. profiles SELECT 정책 보완: 학생이 자신의 담당 멘토 프로필을 조회 가능
-- ---------------------------------------------------------
drop policy if exists "profiles_select_self_or_related" on public.profiles;

create policy "profiles_select_self_or_related"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.is_admin()
    or public.is_mentor_of(id)
    or public.is_my_mentor(id)
  );

-- ---------------------------------------------------------
-- 3. (확인용) study_records 학생 본인 조회 정책은 이미 존재합니다.
--    아래 정책이 학생이 자신의 학습 기록 + 멘토 피드백 컬럼을 읽는 근거입니다.
--    변경 없음.
--
--    create policy "records_select_related"
--      on public.study_records for select
--      using (
--        student_id = auth.uid()
--        or public.is_admin()
--        or public.is_mentor_of(student_id)
--      );
-- ---------------------------------------------------------
