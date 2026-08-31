"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";

/**
 * 학생이 올린 플래너/공부 인증 사진처럼 "작게 보면 내용을 읽기 어려운" 이미지를
 * 위한 썸네일 + 전체화면 라이트박스 컴포넌트.
 *
 * - 썸네일을 누르면 전체화면 모달로 원본 비율(object-contain)에 맞춰 크게 보여줍니다.
 * - 모달: 배경 클릭 / 닫기 버튼 / Esc 로 닫힘, 사진 클릭 시 원본 픽셀 크기로
 *   확대(1:1) ↔ 화면 맞춤 토글(확대 시 스크롤로 이동), 새 탭에서 원본 보기 제공.
 */
export function ZoomableImage({
  src,
  alt,
  thumbClassName,
  caption,
}: {
  src: string;
  alt: string;
  /** 썸네일 <img> 에 적용할 클래스. 기본은 카드용 큰 미리보기. */
  thumbClassName?: string;
  /** 라이트박스 상단에 표시할 설명(예: "플래너 · 8월 31일"). */
  caption?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${alt} 크게 보기`}
        className="group relative block w-full overflow-hidden rounded-lg bg-gray-50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={thumbClassName ?? "max-h-72 w-full object-contain"}
        />
        <span className="pointer-events-none absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white opacity-90 transition group-hover:bg-black/70">
          <Maximize2 size={11} /> 크게 보기
        </span>
      </button>
      {open && <ImageLightbox src={src} alt={alt} caption={caption} onClose={() => setOpen(false)} />}
    </>
  );
}

function ImageLightbox({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2 p-3">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-white/70">
          {caption ?? alt}
        </span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex min-h-10 items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
        >
          <ExternalLink size={13} /> 새 탭에서 원본
        </a>
        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          aria-label={zoomed ? "화면에 맞추기" : "원본 크기로 확대"}
          className="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          {zoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X size={18} />
        </button>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-auto p-4"
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
          className={
            zoomed
              ? "max-w-none cursor-zoom-out"
              : "max-h-full max-w-full cursor-zoom-in object-contain"
          }
        />
      </div>

      <p className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[11px] text-white/50">
        배경을 누르면 닫혀요 · 사진을 누르면 확대/축소돼요
      </p>
    </div>
  );
}
