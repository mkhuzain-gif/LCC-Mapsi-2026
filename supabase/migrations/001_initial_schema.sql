-- =============================================
-- LCC MAPSI XXVII 2026 — Database Schema & RLS
-- Run in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: profiles
-- Extends Supabase auth.users with role/metadata
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'committee', 'participant')) DEFAULT 'participant',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security Definer helper functions to prevent RLS infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_committee()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'committee')
  );
$$;

-- Profiles: user can read own, admin reads all
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "profiles_committee_select" ON public.profiles;
CREATE POLICY "profiles_committee_select" ON public.profiles FOR SELECT
  TO authenticated USING (public.is_admin_or_committee());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'participant')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-confirm email for new users created
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_user();


-- =============================================
-- TABLE: participants
-- Competition participants (students)
-- =============================================
CREATE TABLE IF NOT EXISTS public.participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_number TEXT UNIQUE,       -- Nomor Undian (e.g. "A-01")
  access_code TEXT UNIQUE,       -- Unique login code for participant
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  school_name TEXT NOT NULL,
  district TEXT NOT NULL,        -- Kabupaten/Kota
  contingent TEXT,               -- Kontingen name
  stage TEXT,                    -- Stage/Round: 'stage_1' ... 'stage_6'
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'submitted', 'disqualified')),
  qr_code_data TEXT,             -- QR code payload
  notes TEXT,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_participants_draw_number ON public.participants(draw_number);
CREATE INDEX IF NOT EXISTS idx_participants_stage ON public.participants(stage);
CREATE INDEX IF NOT EXISTS idx_participants_status ON public.participants(status);

-- Admin/User: full access to manage participants
DROP POLICY IF EXISTS "participants_admin_all" ON public.participants;
CREATE POLICY "participants_admin_all" ON public.participants FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Allow anon/authenticated SELECT for participant verification during login
DROP POLICY IF EXISTS "participants_anon_select" ON public.participants;
CREATE POLICY "participants_anon_select" ON public.participants FOR SELECT
  TO anon, authenticated USING (true);

-- =============================================
-- TABLE: exam_sessions
-- Competition exam sessions/stages
-- =============================================
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  stage TEXT NOT NULL,           -- 'stage_1' ... 'stage_6'
  token TEXT UNIQUE NOT NULL,    -- Access token for exam entry
  token_active BOOLEAN NOT NULL DEFAULT FALSE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
  ranking_visible BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON public.exam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_stage ON public.exam_sessions(stage);

-- Admin: full
DROP POLICY IF EXISTS "sessions_admin_all" ON public.exam_sessions;
CREATE POLICY "sessions_admin_all" ON public.exam_sessions FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Committee: read
DROP POLICY IF EXISTS "sessions_committee_select" ON public.exam_sessions;
CREATE POLICY "sessions_committee_select" ON public.exam_sessions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','committee'))
  );

-- Participant: read active sessions
DROP POLICY IF EXISTS "sessions_participant_select" ON public.exam_sessions;
CREATE POLICY "sessions_participant_select" ON public.exam_sessions FOR SELECT
  TO anon, authenticated USING (status = 'active');

-- =============================================
-- TABLE: questions
-- Question bank (PAI + BTQ)
-- =============================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL CHECK (subject IN ('PAI', 'BTQ')),
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('high', 'medium', 'low')),
  question_text TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT NOT NULL,  -- 'A', 'B', 'C', 'D' or 'True', 'False'
  explanation TEXT,
  image_url TEXT,
  session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  order_number INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_session ON public.questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_active ON public.questions(is_active);

-- Admin: full
DROP POLICY IF EXISTS "questions_admin_all" ON public.questions;
CREATE POLICY "questions_admin_all" ON public.questions FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Committee: read
DROP POLICY IF EXISTS "questions_committee_select" ON public.questions;
CREATE POLICY "questions_committee_select" ON public.questions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','committee'))
  );

-- Participant: read questions
DROP POLICY IF EXISTS "questions_participant_select" ON public.questions;
CREATE POLICY "questions_participant_select" ON public.questions FOR SELECT
  TO anon, authenticated USING (is_active = TRUE);

-- =============================================
-- TABLE: exam_submissions
-- One record per participant per session
-- =============================================
CREATE TABLE IF NOT EXISTS public.exam_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  pai_score INTEGER DEFAULT 0,
  btq_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  unanswered_count INTEGER DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  rank INTEGER,
  tie_break_rank INTEGER,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'submitted', 'auto_submitted', 'disqualified')),
  is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
  suspicious_count INTEGER DEFAULT 0,
  question_order JSONB,
  answer_order JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, session_id)
);

ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_submissions_participant ON public.exam_submissions(participant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_session ON public.exam_submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.exam_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_rank ON public.exam_submissions(rank);

-- Admin: full
DROP POLICY IF EXISTS "submissions_admin_all" ON public.exam_submissions;
CREATE POLICY "submissions_admin_all" ON public.exam_submissions FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Committee: read all submissions
DROP POLICY IF EXISTS "submissions_committee_select" ON public.exam_submissions;
CREATE POLICY "submissions_committee_select" ON public.exam_submissions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','committee'))
  );

-- Participant: read own, insert own, update own
DROP POLICY IF EXISTS "submissions_participant_select" ON public.exam_submissions;
CREATE POLICY "submissions_participant_select" ON public.exam_submissions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "submissions_participant_insert" ON public.exam_submissions;
CREATE POLICY "submissions_participant_insert" ON public.exam_submissions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "submissions_participant_update" ON public.exam_submissions;
CREATE POLICY "submissions_participant_update" ON public.exam_submissions FOR UPDATE
  TO anon, authenticated USING (is_finalized = FALSE);

-- =============================================
-- TABLE: exam_answers
-- Per-question answers from each participant
-- =============================================
CREATE TABLE IF NOT EXISTS public.exam_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES public.exam_submissions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, question_id)
);

ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_answers_submission ON public.exam_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON public.exam_answers(question_id);

-- Admin: full
DROP POLICY IF EXISTS "answers_admin_all" ON public.exam_answers;
CREATE POLICY "answers_admin_all" ON public.exam_answers FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Committee: read
DROP POLICY IF EXISTS "answers_committee_select" ON public.exam_answers;
CREATE POLICY "answers_committee_select" ON public.exam_answers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','committee'))
  );

-- Participant: manage own answers
DROP POLICY IF EXISTS "answers_participant_manage" ON public.exam_answers;
CREATE POLICY "answers_participant_manage" ON public.exam_answers FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);


-- =============================================
-- TABLE: activity_logs
-- Audit trail for anti-cheat & system events
-- =============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_activity_participant ON public.activity_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_activity_session ON public.activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_event ON public.activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_severity ON public.activity_logs(severity);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_logs(created_at);

-- Admin & committee: read all
DROP POLICY IF EXISTS "logs_admin_committee_select" ON public.activity_logs;
CREATE POLICY "logs_admin_committee_select" ON public.activity_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','committee'))
  );

-- Admin: full
DROP POLICY IF EXISTS "logs_admin_all" ON public.activity_logs;
CREATE POLICY "logs_admin_all" ON public.activity_logs FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Participant: insert activity logs
DROP POLICY IF EXISTS "logs_participant_insert" ON public.activity_logs;
CREATE POLICY "logs_participant_insert" ON public.activity_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- =============================================
-- TABLE: announcements
-- Committee announcements shown on dashboard
-- =============================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'critical')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  target_role TEXT DEFAULT 'all' CHECK (target_role IN ('all', 'admin', 'committee', 'participant')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admin: full
DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;
CREATE POLICY "announcements_admin_all" ON public.announcements FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- All authenticated: read active ones
DROP POLICY IF EXISTS "announcements_select_active" ON public.announcements;
CREATE POLICY "announcements_select_active" ON public.announcements FOR SELECT
  TO authenticated USING (is_active = TRUE);

-- =============================================
-- FUNCTION: calculate_submission_score
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_submission_score(p_submission_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pai_score INTEGER := 0;
  v_btq_score INTEGER := 0;
  v_correct INTEGER := 0;
  v_wrong INTEGER := 0;
  v_unanswered INTEGER := 0;
  v_total INTEGER := 0;
  v_percentage NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_pai_score
  FROM public.exam_answers ea
  JOIN public.questions q ON q.id = ea.question_id
  WHERE ea.submission_id = p_submission_id AND q.subject = 'PAI' AND ea.is_correct = TRUE;

  SELECT COUNT(*) INTO v_btq_score
  FROM public.exam_answers ea
  JOIN public.questions q ON q.id = ea.question_id
  WHERE ea.submission_id = p_submission_id AND q.subject = 'BTQ' AND ea.is_correct = TRUE;

  SELECT COUNT(*) INTO v_correct
  FROM public.exam_answers WHERE submission_id = p_submission_id AND is_correct = TRUE;

  SELECT COUNT(*) INTO v_wrong
  FROM public.exam_answers WHERE submission_id = p_submission_id AND is_correct = FALSE;

  SELECT COUNT(*) INTO v_unanswered
  FROM public.exam_answers WHERE submission_id = p_submission_id AND selected_answer IS NULL;

  v_total := v_correct + v_wrong + v_unanswered;
  IF v_total > 0 THEN
    v_percentage := (v_correct::NUMERIC / v_total) * 100;
  END IF;

  UPDATE public.exam_submissions SET
    pai_score = v_pai_score,
    btq_score = v_btq_score,
    total_score = v_pai_score + v_btq_score,
    correct_count = v_correct,
    wrong_count = v_wrong,
    unanswered_count = v_unanswered,
    percentage = v_percentage,
    updated_at = NOW()
  WHERE id = p_submission_id;
END;
$$;

-- =============================================
-- FUNCTION: recalculate_rankings
-- =============================================
CREATE OR REPLACE FUNCTION public.recalculate_rankings(p_session_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD;
  v_rank INTEGER := 1;
BEGIN
  FOR r IN
    SELECT id FROM public.exam_submissions
    WHERE session_id = p_session_id
      AND status IN ('submitted', 'auto_submitted')
    ORDER BY total_score DESC, submitted_at ASC NULLS LAST
  LOOP
    UPDATE public.exam_submissions SET rank = v_rank WHERE id = r.id;
    v_rank := v_rank + 1;
  END LOOP;
END;
$$;
