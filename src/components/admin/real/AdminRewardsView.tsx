"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Gift, Search } from "lucide-react";
import { RealTopBar } from "@/components/RealTopBar";
import { setRewardClaim } from "@/lib/actions/rewards";
import { formatSeoulDate } from "@/lib/date";
import { earnedRewards, rewardKey, type EarnedReward } from "@/lib/rewards";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type StudentRow = Pick<Profile, "id" | "name" | "username" | "round" | "stamp_count" | "stamp_goal">;
type Claim = Pick<Database["public"]["Tables"]["reward_claims"]["Row"], "student_id" | "round" | "stage" | "claimed_at">;

export function AdminRewardsView({
  admin,
  students,
  claims,
  loadError,
}: {
  admin: Profile;
  students: StudentRow[];
  claims: Claim[];
  loadError: string | null;
}) {
  // key → 받은 시각. 체크/해제 결과를 이 상태에만 반영해 페이지 전체를 다시 불러오지 않습니다.
  const [claimed, setClaimed] = useState<Map<string, string>>(
    () => new Map(claims.map((c) => [rewardKey(c.student_id, c.round, c.stage), c.claimed_at])),
  );
  // 처음 열었을 때 미수령이 있던 학생. 체크하자마자 카드가 사라지면 실수로 눌렀을 때 되돌리기 어려워서
  // "안 받은 학생" 보기에서도 이 학생들은 새로고침 전까지 남겨 둡니다.
  const [initiallyPending] = useState(
    () =>
      new Set(
        students
          .filter((s) => earnedRewards(s).some((r) => !claimed.has(rewardKey(s.id, r.round, r.stage))))
          .map((s) => s.id),
      ),
  );
  const [onlyPending, setOnlyPending] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(loadError);

  const rows = useMemo(
    () =>
      students.map((s) => {
        const earned = earnedRewards(s);
        const pending = earned.filter((r) => !claimed.has(rewardKey(s.id, r.round, r.stage))).length;
        return { student: s, earned, pending };
      }),
    [students, claimed],
  );
  const totalPending = rows.reduce((n, r) => n + r.pending, 0);
  const pendingStudents = rows.filter((r) => r.pending > 0).length;

  const q = query.trim();
  const visible = rows
    .filter((r) => (onlyPending ? r.pending > 0 || initiallyPending.has(r.student.id) : true))
    .filter((r) => !q || r.student.name.includes(q) || (r.student.username ?? "").includes(q))
    // 체크할 때마다 순서가 바뀌지 않도록 처음 상태 기준으로만 미수령 학생을 위로 올립니다.
    .sort((a, b) => Number(initiallyPending.has(b.student.id)) - Number(initiallyPending.has(a.student.id)));

  const toggle = (studentId: string, reward: EarnedReward) => {
    const key = rewardKey(studentId, reward.round, reward.stage);
    const next = !claimed.has(key);
    const prevAt = claimed.get(key);
    const apply = (at: string | undefined) =>
      setClaimed((m) => {
        const copy = new Map(m);
        if (at) copy.set(key, at);
        else copy.delete(key);
        return copy;
      });
    setError(null);
    apply(next ? new Date().toISOString() : undefined);
    return setRewardClaim(studentId, reward.round, reward.stage, next).then((res) => {
      if (!res.ok) {
        apply(prevAt);
        setError(res.message ?? "저장하지 못했어요. 잠시 후 다시 시도해주세요.");
      } else if (next && res.claimedAt) {
        apply(res.claimedAt);
      }
    });
  };

  return (
    <div>
      <RealTopBar name={admin.name} roleLabel="관리자" />
      <main className="mx-auto max-w-2xl space-y-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
        <Link
          href="/admin"
          className="flex min-h-11 w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeft size={14} /> 학생 관리로
        </Link>

        <div className="rounded-2xl border-2 border-white/70 bg-white/70 p-4 shadow-md backdrop-blur">
          <h1 className="flex items-center gap-2 text-lg font-bold text-purple-700">
            <Gift size={20} className="text-amber-500" /> 선물 수령 체크
          </h1>
          <p className="text-sm text-gray-500">
            아직 안 받아 간 선물 {totalPending}개 · 학생 {pendingStudents}명
          </p>
          <p className="mt-1 text-xs text-gray-400">
            도장 7·15·20개마다 선물이 생겨요. 선물을 건넨 칸을 누르면 받음으로 바뀌고, 다시 누르면 취소돼요.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5">
            <Search size={15} className="text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 또는 학번으로 찾기"
              className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none"
            />
          </label>
          <div className="flex rounded-full border border-gray-200 bg-white p-1 text-xs font-semibold">
            {[
              [true, "안 받은 학생"],
              [false, "전체"],
            ].map(([value, label]) => (
              <button
                key={String(value)}
                type="button"
                onClick={() => setOnlyPending(value as boolean)}
                className={`min-h-9 rounded-full px-3 ${onlyPending === value ? "bg-amber-500 text-white" : "text-gray-500"}`}
              >
                {label as string}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">{error}</p>}

        <section className="space-y-2.5">
          {visible.map(({ student, earned, pending }) => (
            <div
              key={student.id}
              className="rounded-2xl border-2 border-white/70 bg-white/85 p-3.5 shadow-md backdrop-blur"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-gray-800">
                  {student.name}
                  {student.username && <span className="ml-1.5 text-xs font-normal text-gray-400">{student.username}</span>}
                </p>
                <p className="shrink-0 text-xs text-gray-500">
                  {student.round}회차 · 도장 {student.stamp_count}/{student.stamp_goal}
                  {pending > 0 && <span className="ml-1.5 font-bold text-amber-600">미수령 {pending}</span>}
                </p>
              </div>
              {earned.length === 0 ? (
                <p className="mt-2 text-xs text-gray-400">아직 받을 선물이 없어요.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {earned.map((r) => (
                    <RewardChip
                      key={`${r.round}-${r.stage}`}
                      reward={r}
                      showRound={student.round > 1}
                      claimedAt={claimed.get(rewardKey(student.id, r.round, r.stage))}
                      onToggle={() => toggle(student.id, r)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
              {onlyPending && !q ? "모든 학생이 선물을 받아 갔어요. 🎉" : "해당하는 학생이 없어요."}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function RewardChip({
  reward,
  showRound,
  claimedAt,
  onToggle,
}: {
  reward: EarnedReward;
  showRound: boolean;
  claimedAt: string | undefined;
  onToggle: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const label = `${showRound ? `${reward.round}회차 ` : ""}${reward.label} (${reward.count}개)`;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(onToggle)}
      aria-pressed={Boolean(claimedAt)}
      className={`flex min-h-10 items-center gap-1 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition active:scale-[0.97] disabled:opacity-60 ${
        claimedAt
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-amber-300 bg-amber-50 text-amber-700"
      }`}
    >
      {claimedAt ? <Check size={13} /> : <Gift size={13} />}
      {label}
      <span className="font-medium opacity-75">
        {claimedAt ? `받음 · ${formatSeoulDate(claimedAt)}` : "미수령"}
      </span>
    </button>
  );
}
