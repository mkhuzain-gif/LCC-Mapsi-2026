// =============================================
// LCC MAPSI XXVII 2026 — TypeScript Database Types
// =============================================

export type UserRole = "admin" | "committee" | "participant";
export type Gender = "male" | "female";
export type ParticipantStatus = "registered" | "active" | "submitted" | "disqualified";
export type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";
export type SubmissionStatus = "not_started" | "in_progress" | "submitted" | "auto_submitted" | "disqualified";
export type QuestionSubject = "PAI" | "BTQ";
export type QuestionType = "multiple_choice" | "true_false";
export type Difficulty = "high" | "medium" | "low";
export type AnnouncementType = "info" | "warning" | "success" | "critical";
export type LogSeverity = "info" | "warning" | "critical";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Participant = {
  id: string;
  draw_number: string | null;
  access_code: string | null;
  full_name: string;
  gender: Gender;
  school_name: string;
  district: string;
  contingent: string | null;
  stage: string | null;
  status: ParticipantStatus;
  qr_code_data: string | null;
  notes: string | null;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ExamSession = {
  id: string;
  title: string;
  stage: string;
  token: string;
  token_active: boolean;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  status: SessionStatus;
  is_finalized: boolean;
  ranking_visible: boolean;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Question = {
  id: string;
  subject: QuestionSubject;
  question_type: QuestionType;
  difficulty: Difficulty;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
  explanation: string | null;
  image_url: string | null;
  session_id: string | null;
  order_number: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ExamSubmission = {
  id: string;
  participant_id: string;
  session_id: string;
  started_at: string | null;
  submitted_at: string | null;
  duration_seconds: number | null;
  pai_score: number;
  btq_score: number;
  total_score: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  percentage: number;
  rank: number | null;
  tie_break_rank: number | null;
  status: SubmissionStatus;
  is_finalized: boolean;
  suspicious_count: number;
  question_order: string[] | null;
  answer_order: Record<string, string[]> | null;
  created_at: string;
  updated_at: string;
};

export type ExamAnswer = {
  id: string;
  submission_id: string;
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean | null;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  participant_id: string | null;
  session_id: string | null;
  event_type: string;
  severity: LogSeverity;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  is_active: boolean;
  target_role: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// Joined types for UI
export type SubmissionWithParticipant = ExamSubmission & {
  participant: Participant;
};

export type RankingEntry = {
  rank: number;
  participant: Participant;
  submission: ExamSubmission;
  is_tie: boolean;
};

// =============================================
// Supabase Database Type
// =============================================
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      participants: {
        Row: Participant;
        Insert: Partial<Participant>;
        Update: Partial<Participant>;
        Relationships: [
          {
            foreignKeyName: "participants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      exam_sessions: {
        Row: ExamSession;
        Insert: Partial<ExamSession>;
        Update: Partial<ExamSession>;
        Relationships: [];
      };
      questions: {
        Row: Question;
        Insert: Partial<Question>;
        Update: Partial<Question>;
        Relationships: [
          {
            foreignKeyName: "questions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "exam_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      exam_submissions: {
        Row: ExamSubmission;
        Insert: Partial<ExamSubmission>;
        Update: Partial<ExamSubmission>;
        Relationships: [
          {
            foreignKeyName: "exam_submissions_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_submissions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "exam_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      exam_answers: {
        Row: ExamAnswer;
        Insert: Partial<ExamAnswer>;
        Update: Partial<ExamAnswer>;
        Relationships: [
          {
            foreignKeyName: "exam_answers_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "exam_submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          }
        ];
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Partial<ActivityLog>;
        Update: Partial<ActivityLog>;
        Relationships: [];
      };
      announcements: {
        Row: Announcement;
        Insert: Partial<Announcement>;
        Update: Partial<Announcement>;
        Relationships: [];
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
        Relationships: [];
      };
    };
    Functions: {
      calculate_submission_score: {
        Args: { p_submission_id: string };
        Returns: undefined;
      };
      recalculate_rankings: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
    };
  };
};
