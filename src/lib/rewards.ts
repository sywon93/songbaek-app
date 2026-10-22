/**
 * 도장판 보상 단계. 학생 도장판(RealStudentView / StampBoard)의 REWARD_TIERS 와
 * 같은 개수를 써야 합니다.
 */
export const REWARD_STAGES = [
  { stage: 1, label: "1차", count: 7 },
  { stage: 2, label: "2차", count: 15 },
  { stage: 3, label: "3차", count: 20 },
] as const;

export interface EarnedReward {
  round: number;
  stage: number;
  label: string;
  count: number;
}

/**
 * 학생이 지금까지 받을 자격이 생긴 보상 목록(오래된 것부터).
 * 지난 회차는 목표까지 모두 채웠으므로 목표 이하의 단계가 전부, 현재 회차는
 * 지금 도장 수까지 도달한 단계만 들어갑니다.
 */
export function earnedRewards(student: {
  round: number;
  stamp_count: number;
  stamp_goal: number;
}): EarnedReward[] {
  const stages = REWARD_STAGES.filter((s) => s.count <= student.stamp_goal);
  const list: EarnedReward[] = [];
  for (let round = 1; round <= student.round; round++) {
    for (const s of stages) {
      if (round < student.round || student.stamp_count >= s.count) {
        list.push({ round, stage: s.stage, label: s.label, count: s.count });
      }
    }
  }
  return list;
}

export const rewardKey = (studentId: string, round: number, stage: number) =>
  `${studentId}:${round}:${stage}`;
