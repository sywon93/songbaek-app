"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export type ToastMessage = {
  text: string;
  variant?: "error" | "success";
};

// 화면 하단 중앙에 잠깐 떴다 사라지는 알림. 서버 액션 결과(에러/성공)를
// 사용자 친화적으로 표출하기 위한 최소 구현이라 외부 라이브러리는 쓰지 않습니다.
export function Toast({
  message,
  onClose,
  duration = 4000,
}: {
  message: ToastMessage | null;
  onClose: () => void;
  duration?: number;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onCloseRef.current(), duration);
    return () => clearTimeout(t);
  }, [message, duration]);

  if (!message) return null;

  const isError = message.variant !== "success";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
      <div
        role="alert"
        aria-live="assertive"
        className={`pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ring-1 ${
          isError
            ? "bg-red-600 text-white ring-red-700/50"
            : "bg-emerald-600 text-white ring-emerald-700/50"
        }`}
      >
        {isError ? (
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
        ) : (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        )}
        <span className="flex-1 leading-snug">{message.text}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="알림 닫기"
          className="shrink-0 opacity-80 transition hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// 서버 액션에서 넘어온(혹은 던져진) 오류를 학생이 이해할 수 있는 문구로 정리합니다.
// 프로덕션 Next.js 는 Server Action 에서 throw 된 에러 메시지를 가리고
// "Minified React error #441" 같은 문자열로 바꾸므로, 그 경우 일반 안내로 대체합니다.
export function friendlyErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  if (
    !raw ||
    raw.includes("Minified React error") ||
    raw.includes("Server Components render") ||
    raw.includes("digest") ||
    raw.toLowerCase().includes("an error occurred in the server")
  ) {
    return "처리 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.";
  }
  return raw;
}
