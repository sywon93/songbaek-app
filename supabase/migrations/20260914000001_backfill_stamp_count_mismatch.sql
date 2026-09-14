-- =========================================================
-- 백필: 위 트리거 버그(20260914000000)로 인해 과거에 지급되지 못한
-- 도장을 일괄 보정합니다.
--
-- stamp_count 를 "정답 값"(승인된 일지 수 - (round-1) * stamp_goal, 0 미만
-- 방지)으로 다시 계산해 덮어쓰는 방식이라 몇 번을 다시 실행해도 결과가
-- 항상 같습니다 (append 방식이 아니라 절대값 재계산이므로 중복 지급 위험
-- 자체가 없습니다).
--
-- round(회차)를 이미 넘긴 학생은 stamp_goal 만큼씩 차감된 값이 정답이므로
-- 이 계산은 "stamp_goal 이 그 학생의 전체 이력 동안 바뀐 적 없다"고
-- 가정합니다. 대부분(round=1)인 학생은 이 가정과 무관하게 정확합니다.
-- round>=2 인 학생이 있고 중간에 stamp_goal 을 바꾼 적이 있다면, 아래
-- 진단 쿼리 결과를 먼저 눈으로 확인한 뒤 실행하세요.
-- =========================================================

-- ---------------------------------------------------------
-- [1] 진단: 실행 전 확인용 (아무것도 변경하지 않음)
-- ---------------------------------------------------------
select
  p.id as student_id,
  p.name,
  p.class_no,
  p.student_no,
  p.round,
  p.stamp_goal,
  p.stamp_count as current_stamp_count,
  count(sr.id) filter (where sr.status = 'approved') as approved_diary_count,
  greatest(
    count(sr.id) filter (where sr.status = 'approved') - (p.round - 1) * p.stamp_goal,
    0
  ) as expected_stamp_count
from public.profiles p
left join public.study_records sr on sr.student_id = p.id
where p.role = 'student'
group by p.id, p.name, p.class_no, p.student_no, p.round, p.stamp_goal, p.stamp_count
having p.stamp_count <> greatest(
  count(sr.id) filter (where sr.status = 'approved') - (p.round - 1) * p.stamp_goal,
  0
)
order by
  greatest(count(sr.id) filter (where sr.status = 'approved') - (p.round - 1) * p.stamp_goal, 0)
  - p.stamp_count desc;

-- ---------------------------------------------------------
-- [2] 백필 실행: 모든 학생 stamp_count 재계산
-- ---------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select id from public.profiles where role = 'student' loop
    perform public.recompute_stamp_count_internal(r.id);
  end loop;
end $$;

-- ---------------------------------------------------------
-- [3] 검증: 0건이면 정상적으로 다 맞춰진 것
-- ---------------------------------------------------------
select count(*) as still_mismatched_students
from (
  select p.id
  from public.profiles p
  left join public.study_records sr on sr.student_id = p.id
  where p.role = 'student'
  group by p.id, p.stamp_count, p.round, p.stamp_goal
  having p.stamp_count <> greatest(
    count(sr.id) filter (where sr.status = 'approved') - (p.round - 1) * p.stamp_goal,
    0
  )
) x;
