"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { signInAdmin } from "@/lib/actions/auth";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(signInAdmin, null);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mb-6 text-center">
        <p className="text-4xl">🛡️</p>
        <h1 className="mt-2 text-xl font-bold text-purple-700">관리자 로그인</h1>
        <p className="mt-1 text-sm text-gray-500">
          선생님 전용 계정으로 로그인해주세요.
        </p>
      </div>

      <form
        action={action}
        className="space-y-3 rounded-2xl border-2 border-white/70 bg-white/85 p-4 shadow-md backdrop-blur"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            이메일
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="admin@school.ac.kr"
            className="min-h-12 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-purple-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            비밀번호
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="min-h-12 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-purple-500 focus:outline-none"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-500">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-violet-500 py-3 text-sm font-bold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          <ShieldCheck size={16} />
          {pending ? "로그인 중..." : "관리자 로그인"}
        </button>
      </form>

      <Link
        href="/login"
        className="mt-4 flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white/70 py-3 text-sm font-semibold text-gray-500 hover:bg-white"
      >
        <ArrowLeft size={14} /> 학생/멘토 로그인으로 돌아가기
      </Link>
    </div>
  );
}
