-- =========================================================
-- 멘토링 타임슬롯: 멘티(세션) 인원수에 따라 중간 휴식시간을 반영한
-- 동적 슬롯 구성을 위해 mentoring_time_slot enum 에 값 추가
--
-- ⚠️ ALTER TYPE ... ADD VALUE 로 추가한 enum 값은 "같은 트랜잭션 안에서는"
--    사용할 수 없습니다. 그래서 값 추가(이 파일)와, 그 값을 참조하는 함수/트리거
--    재정의(다음 파일 20260901000001_...)를 반드시 별도 마이그레이션(=별도
--    트랜잭션)으로 나눠 실행합니다. Supabase SQL Editor 에서 수동 실행할 경우
--    이 파일을 먼저 실행해 커밋한 뒤 다음 파일을 실행하세요.
--
-- 기존 값(멘티 4명 기준, 변경 없음):
--   slot_1840 = 18:40~19:10, slot_1915 = 19:15~19:45,
--   slot_1950 = 19:50~20:20, slot_2025 = 20:25~20:55
--
-- 추가 값:
--   [멘티 3명] 50분 진행 + 10분 휴식
--     slot_1800_1850 = 18:00~18:50
--     slot_1900_1950 = 19:00~19:50
--     slot_2000_2050 = 20:00~20:50
--   [멘티 5명] 30분 진행 + 5/10분 휴식 (뒤 3개는 기존 값 재사용)
--     slot_1800_1830 = 18:00~18:30
--     slot_1835_1905 = 18:35~19:05
--     (+ slot_1915, slot_1950, slot_2025)
-- =========================================================

alter type public.mentoring_time_slot add value if not exists 'slot_1800_1850';
alter type public.mentoring_time_slot add value if not exists 'slot_1900_1950';
alter type public.mentoring_time_slot add value if not exists 'slot_2000_2050';
alter type public.mentoring_time_slot add value if not exists 'slot_1800_1830';
alter type public.mentoring_time_slot add value if not exists 'slot_1835_1905';
