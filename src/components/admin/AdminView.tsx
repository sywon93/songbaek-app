"use client";

import { BarChart3, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useMockStore } from "@/lib/mock/store";

export function AdminView() {
  const { students, mentors } = useMockStore();

  const total = students.length;
  const approvedToday = students.filter(
    (s) => s.today.status === "approved",
  ).length;
  const notStartedToday = students.filter(
    (s) => s.today.status === "none",
  ).length;
  const mentorName = (id: string) =>
    mentors.find((m) => m.id === id)?.name ?? "-";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-white/70 bg-white/70 p-4 shadow-md backdrop-blur">
        <h1 className="flex items-center gap-2 text-lg font-bold text-rose-500">
          <ShieldCheck size={20} className="text-rose-500" />
          전체 학생 도장 현황
        </h1>
        <p className="text-sm text-gray-500">
          전체 {total}명 · 오늘 인증 완료 {approvedToday}명 · 미시작{" "}
          {notStartedToday}명
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SummaryTile label="전체 학생" value={`${total}명`} />
        <SummaryTile
          label="오늘 인증 완료"
          value={`${approvedToday}명`}
          accent="text-green-600"
        />
        <SummaryTile
          label="오늘 미시작"
          value={`${notStartedToday}명`}
          accent="text-gray-500"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border-2 border-white/70 bg-white/85 backdrop-blur shadow-md">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">학생</th>
              <th className="px-3 py-2 font-medium">담당 멘토</th>
              <th className="px-3 py-2 font-medium">회차</th>
              <th className="px-3 py-2 font-medium">도장</th>
              <th className="px-3 py-2 font-medium">오늘</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">
                    1학년 {s.classNo}반 {s.studentNo}번
                  </p>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">
                  {mentorName(s.mentorId)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-600">
                    {s.round}회차
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <StampProgress count={s.stampCount} goal={s.stampGoal} />
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={s.today.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  accent = "text-rose-600",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border-2 border-white/70 bg-white/85 backdrop-blur p-3 text-center shadow-md">
      <p className={`text-lg font-bold ${accent}`}>{value}</p>
      <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-gray-400">
        <BarChart3 size={11} />
        {label}
      </p>
    </div>
  );
}

function StampProgress({ count, goal }: { count: number; goal: number }) {
  const achieved = count >= goal;
  const pct = Math.min(100, Math.round((count / goal) * 100));
  return (
    <div className="w-28">
      <div className="flex items-center justify-between text-[11px]">
        <span className={achieved ? "font-semibold text-rose-600" : "text-gray-500"}>
          {count}/{goal}
        </span>
        {achieved && <span title="목표 달성">🎉</span>}
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${achieved ? "bg-rose-500" : "bg-rose-300"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
