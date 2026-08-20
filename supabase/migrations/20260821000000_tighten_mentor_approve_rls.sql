-- =========================================================
-- 배포 전 최종 점검: 멘토 승인 RLS 보완
-- 기존 정책은 담당 학생이기만 하면(상태 무관) study_records 행을 수정해
-- status='approved'로만 바꾸면 통과됐습니다. 즉 아직 'started'인(제출 전)
-- 기록이나 이미 'approved'된 기록까지 멘토가 임의로 다시 손댈 수 있는
-- 여지가 있었습니다. 승인 전이(status='submitted') 기록만 승인 처리할 수
-- 있도록 using 절에 상태 조건을 추가합니다. 정상적인 승인 흐름
-- (submitted -> approved)에는 영향이 없습니다.
-- =========================================================

drop policy if exists "records_update_mentor_approve" on public.study_records;

create policy "records_update_mentor_approve"
  on public.study_records for update
  using (public.is_mentor_of(student_id) and status = 'submitted')
  with check (public.is_mentor_of(student_id) and status = 'approved');
