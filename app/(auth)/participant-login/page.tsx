"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, Key, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/shared/ToastProvider";
import Link from "next/link";

export default function ParticipantLoginPage() {
  const [drawNumber, setDrawNumber] = useState("");
  const [examToken, setExamToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ drawNumber?: string; examToken?: string }>({});

  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();

  const validate = () => {
    const errs: { drawNumber?: string; examToken?: string } = {};
    if (!drawNumber.trim()) errs.drawNumber = "No. undian harus diisi";
    if (!examToken.trim()) errs.examToken = "Token ujian harus diisi";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const raw = drawNumber.trim();
      const cleanRaw = raw.replace(/^#\s*/, "").trim();

      // Extract number digits
      const digitsMatch = cleanRaw.match(/\d+/);
      const digits = digitsMatch ? digitsMatch[0] : "";
      const parsedNum = digits ? parseInt(digits, 10) : NaN;

      const candidatesSet = new Set<string>();
      if (raw) candidatesSet.add(raw);
      if (cleanRaw) candidatesSet.add(cleanRaw);

      if (!isNaN(parsedNum)) {
        const p1 = String(parsedNum); // e.g. "2"
        const p2 = p1.padStart(2, "0"); // e.g. "02"
        const p3 = p1.padStart(3, "0"); // e.g. "002"
        const p4 = p1.padStart(4, "0"); // e.g. "0002"

        candidatesSet.add(p1);
        candidatesSet.add(p2);
        candidatesSet.add(p3);
        candidatesSet.add(p4);
        candidatesSet.add(`P${p1}`);
        candidatesSet.add(`P${p2}`);
        candidatesSet.add(`P${p3}`);
        candidatesSet.add(`A-${p3}`);
        candidatesSet.add(`A-${p1}`);
      }

      const candidates = Array.from(candidatesSet);

      // Build OR condition for PostgREST
      const orFilter = candidates
        .flatMap((c) => [`draw_number.ilike.${c}`, `access_code.ilike.${c}`])
        .join(",");

      let participant = null;

      const { data: participants, error: pError } = await supabase
        .from("participants")
        .select("*, profile_id")
        .or(orFilter);

      if (pError) {
        console.error("Supabase participant query error:", pError);
      }

      if (participants && participants.length > 0) {
        participant = participants[0];
      }

      // Secondary fallback: fetch participants list and match in JS
      if (!participant) {
        const { data: allP, error: allError } = await supabase.from("participants").select("*, profile_id");
        if (allError) {
          console.error("Supabase all participants query error:", allError);
        }
        if (allP && allP.length > 0) {
          participant = allP.find((p) => {
            const dn = (p.draw_number ?? "").toLowerCase().trim();
            const ac = (p.access_code ?? "").toLowerCase().trim();
            return candidates.some((c) => {
              const cl = c.toLowerCase();
              return dn === cl || ac === cl || dn.endsWith(cl) || (digits && (dn.includes(digits) || ac.includes(digits)));
            });
          }) ?? null;
        }
      }

      if (!participant) {
        if (pError && (pError.code === "42501" || pError.message?.toLowerCase().includes("policy") || pError.message?.toLowerCase().includes("permission"))) {
          toast.error("Akses Database Ditolak", "Jalankan SQL RLS di Supabase SQL Editor");
          setErrors({ drawNumber: "Akses RLS Supabase dibatasi (Jalankan script SQL di Supabase Editor)" });
        } else {
          toast.error("No. undian tidak valid", "Periksa kembali nomor undian Anda");
          setErrors({ drawNumber: "No. undian tidak ditemukan" });
        }
        return;
      }

      // 2. Verify exam token against active session
      const { data: session, error: sError } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("token", examToken.toUpperCase().trim())
        .eq("token_active", true)
        .eq("status", "active")
        .maybeSingle();

      if (sError || !session) {
        toast.error("Token ujian tidak valid", "Token tidak aktif atau sudah berakhir");
        setErrors({ examToken: "Token tidak valid atau tidak aktif" });
        return;
      }

      // 3. Check if participant already submitted
      const { data: existingSubmission } = await supabase
        .from("exam_submissions")
        .select("status")
        .eq("participant_id", participant.id)
        .eq("session_id", session.id)
        .maybeSingle();

      if (existingSubmission && ["submitted", "auto_submitted"].includes(existingSubmission.status)) {
        toast.error("Ujian sudah dikerjakan", "Anda hanya boleh mengerjakan ujian satu kali");
        return;
      }

      // 4. Log activity
      await supabase.from("activity_logs").insert({
        participant_id: participant.id,
        session_id: session.id,
        event_type: "participant_login",
        severity: "info",
        details: { draw_number: raw, session_title: session.title },
      });

      // Store session info in sessionStorage for exam
      sessionStorage.setItem("exam_participant_id", participant.id);
      sessionStorage.setItem("exam_session_id", session.id);
      sessionStorage.setItem("exam_participant_name", participant.full_name);
      sessionStorage.setItem("exam_draw_number", participant.draw_number ?? raw);
      sessionStorage.setItem("exam_duration_minutes", String(session.duration_minutes));

      toast.success("Login berhasil!", `Selamat datang, ${participant.full_name}`);
      router.push("/exam/instructions");
    } catch {
      toast.error("Terjadi kesalahan", "Coba lagi beberapa saat");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="clay-card" style={{ padding: "2.5rem 2rem" }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "1.35rem",
          marginBottom: "0.4rem",
        }}
      >
        Login Peserta
      </h2>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "2rem", fontWeight: 500 }}>
        Masukkan nomor undian dan token ujian Anda
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Draw Number / No Undian */}
        <div className="form-group" style={{ marginBottom: "1.25rem" }}>
          <label className="form-label" htmlFor="participant-draw-number">
            No. Undian Peserta
          </label>
          <div style={{ position: "relative" }}>
            <Hash
              size={16}
              style={{
                position: "absolute",
                left: "0.9rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              id="participant-draw-number"
              type="text"
              className="clay-input"
              style={{ paddingLeft: "2.5rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
              placeholder="Contoh: 001"
              value={drawNumber}
              onChange={(e) => setDrawNumber(e.target.value)}
              disabled={isLoading}
              autoComplete="off"
            />
          </div>
          {errors.drawNumber && <span className="form-error">{errors.drawNumber}</span>}
        </div>

        {/* Token */}
        <div className="form-group" style={{ marginBottom: "1.75rem" }}>
          <label className="form-label" htmlFor="participant-token">
            Token Ujian
          </label>
          <div style={{ position: "relative" }}>
            <Key
              size={16}
              style={{
                position: "absolute",
                left: "0.9rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              id="participant-token"
              type="text"
              className="clay-input"
              style={{ paddingLeft: "2.5rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}
              placeholder="Contoh: MAPSI2026"
              value={examToken}
              onChange={(e) => setExamToken(e.target.value)}
              disabled={isLoading}
              autoComplete="off"
            />
          </div>
          {errors.examToken && <span className="form-error">{errors.examToken}</span>}
        </div>

        <div
          className="clay-alert clay-alert-info"
          style={{ marginBottom: "1.5rem", fontSize: "0.8rem" }}
        >
          <span>ℹ️</span>
          <span>
            Nomor undian dan token diberikan oleh panitia. Hubungi panitia jika belum mendapatkannya.
          </span>
        </div>

        <button
          type="submit"
          className="clay-btn clay-btn-success clay-btn-lg"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={isLoading}
          id="participant-login-submit-btn"
        >
          {isLoading ? (
            <>
              <span className="clay-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              Memverifikasi...
            </>
          ) : (
            <>
              <LogIn size={18} />
              Masuk ke Ujian
            </>
          )}
        </button>
      </form>

      <div className="clay-divider" />
      <div style={{ textAlign: "center" }}>
        <Link
          href="/login"
          style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", fontWeight: 500, textDecoration: "none" }}
        >
          ← Login Admin / Panitia
        </Link>
      </div>
    </div>
  );
}

