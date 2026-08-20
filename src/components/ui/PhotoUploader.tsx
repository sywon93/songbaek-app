"use client";

import { Camera, ImagePlus, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { fileToCompressedDataUrl } from "@/lib/mock/image";

export function PhotoUploader({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (dataUrl: string) => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      onChange(dataUrl);
    } catch {
      setError("사진을 처리하지 못했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* capture="environment" 가 있는 입력은 모바일에서 카메라를 바로 열고,
          없는 입력은 갤러리(사진 보관함)를 바로 엽니다. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt={label}
          className="h-48 w-full rounded-2xl border-2 border-pink-100 object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/40 px-4 py-6 text-center text-gray-400">
          <Camera size={30} />
          <span className="text-sm font-medium">{label}</span>
        </div>
      )}

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={loading}
          className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-2 py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          <Camera size={17} /> {value ? "다시 촬영" : "사진 촬영"}
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={loading}
          className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 border-rose-200 bg-white px-2 py-3 text-sm font-bold text-rose-500 transition active:scale-[0.98] disabled:opacity-60"
        >
          {value ? <RefreshCw size={17} /> : <ImagePlus size={17} />}{" "}
          갤러리에서 선택
        </button>
      </div>

      {loading && (
        <p className="mt-1.5 text-xs text-gray-400">사진 처리 중...</p>
      )}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
