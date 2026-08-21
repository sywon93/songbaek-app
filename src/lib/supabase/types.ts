// 이 파일은 supabase/migrations 의 스키마와 손으로 맞춰둔 최소 타입입니다.
// Supabase 프로젝트를 연결한 뒤에는 아래 명령으로 자동 생성 타입으로 교체하세요.
//   npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts

export type UserRole = "student" | "mentor" | "admin";
export type SubmissionStatus = "started" | "submitted" | "approved";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";
export type MentoringTimeSlot = "slot_1840" | "slot_1915" | "slot_1950" | "slot_2025";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          name: string;
          student_id_number: string | null;
          phone: string | null;
          avatar_url: string | null;
          stamp_count: number;
          stamp_goal: number;
          round: number;
          mentoring_day: Weekday | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          name: string;
          student_id_number?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          stamp_count?: number;
          stamp_goal?: number;
          round?: number;
          mentoring_day?: Weekday | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      mentor_student_links: {
        Row: {
          id: string;
          mentor_id: string;
          student_id: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mentor_id: string;
          student_id: string;
          created_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["mentor_student_links"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "mentor_student_links_mentor_id_fkey";
            columns: ["mentor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mentor_student_links_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      study_records: {
        Row: {
          id: string;
          student_id: string;
          record_date: string;
          status: SubmissionStatus;
          planner_photo_url: string;
          started_at: string;
          study_photo_url: string | null;
          study_minutes: number | null;
          study_content: string | null;
          student_note: string | null;
          submitted_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          encouragement_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          record_date?: string;
          status?: SubmissionStatus;
          planner_photo_url: string;
          started_at?: string;
          study_photo_url?: string | null;
          study_minutes?: number | null;
          study_content?: string | null;
          student_note?: string | null;
          submitted_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          encouragement_message?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["study_records"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "study_records_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mentoring_reservations: {
        Row: {
          id: string;
          student_id: string;
          session_date: string;
          time_slot: MentoringTimeSlot;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          session_date: string;
          time_slot: MentoringTimeSlot;
        };
        Update: Partial<
          Database["public"]["Tables"]["mentoring_reservations"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "mentoring_reservations_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notices: {
        Row: {
          id: string;
          title: string;
          content: string;
          is_pinned: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          is_pinned?: boolean;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notices"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "notices_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      start_next_round: {
        Args: { p_student: string };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      mentoring_slot_status: {
        Args: { p_date: string };
        Returns: {
          time_slot: MentoringTimeSlot;
          is_taken: boolean;
          is_mine: boolean;
          reservation_id: string | null;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      submission_status: SubmissionStatus;
      weekday: Weekday;
      mentoring_time_slot: MentoringTimeSlot;
    };
    CompositeTypes: Record<string, never>;
  };
}
