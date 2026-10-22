-- =========================================================
-- 공지사항 사진 첨부
--   notices.image_paths : 첨부 사진의 스토리지 경로 목록(표시 순서대로, 최대 5장)
--   notice-photos 버킷  : 비공개. 로그인한 사용자 모두 읽기, 관리자만 올리기/지우기
--   경로 규칙: {uuid}.jpg
-- 재실행 안전
-- =========================================================

alter table public.notices
  add column if not exists image_paths text[] not null default '{}';

comment on column public.notices.image_paths is '첨부 사진의 notice-photos 버킷 경로 목록(표시 순서)';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notice-photos', 'notice-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "notice_photos_select_authenticated" on storage.objects;
create policy "notice_photos_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'notice-photos');

drop policy if exists "notice_photos_insert_admin" on storage.objects;
create policy "notice_photos_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'notice-photos' and public.is_admin());

drop policy if exists "notice_photos_delete_admin" on storage.objects;
create policy "notice_photos_delete_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'notice-photos' and public.is_admin());
