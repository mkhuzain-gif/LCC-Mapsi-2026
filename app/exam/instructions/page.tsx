"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ExamInterface } from "@/components/exam/ExamInterface";
import type { Question, ExamSubmission } from "@/lib/types/database";
import { loadAppConfig, type AppConfig } from "@/app/admin/settings/SettingsClient";
import {
  GraduationCap, BookOpen, Clock, Shield, AlertTriangle,
  CheckCircle, Play,
} from "lucide-react";

export default function ExamPage() {
  const router = useRouter();
  const supabase = createClient();

  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [phase, setPhase] = useState<"loading" | "instructions" | "exam" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState("");
  const [drawNumber, setDrawNumber] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [existingAnswers, setExistingAnswers] = useState<Map<string, string | null>>(new Map());
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    setAppConfig(loadAppConfig());
    const pid = sessionStorage.getItem("exam_participant_id");
    const sid = sessionStorage.getItem("exam_session_id");
    const pname = sessionStorage.getItem("exam_participant_name");
    const pdraw = sessionStorage.getItem("exam_draw_number");
    const dur = sessionStorage.getItem("exam_duration_minutes");

    if (!pid || !sid) {
      router.push("/participant-login");
      return;
    }

    setParticipantId(pid);
    setParticipantName(pname ?? "Peserta");
    setDrawNumber(pdraw ?? "");
    setSessionId(sid);
    setDurationMinutes(parseInt(dur ?? "90"));
    setPhase("instructions");
  }, [router]);

  const handleStartExam = async () => {
    if (!participantId || !sessionId) return;
    setIsStarting(true);

    try {
      // Fetch questions for the active session
      let fetchedQuestions: Question[] = [];
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("session_id", sessionId)
        .eq("is_active", true);

      if (qs && qs.length > 0) {
        fetchedQuestions = qs;
      } else {
        // Fallback 1: try general question bank (session_id is null)
        const { data: generalQs } = await supabase
          .from("questions")
          .select("*")
          .is("session_id", null)
          .eq("is_active", true);

        if (generalQs && generalQs.length > 0) {
          fetchedQuestions = generalQs;
        } else {
          // Fallback 2: try all active questions in bank
          const { data: allActiveQs } = await supabase
            .from("questions")
            .select("*")
            .eq("is_active", true);

          if (allActiveQs && allActiveQs.length > 0) {
            fetchedQuestions = allActiveQs;
          }
        }
      }

      if (fetchedQuestions.length === 0) {
        setError("Bank soal tidak tersedia. Hubungi panitia.");
        setPhase("error");
        return;
      }
      setQuestions(fetchedQuestions);

      // Check for existing submission
      const { data: existingSub } = await supabase
        .from("exam_submissions")
        .select("*")
        .eq("participant_id", participantId)
        .eq("session_id", sessionId)
        .maybeSingle();

      if (existingSub && ["submitted", "auto_submitted"].includes(existingSub.status)) {
        setError("Anda sudah pernah mengumpulkan jawaban untuk sesi ini.");
        setPhase("error");
        return;
      }

      let activeSub: ExamSubmission;

      if (existingSub && existingSub.status === "in_progress") {
        // Resume existing
        activeSub = existingSub;

        // Load existing answers
        const { data: ans } = await supabase
          .from("exam_answers")
          .select("question_id, selected_answer")
          .eq("submission_id", existingSub.id);

        const ansMap = new Map<string, string | null>();
        ans?.forEach((a) => ansMap.set(a.question_id, a.selected_answer));
        setExistingAnswers(ansMap);
      } else {
        // Create new submission
        const { data: newSub, error: subErr } = await supabase
          .from("exam_submissions")
          .insert({
            participant_id: participantId,
            session_id: sessionId,
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        if (subErr || !newSub) {
          console.error("New submission error:", subErr);
          setError("Gagal memulai ujian. Hubungi panitia.");
          setPhase("error");
          return;
        }
        activeSub = newSub;


        // Log exam start
        await supabase.from("activity_logs").insert({
          participant_id: participantId,
          session_id: sessionId,
          event_type: "exam_start",
          severity: "info",
          details: { participant_name: participantName },
        });
      }

      setSubmission(activeSub);
      setPhase("exam");
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setPhase("error");
    } finally {
      setIsStarting(false);
    }
  };

  if (phase === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--color-bg)" }}>
        <div className="clay-spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", background: "var(--color-bg)" }}>
        <div className="clay-card" style={{ padding: "2.5rem", maxWidth: 480, textAlign: "center" }}>
          <AlertTriangle size={48} color="var(--color-danger)" style={{ margin: "0 auto 1rem", display: "block" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.3rem", marginBottom: "0.75rem" }}>
            Tidak Dapat Memulai Ujian
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontWeight: 600, marginBottom: "1.5rem" }}>{error}</p>
          <button className="clay-btn clay-btn-ghost" onClick={() => router.push("/participant-login")}>
            ← Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  if (phase === "exam" && submission && questions.length > 0) {
    return (
      <ExamInterface
        questions={questions}
        submission={submission}
        participantName={participantName}
        drawNumber={drawNumber}
        durationMinutes={durationMinutes}
        sessionId={sessionId!}
        existingAnswers={existingAnswers}
      />
    );
  }

  // Instructions phase
  const rules = [
    "Ujian berlangsung selama maksimal 90 menit",
    "Terdiri dari 75 soal PAI dan 25 soal BTQ (100 soal total)",
    "Jenis soal: Pilihan Ganda dan Benar/Salah",
    "Jawaban tersimpan otomatis saat Anda berpindah soal",
    "Tidak diperbolehkan keluar dari layar ujian (tab switching akan dicatat)",
    "Tidak diperbolehkan membuka buku, catatan, atau aplikasi lain",
    "Tidak diperbolehkan berkomunikasi dengan peserta lain",
    "Setelah dikumpulkan, jawaban tidak dapat diubah kembali",
    "Peserta terlambat tidak mendapatkan tambahan waktu",
    "Penilaian otomatis dilakukan oleh sistem",
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, var(--color-bg), #e0d7ff)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 680 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 68,
            height: 68,
            borderRadius: "22px",
            background: "linear-gradient(135deg, var(--color-primary-light), var(--color-primary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
            boxShadow: "var(--clay-shadow-md)",
            overflow: "hidden",
            padding: 5,
          }}>
            {(appConfig?.logoDataUrl || "/icon-192.png") ? (
              <img
                src={appConfig?.logoDataUrl || "/icon-192.png"}
                alt="Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "16px",
                  background: "white",
                  padding: "3px",
                }}
              />
            ) : (
              <GraduationCap size={34} color="white" />
            )}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.6rem", marginBottom: "0.25rem" }}>
            {appConfig?.appName || "LCC MAPSI"} {appConfig?.edition || "XXVII"} {appConfig?.eventYear || "2026"}
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Ujian Online PAI & BTQ</p>
        </div>

        {/* Participant card */}
        <div className="clay-card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem", background: "linear-gradient(135deg, var(--color-primary-lighter), #ede9fe)" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "1.2rem",
              color: "white",
            }}>
              {participantName.charAt(0)}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>{participantName}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-primary)", fontWeight: 700 }}>
                No. Undian: {drawNumber || "—"} &nbsp;•&nbsp; Durasi: {durationMinutes} menit
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { icon: <BookOpen size={20} />, label: "100 Soal", sub: "75 PAI + 25 BTQ", color: "var(--color-info)" },
            { icon: <Clock size={20} />, label: "90 Menit", sub: "Durasi maksimal", color: "var(--color-accent)" },
            { icon: <Shield size={20} />, label: "1 Kali Saja", sub: "Tidak bisa diulang", color: "var(--color-danger)" },
          ].map((info) => (
            <div key={info.label} className="clay-card-sm" style={{ padding: "1rem", textAlign: "center" }}>
              <div style={{ color: info.color, marginBottom: "0.4rem", display: "flex", justifyContent: "center" }}>{info.icon}</div>
              <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{info.label}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600 }}>{info.sub}</div>
            </div>
          ))}
        </div>

        {/* Rules */}
        <div className="clay-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={18} color="var(--color-warning)" /> Peraturan Ujian
          </h3>
          <ol style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {rules.map((rule, i) => (
              <li key={i} style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                {rule}
              </li>
            ))}
          </ol>
        </div>

        {/* Agreement */}
        <div
          className="clay-card-sm"
          style={{
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            cursor: "pointer",
            border: `2px solid ${agreedToRules ? "var(--color-success)" : "var(--color-border)"}`,
            background: agreedToRules ? "var(--color-success-lighter)" : "var(--color-surface)",
            transition: "var(--transition-default)",
          }}
          onClick={() => setAgreedToRules(!agreedToRules)}
        >
          <div style={{
            width: 22,
            height: 22,
            borderRadius: "6px",
            border: `3px solid ${agreedToRules ? "var(--color-success)" : "var(--color-border)"}`,
            background: agreedToRules ? "var(--color-success)" : "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            {agreedToRules && <CheckCircle size={14} color="white" />}
          </div>
          <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>
            Saya memahami dan menyetujui peraturan ujian di atas, serta akan mengerjakan soal secara mandiri.
          </span>
        </div>

        {/* Start button */}
        <button
          className="clay-btn clay-btn-success clay-btn-lg"
          style={{ width: "100%", justifyContent: "center", fontSize: "1.1rem" }}
          disabled={!agreedToRules || isStarting}
          onClick={handleStartExam}
          id="exam-start-btn"
        >
          {isStarting ? (
            <><span className="clay-spinner" style={{ width: 22, height: 22, borderWidth: 3 }} />Menyiapkan Ujian...</>
          ) : (
            <><Play size={20} /> Mulai Ujian</>
          )}
        </button>
      </div>
    </div>
  );
}
