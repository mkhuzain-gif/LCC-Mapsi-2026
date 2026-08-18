"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ExamSubmission } from "@/lib/types/database";
import {
  CheckCircle2, XCircle, MinusCircle, Trophy,
  Clock, BookOpen, BarChart3, Home,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function ExamResultPage() {
  const router = useRouter();
  const supabase = createClient();
  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [participantName, setParticipantName] = useState("");

  useEffect(() => {
    const participantId = sessionStorage.getItem("exam_participant_id");
    const sessionId = sessionStorage.getItem("exam_session_id");
    const pName = sessionStorage.getItem("exam_participant_name") ?? "";
    setParticipantName(pName);

    if (!participantId || !sessionId) {
      router.push("/participant-login");
      return;
    }

    supabase
      .from("exam_submissions")
      .select("*")
      .eq("participant_id", participantId)
      .eq("session_id", sessionId)
      .single()
      .then(({ data }) => {
        setSubmission(data);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--color-bg)" }}>
        <div className="clay-spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
      </div>
    );
  }

  if (!submission) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem" }}>
        <div className="clay-card" style={{ padding: "2.5rem", textAlign: "center", maxWidth: 420 }}>
          <p style={{ fontWeight: 700 }}>Tidak ada data hasil ujian ditemukan.</p>
          <button className="clay-btn clay-btn-primary" style={{ marginTop: "1rem" }} onClick={() => router.push("/participant-login")}>
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  const total = submission.correct_count + submission.wrong_count + submission.unanswered_count;
  const pct = submission.percentage;
  const durationMin = submission.duration_seconds ? Math.floor(submission.duration_seconds / 60) : null;
  const durationSec = submission.duration_seconds ? submission.duration_seconds % 60 : null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, var(--color-bg), #e0d7ff)", padding: "2rem", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 620, paddingTop: "2rem" }}>
        {/* Success header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-success-light), var(--color-success))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
            boxShadow: "var(--clay-shadow-success)",
          }}>
            <CheckCircle2 size={40} color="white" />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.8rem", marginBottom: "0.25rem" }}>
            Ujian Selesai!
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
            Terima kasih, <strong>{participantName}</strong>. Jawaban Anda telah berhasil dikumpulkan.
          </p>
          {submission.submitted_at && (
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-light)", fontWeight: 500, marginTop: "0.25rem" }}>
              Waktu submit: {format(new Date(submission.submitted_at), "dd MMMM yyyy, HH:mm:ss", { locale: id })}
            </p>
          )}
        </div>

        {/* Score card */}
        <div className="clay-card" style={{ padding: "2rem", marginBottom: "1.5rem", textAlign: "center" }}>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "4rem", lineHeight: 1, color: "var(--color-primary)" }}>
              {submission.total_score}
            </div>
            <div style={{ fontSize: "1rem", color: "var(--color-text-muted)", fontWeight: 600 }}>dari {total} soal</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ textAlign: "center", padding: "1rem", background: "var(--color-info-lighter)", borderRadius: "16px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", color: "var(--color-info)" }}>{submission.pai_score}</div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-info)" }}>Skor PAI</div>
            </div>
            <div style={{ textAlign: "center", padding: "1rem", background: "var(--color-secondary-lighter)", borderRadius: "16px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", color: "var(--color-secondary)" }}>{submission.btq_score}</div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-secondary)" }}>Skor BTQ</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              <span>Persentase Benar</span>
              <span style={{ color: "var(--color-primary)" }}>{pct}%</span>
            </div>
            <div className="clay-progress clay-progress-primary">
              <div className="clay-progress-bar" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div className="clay-card-sm" style={{ padding: "1rem", textAlign: "center" }}>
            <CheckCircle2 size={22} color="var(--color-success)" style={{ margin: "0 auto 0.4rem", display: "block" }} />
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", color: "var(--color-success)" }}>{submission.correct_count}</div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-success)" }}>Benar</div>
          </div>
          <div className="clay-card-sm" style={{ padding: "1rem", textAlign: "center" }}>
            <XCircle size={22} color="var(--color-danger)" style={{ margin: "0 auto 0.4rem", display: "block" }} />
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", color: "var(--color-danger)" }}>{submission.wrong_count}</div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-danger)" }}>Salah</div>
          </div>
          <div className="clay-card-sm" style={{ padding: "1rem", textAlign: "center" }}>
            <MinusCircle size={22} color="var(--color-text-muted)" style={{ margin: "0 auto 0.4rem", display: "block" }} />
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", color: "var(--color-text-muted)" }}>{submission.unanswered_count}</div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)" }}>Tidak Dijawab</div>
          </div>
        </div>

        {/* Duration */}
        {durationMin !== null && (
          <div className="clay-card-sm" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <Clock size={22} color="var(--color-accent)" />
            <div>
              <div style={{ fontWeight: 700 }}>Durasi Pengerjaan</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.2rem", color: "var(--color-accent)" }}>
                {durationMin} menit {durationSec} detik
              </div>
            </div>
          </div>
        )}

        {/* Rank (if visible) */}
        {submission.rank && (
          <div className={`clay-rank-card ${submission.rank <= 3 ? `clay-rank-${submission.rank}` : ""}`} style={{ marginBottom: "1.5rem", justifyContent: "center" }}>
            <Trophy size={28} color={submission.rank === 1 ? "#f59e0b" : submission.rank === 2 ? "#94a3b8" : submission.rank === 3 ? "#fb923c" : "var(--color-primary)"} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2rem" }}>#{submission.rank}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Peringkat Sementara</div>
            </div>
          </div>
        )}

        <div className="clay-alert clay-alert-info" style={{ marginBottom: "1.5rem" }}>
          <span>ℹ️</span>
          <span>Hasil ini bersifat sementara. Peringkat final akan ditentukan oleh panitia setelah semua peserta selesai mengerjakan.</span>
        </div>

        <button
          className="clay-btn clay-btn-ghost clay-btn-lg"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => router.push("/participant-login")}
          id="exam-result-home-btn"
        >
          <Home size={18} /> Kembali ke Halaman Utama
        </button>
      </div>
    </div>
  );
}
