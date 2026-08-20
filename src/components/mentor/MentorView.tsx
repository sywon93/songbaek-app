"use client";

import { Users2 } from "lucide-react";
import { StudentReviewCard } from "@/components/mentor/StudentReviewCard";
import { useMockStore } from "@/lib/mock/store";

export function MentorView() {
  const { students, mentors, currentMentorId, setCurrentMentorId } =
    useMockStore();

  const myStudents = students.filter((s) => s.mentorId === currentMentorId);
  const pendingCount = myStudents.filter(
    (s) => s.today.status === "submitted",
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-white/70 bg-white/70 p-4 shadow-md backdrop-blur">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-rose-500">
            <Users2 size={20} className="text-rose-500" />
            담당 학생 오늘 제출 현황
          </h1>
          <p className="text-sm text-gray-500">
            승인 대기 {pendingCount}건 / 전체 {myStudents.length}명
          </p>
        </div>
        <select
          value={currentMentorId}
          onChange={(e) => setCurrentMentorId(e.target.value)}
          className="min-h-11 rounded-full border border-rose-200 bg-white px-3 py-2 text-sm text-gray-700"
        >
          {mentors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2.5">
        {myStudents.map((student) => (
          <StudentReviewCard key={student.id} student={student} />
        ))}
        {myStudents.length === 0 && (
          <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
            담당 학생이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
