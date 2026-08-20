"use client";

import { useActionState, useTransition } from "react";
import { BarChart3, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { RealTopBar } from "@/components/RealTopBar";
import {
  assignMentor,
  createMentor,
  createStudent,
  deleteProfile,
  unassignMentor,
} from "@/lib/actions/admin";
import type { Database } from "@/lib/supabase/types";
import type { RecordStatus } from "@/lib/mock/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Link = Database["public"]["Tables"]["mentor_student_links"]["Row"];

export function RealAdminView({
  admin,
  students,
  mentors,
  links,
  todayStatus,
}: {
  admin: Profile;
  students: Profile[];
  mentors: Profile[];
  links: Link[];
  todayStatus: Map<string, RecordStatus>;
}) {
  const total = students.length;
  const approvedToday = students.filter((s) => todayStatus.get(s.id) === "approved").length;
  const notStartedToday = students.filter((s) => !todayStatus.has(s.id)).length;
  const mentorOf = (studentId: string) => links.find((l) => l.student_id === studentId)?.mentor_id ?? "";

  return (
    <div>
      <RealTopBar name={admin.name} roleLabel="관리자" />
      <main className="mx-auto max-w-2xl space-y-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        <div className="rounded-2xl border-2 border-white/70 bg-white/70 p-4 shadow-md backdrop-blur">
          <h1 className="flex items-center gap-2 text-lg font-bold text-purple-700">
            <ShieldCheck size={20} className="text-rose-500" /> 전체 학생 도장 현황
          </h1>
          <p className="text-sm text-gray-500">
            전체 {total}명 · 오늘 인증 완료 {approvedToday}명 · 미시작 {notStartedToday}명
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <SummaryTile label="전체 학생" value={`${total}명`} />
          <SummaryTile label="오늘 인증 완료" value={`${approvedToday}명`} accent="text-green-600" />
          <SummaryTile label="오늘 미시작" value={`${notStartedToday}명`} accent="text-gray-500" />
        </div>

        <section className="overflow-x-auto rounded-2xl border-2 border-white/70 bg-white/85 shadow-md backdrop-blur">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">학생</th>
                <th className="px-3 py-2 font-medium">담당 멘토</th>
                <th className="px-3 py-2 font-medium">회차</th>
                <th className="px-3 py-2 font-medium">도장</th>
                <th className="px-3 py-2 font-medium">오늘</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  mentors={mentors}
                  currentMentorId={mentorOf(s.id)}
                  status={todayStatus.get(s.id) ?? "none"}
                />
              ))}
            </tbody>
          </table>
        </section>

        <CreateStudentForm />
        <CreateMentorForm />
        <MentorRoster mentors={mentors} />
      </main>
    </div>
  );
}

function SummaryTile({ label, value, accent = "text-rose-600" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border-2 border-white/70 bg-white/85 p-3 text-center shadow-md backdrop-blur">
      <p className={`text-lg font-bold ${accent}`}>{value}</p>
      <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-gray-400">
        <BarChart3 size={11} /> {label}
      </p>
    </div>
  );
}

function StudentRow({
  student,
  mentors,
  currentMentorId,
  status,
}: {
  student: Profile;
  mentors: Profile[];
  currentMentorId: string;
  status: RecordStatus;
}) {
  const [pending, startTransition] = useTransition();
  const achieved = student.stamp_count >= student.stamp_goal;
  const pct = Math.min(100, Math.round((student.stamp_count / student.stamp_goal) * 100));

  const handleMentorChange = (mentorId: string) => {
    startTransition(async () => {
      if (mentorId) await assignMentor(student.id, mentorId);
      else await unassignMentor(student.id);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProfile(student.id);
    });
  };

  return (
    <tr>
      <td className="px-3 py-2.5">
        <p className="font-medium text-gray-800">{student.name}</p>
        <p className="text-xs text-gray-400">
          1학년 {student.class_no}반 {student.student_no}번
        </p>
      </td>
      <td className="px-3 py-2.5">
        <select
          value={currentMentorId}
          disabled={pending}
          onChange={(e) => handleMentorChange(e.target.value)}
          className="min-h-11 rounded-full border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700"
        >
          <option value="">미배정</option>
          {mentors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2.5">
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-600">
          {student.round}회차
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="w-28">
          <div className="flex items-center justify-between text-[11px]">
            <span className={achieved ? "font-semibold text-rose-600" : "text-gray-500"}>
              {student.stamp_count}/{student.stamp_goal}
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
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge status={status} />
      </td>
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          title="학생 계정 삭제"
          className="rounded-full p-2.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

function MentorRoster({ mentors }: { mentors: Profile[] }) {
  const [pending, startTransition] = useTransition();
  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteProfile(id);
    });
  };
  return (
    <section className="rounded-2xl border-2 border-white/70 bg-white/85 p-4 shadow-md backdrop-blur">
      <h2 className="mb-3 text-base font-bold text-gray-800">멘토 명단</h2>
      <div className="space-y-2">
        {mentors.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
            <span className="font-medium text-gray-700">{m.name}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleDelete(m.id)}
              className="rounded-full p-2.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {mentors.length === 0 && <p className="text-center text-xs text-gray-400">등록된 멘토가 없어요.</p>}
      </div>
    </section>
  );
}

function CreateStudentForm() {
  const [state, action, pending] = useActionState(createStudent, null);
  return (
    <form action={action} className="space-y-2 rounded-2xl border-2 border-white/70 bg-white/85 p-4 shadow-md backdrop-blur">
      <h2 className="flex items-center gap-1.5 text-base font-bold text-gray-800">
        <UserPlus size={16} className="text-rose-500" /> 학생 계정 추가
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <input name="name" placeholder="이름" required className="col-span-3 min-h-12 rounded-lg border border-gray-300 px-3 py-3 text-base sm:col-span-1" />
        <input name="classNo" type="number" inputMode="numeric" min={1} placeholder="반" required className="min-h-12 rounded-lg border border-gray-300 px-3 py-3 text-base" />
        <input name="studentNo" type="number" inputMode="numeric" min={1} placeholder="번호" required className="min-h-12 rounded-lg border border-gray-300 px-3 py-3 text-base" />
      </div>
      <input
        name="password"
        type="password"
        placeholder="초기 비밀번호 (6자 이상)"
        required
        minLength={6}
        className="min-h-12 w-full rounded-lg border border-gray-300 px-3 py-3 text-base"
      />
      {state?.error && <p className="text-xs font-medium text-red-500">{state.error}</p>}
      {state?.success && <p className="text-xs font-medium text-green-600">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-rose-500 py-3 text-sm font-bold text-white active:scale-[0.99] disabled:opacity-60"
      >
        <Plus size={14} /> {pending ? "생성 중..." : "학생 추가"}
      </button>
    </form>
  );
}

function CreateMentorForm() {
  const [state, action, pending] = useActionState(createMentor, null);
  return (
    <form action={action} className="space-y-2 rounded-2xl border-2 border-white/70 bg-white/85 p-4 shadow-md backdrop-blur">
      <h2 className="flex items-center gap-1.5 text-base font-bold text-gray-800">
        <UserPlus size={16} className="text-violet-500" /> 멘토 계정 추가
      </h2>
      <input name="name" placeholder="이름" required className="min-h-12 w-full rounded-lg border border-gray-300 px-3 py-3 text-base" />
      <input name="email" type="email" placeholder="이메일" required className="min-h-12 w-full rounded-lg border border-gray-300 px-3 py-3 text-base" />
      <input
        name="password"
        type="password"
        placeholder="초기 비밀번호 (6자 이상)"
        required
        minLength={6}
        className="min-h-12 w-full rounded-lg border border-gray-300 px-3 py-3 text-base"
      />
      {state?.error && <p className="text-xs font-medium text-red-500">{state.error}</p>}
      {state?.success && <p className="text-xs font-medium text-green-600">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-violet-500 py-3 text-sm font-bold text-white active:scale-[0.99] disabled:opacity-60"
      >
        <Plus size={14} /> {pending ? "생성 중..." : "멘토 추가"}
      </button>
    </form>
  );
}
