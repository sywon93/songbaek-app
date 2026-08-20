"use client";

import { Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "stampboard-a2hs-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// This component is always mounted via next/dynamic({ ssr: false }), so it only
// ever renders in the browser — the lazy initializers below can safely read
// window/localStorage without a server/client hydration mismatch.
export function AddToHomeScreenTip() {
  const [visible, setVisible] = useState(
    () => !localStorage.getItem(DISMISS_KEY) && !isStandalone(),
  );
  const [isIOS] = useState(() => /iphone|ipad|ipod/i.test(window.navigator.userAgent));
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const handleAdd = async () => {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
      dismiss();
      return;
    }
    setShowIOSGuide((v) => !v);
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/70 p-3">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xl">📱</span>
        <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-violet-700">
          홈 화면에 앱 추가하고 더 빠르게 접속해보세요!
        </p>
        <button
          type="button"
          onClick={handleAdd}
          className="flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-violet-500 px-3 py-2 text-xs font-bold text-white active:scale-[0.97]"
        >
          <Smartphone size={13} /> 추가하기
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="shrink-0 rounded-full p-2 text-violet-300 hover:bg-white/60"
        >
          <X size={15} />
        </button>
      </div>
      {showIOSGuide && isIOS && (
        <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-white/80 p-2.5 text-[11px] leading-snug text-violet-600">
          <Share size={13} className="shrink-0" />
          Safari 하단 공유 버튼을 누르고 &quot;홈 화면에 추가&quot;를 선택하세요.
        </p>
      )}
    </div>
  );
}
