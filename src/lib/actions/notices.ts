"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_NOTICE_PHOTOS,
  NOTICE_PHOTO_BUCKET,
  isNoticePhotoPath,
} from "@/lib/supabase/storage";

export interface NoticeActionState {
  error?: string;
  success?: string;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("관리자만 가능한 작업이에요.");
  return { supabase };
}

/** 폼의 imagePaths(JSON 배열)를 읽어 형식이 맞는 경로만 순서대로, 최대 장수까지 남깁니다. */
function readImagePaths(formData: FormData): string[] {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("imagePaths") ?? "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isNoticePhotoPath))].slice(0, MAX_NOTICE_PHOTOS);
}

function readNoticeInput(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const isPinned = formData.get("isPinned") === "on";
  const imagePaths = readImagePaths(formData);
  return { title, content, isPinned, imagePaths };
}

/** 더 이상 쓰지 않는 공지 사진을 지웁니다. 실패해도 공지 작업은 그대로 성공으로 둡니다. */
async function removeNoticePhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  if (paths.length === 0) return;
  await supabase.storage.from(NOTICE_PHOTO_BUCKET).remove(paths);
}

export async function createNotice(
  _prev: NoticeActionState | null,
  formData: FormData,
): Promise<NoticeActionState> {
  let supabase;
  try {
    ({ supabase } = await requireAdmin());
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { title, content, isPinned, imagePaths } = readNoticeInput(formData);
  if (!title || !content) {
    return { error: "제목과 내용을 입력해주세요." };
  }

  const { error } = await supabase
    .from("notices")
    .insert({ title, content, is_pinned: isPinned, image_paths: imagePaths });
  if (error) return { error: error.message };

  revalidatePath("/admin/notices");
  revalidatePath("/student/notices");
  revalidatePath("/student");
  return { success: "공지사항을 등록했어요." };
}

export async function updateNotice(
  id: string,
  _prev: NoticeActionState | null,
  formData: FormData,
): Promise<NoticeActionState> {
  let supabase;
  try {
    ({ supabase } = await requireAdmin());
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { title, content, isPinned, imagePaths } = readNoticeInput(formData);
  if (!title || !content) {
    return { error: "제목과 내용을 입력해주세요." };
  }

  const { data: before } = await supabase
    .from("notices")
    .select("image_paths")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("notices")
    .update({ title, content, is_pinned: isPinned, image_paths: imagePaths })
    .eq("id", id);
  if (error) return { error: error.message };

  await removeNoticePhotos(
    supabase,
    (before?.image_paths ?? []).filter((p) => !imagePaths.includes(p)),
  );

  revalidatePath("/admin/notices");
  revalidatePath("/student/notices");
  revalidatePath(`/student/notices/${id}`);
  revalidatePath("/student");
  return { success: "공지사항을 수정했어요." };
}

export async function deleteNotice(id: string) {
  const { supabase } = await requireAdmin();
  const { data: before } = await supabase
    .from("notices")
    .select("image_paths")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("notices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await removeNoticePhotos(supabase, before?.image_paths ?? []);
  revalidatePath("/admin/notices");
  revalidatePath("/student/notices");
  revalidatePath("/student");
}
