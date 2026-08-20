"use client";

import {
  CheckCircle2,
  Clock,
  Hourglass,
  Lock,
  MessageCircle,
  MessageCircleQuestion,
  StickyNote,
} from "lucide-react";
import { useState } from "react";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { useMockStore } from "@/lib/mock/store";
import type { Student } from "@/lib/mock/types";

export function EndStudyForm({ student }: { student: Student }) {
  const { submitToday } = useMockStore();
  const { today } = student;

  const [photo, setPhoto] = useState<string | undefined>(today.studyPhotoUrl);
  const [minutes, setMinutes] = useState(today.studyMinutes?.toString() ?? "");
  const [content, setContent] = useState(today.studyContent ?? "");
  const [note, setNote] = useState(today.studentNote ?? "");

  const canSubmit = photo && Number(minutes) > 0 && content.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitToday(student.id, {
      studyPhotoUrl: photo!,
      studyMinutes: Number(minutes),
      studyContent: content.trim(),
      studentNote: note.trim(),
    });
  };

  return (
    <section className="rounded-2xl border-2 border-white/70 bg-white/85 backdrop-blur p-4 shadow-md">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
        <Clock size={18} className="text-rose-500" />
        오늘의 학습 마감
      </h2>

      {today.status === "none" && (
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-400">
          <Lock size={16} />
          먼저 오늘의 학습을 시작해주세요.
        </div>
      )}

      {today.status === "started" && (
        <div className="space-y-3">
          <PhotoUploader
            label="공부한 내용을 인증할 사진을 올려주세요"
            value={photo}
            onChange={setPhoto}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              공부 시간 (분)
            </label>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="예: 90"
              className="min-h-12 w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-rose-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              학습 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="오늘 공부한 내용을 간단히 적어주세요"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-rose-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
              📝 오늘 공부 요약 &amp; 멘토에게 물어보고 싶은 점
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="예) 오늘 비문학 지문이 잘 안 읽혔어요 / 오늘 계획한 분량 완벽 달성!"
              className="w-full resize-none rounded-lg border border-violet-200 bg-violet-50/30 px-3 py-3 text-base focus:border-violet-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="min-h-12 w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            학습 마감 제출하기
          </button>
        </div>
      )}

      {today.status === "submitted" && (
        <SubmittedSummary student={student} />
      )}

      {today.status === "approved" && (
        <div className="space-y-3">
          <SubmittedSummary student={student} />
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3">
            <MessageCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
            <div>
              <p className="text-xs font-semibold text-rose-700">
                멘토의 응원 한마디
              </p>
              <p className="mt-0.5 text-sm text-rose-900">
                {today.encouragementMessage}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SubmittedSummary({ student }: { student: Student }) {
  const { today } = student;
  const approved = today.status === "approved";
  return (
    <div className="space-y-3">
      <div
        className={`flex items-center gap-1.5 rounded-lg p-2.5 text-sm font-medium ${
          approved ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
        }`}
      >
        {approved ? <CheckCircle2 size={16} /> : <Hourglass size={16} />}
        {approved
          ? "멘토 승인 완료! 도장을 받았어요."
          : "제출 완료! 멘토 승인을 기다리고 있어요."}
      </div>
      <div className="flex gap-3">
        {today.studyPhotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={today.studyPhotoUrl}
            alt="공부 인증 사진"
            className="h-20 w-20 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 space-y-1 text-sm">
          <p className="font-medium text-gray-700">{today.studyMinutes}분</p>
          <p className="flex items-start gap-1 text-gray-500">
            <StickyNote size={14} className="mt-0.5 shrink-0" />
            {today.studyContent}
          </p>
        </div>
      </div>
      {today.studentNote && (
        <div className="flex items-start gap-2 rounded-xl bg-violet-50 p-3">
          <MessageCircleQuestion size={16} className="mt-0.5 shrink-0 text-violet-500" />
          <div>
            <p className="text-xs font-semibold text-violet-700">오늘의 한마디 &amp; 질문</p>
            <p className="mt-0.5 text-sm text-violet-900">{today.studentNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}
