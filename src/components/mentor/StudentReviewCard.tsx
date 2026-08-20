"use client";

import {
  ChevronDown,
  MessageCircleQuestion,
  Reply,
  Send,
  Stamp,
} from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { useMockStore } from "@/lib/mock/store";
import type { Student } from "@/lib/mock/types";

export function StudentReviewCard({ student }: { student: Student }) {
  const { approveToday, currentMentorId } = useMockStore();
  const [expanded, setExpanded] = useState(student.today.status === "submitted");
  const [message, setMessage] = useState("");

  const { today } = student;
  const canExpand = today.status === "submitted" || today.status === "approved";

  const canApprove = message.trim().length >= 2;

  const handleApprove = () => {
    if (!canApprove) return;
    approveToday(student.id, {
      mentorId: currentMentorId,
      message: message.trim(),
    });
    setMessage("");
  };

  return (
    <div className="rounded-2xl border-2 border-white/70 bg-white/85 backdrop-blur shadow-md">
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
            1학년 {student.classNo}반 {student.studentNo}번 · 도장{" "}
            {student.stampCount}/{student.stampGoal}
          </p>
        </div>
        <StatusBadge status={today.status} />
        {canExpand && (
          <ChevronDown
            size={16}
            className={`text-gray-400 transition ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {expanded && canExpand && (
        <div className="space-y-3 border-t border-gray-100 p-3">
          {today.studentNote && (
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-violet-700">
                <MessageCircleQuestion size={14} /> 오늘의 한마디 &amp; 질문
              </p>
              <p className="mt-1 text-sm text-violet-900">{today.studentNote}</p>
            </div>
          )}
          <div className="flex gap-3">
            {today.plannerPhotoUrl && (
              <div className="flex-1">
                <p className="mb-1 text-[11px] font-medium text-gray-400">
                  플래너
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={today.plannerPhotoUrl}
                  alt="플래너 사진"
                  className="h-24 w-full rounded-lg object-cover"
                />
              </div>
            )}
            {today.studyPhotoUrl && (
              <div className="flex-1">
                <p className="mb-1 text-[11px] font-medium text-gray-400">
                  공부 인증
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={today.studyPhotoUrl}
                  alt="공부 인증 사진"
                  className="h-24 w-full rounded-lg object-cover"
                />
              </div>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 p-2.5 text-sm">
            <p className="font-medium text-gray-700">{today.studyMinutes}분</p>
            <p className="mt-0.5 text-gray-500">{today.studyContent}</p>
          </div>

          {today.status === "submitted" && (
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
              <button
                type="button"
                disabled={!canApprove}
                onClick={handleApprove}
                className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition active:scale-[0.99] hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Stamp size={16} />
                승인하고 도장 찍어주기
              </button>
            </div>
          )}

          {today.status === "approved" && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-2.5 text-sm">
              <Send size={14} className="mt-0.5 shrink-0 text-rose-500" />
              <div>
                <p className="text-xs font-semibold text-rose-700">멘토의 답장</p>
                <p className="mt-0.5 text-rose-900">{today.encouragementMessage}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
