"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

function readNoticeInput(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const isPinned = formData.get("isPinned") === "on";
  return { title, content, isPinned };
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

  const { title, content, isPinned } = readNoticeInput(formData);
  if (!title || !content) {
    return { error: "제목과 내용을 입력해주세요." };
  }

  const { error } = await supabase
    .from("notices")
    .insert({ title, content, is_pinned: isPinned });
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

  const { title, content, isPinned } = readNoticeInput(formData);
  if (!title || !content) {
    return { error: "제목과 내용을 입력해주세요." };
  }

  const { error } = await supabase
    .from("notices")
    .update({ title, content, is_pinned: isPinned })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/notices");
  revalidatePath("/student/notices");
  revalidatePath(`/student/notices/${id}`);
  revalidatePath("/student");
  return { success: "공지사항을 수정했어요." };
}

export async function deleteNotice(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("notices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/notices");
  revalidatePath("/student/notices");
  revalidatePath("/student");
}
