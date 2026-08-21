"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  Hourglass,
  Lock,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageCircleQuestion,
  Pin,
  PlayCircle,
  RefreshCw,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PhotoUploader } from "@/components/ui/PhotoUploader";
import { RealTopBar } from "@/components/RealTopBar";
import { startNextRound, startToday, submitToday } from "@/lib/actions/study";
import { cancelMentoringReservation, reserveMentoringSlot } from "@/lib/actions/mentoring";
import { weekdayLabel } from "@/lib/date";
import { MENTORING_TIME_SLOTS } from "@/lib/mentoring";
import type { Database } from "@/lib/supabase/types";

type SlotStatus = Database["public"]["Functions"]["mentoring_slot_status"]["Returns"][number];
type NoticePreview = Pick<
  Database["public"]["Tables"]["notices"]["Row"],
  "id" | "title" | "is_pinned" | "created_at"
>;

const AddToHomeScreenTip = dynamic(
  () => import("@/components/AddToHomeScreenTip").then((m) => m.AddToHomeScreenTip),
  { ssr: false },
);

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type StudyRecord = Database["public"]["Tables"]["study_records"]["Row"];

const REWARD_TIERS = [
  { count: 7, icon: "🎁", stage: "1차", bg: "from-orange-200 via-amber-200 to-orange-300", ring: "ring-orange-300", border: "border-amber-300" },
  { count: 15, icon: "🎁", stage: "2차", bg: "from-slate-100 via-violet-100 to-slate-200", ring: "ring-violet-300", border: "border-violet-300" },
  { count: 20, icon: "🎁", stage: "3차", bg: "from-yellow-200 via-amber-200 to-yellow-300", ring: "ring-yellow-300", border: "border-yellow-300" },
];

const STAMP_PALETTE = [
  { border: "border-pink-200", bg: "from-pink-300 to-rose-300" },
  { border: "border-amber-200", bg: "from-amber-200 to-orange-300" },
  { border: "border-emerald-200", bg: "from-emerald-200 to-teal-300" },
  { border: "border-sky-200", bg: "from-sky-200 to-blue-300" },
  { border: "border-violet-200", bg: "from-violet-200 to-purple-300" },
];

export function RealStudentView({
  profile,
  record,
  plannerPhotoUrl,
  studyPhotoUrl,
  mentoringDate,
  slotStatus,
  notices,
}: {
  profile: Profile;
  record: StudyRecord | null;
  plannerPhotoUrl: string | null;
  studyPhotoUrl: string | null;
  mentoringDate: string | null;
  slotStatus: SlotStatus[];
  notices: NoticePreview[];
}) {
  const { stamp_count: stampCount, stamp_goal: stampGoal, round } = profile;
  const achieved = stampCount >= stampGoal;
  const [pending, startTransitionFn] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(achieved);

  const cells = Array.from({ length: stampGoal }, (_, i) => i < stampCount);
  const tiers = REWARD_TIERS.filter((t) => t.count <= stampGoal);
  const currentStage = [...tiers].reverse().find((t) => stampCount >= t.count);
  const status = record?.status ?? "none";

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransitionFn(async () => {
      try {
        await fn();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <div>
      <RealTopBar name={profile.name} roleLabel="학생" />
      <main className="mx-auto max-w-2xl space-y-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        <AddToHomeScreenTip />
        <div className="rounded-2xl border-2 border-white/70 bg-white/70 p-4 shadow-md backdrop-blur">
          <h1 className="text-lg font-bold text-purple-700">
            안녕하세요, {profile.name}님! 👋
          </h1>
          <p className="text-sm text-gray-500">
            1학년 {profile.class_no}반 {profile.student_no}번 · 오늘도 화이팅! 🌸
          </p>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-500">
            {error}
          </p>
        )}

        <NoticesPreviewSection notices={notices} />

        {/* 도장판 */}
        <section className="rounded-2xl border-2 border-white/70 bg-white/80 p-3 shadow-md backdrop-blur sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-bold text-rose-500">
              🐣 나의 도장판
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-500">
                {round}회차
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
                  >
                    <span className={`leading-none drop-shadow-md ${filled ? "animate-sparkle text-4xl sm:text-5xl" : "text-3xl opacity-50"}`}>
                      {tier.icon}
                    </span>
                    <span className={`text-[10px] font-bold leading-none ${filled ? "text-white" : "text-slate-800"}`}>
                      {tier.count}개
                    </span>
                    {filled && <Sparkles size={18} className="absolute -right-1.5 -top-1.5 text-yellow-400 animate-sparkle" />}
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
                      <BadgeCheck size={20} strokeWidth={2.5} className="text-white drop-shadow sm:size-6" />
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
              <span key={t.count} className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                {t.icon} {t.count}개
              </span>
            ))}
          </div>

          {currentStage && (
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-rose-300 via-orange-300 to-amber-300 p-4 text-white shadow-md">
              <p className="flex items-center gap-2 font-bold">
                🎁 {currentStage.stage} 보상 달성! 교무실에 와서 선물을 받아가세요!
              </p>
              {achieved && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => startNextRound(profile.id))}
                  className="mt-3 flex min-h-11 items-center justify-center gap-1 rounded-full bg-white px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-white/90 disabled:opacity-60"
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
                  disabled={pending}
                  onClick={() => run(() => startNextRound(profile.id))}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-rose-400 to-orange-300 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
                >
                  <RefreshCw size={16} /> 다음 회차 도장판 시작하기
                </button>
              )}
            </div>
          </Modal>
        </section>

        {/* 오늘의 학습 시작 */}
        <section className="rounded-2xl border-2 border-white/70 bg-white/85 p-3 shadow-md backdrop-blur sm:p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
            <PlayCircle size={18} className="text-rose-500" /> 오늘의 학습 시작
          </h2>
          {status !== "none" ? (
            <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3">
              {plannerPhotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={plannerPhotoUrl} alt="플래너 사진" className="h-16 w-16 rounded-lg object-cover" />
              )}
              <div className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                <CheckCircle2 size={16} /> 오늘 학습을 시작했어요!
              </div>
            </div>
          ) : (
            <StartForm
              pending={pending}
              onStart={(photo) => run(() => startToday(photo))}
            />
          )}
        </section>

        {/* 오늘의 학습 마감 */}
        <section className="rounded-2xl border-2 border-white/70 bg-white/85 p-3 shadow-md backdrop-blur sm:p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800">
            <Clock size={18} className="text-rose-500" /> 오늘의 학습 마감
          </h2>

          {status === "none" && (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-400">
              <Lock size={16} /> 먼저 오늘의 학습을 시작해주세요.
            </div>
          )}

          {status === "started" && (
            <EndForm
              pending={pending}
              onSubmit={(payload) => run(() => submitToday(payload))}
            />
          )}

          {(status === "submitted" || status === "approved") && record && (
            <div className="space-y-3">
              <div
                className={`flex items-center gap-1.5 rounded-lg p-2.5 text-sm font-medium ${
                  status === "approved" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {status === "approved" ? <CheckCircle2 size={16} /> : <Hourglass size={16} />}
                {status === "approved" ? "멘토 승인 완료! 도장을 받았어요." : "제출 완료! 멘토 승인을 기다리고 있어요."}
              </div>
              <div className="flex gap-3">
                {studyPhotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={studyPhotoUrl} alt="공부 인증 사진" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                )}
                <div className="flex-1 space-y-1 text-sm">
                  <p className="font-medium text-gray-700">{record.study_minutes}분</p>
                  <p className="flex items-start gap-1 text-gray-500">
                    <StickyNote size={14} className="mt-0.5 shrink-0" /> {record.study_content}
                  </p>
                </div>
              </div>
              {record.student_note && (
                <div className="flex items-start gap-2 rounded-xl bg-violet-50 p-3">
                  <MessageCircleQuestion size={16} className="mt-0.5 shrink-0 text-violet-500" />
                  <div>
                    <p className="text-xs font-semibold text-violet-700">오늘의 한마디 &amp; 질문</p>
                    <p className="mt-0.5 text-sm text-violet-900">{record.student_note}</p>
                  </div>
                </div>
              )}
              {status === "approved" && record.encouragement_message && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3">
                  <MessageCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
                  <div>
                    <p className="text-xs font-semibold text-rose-700">멘토의 답장</p>
                    <p className="mt-0.5 text-sm text-rose-900">{record.encouragement_message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <MentoringReservationSection
          mentoringDay={profile.mentoring_day}
          mentoringDate={mentoringDate}
          slotStatus={slotStatus}
        />
      </main>
    </div>
  );
}

function MentoringReservationSection({
  mentoringDay,
  mentoringDate,
  slotStatus,
}: {
  mentoringDay: Profile["mentoring_day"];
  mentoringDate: string | null;
  slotStatus: SlotStatus[];
}) {
  const [pending, startTransitionFn] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransitionFn(async () => {
      try {
        await fn();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const mine = slotStatus.find((s) => s.is_mine);

  return (
    <section className="rounded-2xl border-2 border-white/70 bg-white/85 p-3 shadow-md backdrop-blur sm:p-4">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-800">
        <CalendarClock size={18} className="text-rose-500" /> 멘토링 현장 만남 예약
      </h2>

      {!mentoringDay && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-400">
          지정된 멘토링 요일이 없어요. 담당 선생님(관리자)에게 문의해주세요.
        </p>
      )}

      {mentoringDay && mentoringDate && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            지정 요일 <span className="font-semibold text-gray-700">{weekdayLabel(mentoringDay)}</span> · 다음 세션{" "}
            <span className="font-semibold text-gray-700">{mentoringDate}</span>
          </p>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-500">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {MENTORING_TIME_SLOTS.map((slot) => {
              const status = slotStatus.find((s) => s.time_slot === slot.id);
              const isTaken = status?.is_taken ?? false;
              const isMine = status?.is_mine ?? false;
              const disabled = pending || (isTaken && !isMine) || (mine !== undefined && !isMine);

              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => run(() => reserveMentoringSlot(slot.id))}
                  className={`min-h-14 rounded-xl border-2 px-2 py-2.5 text-center text-sm font-semibold transition ${
                    isMine
                      ? "border-rose-400 bg-rose-50 text-rose-600"
                      : isTaken
                        ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300"
                        : "border-gray-200 bg-white text-gray-700 hover:border-rose-300 active:scale-[0.99] disabled:opacity-60"
                  }`}
                >
                  {slot.label}
                  <span className="mt-0.5 block text-[11px] font-medium">
                    {isMine ? "내 예약" : isTaken ? "마감" : "예약 가능"}
                  </span>
                </button>
              );
            })}
          </div>

          {mine?.reservation_id && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => cancelMentoringReservation(mine.reservation_id!))}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
            >
              <X size={12} /> 예약 취소
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function NoticesPreviewSection({ notices }: { notices: NoticePreview[] }) {
  if (notices.length === 0) return null;
  return (
    <Link
      href="/student/notices"
      className="block rounded-2xl border-2 border-white/70 bg-white/85 p-3.5 shadow-md backdrop-blur active:scale-[0.99] sm:p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
          <Megaphone size={16} className="text-rose-500" /> 공지사항
        </h2>
        <span className="text-[11px] font-medium text-gray-400">전체보기 →</span>
      </div>
      <ul className="space-y-1">
        {notices.map((n) => (
          <li key={n.id} className="flex items-center gap-1.5 truncate text-xs text-gray-600">
            {n.is_pinned && <Pin size={11} className="shrink-0 text-rose-400" />}
            <span className="truncate">{n.title}</span>
          </li>
        ))}
      </ul>
    </Link>
  );
}

function StartForm({
  pending,
  onStart,
}: {
  pending: boolean;
  onStart: (photoDataUrl: string) => void;
}) {
  const [photo, setPhoto] = useState<string | undefined>();
  return (
    <div className="space-y-3">
      <PhotoUploader label="오늘 계획을 적은 플래너 사진을 올려주세요" value={photo} onChange={setPhoto} />
      <button
        type="button"
        disabled={!photo || pending}
        onClick={() => photo && onStart(photo)}
        className="min-h-12 w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {pending ? "제출 중..." : "학습 시작 제출하기"}
      </button>
    </div>
  );
}

function EndForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (payload: {
    studyPhotoDataUrl: string;
    studyMinutes: number;
    studyContent: string;
    studentNote: string;
  }) => void;
}) {
  const [photo, setPhoto] = useState<string | undefined>();
  const [minutes, setMinutes] = useState("");
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const canSubmit = photo && Number(minutes) > 0 && content.trim().length > 0;

  return (
    <div className="space-y-3">
      <PhotoUploader label="공부한 내용을 인증할 사진을 올려주세요" value={photo} onChange={setPhoto} />
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">공부 시간 (분)</label>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="예: 90"
          className="min-h-12 w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-rose-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">학습 내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="오늘 공부한 내용을 간단히 적어주세요"
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-rose-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
          📝 오늘 공부 요약 &amp; 멘토에게 물어보고 싶은 점
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="예) 오늘 비문학 지문이 잘 안 읽혔어요 / 오늘 계획한 분량 완벽 달성!"
          className="w-full resize-none rounded-lg border border-violet-200 bg-violet-50/30 px-3 py-3 text-base focus:border-violet-400 focus:outline-none"
        />
      </div>
      <button
        type="button"
        disabled={!canSubmit || pending}
        onClick={() =>
          photo &&
          onSubmit({
            studyPhotoDataUrl: photo,
            studyMinutes: Number(minutes),
            studyContent: content.trim(),
            studentNote: note.trim(),
          })
        }
        className="min-h-12 w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {pending ? "제출 중..." : "학습 마감 제출하기"}
      </button>
    </div>
  );
}
