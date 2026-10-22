import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const BUCKET = "study-photos";

/** "data:image/jpeg;base64,...." 형태의 압축된 이미지를 스토리지에 업로드하고 경로를 반환합니다. */
export async function uploadStudyPhoto(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    date: string;
    kind: "planner" | "study";
    dataUrl: string;
  },
): Promise<string> {
  const match = /^data:([^;]+);base64,(.+)$/.exec(params.dataUrl);
  if (!match) throw new Error("잘못된 이미지 데이터예요.");
  const [, contentType, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  const path = `${params.userId}/${params.date}/${params.kind}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`사진 업로드에 실패했어요: ${error.message}`);
  return path;
}

export const NOTICE_PHOTO_BUCKET = "notice-photos";
export const MAX_NOTICE_PHOTOS = 5;

/** 공지 사진 경로는 "{uuid}.jpg" 형태만 허용합니다. */
export function isNoticePhotoPath(path: unknown): path is string {
  return typeof path === "string" && /^[0-9a-f-]{36}\.jpg$/.test(path);
}

/** 공지 사진 경로 목록을 서명된 URL로 한 번에 변환합니다. 실패한 항목은 빠집니다. */
export async function getSignedNoticePhotoUrls(
  supabase: SupabaseClient<Database>,
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage
    .from(NOTICE_PHOTO_BUCKET)
    .createSignedUrls(paths, 60 * 60);
  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}

/** 비공개 버킷의 경로를 짧은 유효기간의 서명된 URL로 변환합니다. */
export async function getSignedPhotoUrl(
  supabase: SupabaseClient<Database>,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}
