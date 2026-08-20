"use client";

import { GraduationCap, RotateCcw, ShieldCheck, UserCheck } from "lucide-react";
import { useMockStore } from "@/lib/mock/store";
import type { Role } from "@/lib/mock/types";

const ROLE_TABS: { role: Role; label: string; icon: typeof GraduationCap }[] = [
  { role: "student", label: "학생 모드", icon: GraduationCap },
  { role: "mentor", label: "멘토 모드", icon: UserCheck },
  { role: "admin", label: "관리자 모드", icon: ShieldCheck },
];

export function RoleSwitcher() {
  const { role, setRole, students, currentStudentId, setCurrentStudentId, resetAll } =
    useMockStore();

  return (
    <div className="sticky top-0 z-40 border-b-2 border-dashed border-amber-200 bg-amber-50/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
        <span className="text-xs font-semibold text-amber-700">
          🧪 임시 역할 스위치 (Mock)
        </span>
        <div className="ml-auto flex items-center gap-2">
          {role === "student" && (
            <select
              value={currentStudentId}
              onChange={(e) => setCurrentStudentId(e.target.value)}
              className="min-h-11 rounded-full border border-amber-300 bg-white px-3 py-2 text-xs text-gray-700"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  테스트: {s.name} ({s.stampCount}개)
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={resetAll}
            title="목업 데이터 초기화"
            className="flex min-h-11 items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-2 text-xs text-gray-500 hover:bg-amber-100"
          >
            <RotateCcw size={12} /> 초기화
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-2xl gap-1.5 px-3 pb-2.5 sm:px-4">
        {ROLE_TABS.map(({ role: r, label, icon: Icon }) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium transition ${
              role === r
                ? "bg-gradient-to-r from-rose-400 to-orange-300 text-white shadow-md"
                : "bg-white/80 text-gray-500 hover:bg-rose-50"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
