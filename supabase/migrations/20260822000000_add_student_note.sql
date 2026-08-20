-- =========================================================
-- '오늘의 한마디 & 멘토 질문' 기능
-- 학생이 학습 마감 시 남기는 성찰/질문 메모. 멘토 승인 화면 상단에
-- 노출되어, 멘토의 응원 한마디(encouragement_message)가 그에 대한
-- 답장 역할을 하게 됩니다.
-- =========================================================

alter table public.study_records
  add column student_note text;

comment on column public.study_records.student_note is
  '학생이 학습 마감 시 남기는 오늘의 한마디 & 멘토에게 묻고 싶은 점';
