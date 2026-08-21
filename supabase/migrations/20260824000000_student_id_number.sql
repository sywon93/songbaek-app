-- =========================================================
-- '반'/'번호' 분리 입력을 '학번(student_id_number)' 단일 입력으로 통합
-- 기존: class_no(반) + student_no(번호) 두 컬럼
-- 변경: student_id_number(학번, 4~5자리 숫자 문자열) 한 컬럼으로 단순화
-- =========================================================

-- ---------------------------------------------------------
-- 1. student_id_number 컬럼 추가 + 기존 데이터 백필
--    (기존 로그인 학번 규칙과 동일하게 1(학년) + class_no(2자리) + student_no(2자리))
-- ---------------------------------------------------------
alter table public.profiles
  add column student_id_number text;

update public.profiles
set student_id_number = '1' || lpad(class_no::text, 2, '0') || lpad(student_no::text, 2, '0')
where class_no is not null and student_no is not null;

alter table public.profiles
  add constraint profiles_student_id_number_format
    check (student_id_number is null or student_id_number ~ '^\d{4,5}$'),
  add constraint profiles_student_id_number_unique unique (student_id_number);

comment on column public.profiles.student_id_number is '학번(4~5자리 숫자 문자열), 학생 로그인 식별자 겸 표시용';

-- ---------------------------------------------------------
-- 2. 기존 반/번호 컬럼 제거
-- ---------------------------------------------------------
alter table public.profiles
  drop column class_no,
  drop column student_no;

-- ---------------------------------------------------------
-- 3. 신규 가입 트리거: class_no/student_no 대신 student_id_number 사용
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, student_id_number)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'student'),
    coalesce(new.raw_user_meta_data ->> 'name', new.email, '이름없음'),
    nullif(new.raw_user_meta_data ->> 'student_id_number', '')
  );
  return new;
end;
$$;
