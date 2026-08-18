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
  Maximize2, AlertTriangle, Save, Flag, CheckCircle,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(submission.status === "submitted" || submission.status === "auto_submitted");
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

  // =============================================
  // Render options for current question
  // =============================================
  const renderOptions = () => {
    if (!currentQuestion) return null;
    const q = currentQuestion;
    const selectedAnswer = answers.get(q.id) ?? null;

    if (q.question_type === "true_false") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[
            { value: "True", label: "✅  Benar" },
            { value: "False", label: "❌  Salah" },
          ].map((opt) => (
            <div
              key={opt.value}
              className={`clay-option ${selectedAnswer === opt.value ? "selected" : ""}`}
              onClick={() => handleAnswer(q.id, opt.value)}
              role="radio"
              aria-checked={selectedAnswer === opt.value}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleAnswer(q.id, opt.value)}
              id={`option-${opt.value}`}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: `3px solid ${selectedAnswer === opt.value ? "var(--color-primary)" : "var(--color-border)"}`,
                background: selectedAnswer === opt.value ? "var(--color-primary)" : "white",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {selectedAnswer === opt.value && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
              </div>
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>{opt.label}</span>
            </div>
          ))}
        </div>
      );
    }

    // Multiple choice
    const opts = [
      { key: "A", value: q.option_a },
      { key: "B", value: q.option_b },
      { key: "C", value: q.option_c },
      { key: "D", value: q.option_d },
    ].filter((o) => o.value);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {opts.map((opt) => (
          <div
            key={opt.key}
            className={`clay-option ${selectedAnswer === opt.key ? "selected" : ""}`}
            onClick={() => handleAnswer(q.id, opt.key)}
            role="radio"
            aria-checked={selectedAnswer === opt.key}
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleAnswer(q.id, opt.key)}
            id={`option-${opt.key}`}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "10px",
              background: selectedAnswer === opt.key
                ? "var(--color-primary)"
                : "var(--color-surface-2)",
              color: selectedAnswer === opt.key ? "white" : "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "0.9rem",
              flexShrink: 0,
              boxShadow: "var(--clay-shadow-sm)",
              transition: "var(--transition-spring)",
            }}>
              {opt.key}
            </div>
            <span style={{ fontWeight: 600, lineHeight: 1.5 }}>{opt.value}</span>
          </div>
        ))}
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
        }}>
          {violationWarning}
        </div>
      )}

      {/* Top Bar */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        borderBottom: `3px solid ${isCritical ? "var(--color-danger)" : isWarning ? "var(--color-warning)" : "var(--color-primary-lighter)"}`,
        padding: "0.75rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        boxShadow: "0 2px 16px rgba(109,40,217,0.1)",
        flexWrap: "wrap",
      }}>
        {/* Participant info */}
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.9rem" }}>{participantName}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
            No. Undian: <strong>{drawNumber}</strong>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
            {answeredCount}/{orderedQuestions.length} dijawab
          </span>
          <div className="clay-progress" style={{ width: 100, height: 8 }}>
            <div
              className="clay-progress-bar"
              style={{
                width: `${(answeredCount / orderedQuestions.length) * 100}%`,
                background: "linear-gradient(90deg, var(--color-success-light), var(--color-success))",
              }}
            />
          </div>
        </div>

        {/* Timer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "12px",
            background: isCritical ? "var(--color-danger-lighter)" : isWarning ? "var(--color-warning-lighter)" : "var(--color-success-lighter)",
            boxShadow: "var(--clay-shadow-sm)",
          }}
        >
          <Clock size={18} color={isCritical ? "var(--color-danger)" : isWarning ? "var(--color-warning)" : "var(--color-success)"} />
          <span
            className={`clay-timer ${isCritical ? "clay-timer-critical" : isWarning ? "clay-timer-warning" : "clay-timer-normal"}`}
            style={{ fontSize: "1.4rem" }}
          >
            {display}
          </span>
        </div>

        {/* Autosave status */}
        <div className={`clay-autosave ${
          saveStatus === "saving" ? "clay-autosave-saving" :
          saveStatus === "saved" ? "clay-autosave-saved" :
          saveStatus === "error" ? "clay-autosave-error" :
          "clay-autosave-saved"
        }`} style={{ display: saveStatus !== "idle" ? "flex" : "none" }}>
          {saveStatus === "saving" ? "💾 Menyimpan..." : saveStatus === "saved" ? "✓ Tersimpan" : "⚠️ Gagal simpan"}
        </div>

        {/* Fullscreen & Submit */}
        <button className="clay-btn clay-btn-ghost clay-btn-sm" onClick={enterFullscreen} title="Layar Penuh">
          <Maximize2 size={15} />
        </button>

        <button
          className="clay-btn clay-btn-primary"
          onClick={() => setShowSubmitConfirm(true)}
          disabled={isSubmitting}
          id="exam-submit-btn"
        >
          <Send size={15} /> Kumpulkan
        </button>
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", gap: 0, maxHeight: "calc(100vh - 80px)", overflow: "hidden" }}>
        {/* Question Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem" }}>
          {/* Subject badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <span className={`clay-badge ${currentQuestion?.subject === "PAI" ? "clay-badge-info" : "clay-badge-secondary"}`} style={{ fontSize: "0.8rem" }}>
              {currentQuestion?.subject}
            </span>
            <span className={`clay-badge ${
              currentQuestion?.difficulty === "high" ? "clay-badge-danger" :
              currentQuestion?.difficulty === "medium" ? "clay-badge-warning" :
              "clay-badge-success"
            }`} style={{ fontSize: "0.8rem" }}>
              {currentQuestion?.difficulty === "high" ? "HOTS" : currentQuestion?.difficulty === "medium" ? "Sedang" : "Mudah"}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600, marginLeft: "auto" }}>
              Soal {currentIdx + 1} dari {orderedQuestions.length}
            </span>
          </div>

          {/* Question card */}
          <div className="clay-question-card" style={{ marginBottom: "1.5rem", userSelect: "none" }}>
            <p style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "1.05rem",
              lineHeight: 1.7,
              marginBottom: "0.5rem",
            }}>
              {currentIdx + 1}. {currentQuestion?.question_text}
            </p>
          </div>

          {/* Options */}
          <div style={{ marginBottom: "2rem" }}>
            {renderOptions()}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              className="clay-btn clay-btn-ghost"
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              id="exam-prev-btn"
            >
              <ChevronLeft size={18} /> Sebelumnya
            </button>
            <button
              className="clay-btn clay-btn-primary"
              onClick={() => setCurrentIdx((i) => Math.min(orderedQuestions.length - 1, i + 1))}
              disabled={currentIdx === orderedQuestions.length - 1}
              id="exam-next-btn"
            >
              Berikutnya <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Question Navigator Sidebar */}
        <div style={{
          width: 200,
          background: "var(--color-surface)",
          borderLeft: "2px solid var(--color-border)",
          overflowY: "auto",
          padding: "1rem",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-text-muted)", marginBottom: "0.75rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Navigator Soal
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", fontSize: "0.72rem", fontWeight: 600, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "3px", color: "var(--color-text-muted)" }}>
              <div style={{ width: 10, height: 10, borderRadius: "3px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }} />
              Belum
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "3px", color: "var(--color-success)" }}>
              <div style={{ width: 10, height: 10, borderRadius: "3px", background: "var(--color-success)" }} />
              Dijawab
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            {orderedQuestions.map((q, idx) => {
              const isAnswered = !!(answers.get(q.id));
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={q.id}
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

          <div className="clay-divider" />

          <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", color: "var(--color-success)" }}>
              <span>Dijawab:</span>
              <strong>{answeredCount}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", color: "var(--color-warning)" }}>
              <span>Belum:</span>
              <strong>{unansweredCount}</strong>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div style={{ marginTop: "0.75rem", padding: "0.6rem", background: "var(--color-warning-lighter)", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-warning)", textAlign: "center" }}>
              <Flag size={13} style={{ display: "inline", marginRight: "4px" }} />
              {unansweredCount} soal belum dijawab
            </div>
          )}
        </div>
      </div>

      {/* Submit Confirmation */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        title="Kumpulkan Jawaban?"
        message={
          unansweredCount > 0
            ? `Masih ada ${unansweredCount} soal yang belum dijawab. Setelah dikumpulkan, jawaban tidak dapat diubah kembali.`
            : "Semua soal telah dijawab. Apakah Anda yakin ingin mengumpulkan jawaban? Tindakan ini tidak dapat dibatalkan."
        }
        confirmLabel="Ya, Kumpulkan"
        cancelLabel="Kembali ke Soal"
        variant={unansweredCount > 0 ? "warning" : "primary"}
        isLoading={isSubmitting}
        onConfirm={handleManualSubmit}
        onCancel={() => setShowSubmitConfirm(false)}
      />
    </div>
  );
}
