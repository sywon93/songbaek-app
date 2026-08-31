"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ShieldCheck,
  Stamp,
  Undo2,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { RealTopBar } from "@/components/RealTopBar";
import { ZoomableImage } from "@/components/ui/ZoomableImage";
import { adminSetStamp } from "@/lib/actions/admin";
import type { Database } from "@/lib/supabase/types";
import type { RecordStatus } from "@/lib/mock/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type StudyRecord = Database["public"]["Tables"]["study_records"]["Row"];

export interface AdminRecordEntry {
  profile: Profile;
  record: StudyRecord | null;
  mentorName: string | null;
  plannerPhotoUrl: string | null;
  studyPhotoUrl: string | null;
}

export function AdminRecordsView({
  admin,
  date,
  entries,
}: {
  admin: Profile;
  date: string;
  entries: AdminRecordEntry[];
}) {
  const router = useRouter();
  const approvedCount = entries.filter((e) => e.record?.status === "approved").length;
  const noRecordCount = entries.filter((e) => !e.record).length;

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
            <ShieldCheck size={20} className="text-rose-500" /> 전체 학습 기록 · 도장 관리
          </h1>
          <p className="text-sm text-gray-500">
            전체 {entries.length}명 · 도장 완료 {approvedCount}명 · 기록 없음 {noRecordCount}명
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border-2 border-white/70 bg-white/85 p-3.5 shadow-md backdrop-blur">
          <Calendar size={16} className="shrink-0 text-rose-500" />
          <span className="shrink-0 text-sm font-medium text-gray-600">조회 날짜</span>
          <input
            type="date"
            defaultValue={date}
            onChange={(e) => {
              if (e.target.value) router.push(`/admin/records?date=${e.target.value}`);
            }}
            className="ml-auto min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-2.5">
          {entries.map((entry) => (
            <RecordRow key={entry.profile.id} entry={entry} date={date} />
          ))}
          {entries.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
              등록된 학생이 없어요.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function RecordRow({ entry, date }: { entry: AdminRecordEntry; date: string }) {
  const { profile: student, record, mentorName } = entry;
  const status: RecordStatus = record?.status ?? "none";
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      try {
        await adminSetStamp({
          studentId: student.id,
          date,
          approve: true,
          message: message.trim() || undefined,
        });
        setMessage("");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      try {
        await adminSetStamp({ studentId: student.id, date, approve: false });
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <div className="rounded-2xl border-2 border-white/70 bg-white/85 shadow-md backdrop-blur">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex min-h-16 w-full items-center gap-3 p-3.5 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600">
          {student.name.slice(0, 1)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{student.name}</p>
          <p className="text-xs text-gray-400">
            학번 {student.username ?? "미지정"} · 멘토 {mentorName ?? "미배정"}
          </p>
        </div>
        {record?.manual_override && status === "approved" && (
          <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
            관리자 부여
          </span>
        )}
        <StatusBadge status={status} />
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-100 p-3">
          {record ? (
            <>
              <div className="rounded-lg bg-gray-50 p-2.5 text-sm">
                <p className="font-medium text-gray-700">{record.study_minutes ?? 0}분</p>
                <p className="mt-0.5 text-gray-500">{record.study_content || "작성된 학습 내용이 없어요."}</p>
              </div>
              {record.student_note && (
                <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-3">
                  <p className="text-xs font-bold text-violet-700">오늘의 한마디 &amp; 질문</p>
                  <p className="mt-1 text-sm text-violet-900">{record.student_note}</p>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                {entry.plannerPhotoUrl && (
                  <div className="flex-1">
                    <p className="mb-1 text-[11px] font-medium text-gray-400">플래너</p>
                    <ZoomableImage
                      src={entry.plannerPhotoUrl}
                      alt="플래너 사진"
                      caption={`플래너 · ${student.name} · ${date}`}
                      thumbClassName="max-h-80 w-full object-contain sm:h-64"
                    />
                  </div>
                )}
                {entry.studyPhotoUrl && (
                  <div className="flex-1">
                    <p className="mb-1 text-[11px] font-medium text-gray-400">공부 인증</p>
                    <ZoomableImage
                      src={entry.studyPhotoUrl}
                      alt="공부 인증 사진"
                      caption={`공부 인증 · ${student.name} · ${date}`}
                      thumbClassName="max-h-80 w-full object-contain sm:h-64"
                    />
                  </div>
                )}
              </div>
              {record.encouragement_message && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-900">
                  {record.encouragement_message}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400">이 날짜에는 학생이 남긴 학습 기록이 없어요.</p>
          )}

          {error && <p className="text-xs font-medium text-red-500">{error}</p>}

          {status === "approved" ? (
            <button
              type="button"
              disabled={pending}
              onClick={handleCancel}
              className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 bg-white py-3 text-sm font-semibold text-red-500 transition active:scale-[0.99] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Undo2 size={16} /> {pending ? "취소 중..." : "도장 취소하기"}
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="응원 한마디 (선택, 비워두면 기본 메시지가 들어가요)"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-rose-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={pending}
                onClick={handleApprove}
                className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition active:scale-[0.99] hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Stamp size={16} /> {pending ? "지급 중..." : "도장 수동 부여하기"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
