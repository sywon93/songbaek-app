"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  MessageCircleQuestion,
  Reply,
  Send,
  Stamp,
  Users2,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { RealTopBar } from "@/components/RealTopBar";
import { approveToday } from "@/lib/actions/study";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type StudyRecord = Database["public"]["Tables"]["study_records"]["Row"];

export interface StudentWithRecord {
  profile: Profile;
  record: StudyRecord | null;
  plannerPhotoUrl: string | null;
  studyPhotoUrl: string | null;
}

export function RealMentorView({
  mentor,
  students,
  date,
}: {
  mentor: Profile;
  students: StudentWithRecord[];
  date: string;
}) {
  const pendingCount = students.filter((s) => s.record?.status === "submitted").length;

  return (
    <div>
      <RealTopBar name={mentor.name} roleLabel="멘토" />
      <main className="mx-auto max-w-2xl space-y-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        <div className="rounded-2xl border-2 border-white/70 bg-white/70 p-4 shadow-md backdrop-blur">
          <h1 className="flex items-center gap-2 text-lg font-bold text-purple-700">
            <Users2 size={20} className="text-rose-500" />
            담당 학생 오늘 제출 현황
          </h1>
          <p className="text-sm text-gray-500">
            승인 대기 {pendingCount}건 / 전체 {students.length}명
          </p>
        </div>

        <div className="space-y-2.5">
          {students.map((s) => (
            <ReviewCard key={s.profile.id} entry={s} date={date} />
          ))}
          {students.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
              담당 학생이 없습니다. 관리자에게 매칭을 요청하세요.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function ReviewCard({ entry, date }: { entry: StudentWithRecord; date: string }) {
  const { profile: student, record } = entry;
  const status = record?.status ?? "none";
  const canExpand = status === "submitted" || status === "approved";
  const [expanded, setExpanded] = useState(status === "submitted");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    if (!record || message.trim().length < 2) return;
    setError(null);
    startTransition(async () => {
      try {
        await approveToday({ studentId: student.id, recordDate: date, message });
        setMessage("");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <div className="rounded-2xl border-2 border-white/70 bg-white/85 shadow-md backdrop-blur">
      <button
        type="button"
        onClick={() => canExpand && setExpanded((v) => !v)}
        className="flex min-h-16 w-full items-center gap-3 p-3.5 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600">
          {student.name.slice(0, 1)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{student.name}</p>
          <p className="text-xs text-gray-400">
            학번 {student.username ?? "미지정"} · 도장 {student.stamp_count}/{student.stamp_goal}
          </p>
        </div>
        <StatusBadge status={status} />
        {canExpand && (
          <ChevronDown size={16} className={`text-gray-400 transition ${expanded ? "rotate-180" : ""}`} />
        )}
      </button>

      {expanded && canExpand && record && (
        <div className="space-y-3 border-t border-gray-100 p-3">
          {record.student_note && (
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-violet-700">
                <MessageCircleQuestion size={14} /> 오늘의 한마디 &amp; 질문
              </p>
              <p className="mt-1 text-sm text-violet-900">{record.student_note}</p>
            </div>
          )}
          <div className="flex gap-3">
            {entry.plannerPhotoUrl && (
              <div className="flex-1">
                <p className="mb-1 text-[11px] font-medium text-gray-400">플래너</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.plannerPhotoUrl} alt="플래너 사진" className="h-24 w-full rounded-lg object-cover" />
              </div>
            )}
            {entry.studyPhotoUrl && (
              <div className="flex-1">
                <p className="mb-1 text-[11px] font-medium text-gray-400">공부 인증</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.studyPhotoUrl} alt="공부 인증 사진" className="h-24 w-full rounded-lg object-cover" />
              </div>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 p-2.5 text-sm">
            <p className="font-medium text-gray-700">{record.study_minutes}분</p>
            <p className="mt-0.5 text-gray-500">{record.study_content}</p>
          </div>

          {status === "submitted" && (
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
                <Reply size={13} /> 답장하기 · 응원 한마디{" "}
                <span className="text-rose-500">(필수)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="오늘도 수고했어요! 도장 찍어주려면 한마디를 남겨주세요 :)"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-rose-500 focus:outline-none"
              />
              {error && <p className="text-xs font-medium text-red-500">{error}</p>}
              <button
                type="button"
                disabled={message.trim().length < 2 || pending}
                onClick={handleApprove}
                className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition active:scale-[0.99] hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Stamp size={16} /> {pending ? "승인 중..." : "승인하고 도장 찍어주기"}
              </button>
            </div>
          )}

          {status === "approved" && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-2.5 text-sm">
              <Send size={14} className="mt-0.5 shrink-0 text-rose-500" />
              <div>
                <p className="text-xs font-semibold text-rose-700">멘토의 답장</p>
                <p className="mt-0.5 text-rose-900">{record.encouragement_message}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
