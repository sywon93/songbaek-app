"use client";

import { BadgeCheck, MapPin, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useMockStore } from "@/lib/mock/store";
import type { Student } from "@/lib/mock/types";

const REWARD_TIERS = [
  {
    count: 7,
    icon: "🎁",
    stage: "1차",
    bg: "from-orange-200 via-amber-200 to-orange-300",
    ring: "ring-orange-300",
    border: "border-amber-300",
  },
  {
    count: 15,
    icon: "🎁",
    stage: "2차",
    bg: "from-slate-100 via-violet-100 to-slate-200",
    ring: "ring-violet-300",
    border: "border-violet-300",
  },
  {
    count: 20,
    icon: "🎁",
    stage: "3차",
    bg: "from-yellow-200 via-amber-200 to-yellow-300",
    ring: "ring-yellow-300",
    border: "border-yellow-300",
  },
];

const STAMP_PALETTE = [
  { border: "border-pink-200", bg: "from-pink-300 to-rose-300" },
  { border: "border-amber-200", bg: "from-amber-200 to-orange-300" },
  { border: "border-emerald-200", bg: "from-emerald-200 to-teal-300" },
  { border: "border-sky-200", bg: "from-sky-200 to-blue-300" },
  { border: "border-violet-200", bg: "from-violet-200 to-purple-300" },
];

export function StampBoard({ student }: { student: Student }) {
  const { startNextRound } = useMockStore();
  const { stampCount, stampGoal, round } = student;
  const achieved = stampCount >= stampGoal;
  // Reinitialized whenever this component remounts (see key={student.id} at call site).
  const [showCelebration, setShowCelebration] = useState(achieved);

  const cells = Array.from({ length: stampGoal }, (_, i) => i < stampCount);
  const tiers = REWARD_TIERS.filter((t) => t.count <= stampGoal);
  const currentStage = [...tiers].reverse().find((t) => stampCount >= t.count);

  const handleNextRound = () => {
    startNextRound(student.id);
    setShowCelebration(false);
  };

  return (
    <section className="rounded-2xl border-2 border-white/70 bg-white/80 p-3 shadow-md backdrop-blur sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-base font-bold text-rose-500">
          🐣 나의 도장판
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-500">
            {round ?? 1}회차
          </span>
        </h2>
        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-sm font-bold text-rose-500">
          {Math.min(stampCount, stampGoal)} / {stampGoal}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {cells.map((filled, i) => {
          const position = i + 1;
          const tier = tiers.find((t) => t.count === position);
          const palette = STAMP_PALETTE[i % STAMP_PALETTE.length];
          const tilt = i % 2 === 0 ? "-rotate-6" : "rotate-6";

          if (tier) {
            return (
              <div
                key={i}
                className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-dashed ${tier.border} ${
                  filled
                    ? `border-solid bg-gradient-to-br ${tier.bg} shadow-lg ring-4 ring-offset-1 ${tier.ring} animate-stamp-pop`
                    : "bg-white/50"
                }`}
                title={`${tier.stage} 보상칸 (${tier.count}개)`}
              >
                <span
                  className={`leading-none drop-shadow-md ${filled ? "animate-sparkle text-4xl sm:text-5xl" : "text-3xl opacity-50"}`}
                >
                  {tier.icon}
                </span>
                <span
                  className={`text-[10px] font-bold leading-none ${filled ? "text-white" : "text-slate-800"}`}
                >
                  {tier.count}개
                </span>
                {filled && (
                  <Sparkles
                    size={18}
                    className="absolute -right-1.5 -top-1.5 text-yellow-400 animate-sparkle"
                  />
                )}
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-2xl border-2 text-xl font-bold text-gray-300 ${
                filled
                  ? `border-transparent bg-gradient-to-br ${palette.bg} shadow-lg ${tilt} animate-stamp-pop`
                  : `border-dashed ${palette.border} bg-white/50`
              }`}
            >
              {filled ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white/90 sm:h-11 sm:w-11">
                  <BadgeCheck
                    size={20}
                    strokeWidth={2.5}
                    className="text-white drop-shadow sm:size-6"
                  />
                </div>
              ) : (
                position
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        {tiers.map((t) => (
          <span
            key={t.count}
            className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800"
          >
            {t.icon} {t.count}개
          </span>
        ))}
      </div>

      {stampCount > stampGoal && (
        <p className="mt-2 text-right text-xs text-gray-400">
          + {stampCount - stampGoal}개 추가 도장 🎉
        </p>
      )}

      {currentStage && (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-rose-300 via-orange-300 to-amber-300 p-4 text-white shadow-md">
          <p className="flex items-center gap-2 font-bold">
            🎁 {currentStage.stage} 보상 달성! 교무실에 와서 선물을 받아가세요!
          </p>
          {achieved && (
            <button
              type="button"
              onClick={handleNextRound}
              className="mt-3 flex min-h-11 items-center justify-center gap-1 rounded-full bg-white px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-white/90"
            >
              <RefreshCw size={14} /> 🎉 다음 회차 도장판 시작하기
            </button>
          )}
        </div>
      )}

      <Modal open={showCelebration} onClose={() => setShowCelebration(false)}>
        <div className="flex flex-col items-center text-center">
          <span className="mb-2 text-4xl animate-sparkle">🎁</span>
          <h3 className="text-lg font-bold text-purple-700">
            {currentStage ? `${currentStage.stage} 보상 달성! 🎉` : "축하합니다! 🎉"}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            도장 {currentStage ? currentStage.count : stampGoal}개를 모았어요!
            <br />
            1학년부 교무실로 찾아와 선물을 받아가세요!
          </p>
          <div className="mt-4 flex w-full items-start gap-2 rounded-2xl bg-rose-50 p-3 text-left text-sm text-gray-700">
            <MapPin size={18} className="mt-0.5 shrink-0 text-rose-400" />
            <div>
              <p className="font-semibold">1학년부 교무실</p>
              <p className="text-gray-500">본관 2층, 1학년 교실 옆</p>
              <p className="text-gray-500">평일 08:00 ~ 17:00</p>
            </div>
          </div>
          {achieved && (
            <button
              type="button"
              onClick={handleNextRound}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-rose-400 to-orange-300 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              <RefreshCw size={16} /> 다음 회차 도장판 시작하기
            </button>
          )}
        </div>
      </Modal>
    </section>
  );
}
