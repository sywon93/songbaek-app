"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { MOCK_MENTORS, MOCK_STUDENTS } from "@/lib/mock/seed";
import type { Mentor, Role, Student } from "@/lib/mock/types";

const STORAGE_KEY = "study-app-mock-state-v1";

interface MockState {
  role: Role;
  currentStudentId: string;
  currentMentorId: string;
  students: Student[];
  mentors: Mentor[];
}

function initialState(): MockState {
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as MockState;
      } catch {
        // fall through to seed data
      }
    }
  }
  return {
    role: "student",
    currentStudentId: MOCK_STUDENTS[0].id,
    currentMentorId: MOCK_MENTORS[0].id,
    students: MOCK_STUDENTS,
    mentors: MOCK_MENTORS,
  };
}

interface MockStore {
  role: Role;
  setRole: (role: Role) => void;
  students: Student[];
  mentors: Mentor[];
  currentStudentId: string;
  setCurrentStudentId: (id: string) => void;
  currentMentorId: string;
  setCurrentMentorId: (id: string) => void;
  startToday: (studentId: string, plannerPhotoUrl: string) => void;
  submitToday: (
    studentId: string,
    payload: {
      studyPhotoUrl: string;
      studyMinutes: number;
      studyContent: string;
      studentNote: string;
    },
  ) => void;
  approveToday: (
    studentId: string,
    payload: { mentorId: string; message: string },
  ) => void;
  resetStudentToday: (studentId: string) => void;
  startNextRound: (studentId: string) => void;
  resetAll: () => void;
}

const MockStoreContext = createContext<MockStore | null>(null);

export function MockStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MockState>(initialState);

  const persist = useCallback((next: MockState) => {
    setState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const updateStudent = useCallback(
    (studentId: string, updater: (student: Student) => Student) => {
      setState((prev) => {
        const next: MockState = {
          ...prev,
          students: prev.students.map((s) =>
            s.id === studentId ? updater(s) : s,
          ),
        };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    [],
  );

  const store = useMemo<MockStore>(
    () => ({
      role: state.role,
      setRole: (role) => persist({ ...state, role }),
      students: state.students,
      mentors: state.mentors,
      currentStudentId: state.currentStudentId,
      setCurrentStudentId: (id) => persist({ ...state, currentStudentId: id }),
      currentMentorId: state.currentMentorId,
      setCurrentMentorId: (id) => persist({ ...state, currentMentorId: id }),
      startToday: (studentId, plannerPhotoUrl) =>
        updateStudent(studentId, (s) => ({
          ...s,
          today: {
            status: "started",
            plannerPhotoUrl,
            startedAt: new Date().toISOString(),
          },
        })),
      submitToday: (studentId, payload) =>
        updateStudent(studentId, (s) => ({
          ...s,
          today: {
            ...s.today,
            status: "submitted",
            studyPhotoUrl: payload.studyPhotoUrl,
            studyMinutes: payload.studyMinutes,
            studyContent: payload.studyContent,
            studentNote: payload.studentNote,
            submittedAt: new Date().toISOString(),
          },
        })),
      approveToday: (studentId, payload) =>
        updateStudent(studentId, (s) => ({
          ...s,
          stampCount:
            s.today.status === "approved" ? s.stampCount : s.stampCount + 1,
          today: {
            ...s.today,
            status: "approved",
            reviewedBy: payload.mentorId,
            reviewedAt: new Date().toISOString(),
            encouragementMessage: payload.message,
          },
        })),
      resetStudentToday: (studentId) =>
        updateStudent(studentId, (s) => ({
          ...s,
          today: { status: "none" },
        })),
      startNextRound: (studentId) =>
        updateStudent(studentId, (s) => ({
          ...s,
          round: (s.round ?? 1) + 1,
          stampCount: Math.max(0, s.stampCount - s.stampGoal),
        })),
      resetAll: () => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        setState({
          role: "student",
          currentStudentId: MOCK_STUDENTS[0].id,
          currentMentorId: MOCK_MENTORS[0].id,
          students: MOCK_STUDENTS,
          mentors: MOCK_MENTORS,
        });
      },
    }),
    [state, persist, updateStudent],
  );

  return (
    <MockStoreContext.Provider value={store}>
      {children}
    </MockStoreContext.Provider>
  );
}

export function useMockStore() {
  const ctx = useContext(MockStoreContext);
  if (!ctx) {
    throw new Error("useMockStore must be used within MockStoreProvider");
  }
  return ctx;
}
