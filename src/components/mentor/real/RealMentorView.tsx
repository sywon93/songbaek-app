"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarSearch,
  ChevronDown,
  Gift,
  History,
  MessageCircleQuestion,
  Reply,
  Search,
  Send,
  Stamp,
  Users2,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { RealTopBar } from "@/components/RealTopBar";
import { Modal } from "@/components/ui/Modal";
import { Toast, friendlyErrorMessage, type ToastMessage } from "@/components/ui/Toast";
import { ZoomableImage } from "@/components/ui/ZoomableImage";
import {
  approveToday,
  awardFreeStamp,
  searchStudentsForGift,
  type GiftSearchStudent,
} from "@/lib/actions/study";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type StudyRecord = Database["public"]["Tables"]["study_records"]["Row"];

export interface StudentWithRecord {
  profile: Profile;
  record: StudyRecord | null;
  plannerPhotoUrl: string | null;
  studyPhotoUrl: string | null;
}

function studentAnchorId(studentId: string) {
  return `student-${studentId}`;
}

function formatDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${wd})`;
}

export function RealMentorView({
  mentor,
  students,
  date,
  pastPending,
  browseDate,
  browseEntries,
}: {
  mentor: Profile;
  students: StudentWithRecord[];
  date: string;
  pastPending: StudentWithRecord[];
  browseDate: string | null;
  browseEntries: StudentWithRecord[];
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
            {pastPending.length > 0 && (
              <span className="ml-1 font-semibold text-amber-600">
                · 지난 날짜 밀린 승인 {pastPending.length}건
              </span>
            )}
          </p>
        </div>

        <GiftAnyStudentSection />

        <PastPendingSection entries={pastPending} />

        <div className="space-y-2.5">
          <p className="px-1 text-xs font-semibold text-gray-400">오늘 ({formatDateLabel(date)})</p>
          {students.map((s) => (
            <ReviewCard key={s.profile.id} entry={s} approveDate={date} variant="today" />
          ))}
          {students.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
              담당 학생이 없습니다. 관리자에게 매칭을 요청하세요.
            </p>
          )}
        </div>

        <DateBrowseSection browseDate={browseDate} entries={browseEntries} today={date} />
      </main>
    </div>
  );
}

function PastPendingSection({ entries }: { entries: StudentWithRecord[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-4 shadow-md backdrop-blur">
      <h2 className="flex items-center gap-1.5 text-base font-bold text-amber-800">
        <History size={16} className="text-amber-500" /> 밀린 승인 · 지난 날짜 ({entries.length}건)
      </h2>
      <p className="mt-0.5 text-xs text-amber-700/80">
        예전에 학생이 제출했지만 아직 도장을 못 찍은 기록이에요. 지금이라도 확인하고 도장을 찍어줄 수 있어요.
      </p>
      <div className="mt-3 space-y-2.5">
        {entries.map((s) => (
          <ReviewCard
            key={s.record?.id ?? s.profile.id}
            entry={s}
            approveDate={s.record?.record_date ?? ""}
            variant="past"
          />
        ))}
      </div>
    </section>
  );
}

function DateBrowseSection({
  browseDate,
  entries,
  today,
}: {
  browseDate: string | null;
  entries: StudentWithRecord[];
  today: string;
}) {
  const router = useRouter();

  return (
    <section className="rounded-2xl border-2 border-white/70 bg-white/85 p-4 shadow-md backdrop-blur">
      <h2 className="flex items-center gap-1.5 text-base font-bold text-gray-800">
        <CalendarSearch size={16} className="text-violet-500" /> 날짜별 학습 현황 조회
      </h2>
      <p className="mt-0.5 text-xs text-gray-400">
        특정 날짜를 골라 담당 학생 전체의 그날 학습 현황을 확인하고, 승인 대기 중인 기록은 도장을 찍어줄 수 있어요.
      </p>

      <label className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <span className="shrink-0 text-sm font-medium text-gray-600">조회 날짜</span>
        <input
          type="date"
          max={today}
          defaultValue={browseDate ?? ""}
          onChange={(e) => {
            router.push(e.target.value ? `/mentor?date=${e.target.value}` : "/mentor");
          }}
          className="ml-auto min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      {browseDate && (
        <div className="mt-3 space-y-2.5">
          <p className="px-1 text-xs font-semibold text-gray-400">{formatDateLabel(browseDate)} 학습 현황</p>
          {entries.map((s) => (
            <ReviewCard
              key={s.profile.id}
              entry={s}
              approveDate={browseDate}
              variant="browse"
            />
          ))}
          {entries.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
              담당 학생이 없어요.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ReviewCard({
  entry,
  approveDate,
  variant,
}: {
  entry: StudentWithRecord;
  approveDate: string;
  variant: "today" | "past" | "browse";
}) {
  const { profile: student, record } = entry;
  const status = record?.status ?? "none";
  const canExpand =
    variant === "today" ? status === "submitted" || status === "approved" : true;
  const [expanded, setExpanded] = useState(
    variant === "past" ? true : status === "submitted",
  );
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 요일별 상담 신청 명단에서 학생을 눌러 이동해 온 경우, 해당 카드를
  // 자동으로 펼쳐서 바로 학습 기록을 확인/처리할 수 있게 합니다. (오늘 목록 한정)
  useEffect(() => {
    if (variant !== "today" || !canExpand) return;
    const hash = `#${studentAnchorId(student.id)}`;
    const syncFromHash = () => {
      if (window.location.hash === hash) setExpanded(true);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [variant, canExpand, student.id]);

  const handleApprove = () => {
    if (!record || message.trim().length < 2 || !approveDate) return;
    setError(null);
    startTransition(async () => {
      try {
        await approveToday({ studentId: student.id, recordDate: approveDate, message });
        setMessage("");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const cardId = variant === "today" ? studentAnchorId(student.id) : undefined;

  return (
    <div
      id={cardId}
      className="scroll-mt-20 rounded-2xl border-2 border-white/70 bg-white/85 shadow-md backdrop-blur"
    >
      <div className="flex min-h-16 w-full items-center gap-2 p-3.5">
        <button
          type="button"
          onClick={() => canExpand && setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600">
            {student.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800">{student.name}</p>
            <p className="text-xs text-gray-400">
              학번 {student.username ?? "미지정"} · 도장 {student.stamp_count}/{student.stamp_goal}
            </p>
          </div>
        </button>
        <GiftStampButton studentId={student.id} studentName={student.name} />
        {variant === "past" && record && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
            {formatDateLabel(record.record_date)}
          </span>
        )}
        <StatusBadge status={status} />
        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "접기" : "펼치기"}
            className="shrink-0 p-1 text-gray-400"
          >
            <ChevronDown size={16} className={`transition ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {expanded && canExpand && (
        <div className="space-y-3 border-t border-gray-100 p-3">
          {!record && (
            <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-400">
              이 날짜에는 학생이 남긴 학습 기록이 없어요.
            </p>
          )}
          {record && status === "started" && (
            <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-600">
              학습을 시작했지만 아직 마감(공부 인증) 제출을 하지 않았어요.
            </p>
          )}

          {record && (status === "submitted" || status === "approved") && (
            <>
              {record.student_note && (
                <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-violet-700">
                    <MessageCircleQuestion size={14} /> 오늘의 한마디 &amp; 질문
                  </p>
                  <p className="mt-1 text-sm text-violet-900">{record.student_note}</p>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                {entry.plannerPhotoUrl && (
                  <div className="flex-1">
                    <p className="mb-1 text-[11px] font-medium text-gray-400">플래너</p>
                    <ZoomableImage
                      src={entry.plannerPhotoUrl}
                      alt="플래너 사진"
                      caption={`플래너 · ${student.name} · ${record ? formatDateLabel(record.record_date) : ""}`}
                      thumbClassName="max-h-80 w-full object-contain sm:h-64"
                    />
                  </div>
                )}
                {entry.studyPhotoUrl && (
                  <div className="flex-1">
                    <p className="mb-1 text-[11px] font-medium text-gray-400">공부 인증</p>
                    <ZoomableImage
                      src={entry.studyPhotoUrl}
                      alt="공부 인증 사진"
                      caption={`공부 인증 · ${student.name} · ${record ? formatDateLabel(record.record_date) : ""}`}
                      thumbClassName="max-h-80 w-full object-contain sm:h-64"
                    />
                  </div>
                )}
              </div>
              <div className="rounded-lg bg-gray-50 p-2.5 text-sm">
                <p className="font-medium text-gray-700">{record.study_minutes ?? 0}분</p>
                <p className="mt-0.5 text-gray-500">{record.study_content}</p>
              </div>
            </>
          )}

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
                <Stamp size={16} />{" "}
                {pending
                  ? "승인 중..."
                  : variant === "today"
                    ? "승인하고 도장 찍어주기"
                    : `${record ? formatDateLabel(record.record_date) : ""} 도장 찍어주기`}
              </button>
            </div>
          )}

          {status === "approved" && record && (
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

// 사유 입력 + 선물 실행 폼. 담당 멘티 카드의 버튼과 전체 학생 검색 모달이
// 함께 사용합니다. 선물에 성공하면 onDone 을 호출합니다.
function GiftReasonForm({
  studentId,
  studentName,
  onDone,
  onToast,
  onPendingChange,
}: {
  studentId: string;
  studentName: string;
  onDone: () => void;
  onToast: (t: ToastMessage) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  const canSubmit = reason.trim().length >= 2 && !pending;

  const handleGift = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      try {
        const res = await awardFreeStamp({ studentId, reason });
        if (!res.ok) {
          onToast({ text: res.message, variant: "error" });
          return;
        }
        onToast({ text: `${studentName}님에게 도장을 선물했어요! 🎁`, variant: "success" });
        setReason("");
        onDone();
      } catch (e) {
        onToast({ text: friendlyErrorMessage(e), variant: "error" });
      }
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        일지 승인과 별개로 도장을 바로 1개 지급해요. 어떤 점이 좋았는지 짧게 남겨주세요.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="예) 숙제 우수 / 태도 좋음 / 질문을 적극적으로 함"
        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-amber-400 focus:outline-none"
      />
      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleGift}
        className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white transition active:scale-[0.99] hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        <Gift size={16} /> {pending ? "선물하는 중..." : "도장 선물하기"}
      </button>
    </div>
  );
}

// 담당 멘티 카드 옆의 [🎁 도장 선물하기] 버튼 + 모달.
function GiftStampButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100 active:scale-[0.97]"
      >
        <Gift size={12} /> 도장 선물하기
      </button>

      <Modal open={open} onClose={() => !pending && setOpen(false)}>
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-base font-bold text-gray-800">
            <Gift size={18} className="text-amber-500" /> {studentName}님에게 도장 선물하기
          </h3>
          <GiftReasonForm
            studentId={studentId}
            studentName={studentName}
            onDone={() => setOpen(false)}
            onToast={setToast}
            onPendingChange={setPending}
          />
        </div>
      </Modal>

      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

// 담당 여부와 상관없이 전체 학생을 이름/학번으로 검색해 도장을 선물하는 영역.
function GiftAnyStudentSection() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  return (
    <section className="rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-4 shadow-md backdrop-blur">
      <h2 className="flex items-center gap-1.5 text-base font-bold text-amber-800">
        <Gift size={16} className="text-amber-500" /> 전체 학생 검색 · 도장 선물
      </h2>
      <p className="mt-0.5 text-xs text-amber-700/80">
        담당이 아닌 학생도 이름이나 학번으로 찾아 도장을 선물할 수 있어요.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 text-left text-sm text-gray-400 hover:bg-amber-50"
      >
        <Search size={16} className="text-amber-500" /> 학생 이름 또는 학번으로 검색
      </button>

      <Modal open={open} onClose={() => !pending && setOpen(false)}>
        {/* 모달을 열 때마다 검색어/선택 상태를 초기화하려고 open 이 true 일 때만 마운트 */}
        {open && (
          <StudentGiftSearch
            onDone={() => setOpen(false)}
            onToast={setToast}
            onPendingChange={setPending}
          />
        )}
      </Modal>

      <Toast message={toast} onClose={() => setToast(null)} />
    </section>
  );
}

const GIFT_SEARCH_LIMIT = 20;

function StudentGiftSearch({
  onDone,
  onToast,
  onPendingChange,
}: {
  onDone: () => void;
  onToast: (t: ToastMessage) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiftSearchStudent[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GiftSearchStudent | null>(null);
  // 느린 응답이 늦게 도착해 최신 검색 결과를 덮어쓰지 않도록 요청 번호를 둡니다.
  const requestSeq = useRef(0);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    const empty = value.trim() === "";
    setSearching(!empty);
    if (empty) {
      requestSeq.current++;
      setResults([]);
      setError(null);
    }
  };

  // 입력이 300ms 멈추면 검색합니다.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await searchStudentsForGift(q);
        if (seq !== requestSeq.current) return;
        if (res.ok) {
          setResults(res.students);
          setError(null);
        } else {
          setResults([]);
          setError(res.message);
        }
      } catch (e) {
        if (seq === requestSeq.current) setError(friendlyErrorMessage(e));
      } finally {
        if (seq === requestSeq.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (selected) {
    return (
      <div className="space-y-3">
        <h3 className="flex items-center gap-1.5 text-base font-bold text-gray-800">
          <Gift size={18} className="text-amber-500" /> {selected.name}님에게 도장 선물하기
        </h3>
        <p className="text-xs text-gray-500">
          학번 {selected.username ?? "미지정"} · 현재 도장 {selected.stamp_count}/{selected.stamp_goal}
        </p>
        <GiftReasonForm
          studentId={selected.id}
          studentName={selected.name}
          onDone={onDone}
          onToast={onToast}
          onPendingChange={onPendingChange}
        />
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="w-full py-1 text-xs font-medium text-gray-400 hover:text-gray-600"
        >
          ← 다른 학생 고르기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-base font-bold text-gray-800">
        <Search size={18} className="text-amber-500" /> 도장 선물할 학생 찾기
      </h3>
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="이름 또는 학번"
        className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-amber-400 focus:outline-none"
      />
      <div className="max-h-72 space-y-1.5 overflow-y-auto">
        {searching && <p className="py-3 text-center text-xs text-gray-400">검색 중...</p>}
        {!searching && error && (
          <p className="py-3 text-center text-xs font-medium text-red-500">{error}</p>
        )}
        {!searching && !error && query.trim() && results.length === 0 && (
          <p className="py-3 text-center text-xs text-gray-400">일치하는 학생이 없어요.</p>
        )}
        {!searching &&
          results.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s)}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left hover:border-amber-300 hover:bg-amber-50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600">
                {s.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                <p className="text-xs text-gray-400">
                  학번 {s.username ?? "미지정"} · 도장 {s.stamp_count}/{s.stamp_goal}
                </p>
              </div>
              <Gift size={16} className="shrink-0 text-amber-500" />
            </button>
          ))}
        {!searching && results.length === GIFT_SEARCH_LIMIT && (
          <p className="pt-1 text-center text-[11px] text-gray-400">
            최대 {GIFT_SEARCH_LIMIT}명까지 보여줘요. 이름을 더 정확히 입력해보세요.
          </p>
        )}
      </div>
    </div>
  );
}
