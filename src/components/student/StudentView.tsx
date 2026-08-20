"use client";

import dynamic from "next/dynamic";
import { StampBoard } from "@/components/student/StampBoard";
import { StartStudyForm } from "@/components/student/StartStudyForm";
import { EndStudyForm } from "@/components/student/EndStudyForm";
import { useMockStore } from "@/lib/mock/store";

const AddToHomeScreenTip = dynamic(
  () => import("@/components/AddToHomeScreenTip").then((m) => m.AddToHomeScreenTip),
  { ssr: false },
);

export function StudentView() {
  const { students, currentStudentId } = useMockStore();
  const student = students.find((s) => s.id === currentStudentId);

  if (!student) return null;

  return (
    <div className="space-y-4">
      <AddToHomeScreenTip />
      <div className="rounded-2xl border-2 border-white/70 bg-white/70 p-4 shadow-md backdrop-blur">
        <h1 className="text-lg font-bold text-purple-700">
          안녕하세요, {student.name}님! 👋
        </h1>
        <p className="text-sm text-gray-500">
          1학년 {student.classNo}반 {student.studentNo}번 · 오늘도 화이팅! 🌸
        </p>
      </div>
      <div key={student.id} className="space-y-4">
        <StampBoard student={student} />
        <StartStudyForm student={student} />
        <EndStudyForm student={student} />
      </div>
    </div>
  );
}
