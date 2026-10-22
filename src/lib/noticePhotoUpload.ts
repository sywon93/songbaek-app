import { createClient } from "@/lib/supabase/client";
import { NOTICE_PHOTO_BUCKET } from "@/lib/supabase/storage";

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("잘못된 이미지 데이터예요.");
  const bin = atob(match[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: match[1] });
}

/**
 * 압축된 공지 사진(data URL)들을 브라우저에서 바로 notice-photos 버킷에 올리고
 * 경로를 순서대로 돌려줍니다. 사진 용량이 Server Action 본문 한도(1MB)에 걸리지 않도록
 * 서버를 거치지 않습니다. 하나라도 실패하면 이미 올린 것은 지우고 에러를 던집니다.
 */
export async function uploadNoticePhotos(dataUrls: string[]): Promise<string[]> {
  if (dataUrls.length === 0) return [];
  const supabase = createClient();
  const paths: string[] = [];
  try {
    for (const dataUrl of dataUrls) {
      const path = `${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from(NOTICE_PHOTO_BUCKET)
        .upload(path, dataUrlToBlob(dataUrl), { contentType: "image/jpeg" });
      if (error) throw new Error(`사진 업로드에 실패했어요: ${error.message}`);
      paths.push(path);
    }
  } catch (e) {
    await discardNoticePhotos(paths);
    throw e;
  }
  return paths;
}

/** 공지 저장에 실패했을 때 방금 올린 사진을 치웁니다. */
export async function discardNoticePhotos(paths: string[]) {
  if (paths.length === 0) return;
  await createClient().storage.from(NOTICE_PHOTO_BUCKET).remove(paths);
}
