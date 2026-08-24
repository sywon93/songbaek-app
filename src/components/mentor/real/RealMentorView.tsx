"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CalendarClock,
  ChevronDown,
  Clock3,
  MessageCircleQuestion,
  Reply,
  Send,
  Stamp,
  Users2,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { RealTopBar } from "@/components/RealTopBar";
import { approveToday } from "@/lib/actions/study";
import { weekdayLabel } from "@/lib/date";
import { mentoringSlotLabel } from "@/lib/mentoring";
import type { Database, MentoringTimeSlot, Weekday } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type StudyRecord = Database["public"]["Tables"]["study_records"]["Row"];

export interface StudentWithRecord {
  profile: Profile;
  record: StudyRecord | null;
  plannerPhotoUrl: string | null;
  studyPhotoUrl: string | null;
}

export interface StudentScheduleEntry {
  profile: Profile;
  mentoringDay: Weekday;
  nextSessionDate: string;
  reservedSlot: MentoringTimeSlot | null;
}

const WEEKDAY_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

function studentAnchorId(studentId: string) {
  return `student-${studentId}`;
}

export function RealMentorView({
  mentor,
  students,
  date,
  scheduleEntries,
}: {
  mentor: Profile;
  students: StudentWithRecord[];
  date: string;
  scheduleEntries: StudentScheduleEntry[];
}) {
  const pendingCount = students.filter((s) => s.record?.status === "submitted").length;

  return (
    <div>
      <RealTopBar name={mentor.name} roleLabel="멘토" />
      <main className="mx-auto max-w-2xl space-y-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        <div className="rounded-2xl border-2 border-white/70 bg-white/70 p-4 shadow-md backdrop-blur">
          <h1 className="flex items-center gap-2 text-lg font-bold text-purple-700">
            <Users2 size={20} className="text-rose-500" />
            담당 학생 오늘 제출 현황
          </h1>
          <p className="text-sm text-gray-500">
            승인 대기 {pendingCount}건 / 전체 {students.length}명
          </p>
        </div>

        <MentoringScheduleSection entries={scheduleEntries} />

        <div className="space-y-2.5">
          {students.map((s) => (
            <ReviewCard key={s.profile.id} entry={s} date={date} />
          ))}
          {students.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
              담당 학생이 없습니다. 관리자에게 매칭을 요청하세요.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function MentoringScheduleSection({ entries }: { entries: StudentScheduleEntry[] }) {
  const days = WEEKDAY_ORDER.filter((day) => entries.some((e) => e.mentoringDay === day));

  return (
    <section className="rounded-2xl border-2 border-white/70 bg-white/85 p-4 shadow-md backdrop-blur">
      <h2 className="flex items-center gap-1.5 text-base font-bold text-gray-800">
        <CalendarClock size={16} className="text-violet-500" /> 요일별 상담 신청 명단
      </h2>
      <p className="mt-0.5 text-xs text-gray-400">
        담당 학생의 지정 요일별 다음 상담일 예약 현황이에요. 학생을 누르면 아래 학습 기록으로 이동해요.
      </p>

      {days.length === 0 && (
        <p className="mt-3 rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-400">
          상담 요일이 지정된 담당 학생이 없어요.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {days.map((day) => {
          const dayEntries = entries.filter((e) => e.mentoringDay === day);
          const sessionDate = dayEntries[0]?.nextSessionDate;
          return (
            <div key={day} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-700">{weekdayLabel(day)}</p>
                <p className="text-[11px] text-gray-400">{sessionDate} 상담 예정</p>
              </div>
              <ul className="space-y-1.5">
                {dayEntries.map((entry) => (
                  <li key={entry.profile.id}>
                    <a
                      href={`#${studentAnchorId(entry.profile.id)}`}
                      className="flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm active:scale-[0.99]"
                    >
                      <span className="flex-1 truncate">
                        <span className="font-medium text-gray-800">{entry.profile.name}</span>
                        <span className="ml-1.5 text-xs text-gray-400">
                          학번 {entry.profile.username ?? "미지정"}
                        </span>
                      </span>
                      {entry.reservedSlot ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-600">
                          <Clock3 size={10} /> {mentoringSlotLabel(entry.reservedSlot)}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-400">
                          미예약
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReviewCard({ entry, date }: { entry: StudentWithRecord; date: string }) {
  const { profile: student, record } = entry;
  const status = record?.status ?? "none";
  const canExpand = status === "submitted" || status === "approved";
  const [expanded, setExpanded] = useState(status === "submitted");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 요일별 상담 신청 명단에서 학생을 눌러 이동해 온 경우, 해당 카드를
  // 자동으로 펼쳐서 바로 학습 기록을 확인/처리할 수 있게 합니다.
  useEffect(() => {
    if (!canExpand) return;
    const hash = `#${studentAnchorId(student.id)}`;
    const syncFromHash = () => {
      if (window.location.hash === hash) setExpanded(true);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [canExpand, student.id]);

  const handleApprove = () => {
    if (!record || message.trim().length < 2) return;
    setError(null);
    startTransition(async () => {
      try {
        await approveToday({ studentId: student.id, recordDate: date, message });
        setMessage("");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <div
      id={studentAnchorId(student.id)}
      className="scroll-mt-20 rounded-2xl border-2 border-white/70 bg-white/85 shadow-md backdrop-blur"
    >
      <button
        type="button"
        onClick={() => canExpand && setExpanded((v) => !v)}
        className="flex min-h-16 w-full items-center gap-3 p-3.5 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600">
          {student.name.slice(0, 1)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{student.name}</p>
          <p className="text-xs text-gray-400">
            학번 {student.username ?? "미지정"} · 도장 {student.stamp_count}/{student.stamp_goal}
          </p>
        </div>
        <StatusBadge status={status} />
        {canExpand && (
          <ChevronDown size={16} className={`text-gray-400 transition ${expanded ? "rotate-180" : ""}`} />
        )}
      </button>

      {expanded && canExpand && record && (
        <div className="space-y-3 border-t border-gray-100 p-3">
          {record.student_note && (
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-violet-700">
                <MessageCircleQuestion size={14} /> 오늘의 한마디 &amp; 질문
              </p>
              <p className="mt-1 text-sm text-violet-900">{record.student_note}</p>
            </div>
          )}
          <div className="flex gap-3">
            {entry.plannerPhotoUrl && (
              <div className="flex-1">
                <p className="mb-1 text-[11px] font-medium text-gray-400">플래너</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.plannerPhotoUrl} alt="플래너 사진" className="h-24 w-full rounded-lg object-cover" />
              </div>
            )}
            {entry.studyPhotoUrl && (
              <div className="flex-1">
                <p className="mb-1 text-[11px] font-medium text-gray-400">공부 인증</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.studyPhotoUrl} alt="공부 인증 사진" className="h-24 w-full rounded-lg object-cover" />
              </div>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 p-2.5 text-sm">
            <p className="font-medium text-gray-700">{record.study_minutes}분</p>
            <p className="mt-0.5 text-gray-500">{record.study_content}</p>
          </div>

          {status === "submitted" && (
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-xs font-medium text-gray-500">
                <Reply size={13} /> 답장하기 · 응원 한마디{" "}
                <span className="text-rose-500">(필수)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="오늘도 수고했어요! 도장 찍어주려면 한마디를 남겨주세요 :)"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-rose-500 focus:outline-none"
              />
              {error && <p className="text-xs font-medium text-red-500">{error}</p>}
              <button
                type="button"
                disabled={message.trim().length < 2 || pending}
                onClick={handleApprove}
                className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition active:scale-[0.99] hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Stamp size={16} /> {pending ? "승인 중..." : "승인하고 도장 찍어주기"}
              </button>
            </div>
          )}

          {status === "approved" && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-2.5 text-sm">
              <Send size={14} className="mt-0.5 shrink-0 text-rose-500" />
              <div>
                <p className="text-xs font-semibold text-rose-700">멘토의 답장</p>
                <p className="mt-0.5 text-rose-900">{record.encouragement_message}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
