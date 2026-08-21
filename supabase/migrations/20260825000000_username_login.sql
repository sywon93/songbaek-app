-- =========================================================
-- 이메일 로그인 -> 아이디(username) 로그인 전환
-- 학생/멘토 모두 실제 이메일 대신 아이디로 로그인합니다.
-- profiles.student_id_number(학생 전용, 학번) 컬럼을 profiles.username(전체
-- 역할 공용 로그인 아이디)으로 일반화합니다. 내부적으로는
-- {username}@songbaek.app 이메일로 매핑되어 Supabase Auth에 그대로 사용됩니다.
-- 학생은 관리자가 입력한 학번(4~5자리 숫자)이 곧 아이디가 되고, 멘토는
-- 관리자가 별도로 지정한 아이디(영문 소문자/숫자/밑줄 3~20자)를 사용합니다.
-- =========================================================

alter table public.profiles
  rename column student_id_number to username;

alter table public.profiles
  drop constraint profiles_student_id_number_format,
  drop constraint profiles_student_id_number_unique;

alter table public.profiles
  add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_]{3,20}$'),
  add constraint profiles_username_unique unique (username);

comment on column public.profiles.username is
  '로그인 아이디. 학생은 학번(4~5자리 숫자), 멘토는 관리자가 지정한 아이디. 내부적으로 {username}@songbaek.app 이메일로 매핑됨';

-- 신규 가입 트리거: student_id_number 메타데이터 대신 username 사용
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, username)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'student'),
    coalesce(new.raw_user_meta_data ->> 'name', new.email, '이름없음'),
    nullif(new.raw_user_meta_data ->> 'username', '')
  );
  return new;
end;
$$;
