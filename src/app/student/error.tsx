"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

// 학생 홈(/student 및 하위 경로)의 서버/클라이언트 렌더 중 예외가 던져지면
// React 기본 동작은 프로덕션에서 "Minified React error #441" 만 노출합니다.
// 이 경계에서 사용자에게는 다시 시도 UI 를, 콘솔에는 원인 파악용 digest 를 남깁니다.
export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[student] render error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-2xl border-2 border-white/70 bg-white/80 p-6 shadow-md backdrop-blur">
        <h1 className="text-lg font-bold text-purple-700">화면을 불러오지 못했어요 😢</h1>
        <p className="mt-2 text-sm text-gray-500">
          잠시 후 다시 시도해 주세요. 문제가 계속되면 담당 선생님께 알려주세요.
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] text-gray-300">오류 코드: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-rose-400 to-orange-300 px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <RefreshCw size={16} /> 다시 시도
        </button>
      </div>
    </main>
  );
}
