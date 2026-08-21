"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { GraduationCap, KeyRound, UserCheck } from "lucide-react";
import { signInMentor, signInStudent } from "@/lib/actions/auth";

type Tab = "student" | "mentor";

export function LoginForm() {
  const [tab, setTab] = useState<Tab>("student");
  const [studentState, studentAction, studentPending] = useActionState(
    signInStudent,
    null,
  );
  const [mentorState, mentorAction, mentorPending] = useActionState(
    signInMentor,
    null,
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mb-6 text-center">
        <p className="text-4xl">🐣</p>
        <h1 className="mt-2 text-xl font-bold text-purple-700">
          자기주도학습 도장판
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          로그인하고 오늘의 학습을 기록해봐요!
        </p>
      </div>

      <div className="rounded-2xl border-2 border-white/70 bg-white/85 p-4 shadow-md backdrop-blur">
        <div className="mb-4 flex gap-1.5 rounded-full bg-rose-50 p-1">
          <button
            type="button"
            onClick={() => setTab("student")}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold transition ${
              tab === "student"
                ? "bg-gradient-to-r from-rose-400 to-orange-300 text-white shadow-md"
                : "text-gray-500"
            }`}
          >
            <GraduationCap size={16} /> 학생
          </button>
          <button
            type="button"
            onClick={() => setTab("mentor")}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold transition ${
              tab === "mentor"
                ? "bg-gradient-to-r from-rose-400 to-orange-300 text-white shadow-md"
                : "text-gray-500"
            }`}
          >
            <UserCheck size={16} /> 멘토
          </button>
        </div>

        {tab === "student" ? (
          <form key="student" action={studentAction} className="space-y-3">
            <Field
              label="학번"
              name="username"
              placeholder="예: 10101 (4~5자리)"
              inputMode="numeric"
              maxLength={5}
            />
            <Field label="비밀번호" name="password" type="password" />
            {studentState?.error && <ErrorText message={studentState.error} />}
            <SubmitButton pending={studentPending} label="학생 로그인" />
          </form>
        ) : (
          <form key="mentor" action={mentorAction} className="space-y-3">
            <Field label="아이디" name="username" placeholder="예: mentor1" />
            <Field label="비밀번호" name="password" type="password" />
            {mentorState?.error && <ErrorText message={mentorState.error} />}
            <SubmitButton pending={mentorPending} label="멘토 로그인" />
          </form>
        )}
      </div>

      <Link
        href="/login/admin"
        className="mt-4 flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white/70 py-3 text-sm font-semibold text-gray-500 hover:bg-white"
      >
        <KeyRound size={14} /> 선생님(관리자) 접속하기
      </Link>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  inputMode,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  inputMode?: "numeric";
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        required
        autoComplete={type === "password" ? "current-password" : "username"}
        className="min-h-12 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-rose-500 focus:outline-none"
      />
    </div>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-500">
      {message}
    </p>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-full bg-gradient-to-r from-rose-400 to-orange-300 py-3 text-sm font-bold text-white transition active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "로그인 중..." : label}
    </button>
  );
}
