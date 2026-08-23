-- =========================================================
-- 관리자: 전체 학생 학습 기록 및 도장 수동 부여/취소
-- 멘토가 승인을 놓친 경우를 위해 관리자가 특정 날짜의 도장을
-- 직접 지급하거나(제출 기록이 없어도) 취소할 수 있게 합니다.
-- =========================================================

-- ---------------------------------------------------------
-- 1. 관리자가 수동으로 지급한 도장인지 표시하는 컬럼
-- ---------------------------------------------------------
alter table public.study_records
  add column manual_override boolean not null default false;

comment on column public.study_records.manual_override is '관리자가 수동으로 승인(도장 지급)한 기록인지 여부';

-- ---------------------------------------------------------
-- 2. 도장 자동 지급/회수 트리거 보완
--    기존에는 승인 시 +1 만 처리했습니다. 관리자가 승인을 취소할 때도
--    동일한 트리거 경로로 -1 되도록 보완합니다(0 미만으로 내려가지 않음).
-- ---------------------------------------------------------
create or replace function public.award_stamp_on_approval()
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
  elsif old.status = 'approved' and new.status is distinct from 'approved' then
    update public.profiles
    set stamp_count = greatest(stamp_count - 1, 0)
    where id = new.student_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------
-- 3. admin_set_stamp(student, date, approved, message) RPC
--    - 관리자만 호출 가능(is_admin() 확인, security definer 로 RLS 우회)
--    - approved = true  : 해당 날짜 기록이 없으면 새로 만들고, 있으면
--                          상태를 approved 로 바꿔 도장을 지급합니다.
--                          (제출 사진/시간/내용이 없던 경우 빈 값으로 채워
--                           NOT NULL/체크 제약을 만족시키고 manual_override=true)
--    - approved = false : 이미 approved 인 기록을 submitted 상태로 되돌려
--                          도장을 회수합니다.
-- ---------------------------------------------------------
create function public.admin_set_stamp(
  p_student uuid,
  p_date date,
  p_approved boolean,
  p_message text default null
)
returns public.study_records
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.study_records;
  result public.study_records;
  default_message constant text := '관리자가 도장을 수동으로 지급했어요.';
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  select * into existing
  from public.study_records
  where student_id = p_student and record_date = p_date;

  if p_approved then
    if existing.id is null then
      insert into public.study_records (
        student_id, record_date, status,
        planner_photo_url, study_photo_url, study_minutes, study_content,
        started_at, submitted_at, reviewed_by, reviewed_at, encouragement_message,
        manual_override
      ) values (
        p_student, p_date, 'approved',
        '', '', 0, '(관리자가 수동으로 도장을 지급했어요)',
        now(), now(), auth.uid(), now(),
        coalesce(nullif(btrim(p_message), ''), default_message),
        true
      )
      returning * into result;

      -- 신규 행은 update 트리거가 실행되지 않으므로 직접 +1 처리합니다.
      update public.profiles
      set stamp_count = stamp_count + 1
      where id = p_student;
    else
      update public.study_records
      set status = 'approved',
          study_photo_url = coalesce(study_photo_url, ''),
          study_minutes = coalesce(study_minutes, 0),
          study_content = coalesce(study_content, '(관리자가 수동으로 도장을 지급했어요)'),
          submitted_at = coalesce(submitted_at, now()),
          reviewed_by = auth.uid(),
          reviewed_at = now(),
          encouragement_message = coalesce(nullif(btrim(p_message), ''), encouragement_message, default_message),
          manual_override = true
      where id = existing.id
      returning * into result;
    end if;
  else
    if existing.id is null or existing.status <> 'approved' then
      raise exception '취소할 승인 기록이 없어요.';
    end if;

    update public.study_records
    set status = 'submitted',
        reviewed_by = null,
        reviewed_at = null,
        manual_override = false
    where id = existing.id
    returning * into result;
  end if;

  return result;
end;
$$;

grant execute on function public.admin_set_stamp(uuid, date, boolean, text) to authenticated;
