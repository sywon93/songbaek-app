import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gift,
  MessageCircle,
  MessageCircleQuestion,
  NotebookPen,
  StickyNote,
} from "lucide-react";
import { RealTopBar } from "@/components/RealTopBar";
import { StatusBadge } from "@/components/StatusBadge";
import { ZoomableImage } from "@/components/ui/ZoomableImage";
import { formatSeoulDateTime, studyDateLabel } from "@/lib/date";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type StudyRecord = Database["public"]["Tables"]["study_records"]["Row"];
type StampAward = Pick<
  Database["public"]["Tables"]["stamp_awards"]["Row"],
  "id" | "reason" | "awarded_at"
>;

const formatDateTime = formatSeoulDateTime;

// 학습 일지(날짜별 1건)와 멘토가 자율로 선물한 보너스 도장(날짜 무관, 여러 건
// 가능)을 하나의 시간순 흐름으로 보여주기 위한 합친 피드 항목입니다.
type FeedItem =
  | { kind: "record"; sortKey: string; record: StudyRecord }
  | { kind: "award"; sortKey: string; award: StampAward };

function seoulDatePart(iso: string): string {
  return (
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso))
  );
}

export function StudentRecordsListView({
  profile,
  records,
  stampAwards,
}: {
  profile: Profile;
  records: StudyRecord[];
  stampAwards: StampAward[];
}) {
  const approvedCount = records.filter((r) => r.status === "approved").length;
  const feedbackCount = records.filter(
    (r) => r.status === "approved" && r.encouragement_message,
  ).length;

  const feed: FeedItem[] = [
    ...records.map((record): FeedItem => ({ kind: "record", sortKey: record.record_date, record })),
    ...stampAwards.map((award): FeedItem => ({
      kind: "award",
      sortKey: seoulDatePart(award.awarded_at),
      award,
    })),
  ].sort((a, b) => {
    const d = b.sortKey.localeCompare(a.sortKey);
    if (d !== 0) return d;
    // 같은 날짜면 보너스 도장을 일지보다 먼저 보여줍니다(받은 시각 기준 최신이라).
    return a.kind === b.kind ? 0 : a.kind === "award" ? -1 : 1;
  });

  return (
    <div>
      <RealTopBar name={profile.name} roleLabel="학생" />
      <main className="mx-auto max-w-2xl space-y-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        <Link
          href="/student"
          className="flex min-h-11 w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> 홈으로
        </Link>

        <div className="rounded-2xl border-2 border-white/70 bg-white/70 p-4 shadow-md backdrop-blur">
          <h1 className="flex items-center gap-2 text-lg font-bold text-purple-700">
            <NotebookPen size={20} className="text-rose-500" /> 내 학습 기록 &amp; 멘토 피드백
          </h1>
          <p className="text-sm text-gray-500">
            전체 {records.length}일 · 도장 {approvedCount + stampAwards.length}개
            {stampAwards.length > 0 && ` (특별 도장 ${stampAwards.length}개 포함)`} · 멘토
            피드백 {feedbackCount}건
          </p>
        </div>

        <section className="space-y-2">
          {feed.map((item) => {
            if (item.kind === "award") {
              const a = item.award;
              return (
                <div
                  key={`award-${a.id}`}
                  className="flex items-start gap-2.5 rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-3.5 shadow-md backdrop-blur"
                >
                  <Gift size={16} className="mt-0.5 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-amber-800">🎁 멘토님의 특별 도장</p>
                    <p className="mt-0.5 text-sm text-amber-900">{a.reason}</p>
                    <p className="mt-1 text-[11px] text-amber-600">
                      {formatDateTime(a.awarded_at) ?? ""}
                    </p>
                  </div>
                </div>
              );
            }

            const r = item.record;
            const hasFeedback = r.status === "approved" && !!r.encouragement_message;
            return (
              <Link
                key={r.id}
                href={`/student/records/${r.id}`}
                className="block rounded-2xl border-2 border-white/70 bg-white/85 p-3.5 shadow-md backdrop-blur active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-sm font-bold text-gray-800">
                    <CalendarDays size={14} className="text-rose-400" />
                    {studyDateLabel(r.record_date)}
                  </span>
                  <span className="ml-auto shrink-0">
                    <StatusBadge status={r.status} />
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                  {r.study_minutes != null && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {r.study_minutes}분
                    </span>
                  )}
                  {r.study_content && (
                    <span className="flex min-w-0 items-center gap-1">
                      <StickyNote size={12} className="shrink-0" />
                      <span className="truncate">{r.study_content}</span>
                    </span>
                  )}
                </div>

                {hasFeedback && (
                  <p className="mt-2 flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600">
                    <MessageCircle size={12} /> 멘토 피드백이 도착했어요
                  </p>
                )}
              </Link>
            );
          })}

          {feed.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
              아직 학습 기록이 없어요. 오늘의 학습을 시작해보세요!
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

export function StudentRecordDetailView({
  profile,
  record,
  plannerPhotoUrl,
  studyPhotoUrl,
  reviewerName,
}: {
  profile: Profile;
  record: StudyRecord;
  plannerPhotoUrl: string | null;
  studyPhotoUrl: string | null;
  reviewerName: string | null;
}) {
  const submittedLabel = formatDateTime(record.submitted_at);
  const reviewedLabel = formatDateTime(record.reviewed_at);

  return (
    <div>
      <RealTopBar name={profile.name} roleLabel="학생" />
      <main className="mx-auto max-w-2xl space-y-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        <Link
          href="/student/records"
          className="flex min-h-11 w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> 목록으로
        </Link>

        <article className="rounded-2xl border-2 border-white/70 bg-white/85 p-4 shadow-md backdrop-blur sm:p-5">
          <div className="flex items-center gap-2">
            <h1 className="flex items-center gap-1.5 text-lg font-bold text-gray-800">
              <CalendarDays size={18} className="text-rose-500" />
              {studyDateLabel(record.record_date)}
            </h1>
            <span className="ml-auto shrink-0">
              <StatusBadge status={record.status} />
            </span>
          </div>

          {record.status === "started" && (
            <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-600">
              학습을 시작했지만 아직 마감(공부 인증) 제출을 하지 않은 날이에요.
            </p>
          )}

          <div className="mt-4 space-y-4">
            {plannerPhotoUrl && (
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-400">오늘의 계획 (플래너)</p>
                <ZoomableImage
                  src={plannerPhotoUrl}
                  alt="플래너 사진"
                  caption={`플래너 · ${studyDateLabel(record.record_date)}`}
                  thumbClassName="max-h-[28rem] w-full object-contain"
                />
              </div>
            )}

            {studyPhotoUrl && (
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-400">공부 인증 사진</p>
                <ZoomableImage
                  src={studyPhotoUrl}
                  alt="공부 인증 사진"
                  caption={`공부 인증 · ${studyDateLabel(record.record_date)}`}
                  thumbClassName="max-h-[28rem] w-full object-contain"
                />
              </div>
            )}

            {(record.study_minutes != null || record.study_content) && (
              <div className="rounded-xl bg-gray-50 p-3 text-sm">
                {record.study_minutes != null && (
                  <p className="flex items-center gap-1.5 font-semibold text-gray-700">
                    <Clock size={14} /> {record.study_minutes}분 공부했어요
                  </p>
                )}
                {record.study_content && (
                  <p className="mt-1 whitespace-pre-wrap text-gray-600">{record.study_content}</p>
                )}
                {submittedLabel && (
                  <p className="mt-2 text-[11px] text-gray-400">제출: {submittedLabel}</p>
                )}
              </div>
            )}

            {record.student_note && (
              <div className="flex items-start gap-2 rounded-xl bg-violet-50 p-3">
                <MessageCircleQuestion size={16} className="mt-0.5 shrink-0 text-violet-500" />
                <div>
                  <p className="text-xs font-semibold text-violet-700">
                    내가 남긴 한마디 &amp; 질문
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-violet-900">
                    {record.student_note}
                  </p>
                </div>
              </div>
            )}
          </div>
        </article>

        {/* 멘토 피드백 */}
        <section className="rounded-2xl border-2 border-rose-200 bg-rose-50/70 p-4 shadow-md backdrop-blur sm:p-5">
          <h2 className="flex items-center gap-1.5 text-base font-bold text-rose-700">
            <MessageCircle size={16} /> 멘토 피드백
          </h2>

          {record.status === "approved" && record.encouragement_message ? (
            <div className="mt-3 space-y-2">
              <div className="rounded-xl bg-white/80 p-3.5 text-sm leading-relaxed text-rose-900">
                <p className="whitespace-pre-wrap">{record.encouragement_message}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-rose-500">
                <span className="flex items-center gap-1">
                  <BookOpenCheck size={12} />
                  {reviewerName ? `${reviewerName} 멘토` : record.manual_override ? "관리자 선생님" : "담당 멘토"}
                </span>
                {reviewedLabel && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} /> {reviewedLabel} 작성
                  </span>
                )}
              </div>
            </div>
          ) : record.status === "submitted" ? (
            <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-amber-700">
              멘토 승인을 기다리고 있어요. 곧 피드백이 도착할 거예요! ⏳
            </p>
          ) : (
            <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-gray-500">
              아직 멘토 피드백이 없는 날이에요.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
