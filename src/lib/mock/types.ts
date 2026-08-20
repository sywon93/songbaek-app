export type Role = "student" | "mentor" | "admin";

export type RecordStatus = "none" | "started" | "submitted" | "approved";

export interface TodayRecord {
  status: RecordStatus;
  plannerPhotoUrl?: string;
  startedAt?: string;
  studyPhotoUrl?: string;
  studyMinutes?: number;
  studyContent?: string;
  studentNote?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  encouragementMessage?: string;
}

export interface Student {
  id: string;
  name: string;
  classNo: number;
  studentNo: number;
  mentorId: string;
  stampCount: number;
  stampGoal: number;
  round: number;
  today: TodayRecord;
}

export interface Mentor {
  id: string;
  name: string;
}
