import { z } from "zod";

// =============================================
// Participant Validation Schema
// =============================================
export const participantSchema = z.object({
  draw_number: z.string().max(50).optional().nullable(),
  full_name: z.string().min(2, "Nama lengkap minimal 2 karakter").max(100),
  gender: z.enum(["male", "female"]),
  school_name: z.string().optional().default("-"),
  district: z.string().optional().default("-"),
  contingent: z.string().max(100).optional().nullable(),
  stage: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type ParticipantFormValues = z.infer<typeof participantSchema>;

// =============================================
// Question Validation Schema
// =============================================
export const questionSchema = z.object({
  subject: z.enum(["PAI", "BTQ"]),
  question_type: z.enum(["multiple_choice", "true_false"]),
  difficulty: z.enum(["high", "medium", "low"]),
  question_text: z.string().min(5, "Teks soal minimal 5 karakter"),
  option_a: z.string().optional().nullable(),
  option_b: z.string().optional().nullable(),
  option_c: z.string().optional().nullable(),
  option_d: z.string().optional().nullable(),
  correct_answer: z.string().min(1, "Pilih jawaban yang benar"),
  explanation: z.string().optional().nullable(),
  session_id: z.string().optional().nullable(),
});

export type QuestionFormValues = z.infer<typeof questionSchema>;

// =============================================
// Exam Session Validation Schema
// =============================================
export const examSessionSchema = z.object({
  title: z.string().min(3, "Judul sesi minimal 3 karakter").max(150),
  stage: z.string().min(1, "Pilih tahap ujian"),
  token: z
    .string()
    .min(4, "Token minimal 4 karakter")
    .max(20)
    .toUpperCase(),
  duration_minutes: z
    .number()
    .min(10, "Durasi minimal 10 menit")
    .max(180, "Durasi maksimal 180 menit"),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  ranking_visible: z.boolean().default(false),
});

export type ExamSessionFormValues = z.infer<typeof examSessionSchema>;
