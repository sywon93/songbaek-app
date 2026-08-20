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
