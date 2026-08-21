import Link from "next/link";
import { ArrowLeft, Megaphone, Pin } from "lucide-react";
import { RealTopBar } from "@/components/RealTopBar";
import type { Database } from "@/lib/supabase/types";

type Notice = Pick<
  Database["public"]["Tables"]["notices"]["Row"],
  "id" | "title" | "is_pinned" | "created_at"
>;

export function StudentNoticesListView({
  profile,
  notices,
}: {
  profile: Database["public"]["Tables"]["profiles"]["Row"];
  notices: Notice[];
}) {
  return (
    <div>
      <RealTopBar name={profile.name} roleLabel="학생" />
      <main className="mx-auto max-w-2xl space-y-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        <Link
          href="/student"
          className="flex min-h-11 w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> 홈으로
        </Link>

        <div className="rounded-2xl border-2 border-white/70 bg-white/70 p-4 shadow-md backdrop-blur">
          <h1 className="flex items-center gap-2 text-lg font-bold text-purple-700">
            <Megaphone size={20} className="text-rose-500" /> 공지사항
          </h1>
          <p className="text-sm text-gray-500">전체 {notices.length}건</p>
        </div>

        <section className="space-y-2">
          {notices.map((n) => (
            <Link
              key={n.id}
              href={`/student/notices/${n.id}`}
              className="flex items-center gap-2 rounded-2xl border-2 border-white/70 bg-white/85 p-3.5 shadow-md backdrop-blur active:scale-[0.99]"
            >
              {n.is_pinned && (
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                  <Pin size={10} /> 고정
                </span>
              )}
              <span className="flex-1 truncate text-sm font-semibold text-gray-800">{n.title}</span>
              <span className="shrink-0 text-[11px] text-gray-400">
                {new Date(n.created_at).toLocaleDateString("ko-KR")}
              </span>
            </Link>
          ))}
          {notices.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">등록된 공지사항이 없어요.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export function StudentNoticeDetailView({
  profile,
  notice,
}: {
  profile: Database["public"]["Tables"]["profiles"]["Row"];
  notice: Database["public"]["Tables"]["notices"]["Row"];
}) {
  return (
    <div>
      <RealTopBar name={profile.name} roleLabel="학생" />
      <main className="mx-auto max-w-2xl space-y-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        <Link
          href="/student/notices"
          className="flex min-h-11 w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> 목록으로
        </Link>

        <article className="rounded-2xl border-2 border-white/70 bg-white/85 p-4 shadow-md backdrop-blur sm:p-5">
          <div className="mb-1 flex items-center gap-1.5">
            {notice.is_pinned && (
              <span className="flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                <Pin size={10} /> 고정
              </span>
            )}
            <span className="text-[11px] text-gray-400">
              {new Date(notice.created_at).toLocaleDateString("ko-KR")}
            </span>
          </div>
          <h1 className="text-lg font-bold text-gray-800">{notice.title}</h1>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{notice.content}</p>
        </article>
      </main>
    </div>
  );
}
