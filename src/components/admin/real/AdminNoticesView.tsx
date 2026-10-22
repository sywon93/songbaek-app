"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Megaphone, Pencil, Pin, Plus, Trash2, X } from "lucide-react";
import { RealTopBar } from "@/components/RealTopBar";
import { Modal } from "@/components/ui/Modal";
import {
  createNotice,
  deleteNotice,
  updateNotice,
  type NoticeActionState,
} from "@/lib/actions/notices";
import { formatSeoulDate } from "@/lib/date";
import { fileToCompressedDataUrl } from "@/lib/mock/image";
import { discardNoticePhotos, uploadNoticePhotos } from "@/lib/noticePhotoUpload";
import { MAX_NOTICE_PHOTOS } from "@/lib/supabase/storage";
import type { Database } from "@/lib/supabase/types";

type Notice = Database["public"]["Tables"]["notices"]["Row"];

/** 폼에서 다루는 사진 한 장: 이미 올라간 사진(path)이거나 새로 고른 사진(dataUrl). */
interface PhotoItem {
  key: string;
  src: string;
  path?: string;
  dataUrl?: string;
}

export function AdminNoticesView({
  admin,
  notices,
  photoUrls,
}: {
  admin: Database["public"]["Tables"]["profiles"]["Row"];
  notices: Notice[];
  photoUrls: Record<string, string>;
}) {
  const [editing, setEditing] = useState<Notice | null>(null);

  return (
    <div>
      <RealTopBar name={admin.name} roleLabel="관리자" />
      <main className="mx-auto max-w-2xl space-y-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        <Link
          href="/admin"
          className="flex min-h-11 w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> 학생 관리로
        </Link>

        <div className="rounded-2xl border-2 border-white/70 bg-white/70 p-4 shadow-md backdrop-blur">
          <h1 className="flex items-center gap-2 text-lg font-bold text-purple-700">
            <Megaphone size={20} className="text-rose-500" /> 공지사항 관리
          </h1>
          <p className="text-sm text-gray-500">전체 {notices.length}건 · 중요 공지는 상단에 고정돼요.</p>
        </div>

        <section className="space-y-2.5">
          {notices.map((n) => (
            <NoticeRow key={n.id} notice={n} photoUrls={photoUrls} onEdit={() => setEditing(n)} />
          ))}
          {notices.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">등록된 공지사항이 없어요.</p>
          )}
        </section>

        <CreateNoticeForm />
      </main>

      <Modal open={editing !== null} onClose={() => setEditing(null)}>
        {editing && (
          <EditNoticeForm notice={editing} photoUrls={photoUrls} onDone={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  );
}

function NoticeRow({
  notice,
  photoUrls,
  onEdit,
}: {
  notice: Notice;
  photoUrls: Record<string, string>;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const handleDelete = () => {
    startTransition(async () => {
      await deleteNotice(notice.id);
    });
  };
  const thumbs = notice.image_paths.map((p) => photoUrls[p]).filter(Boolean);

  return (
    <div className="rounded-2xl border-2 border-white/70 bg-white/85 p-3.5 shadow-md backdrop-blur">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {notice.is_pinned && (
              <span className="flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                <Pin size={10} /> 고정
              </span>
            )}
            <p className="truncate text-sm font-semibold text-gray-800">{notice.title}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{notice.content}</p>
          {thumbs.length > 0 && (
            <div className="mt-2 flex gap-1.5">
              {thumbs.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt="첨부 사진"
                  className="h-12 w-12 rounded-md border border-gray-100 object-cover"
                />
              ))}
            </div>
          )}
          <p className="mt-1 text-[11px] text-gray-400">
            {formatSeoulDate(notice.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            title="수정"
            className="rounded-full p-2.5 text-gray-300 hover:bg-violet-50 hover:text-violet-500"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleDelete}
            title="삭제"
            className="rounded-full p-2.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 새로 고른 사진을 먼저 스토리지에 올리고, 사진 경로 목록을 폼에 실어 공지 액션을 부릅니다.
 * 공지 저장이 실패하면 방금 올린 사진은 지웁니다.
 */
async function submitWithPhotos(
  photos: PhotoItem[],
  formData: FormData,
  save: (formData: FormData) => Promise<NoticeActionState>,
): Promise<NoticeActionState> {
  let uploaded: string[];
  try {
    uploaded = await uploadNoticePhotos(photos.flatMap((p) => (p.dataUrl ? [p.dataUrl] : [])));
  } catch (e) {
    return { error: (e as Error).message };
  }
  let next = 0;
  const paths = photos.map((p) => (p.dataUrl ? uploaded[next++] : p.path!));
  formData.set("imagePaths", JSON.stringify(paths));

  let result: NoticeActionState;
  try {
    result = await save(formData);
  } catch {
    result = { error: "공지사항을 저장하지 못했어요. 잠시 후 다시 시도해주세요." };
  }
  if (result.error) await discardNoticePhotos(uploaded).catch(() => {});
  return result;
}

function NoticePhotosField({
  photos,
  onChange,
  disabled,
}: {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const room = MAX_NOTICE_PHOTOS - photos.length;

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const added: PhotoItem[] = [];
      for (const file of files.slice(0, room)) {
        const dataUrl = await fileToCompressedDataUrl(file, 1280, 0.82);
        added.push({ key: crypto.randomUUID(), src: dataUrl, dataUrl });
      }
      onChange([...photos, ...added]);
      if (files.length > room) setError(`사진은 최대 ${MAX_NOTICE_PHOTOS}장까지 첨부할 수 있어요.`);
    } catch {
      setError("사진을 처리하지 못했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((p, i) => (
          <div key={p.key} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.src}
              alt={`첨부 사진 ${i + 1}`}
              className="aspect-square w-full rounded-lg border border-gray-200 object-cover"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(photos.filter((x) => x.key !== p.key))}
              aria-label={`첨부 사진 ${i + 1} 빼기`}
              className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {room > 0 && (
          <button
            type="button"
            disabled={disabled || loading}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-rose-200 bg-rose-50/40 text-xs font-semibold text-rose-400 disabled:opacity-60"
          >
            <ImagePlus size={20} />
            {loading ? "처리 중..." : `사진 추가 ${photos.length}/${MAX_NOTICE_PHOTOS}`}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function CreateNoticeForm() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [round, setRound] = useState(0);
  const [state, action, pending] = useActionState(
    async (prev: NoticeActionState | null, formData: FormData) => {
      const result = await submitWithPhotos(photos, formData, (fd) => createNotice(prev, fd));
      if (result.success) {
        setPhotos([]);
        setRound((r) => r + 1);
      }
      return result;
    },
    null,
  );
  return (
    <form
      key={round}
      action={action}
      className="space-y-2 rounded-2xl border-2 border-white/70 bg-white/85 p-4 shadow-md backdrop-blur"
    >
      <h2 className="flex items-center gap-1.5 text-base font-bold text-gray-800">
        <Plus size={16} className="text-rose-500" /> 공지사항 작성
      </h2>
      <input
        name="title"
        placeholder="제목"
        required
        className="min-h-12 w-full rounded-lg border border-gray-300 px-3 py-3 text-base"
      />
      <textarea
        name="content"
        placeholder="내용"
        required
        rows={4}
        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-base"
      />
      <NoticePhotosField photos={photos} onChange={setPhotos} disabled={pending} />
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <input type="checkbox" name="isPinned" className="h-4 w-4" /> 중요 공지 상단 고정
      </label>
      {state?.error && <p className="text-xs font-medium text-red-500">{state.error}</p>}
      {state?.success && <p className="text-xs font-medium text-green-600">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-rose-500 py-3 text-sm font-bold text-white active:scale-[0.99] disabled:opacity-60"
      >
        <Plus size={14} /> {pending ? "등록 중..." : "공지 등록"}
      </button>
    </form>
  );
}

function EditNoticeForm({
  notice,
  photoUrls,
  onDone,
}: {
  notice: Notice;
  photoUrls: Record<string, string>;
  onDone: () => void;
}) {
  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    notice.image_paths.map((path) => ({ key: path, path, src: photoUrls[path] ?? "" })),
  );
  const [state, action, pending] = useActionState(
    (prev: NoticeActionState | null, formData: FormData) =>
      submitWithPhotos(photos, formData, (fd) => updateNotice(notice.id, prev, fd)),
    null,
  );

  useEffect(() => {
    if (state?.success) onDone();
  }, [state?.success, onDone]);

  return (
    <form action={action} className="space-y-3">
      <h2 className="text-base font-bold text-gray-800">공지사항 수정</h2>
      <input
        name="title"
        defaultValue={notice.title}
        required
        className="min-h-12 w-full rounded-lg border border-gray-300 px-3 py-3 text-base"
      />
      <textarea
        name="content"
        defaultValue={notice.content}
        required
        rows={5}
        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-base"
      />
      <NoticePhotosField photos={photos} onChange={setPhotos} disabled={pending} />
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <input type="checkbox" name="isPinned" defaultChecked={notice.is_pinned} className="h-4 w-4" /> 중요 공지 상단 고정
      </label>
      {state?.error && <p className="text-xs font-medium text-red-500">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-violet-500 py-3 text-sm font-bold text-white active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "저장 중..." : "저장하기"}
      </button>
    </form>
  );
}
