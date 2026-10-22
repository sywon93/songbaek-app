"use server";

import { createClient } from "@/lib/supabase/server";

export interface RewardClaimResult {
  ok: boolean;
  message?: string;
  claimedAt?: string;
}

/**
 * 선물 수령 체크/해제. 화면이 결과로 바로 갱신하므로 페이지 재검증은 하지 않습니다.
 * (프로덕션에서 throw 메시지가 가려지지 않도록 결과 객체로 돌려줍니다.)
 */
export async function setRewardClaim(
  studentId: string,
  round: number,
  stage: number,
  claimed: boolean,
): Promise<RewardClaimResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요해요." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, message: "관리자만 가능한 작업이에요." };

  if (!Number.isInteger(round) || round < 1 || ![1, 2, 3].includes(stage)) {
    return { ok: false, message: "잘못된 보상 정보예요." };
  }

  if (claimed) {
    const { data, error } = await supabase
      .from("reward_claims")
      .upsert({ student_id: studentId, round, stage }, { onConflict: "student_id,round,stage", ignoreDuplicates: true })
      .select("claimed_at")
      .maybeSingle();
    if (error) return { ok: false, message: `저장하지 못했어요: ${error.message}` };
    return { ok: true, claimedAt: data?.claimed_at ?? new Date().toISOString() };
  }

  const { error } = await supabase
    .from("reward_claims")
    .delete()
    .eq("student_id", studentId)
    .eq("round", round)
    .eq("stage", stage);
  if (error) return { ok: false, message: `해제하지 못했어요: ${error.message}` };
  return { ok: true };
}
