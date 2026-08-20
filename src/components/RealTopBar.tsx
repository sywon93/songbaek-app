"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { signOut } from "@/lib/actions/auth";

export function RealTopBar({
  name,
  roleLabel,
}: {
  name: string;
  roleLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="sticky top-0 z-40 border-b-2 border-dashed border-amber-200 bg-amber-50/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2.5 sm:px-4">
        <span className="rounded-full bg-white px-2.5 py-1.5 text-xs font-bold text-purple-700">
          {roleLabel}
        </span>
        <span className="text-sm font-semibold text-gray-700">{name}님</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => signOut())}
          className="ml-auto flex min-h-11 items-center gap-1 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
        >
          <LogOut size={12} /> 로그아웃
        </button>
      </div>
    </div>
  );
}
