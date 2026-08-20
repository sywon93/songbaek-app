import type { Mentor, Student } from "@/lib/mock/types";

export const MOCK_MENTORS: Mentor[] = [
  { id: "m1", name: "김민준 멘토" },
  { id: "m2", name: "이서연 멘토" },
];

export const MOCK_STUDENTS: Student[] = [
  {
    id: "s1",
    name: "김하은",
    classNo: 3,
    studentNo: 5,
    mentorId: "m1",
    stampCount: 19,
    stampGoal: 20,
    round: 1,
    today: { status: "none" },
  },
  {
    id: "s2",
    name: "이서준",
    classNo: 3,
    studentNo: 12,
    mentorId: "m1",
    stampCount: 5,
    stampGoal: 20,
    round: 1,
    today: {
      status: "submitted",
      plannerPhotoUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(mockPhotoSvg("#c7d2fe", "플래너")),
      startedAt: new Date().toISOString(),
      studyPhotoUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(mockPhotoSvg("#bbf7d0", "공부 인증")),
      studyMinutes: 95,
      studyContent: "수학 정석 3단원 문제풀이 + 영어 단어 100개 암기",
      studentNote:
        "오늘 비문학 지문이 잘 안 읽혔어요. 시간 배분을 어떻게 하면 좋을지 알려주세요!",
      submittedAt: new Date().toISOString(),
    },
  },
  {
    id: "s3",
    name: "박지우",
    classNo: 3,
    studentNo: 18,
    mentorId: "m1",
    stampCount: 20,
    stampGoal: 20,
    round: 1,
    today: { status: "none" },
  },
  {
    id: "s4",
    name: "최수아",
    classNo: 3,
    studentNo: 21,
    mentorId: "m1",
    stampCount: 0,
    stampGoal: 20,
    round: 1,
    today: { status: "none" },
  },
  {
    id: "s5",
    name: "정도윤",
    classNo: 3,
    studentNo: 9,
    mentorId: "m1",
    stampCount: 12,
    stampGoal: 20,
    round: 1,
    today: {
      status: "started",
      plannerPhotoUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(mockPhotoSvg("#c7d2fe", "플래너")),
      startedAt: new Date().toISOString(),
    },
  },
  {
    id: "s6",
    name: "한소율",
    classNo: 3,
    studentNo: 2,
    mentorId: "m1",
    stampCount: 8,
    stampGoal: 20,
    round: 1,
    today: {
      status: "approved",
      plannerPhotoUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(mockPhotoSvg("#c7d2fe", "플래너")),
      startedAt: new Date().toISOString(),
      studyPhotoUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(mockPhotoSvg("#bbf7d0", "공부 인증")),
      studyMinutes: 120,
      studyContent: "국어 문학 개념 정리 및 기출 분석",
      submittedAt: new Date().toISOString(),
      reviewedBy: "m1",
      reviewedAt: new Date().toISOString(),
      encouragementMessage: "오늘도 꾸준히 잘하고 있어요! 이 페이스 유지해봐요 💪",
    },
  },
  {
    id: "s7",
    name: "오하람",
    classNo: 4,
    studentNo: 3,
    mentorId: "m2",
    stampCount: 3,
    stampGoal: 20,
    round: 1,
    today: { status: "none" },
  },
];

function mockPhotoSvg(color: string, label: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360">
    <rect width="100%" height="100%" fill="${color}"/>
    <text x="50%" y="50%" font-size="28" text-anchor="middle" fill="#1f2937" font-family="sans-serif">${label} 사진</text>
  </svg>`;
}
