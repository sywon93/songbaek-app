"use client";

import { CheckCircle2, PlayCircle } from "lucide-react";
import { useState } from "react";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { useMockStore } from "@/lib/mock/store";
import type { Student } from "@/lib/mock/types";

export function StartStudyForm({ student }: { student: Student }) {
  const { startToday } = useMockStore();
  const [photo, setPhoto] = useState<string | undefined>(
    student.today.plannerPhotoUrl,
  );

  const started = student.today.status !== "none";

  const handleSubmit = () => {
    if (!photo) return;
    startToday(student.id, photo);
  };

  return (
    <section className="rounded-2xl border-2 border-white/70 bg-white/85 backdrop-blur p-4 shadow-md">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
        <PlayCircle size={18} className="text-rose-500" />
        오늘의 학습 시작
      </h2>

      {started ? (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3">
          {student.today.plannerPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={student.today.plannerPhotoUrl}
              alt="플래너 사진"
              className="h-16 w-16 rounded-lg object-cover"
            />
          )}
          <div className="flex items-center gap-1.5 text-sm font-medium text-green-700">
            <CheckCircle2 size={16} />
            오늘 학습을 시작했어요!
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <PhotoUploader
            label="오늘 계획을 적은 플래너 사진을 올려주세요"
            value={photo}
            onChange={setPhoto}
          />
          <button
            type="button"
            disabled={!photo}
            onClick={handleSubmit}
            className="min-h-12 w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            학습 시작 제출하기
          </button>
        </div>
      )}
    </section>
  );
}
