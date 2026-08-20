"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCountdownTimer } from "@/lib/hooks/useCountdownTimer";
import { useAntiCheat } from "@/lib/hooks/useAntiCheat";
import { useAutosave } from "@/lib/hooks/useAutosave";
import { useToast } from "@/components/shared/ToastProvider";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Question, ExamSubmission } from "@/lib/types/database";
import {
  Clock, ChevronLeft, ChevronRight, Send,
  Maximize2, Flag, CheckCircle, LayoutGrid,
  X, Check, AlertCircle, Sparkles,
} from "lucide-react";

interface ExamInterfaceProps {
  questions: Question[];
  submission: ExamSubmission;
  participantName: string;
  drawNumber: string;
  durationMinutes: number;
  sessionId: string;
  existingAnswers: Map<string, string | null>;
}

function shuffleArray<T>(arr: T[], seed?: string): T[] {
  const a = [...arr];
  // Seeded shuffle using draw number as seed for consistent shuffling per participant
  let seed_n = seed ? seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) : Date.now();
  for (let i = a.length - 1; i > 0; i--) {
    seed_n = (seed_n * 1103515245 + 12345) & 0x7fffffff;
    const j = seed_n % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function ExamInterface({
  questions,
  submission,
  participantName,
  drawNumber,
  durationMinutes,
  sessionId,
  existingAnswers,
}: ExamInterfaceProps) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  // Randomize question order (seeded by draw number for consistency)
  const orderedQuestions = useMemo(
    () => shuffleArray(questions, drawNumber),
    [questions, drawNumber]
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string | null>>(new Map(existingAnswers));
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showNavModal, setShowNavModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(
    submission.status === "submitted" || submission.status === "auto_submitted"
  );
  const [violationWarning, setViolationWarning] = useState<string | null>(null);

  const { saveAnswer, saveAllImmediately, status: saveStatus } = useAutosave({
    submissionId: submission.id,
  });

  // Calculate time elapsed since exam started
  const startedAt = submission.started_at ? new Date(submission.started_at) : new Date();
  const elapsedSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  const remainingSeconds = Math.max(0, durationMinutes * 60 - elapsedSeconds);

  const { display, isWarning, isCritical, percentLeft } = useCountdownTimer({
    durationSeconds: remainingSeconds,
    onExpire: useCallback(async () => {
      if (!hasSubmitted) {
        toast.warning("Waktu habis!", "Jawaban Anda otomatis dikumpulkan");
        await handleAutoSubmit();
      }
    }, [hasSubmitted]),
    onWarning: useCallback((secs: number) => {
      if (secs === 600) toast.warning("⏰ 10 menit lagi", "Segera selesaikan jawaban Anda");
      if (secs === 300) toast.warning("⚠️ 5 menit lagi", "Pastikan semua soal telah dijawab");
      if (secs === 60) toast.error("🚨 1 menit lagi!", "Segera kumpulkan jawaban!");
    }, [toast]),
  });

  const { enterFullscreen, logEvent } = useAntiCheat({
    participantId: submission.participant_id,
    sessionId,
    submissionId: submission.id,
    enabled: !hasSubmitted,
    onSuspiciousActivity: (event) => {
      setViolationWarning(
        event.type === "tab_switch" ? "⚠️ Anda keluar dari halaman ujian! Aktivitas ini dicatat." :
        event.type === "fullscreen_exit" ? "⚠️ Mode layar penuh dinonaktifkan! Harap aktifkan kembali." :
        event.type === "focus_lost" ? "⚠️ Fokus berpindah dari jendela ujian." :
        "⚠️ Aktivitas mencurigakan terdeteksi."
      );
      setTimeout(() => setViolationWarning(null), 5000);
    },
  });

  // Enter fullscreen on mount
  useEffect(() => {
    if (!hasSubmitted) {
      enterFullscreen();
    }
  }, []);

  const currentQuestion = orderedQuestions[currentIdx];
  const answeredCount = Array.from(answers.values()).filter((v) => v !== null && v !== undefined).length;
  const unansweredCount = orderedQuestions.length - answeredCount;
  const isLastQuestion = currentIdx === orderedQuestions.length - 1;

  const handleAnswer = (questionId: string, answer: string) => {
    if (hasSubmitted) return;
    const newAnswers = new Map(answers);
    const current = newAnswers.get(questionId);
    if (current === answer) {
      newAnswers.set(questionId, null); // Toggle off
    } else {
      newAnswers.set(questionId, answer);
    }
    setAnswers(newAnswers);
    saveAnswer(questionId, newAnswers.get(questionId) ?? null);
  };

  const handleAutoSubmit = async () => {
    if (hasSubmitted) return;
    setIsSubmitting(true);
    try {
      await saveAllImmediately(answers);
      await finalizeSubmission("auto_submitted");
    } catch {
      toast.error("Gagal auto-submit", "Hubungi panitia segera");
    }
    setIsSubmitting(false);
  };

  const handleManualSubmit = async () => {
    setShowSubmitConfirm(false);
    setIsSubmitting(true);
    try {
      await saveAllImmediately(answers);
      await finalizeSubmission("submitted");
    } catch {
      toast.error("Gagal mengumpulkan jawaban", "Coba lagi atau hubungi panitia");
    }
    setIsSubmitting(false);
  };

  const finalizeSubmission = async (status: "submitted" | "auto_submitted") => {
    const now = new Date();
    const submittedAt = now.toISOString();
    const durationSecs = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    // Check all answers against questions
    let paiCorrect = 0;
    let btqCorrect = 0;
    let correctTotal = 0;
    let wrong = 0;
    let unanswered = 0;

    for (const q of orderedQuestions) {
      const answer = answers.get(q.id) ?? null;
      if (answer === null) {
        unanswered++;
      } else if (answer === q.correct_answer) {
        correctTotal++;
        if (q.subject === "PAI") paiCorrect++;
        else btqCorrect++;
      } else {
        wrong++;
      }
    }

    const total = paiCorrect + btqCorrect;
    const percentage = orderedQuestions.length > 0 ? Math.round((correctTotal / orderedQuestions.length) * 10000) / 100 : 0;

    // Update submission
    const { error } = await supabase.from("exam_submissions").update({
      status,
      submitted_at: submittedAt,
      duration_seconds: durationSecs,
      pai_score: paiCorrect,
      btq_score: btqCorrect,
      total_score: total,
      correct_count: correctTotal,
      wrong_count: wrong,
      unanswered_count: unanswered,
      percentage,
      updated_at: submittedAt,
    }).eq("id", submission.id);

    if (error) throw error;

    // Log submission event
    await logEvent("exam_submit", {
      status,
      total_score: total,
      duration_seconds: durationSecs,
    });

    setHasSubmitted(true);
    toast.success("Jawaban dikumpulkan!", `Skor Anda: ${total} / ${orderedQuestions.length}`);

    // Redirect to result after 2s
    setTimeout(() => router.push("/exam/result"), 2000);
  };

  // Render question options
  const renderOptions = () => {
    if (!currentQuestion) return null;
    const q = currentQuestion;
    const selectedAnswer = answers.get(q.id) ?? null;

    if (q.question_type === "true_false") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", width: "100%" }}>
          {[
            { value: "True", label: "Benar" },
            { value: "False", label: "Salah" },
          ].map((opt) => {
            const isSelected = selectedAnswer === opt.value;
            return (
              <div
                key={opt.value}
                className={`clay-option ${isSelected ? "selected" : ""}`}
                onClick={() => handleAnswer(q.id, opt.value)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "16px",
                  border: `2px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                  background: isSelected
                    ? "linear-gradient(135deg, var(--color-primary-lighter), #ede9fe)"
                    : "var(--color-surface)",
                  boxShadow: isSelected ? "var(--clay-shadow-sm)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: `2.5px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                    background: isSelected ? "var(--color-primary)" : "white",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    transition: "all 0.2s",
                  }}
                >
                  {isSelected && <Check size={18} strokeWidth={3} />}
                </div>
                <span style={{ fontWeight: 700, fontSize: "1.05rem", color: isSelected ? "var(--color-primary-dark)" : "var(--color-text)" }}>
                  {opt.value === "True" ? "✅  Benar" : "❌  Salah"}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    // Multiple Choice
    const opts = [
      { key: "A", value: q.option_a },
      { key: "B", value: q.option_b },
      { key: "C", value: q.option_c },
      { key: "D", value: q.option_d },
    ].filter((o) => o.value);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", width: "100%" }}>
        {opts.map((opt) => {
          const isSelected = selectedAnswer === opt.key;
          return (
            <div
              key={opt.key}
              className={`clay-option ${isSelected ? "selected" : ""}`}
              onClick={() => handleAnswer(q.id, opt.key)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleAnswer(q.id, opt.key)}
              id={`option-${opt.key}`}
              style={{
                padding: "0.95rem 1.15rem",
                borderRadius: "16px",
                border: `2px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                background: isSelected
                  ? "linear-gradient(135deg, #ede9fe, #ddd6fe)"
                  : "var(--color-surface)",
                boxShadow: isSelected ? "var(--clay-shadow-sm)" : "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                minHeight: "54px",
                boxSizing: "border-box",
              }}
            >
              {/* Option Letter Badge */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "12px",
                  background: isSelected
                    ? "linear-gradient(135deg, var(--color-primary-light), var(--color-primary))"
                    : "var(--color-surface-2)",
                  color: isSelected ? "white" : "var(--color-primary)",
                  border: `1.5px solid ${isSelected ? "transparent" : "var(--color-primary-lighter)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 900,
                  fontSize: "1rem",
                  flexShrink: 0,
                  boxShadow: isSelected ? "0 4px 12px rgba(109,40,217,0.3)" : "var(--clay-shadow-sm)",
                  transition: "all 0.2s",
                }}
              >
                {opt.key}
              </div>

              {/* Option Text */}
              <span
                style={{
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: "1rem",
                  lineHeight: 1.55,
                  color: isSelected ? "var(--color-primary-dark)" : "var(--color-text)",
                  flex: 1,
                  wordBreak: "break-word",
                }}
              >
                {opt.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (hasSubmitted && !isSubmitting) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem" }}>
        <div className="clay-card" style={{ padding: "3rem", textAlign: "center", maxWidth: 480 }}>
          <CheckCircle size={64} color="var(--color-success)" style={{ margin: "0 auto 1rem", display: "block" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Jawaban Berhasil Dikumpulkan!
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
            Terima kasih {participantName}. Memuat halaman hasil...
          </p>
          <div className="clay-spinner" style={{ margin: "1.5rem auto 0", width: 32, height: 32, borderWidth: 3 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="exam-fullscreen">
      {/* Violation warning banner */}
      {violationWarning && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
          background: "var(--color-danger)",
          color: "white",
          padding: "0.75rem 1.5rem",
          textAlign: "center",
          fontWeight: 800,
          fontSize: "0.9rem",
          animation: "slideDown 0.3s ease",
          boxShadow: "0 4px 16px rgba(220, 38, 38, 0.4)",
        }}>
          {violationWarning}
        </div>
      )}

      {/* ============================================================ */}
      {/* TOP HEADER */}
      {/* ============================================================ */}
      <header
        className="exam-header"
        style={{
          borderBottom: `3px solid ${isCritical ? "var(--color-danger)" : isWarning ? "var(--color-warning)" : "var(--color-primary-lighter)"}`,
        }}
      >
        {/* Left: Participant Name & Draw Number */}
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "0.95rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "var(--color-text)",
            }}
          >
            {participantName}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
            No. Undian: <strong style={{ color: "var(--color-primary)" }}>{drawNumber}</strong>
          </div>
        </div>

        {/* Center: Timer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.4rem 0.85rem",
            borderRadius: "12px",
            background: isCritical ? "var(--color-danger-lighter)" : isWarning ? "var(--color-warning-lighter)" : "var(--color-success-lighter)",
            boxShadow: "var(--clay-shadow-sm)",
            flexShrink: 0,
          }}
        >
          <Clock size={16} color={isCritical ? "var(--color-danger)" : isWarning ? "var(--color-warning)" : "var(--color-success)"} />
          <span
            className={`clay-timer ${isCritical ? "clay-timer-critical" : isWarning ? "clay-timer-warning" : "clay-timer-normal"}`}
            style={{ fontSize: "1.25rem", lineHeight: 1 }}
          >
            {display}
          </span>
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
          {/* Autosave badge (desktop) */}
          <div
            className={`clay-autosave hide-mobile ${
              saveStatus === "saving" ? "clay-autosave-saving" : "clay-autosave-saved"
            }`}
            style={{ display: saveStatus !== "idle" ? "flex" : "none", padding: "0.25rem 0.65rem", fontSize: "0.72rem" }}
          >
            {saveStatus === "saving" ? "💾 Menyimpan..." : "✓ Tersimpan"}
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            className="clay-btn clay-btn-ghost clay-btn-sm"
            onClick={enterFullscreen}
            title="Layar Penuh"
            style={{ padding: "0.4rem 0.6rem" }}
          >
            <Maximize2 size={15} />
          </button>

          {/* Kumpulkan Button */}
          <button
            type="button"
            className="clay-btn clay-btn-primary clay-btn-sm"
            onClick={() => setShowSubmitConfirm(true)}
            disabled={isSubmitting}
            id="exam-top-submit-btn"
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem" }}
          >
            <Send size={14} /> Kumpulkan
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* EXAM BODY */}
      {/* ============================================================ */}
      <div className="exam-body">
        {/* Question Column (FULL WIDTH on Mobile) */}
        <main className="exam-question-column">
          {/* Meta Info: Subject, Difficulty, & Question Counter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span
                className={`clay-badge ${currentQuestion?.subject === "PAI" ? "clay-badge-info" : "clay-badge-secondary"}`}
                style={{ fontSize: "0.8rem", padding: "0.25rem 0.75rem" }}
              >
                {currentQuestion?.subject || "PAI"}
              </span>
              <span
                className={`clay-badge ${
                  currentQuestion?.difficulty === "high" ? "clay-badge-danger" :
                  currentQuestion?.difficulty === "medium" ? "clay-badge-warning" :
                  "clay-badge-success"
                }`}
                style={{ fontSize: "0.8rem", padding: "0.25rem 0.75rem" }}
              >
                {currentQuestion?.difficulty === "high" ? "HOTS" : currentQuestion?.difficulty === "medium" ? "Sedang" : "Mudah"}
              </span>
            </div>

            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-primary)" }}>
              Soal {currentIdx + 1} <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>/ {orderedQuestions.length}</span>
            </div>
          </div>

          {/* Question Card (Large, High Contrast, Very Legible) */}
          <div
            className="clay-card"
            style={{
              padding: "1.5rem 1.5rem",
              marginBottom: "1.25rem",
              userSelect: "none",
              background: "white",
              border: "2px solid rgba(255,255,255,0.9)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "1.125rem",
                lineHeight: 1.75,
                color: "var(--color-text)",
                wordBreak: "break-word",
              }}
            >
              <span style={{ color: "var(--color-primary)", fontWeight: 900, marginRight: "0.35rem" }}>
                {currentIdx + 1}.
              </span>
              {currentQuestion?.question_text}
            </div>

            {/* Optional Image */}
            {currentQuestion?.image_url && (
              <div style={{ marginTop: "1rem", borderRadius: "14px", overflow: "hidden", border: "1.5px solid var(--color-border)" }}>
                <img
                  src={currentQuestion.image_url}
                  alt={`Soal ${currentIdx + 1}`}
                  style={{ width: "100%", maxHeight: 320, objectFit: "contain", background: "#f8f5ff" }}
                />
              </div>
            )}
          </div>

          {/* Options */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Pilih Jawaban:
            </div>
            {renderOptions()}
          </div>
        </main>

        {/* Desktop Question Navigator Sidebar (>= 1024px) */}
        <aside className="exam-sidebar-column">
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--color-primary-dark)", marginBottom: "0.75rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Navigator Soal ({orderedQuestions.length})
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.85rem", fontSize: "0.75rem", fontWeight: 600 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--color-text-muted)" }}>
              <div style={{ width: 12, height: 12, borderRadius: "4px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }} />
              Belum ({unansweredCount})
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--color-success)" }}>
              <div style={{ width: 12, height: 12, borderRadius: "4px", background: "var(--color-success)" }} />
              Dijawab ({answeredCount})
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            {orderedQuestions.map((q, idx) => {
              const isAnswered = !!(answers.get(q.id));
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  type="button"
                  className={`clay-q-nav-btn ${isCurrent ? "current" : isAnswered ? "answered" : "unanswered"}`}
                  onClick={() => setCurrentIdx(idx)}
                  id={`nav-q-${idx + 1}`}
                  title={`Soal ${idx + 1} — ${isAnswered ? "Dijawab" : "Belum dijawab"}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* ============================================================ */}
      {/* STICKY BOTTOM ACTION BAR (EXTRA COMFORTABLE ON MOBILE) */}
      {/* ============================================================ */}
      <footer className="exam-bottom-bar">
        {/* Tombol Sebelumnya */}
        <button
          type="button"
          className="clay-btn clay-btn-ghost"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          id="exam-prev-btn"
          style={{
            flex: "1 1 0",
            maxWidth: 160,
            padding: "0.75rem 1rem",
            fontSize: "0.92rem",
            minHeight: "46px",
          }}
        >
          <ChevronLeft size={18} /> Sebelumnya
        </button>

        {/* Tombol Daftar Soal Modal (Tengah) */}
        <button
          type="button"
          className="clay-btn clay-btn-ghost"
          onClick={() => setShowNavModal(true)}
          style={{
            padding: "0.75rem 0.85rem",
            fontSize: "0.85rem",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            minHeight: "46px",
            background: "var(--color-surface)",
          }}
          id="open-nav-modal-btn"
        >
          <LayoutGrid size={16} color="var(--color-primary)" />
          <span>Soal {currentIdx + 1}/{orderedQuestions.length}</span>
        </button>

        {/* Tombol Selanjutnya / Selesai */}
        {isLastQuestion ? (
          <button
            type="button"
            className="clay-btn clay-btn-success"
            onClick={() => setShowSubmitConfirm(true)}
            id="exam-finish-btn"
            style={{
              flex: "1 1 0",
              maxWidth: 180,
              padding: "0.75rem 1rem",
              fontSize: "0.92rem",
              fontWeight: 800,
              minHeight: "46px",
            }}
          >
            <Send size={16} /> Kumpulkan
          </button>
        ) : (
          <button
            type="button"
            className="clay-btn clay-btn-primary"
            onClick={() => setCurrentIdx((i) => Math.min(orderedQuestions.length - 1, i + 1))}
            id="exam-next-btn"
            style={{
              flex: "1 1 0",
              maxWidth: 160,
              padding: "0.75rem 1rem",
              fontSize: "0.92rem",
              fontWeight: 800,
              minHeight: "46px",
            }}
          >
            Berikutnya <ChevronRight size={18} />
          </button>
        )}
      </footer>

      {/* ============================================================ */}
      {/* MODAL / BOTTOM SHEET: DAFTAR SEMUA SOAL */}
      {/* ============================================================ */}
      {showNavModal && (
        <div className="clay-modal-overlay" onClick={() => setShowNavModal(false)}>
          <div
            className="clay-modal"
            style={{
              maxWidth: 480,
              padding: "1.5rem",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <LayoutGrid size={20} color="var(--color-primary)" />
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>
                  Daftar Nomor Soal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNavModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                  padding: "4px",
                  display: "flex",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Summary Counters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.6rem",
                marginBottom: "1.25rem",
                padding: "0.75rem",
                borderRadius: "14px",
                background: "var(--color-surface-2)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--color-success)" }}>
                  {answeredCount}
                </div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)" }}>
                  Sudah Dijawab
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--color-warning)" }}>
                  {unansweredCount}
                </div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)" }}>
                  Belum Dijawab
                </div>
              </div>
            </div>

            {/* Grid Numbers (6 Columns on mobile) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "8px",
                marginBottom: "1.25rem",
              }}
            >
              {orderedQuestions.map((q, idx) => {
                const isAnswered = !!(answers.get(q.id));
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={q.id}
                    type="button"
                    className={`clay-q-nav-btn ${isCurrent ? "current" : isAnswered ? "answered" : "unanswered"}`}
                    onClick={() => {
                      setCurrentIdx(idx);
                      setShowNavModal(false);
                    }}
                    style={{
                      width: "100%",
                      height: 44,
                      fontSize: "0.9rem",
                      fontWeight: 800,
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="clay-btn clay-btn-ghost"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setShowNavModal(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBMIT CONFIRMATION DIALOG */}
      {/* ============================================================ */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        title="Kumpulkan Jawaban?"
        message={
          unansweredCount > 0
            ? `Masih ada ${unansweredCount} soal yang belum dijawab (${answeredCount}/${orderedQuestions.length} selesai). Setelah dikumpulkan, jawaban tidak dapat diubah kembali.`
            : `Semua ${orderedQuestions.length} soal telah dijawab. Apakah Anda yakin ingin mengumpulkan jawaban sekarang?`
        }
        confirmLabel="Ya, Kumpulkan Jawaban"
        cancelLabel="Kembali ke Soal"
        variant={unansweredCount > 0 ? "warning" : "primary"}
        isLoading={isSubmitting}
        onConfirm={handleManualSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
      />
    </div>
  );
}
