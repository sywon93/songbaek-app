-- =========================================================
-- 자기주도학습 도장판 앱 - 초기 스키마
-- 역할: student(학생) / mentor(멘토) / admin(관리자, 선생님)
-- =========================================================

-- ---------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. Enum 타입
-- ---------------------------------------------------------
create type public.user_role as enum ('student', 'mentor', 'admin');

-- started   : 오늘 학습 시작(플래너 사진) 제출 완료
-- submitted : 오늘 학습 마감(공부 사진 + 시간/내용) 제출 완료, 멘토 승인 대기
-- approved  : 멘토가 승인, 도장 지급 완료
create type public.submission_status as enum ('started', 'submitted', 'approved');

-- ---------------------------------------------------------
-- 2. profiles (모든 사용자 공통 프로필, auth.users 1:1)
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'student',
  name text not null,
  class_no int,          -- 반 (학생용)
  student_no int,        -- 번호 (학생용)
  phone text,
  avatar_url text,
  stamp_count int not null default 0,   -- 누적 도장 개수 (승인 시 자동 증가)
  stamp_goal int not null default 20,   -- 목표 도장 개수
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stamp_count_non_negative check (stamp_count >= 0)
);

comment on table public.profiles is '학생/멘토/관리자 공통 프로필';

create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------
-- 3. mentor_student_links (멘토-학생 매칭, 관리자가 등록)
-- ---------------------------------------------------------
create table public.mentor_student_links (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null, -- 매칭한 관리자
  created_at timestamptz not null default now(),
  unique (student_id) -- 학생 한 명당 담당 멘토는 한 명
);

comment on table public.mentor_student_links is '학생별 담당 멘토 매칭 (관리자 등록)';

create index mentor_student_links_mentor_idx on public.mentor_student_links (mentor_id);

-- ---------------------------------------------------------
-- 4. study_records (학생의 하루 학습 기록: 시작~마감~승인)
-- ---------------------------------------------------------
create table public.study_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  record_date date not null default (now() at time zone 'Asia/Seoul')::date,
  status public.submission_status not null default 'started',

  -- 시작 제출
  planner_photo_url text not null,
  started_at timestamptz not null default now(),

  -- 마감 제출
  study_photo_url text,
  study_minutes int,
  study_content text,
  submitted_at timestamptz,

  -- 멘토 승인
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  encouragement_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (student_id, record_date),
  constraint study_minutes_non_negative check (study_minutes is null or study_minutes >= 0),
  constraint submitted_fields_present check (
    status = 'started'
    or (study_photo_url is not null and study_minutes is not null and submitted_at is not null)
  ),
  constraint reviewed_fields_present check (
    status <> 'approved'
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

comment on table public.study_records is '학생의 하루 학습 시작/마감/승인 기록';

create index study_records_student_date_idx on public.study_records (student_id, record_date desc);
create index study_records_status_idx on public.study_records (status);

-- ---------------------------------------------------------
-- 5. updated_at 자동 갱신 트리거
-- ---------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_study_records_updated_at
  before update on public.study_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 6. auth.users 가입 시 profiles 자동 생성
--    (관리자가 Supabase Auth로 학생/멘토를 초대/등록할 때
--     raw_user_meta_data 에 name, role, class_no, student_no 를 담아 전달)
-- ---------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, class_no, student_no)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'student'),
    coalesce(new.raw_user_meta_data ->> 'name', new.email, '이름없음'),
    nullif(new.raw_user_meta_data ->> 'class_no', '')::int,
    nullif(new.raw_user_meta_data ->> 'student_no', '')::int
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- 7. 승인 시 도장 자동 지급 (stamp_count +1)
-- ---------------------------------------------------------
create function public.award_stamp_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.profiles
    set stamp_count = stamp_count + 1
    where id = new.student_id;
  end if;
  return new;
end;
$$;

create trigger study_records_award_stamp
  after update on public.study_records
  for each row execute function public.award_stamp_on_approval();

-- ---------------------------------------------------------
-- 8. 권한 확인용 헬퍼 함수 (RLS 재귀 방지를 위해 security definer)
-- ---------------------------------------------------------
create function public.current_role()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_role() = 'admin';
$$;

create function public.is_mentor_of(target_student uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.mentor_student_links
    where mentor_id = auth.uid() and student_id = target_student
  );
$$;

-- ---------------------------------------------------------
-- 9. 학생이 자신의 데이터를 함부로 바꾸지 못하도록 보호
--    (role, stamp_count, stamp_goal 은 관리자/시스템만 변경)
-- ---------------------------------------------------------
create function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role = old.role;
    new.stamp_count = old.stamp_count;
    new.stamp_goal = old.stamp_goal;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- =========================================================
-- 10. Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.mentor_student_links enable row level security;
alter table public.study_records enable row level security;

-- ---- profiles ----
create policy "profiles_select_self_or_related"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.is_admin()
    or public.is_mentor_of(id)
  );

create policy "profiles_update_self_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "profiles_insert_admin"
  on public.profiles for insert
  with check (public.is_admin());

create policy "profiles_delete_admin"
  on public.profiles for delete
  using (public.is_admin());

-- ---- mentor_student_links ----
create policy "links_select_related"
  on public.mentor_student_links for select
  using (
    public.is_admin()
    or mentor_id = auth.uid()
    or student_id = auth.uid()
  );

create policy "links_insert_admin"
  on public.mentor_student_links for insert
  with check (public.is_admin());

create policy "links_update_admin"
  on public.mentor_student_links for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "links_delete_admin"
  on public.mentor_student_links for delete
  using (public.is_admin());

-- ---- study_records ----
create policy "records_select_related"
  on public.study_records for select
  using (
    student_id = auth.uid()
    or public.is_admin()
    or public.is_mentor_of(student_id)
  );

create policy "records_insert_self"
  on public.study_records for insert
  with check (student_id = auth.uid());

-- 학생: 승인되기 전까지만 자신의 기록(시작/마감 내용)을 수정 가능, 스스로 승인 불가
create policy "records_update_self"
  on public.study_records for update
  using (student_id = auth.uid() and status <> 'approved')
  with check (student_id = auth.uid() and status <> 'approved');

-- 멘토: 담당 학생의 기록을 승인 처리 가능
create policy "records_update_mentor_approve"
  on public.study_records for update
  using (public.is_mentor_of(student_id))
  with check (public.is_mentor_of(student_id) and status = 'approved');

-- 관리자: 전체 관리
create policy "records_update_admin"
  on public.study_records for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "records_delete_admin"
  on public.study_records for delete
  using (public.is_admin());

-- =========================================================
-- 11. Storage: 플래너/공부 인증 사진 버킷
--     경로 규칙: {student_id}/{record_date}/planner.jpg, study.jpg
-- =========================================================
insert into storage.buckets (id, name, public)
values ('study-photos', 'study-photos', false)
on conflict (id) do nothing;

create policy "study_photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'study-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "study_photos_select_related"
  on storage.objects for select
  using (
    bucket_id = 'study-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or public.is_mentor_of(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "study_photos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'study-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "study_photos_delete_own_or_admin"
  on storage.objects for delete
  using (
    bucket_id = 'study-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
