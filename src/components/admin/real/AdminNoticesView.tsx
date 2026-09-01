"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Megaphone, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { RealTopBar } from "@/components/RealTopBar";
import { Modal } from "@/components/ui/Modal";
import { createNotice, deleteNotice, updateNotice } from "@/lib/actions/notices";
import { formatSeoulDate } from "@/lib/date";
import type { Database } from "@/lib/supabase/types";

type Notice = Database["public"]["Tables"]["notices"]["Row"];

export function AdminNoticesView({ admin, notices }: { admin: Database["public"]["Tables"]["profiles"]["Row"]; notices: Notice[] }) {
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
            <NoticeRow key={n.id} notice={n} onEdit={() => setEditing(n)} />
          ))}
          {notices.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">등록된 공지사항이 없어요.</p>
          )}
        </section>

        <CreateNoticeForm />
      </main>

      <Modal open={editing !== null} onClose={() => setEditing(null)}>
        {editing && <EditNoticeForm notice={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}

function NoticeRow({ notice, onEdit }: { notice: Notice; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const handleDelete = () => {
    startTransition(async () => {
      await deleteNotice(notice.id);
    });
  };

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

function CreateNoticeForm() {
  const [state, action, pending] = useActionState(createNotice, null);
  return (
    <form
      key={state?.success ?? "create"}
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

function EditNoticeForm({ notice, onDone }: { notice: Notice; onDone: () => void }) {
  const [state, action, pending] = useActionState(updateNotice.bind(null, notice.id), null);

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
