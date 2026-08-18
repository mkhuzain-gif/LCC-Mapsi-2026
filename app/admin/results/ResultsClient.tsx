"use client";

import { useState, useMemo } from "react";
import { TopHeader } from "@/components/shared/TopHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import {
  Trophy, Download, Printer, Lock, Eye, EyeOff,
  Medal, Crown, Award, FileSignature, X,
} from "lucide-react";
import type { ExamSession, ExamSubmission, Participant, UserRole } from "@/lib/types/database";
import { rankSubmissions } from "@/lib/utils/scoring";
import { exportRankingsToExcel, printRankings, type SignatureInfo } from "@/lib/utils/export";
import { format } from "date-fns";

function formatDurationDisplay(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const DEFAULT_SIGNATURES: SignatureInfo = {
  juri1: { name: "Ahmad Dahlan, M.Pd", nip: "19800101 200501 1 001" },
  juri2: { name: "Siti Rahmah, S.Ag", nip: "19820202 200602 2 002" },
  juri3: { name: "Muhammad Ridwan, M.Ag", nip: "19850303 200703 1 003" },
  ketua: { name: "H. Fauzi Rahman, S.Pd.I", nip: "19750404 200004 1 004" },
};

interface SignaturesModalProps {
  initial: SignatureInfo;
  onClose: () => void;
  onSave: (sigs: SignatureInfo) => void;
}

function SignaturesModal({ initial, onClose, onSave }: SignaturesModalProps) {
  const [form, setForm] = useState<SignatureInfo>(initial);

  const setJuri = (juriKey: "juri1" | "juri2" | "juri3" | "ketua", field: "name" | "nip", val: string) => {
    setForm((prev) => ({
      ...prev,
      [juriKey]: {
        ...prev[juriKey],
        [field]: val,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="clay-modal-overlay" onClick={onClose}>
      <div className="clay-modal clay-modal-lg" style={{ padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem" }}>
            Pengaturan Tanda Tangan (3 Juri & Ketua Panitia)
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }} aria-label="Tutup">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            {/* Dewan Juri I */}
            <div style={{ gridColumn: "1 / -1", fontWeight: 800, color: "var(--color-primary)", borderBottom: "1px solid var(--color-surface-2)", paddingBottom: "0.25rem" }}>
              Dewan Juri I
            </div>
            <div className="form-group">
              <label className="form-label">Nama Juri I</label>
              <input className="clay-input" value={form.juri1.name} onChange={(e) => setJuri("juri1", "name", e.target.value)} placeholder="Contoh: Ahmad Dahlan, M.Pd" />
            </div>
            <div className="form-group">
              <label className="form-label">NIP Juri I</label>
              <input className="clay-input" value={form.juri1.nip} onChange={(e) => setJuri("juri1", "nip", e.target.value)} placeholder="Contoh: 19800101 200501 1 001" />
            </div>

            {/* Dewan Juri II */}
            <div style={{ gridColumn: "1 / -1", fontWeight: 800, color: "var(--color-primary)", borderBottom: "1px solid var(--color-surface-2)", paddingBottom: "0.25rem", marginTop: "0.5rem" }}>
              Dewan Juri II
            </div>
            <div className="form-group">
              <label className="form-label">Nama Juri II</label>
              <input className="clay-input" value={form.juri2.name} onChange={(e) => setJuri("juri2", "name", e.target.value)} placeholder="Contoh: Siti Rahmah, S.Ag" />
            </div>
            <div className="form-group">
              <label className="form-label">NIP Juri II</label>
              <input className="clay-input" value={form.juri2.nip} onChange={(e) => setJuri("juri2", "nip", e.target.value)} placeholder="Contoh: 19820202 200602 2 002" />
            </div>

            {/* Dewan Juri III */}
            <div style={{ gridColumn: "1 / -1", fontWeight: 800, color: "var(--color-primary)", borderBottom: "1px solid var(--color-surface-2)", paddingBottom: "0.25rem", marginTop: "0.5rem" }}>
              Dewan Juri III
            </div>
            <div className="form-group">
              <label className="form-label">Nama Juri III</label>
              <input className="clay-input" value={form.juri3.name} onChange={(e) => setJuri("juri3", "name", e.target.value)} placeholder="Contoh: Muhammad Ridwan, M.Ag" />
            </div>
            <div className="form-group">
              <label className="form-label">NIP Juri III</label>
              <input className="clay-input" value={form.juri3.nip} onChange={(e) => setJuri("juri3", "nip", e.target.value)} placeholder="Contoh: 19850303 200703 1 003" />
            </div>

            {/* Ketua Panitia MAPSI */}
            <div style={{ gridColumn: "1 / -1", fontWeight: 800, color: "var(--color-primary)", borderBottom: "1px solid var(--color-surface-2)", paddingBottom: "0.25rem", marginTop: "0.5rem" }}>
              Ketua Panitia MAPSI XXVII
            </div>
            <div className="form-group">
              <label className="form-label">Nama Ketua Panitia</label>
              <input className="clay-input" value={form.ketua.name} onChange={(e) => setJuri("ketua", "name", e.target.value)} placeholder="Contoh: H. Fauzi Rahman, S.Pd.I" />
            </div>
            <div className="form-group">
              <label className="form-label">NIP Ketua Panitia</label>
              <input className="clay-input" value={form.ketua.nip} onChange={(e) => setJuri("ketua", "nip", e.target.value)} placeholder="Contoh: 19750404 200004 1 004" />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button type="button" className="clay-btn clay-btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="clay-btn clay-btn-primary">Simpan TTD & Juri</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ResultsClientProps {
  sessions: ExamSession[];
  submissions: ExamSubmission[];
  participants: Participant[];
  role: UserRole;
}

export function ResultsClient({ sessions, submissions, participants, role }: ResultsClientProps) {
  const supabase = createClient();
  const toast = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id ?? "");
  const [showConfirmFinalize, setShowConfirmFinalize] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showTop6Only, setShowTop6Only] = useState(false);
  const [signaturesModalOpen, setSignaturesModalOpen] = useState(false);

  const [signatures, setSignatures] = useState<SignatureInfo>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mapsi_signatures_config");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_SIGNATURES;
  });

  const handleSaveSignatures = (newSigs: SignatureInfo) => {
    setSignatures(newSigs);
    if (typeof window !== "undefined") {
      localStorage.setItem("mapsi_signatures_config", JSON.stringify(newSigs));
    }
    toast.success("Tanda tangan diperbarui", "Data 3 Juri & Ketua Panitia berhasil disimpan");
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  const rankings = useMemo(() => {
    const sessionSubs = submissions.filter((s) => s.session_id === selectedSessionId);
    const entries = sessionSubs.map((sub) => ({
      participant: participants.find((p) => p.id === sub.participant_id)!,
      submission: sub,
    })).filter((e) => e.participant);

    return rankSubmissions(entries);
  }, [submissions, participants, selectedSessionId]);

  const displayedRankings = showTop6Only ? rankings.slice(0, 6) : rankings;

  const handleFinalize = async () => {
    if (!selectedSessionId) return;
    setIsFinalizing(true);
    try {
      const { error } = await supabase
        .from("exam_sessions")
        .update({ is_finalized: true, status: "completed", updated_at: new Date().toISOString() })
        .eq("id", selectedSessionId);

      if (error) throw error;

      // Lock all submissions
      const subIds = submissions.filter((s) => s.session_id === selectedSessionId).map((s) => s.id);
      if (subIds.length > 0) {
        await supabase
          .from("exam_submissions")
          .update({ is_finalized: true })
          .in("id", subIds);
      }

      toast.success("Hasil difinalisasi!", "Ranking sekarang dikunci dan tidak dapat diubah.");
      setShowConfirmFinalize(false);
    } catch (err: unknown) {
      toast.error("Gagal finalisasi", err instanceof Error ? err.message : "");
    } finally {
      setIsFinalizing(false);
    }
  };

  const rankIcons: Record<number, React.ReactNode> = {
    1: <Crown size={20} color="#f59e0b" />,
    2: <Medal size={20} color="#94a3b8" />,
    3: <Award size={20} color="#fb923c" />,
  };

  return (
    <div>
      <TopHeader
        title="Hasil & Ranking Ujian"
        subtitle={`${rankings.length} peserta telah mengumpulkan jawaban`}
        role={role}
        actions={
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className="clay-btn clay-btn-ghost clay-btn-sm"
              onClick={() => setSignaturesModalOpen(true)}
              id="results-signatures-btn"
            >
              <FileSignature size={14} /> TTD / Juri
            </button>
            <button
              className="clay-btn clay-btn-ghost clay-btn-sm"
              onClick={() => setShowTop6Only(!showTop6Only)}
              id="results-toggle-top6-btn"
            >
              {showTop6Only ? <Eye size={14} /> : <EyeOff size={14} />}
              {showTop6Only ? "Tampilkan Semua" : "Top 6 Saja"}
            </button>
            {rankings.length > 0 && (
              <>
                <button
                  className="clay-btn clay-btn-secondary clay-btn-sm"
                  onClick={() => exportRankingsToExcel(rankings, undefined, signatures)}
                  id="results-export-excel-btn"
                >
                  <Download size={14} /> Excel
                </button>
                <button
                  className="clay-btn clay-btn-ghost clay-btn-sm"
                  onClick={() => printRankings(rankings, selectedSession?.title ?? "Ujian", signatures)}
                  id="results-print-btn"
                >
                  <Printer size={14} /> Cetak
                </button>
              </>
            )}
            {role === "admin" && selectedSession && !selectedSession.is_finalized && (
              <button
                className="clay-btn clay-btn-danger clay-btn-sm"
                onClick={() => setShowConfirmFinalize(true)}
                id="results-finalize-btn"
              >
                <Lock size={14} /> Finalisasi
              </button>
            )}
          </div>
        }
      />

      <div style={{ padding: "1.5rem 2rem" }}>
        {/* Session selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <label className="form-label" style={{ margin: 0, whiteSpace: "nowrap" }}>Pilih Sesi:</label>
          <select
            className="clay-select"
            style={{ maxWidth: 360 }}
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            id="results-session-select"
          >
            <option value="">-- Pilih Sesi --</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.stage}) {s.is_finalized ? "✔ Final" : ""}
              </option>
            ))}
          </select>
          {selectedSession?.is_finalized && (
            <span className="clay-badge clay-badge-success" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Lock size={12} /> Hasil Difinalisasi
            </span>
          )}
        </div>

        {/* Top 3 podium */}
        {rankings.length >= 3 && (
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", justifyContent: "center", alignItems: "flex-end", flexWrap: "wrap" }}>
            {/* 2nd place */}
            {rankings[1] && (
              <div className="clay-rank-card clay-rank-2" style={{ flexDirection: "column", textAlign: "center", width: 180, marginBottom: "1rem" }}>
                <Medal size={32} color="#94a3b8" style={{ margin: "0 auto 0.5rem" }} />
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", color: "#64748b" }}>2</div>
                <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{rankings[1].participant.draw_number ?? "—"}</div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.25rem" }}>{rankings[1].participant.full_name}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.2rem", color: "var(--color-primary)" }}>{rankings[1].submission.total_score}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>poin</div>
              </div>
            )}
            {/* 1st place */}
            {rankings[0] && (
              <div className="clay-rank-card clay-rank-1" style={{ flexDirection: "column", textAlign: "center", width: 200, padding: "1.5rem" }}>
                <Crown size={36} color="#f59e0b" style={{ margin: "0 auto 0.5rem" }} />
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2rem", color: "#d97706" }}>1</div>
                <div style={{ fontWeight: 800, fontSize: "1rem" }}>{rankings[0].participant.draw_number ?? "—"}</div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.3rem" }}>{rankings[0].participant.full_name}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", color: "var(--color-primary)" }}>{rankings[0].submission.total_score}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-warning)", fontWeight: 700 }}>poin</div>
              </div>
            )}
            {/* 3rd place */}
            {rankings[2] && (
              <div className="clay-rank-card clay-rank-3" style={{ flexDirection: "column", textAlign: "center", width: 180, marginBottom: "1rem" }}>
                <Award size={32} color="#fb923c" style={{ margin: "0 auto 0.5rem" }} />
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", color: "#ea580c" }}>3</div>
                <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{rankings[2].participant.draw_number ?? "—"}</div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.25rem" }}>{rankings[2].participant.full_name}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.2rem", color: "var(--color-primary)" }}>{rankings[2].submission.total_score}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>poin</div>
              </div>
            )}
          </div>
        )}

        {/* Full table */}
        {rankings.length === 0 ? (
          <div className="clay-card" style={{ padding: "4rem 2rem" }}>
            <div className="clay-empty-state">
              <div className="clay-empty-icon"><Trophy size={36} color="var(--color-primary)" /></div>
              <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>Belum ada hasil</p>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                {selectedSessionId ? "Belum ada peserta yang mengumpulkan jawaban" : "Pilih sesi ujian untuk melihat hasil"}
              </p>
            </div>
          </div>
        ) : (
          <div className="clay-table-wrapper">
            <table className="clay-table">
              <thead>
                <tr>
                  <th style={{ width: 64, textAlign: "center" }}>Rank</th>
                  <th>No. Undian</th>
                  <th>Nama Peserta</th>
                  <th style={{ textAlign: "center" }}>PAI</th>
                  <th style={{ textAlign: "center" }}>BTQ</th>
                  <th style={{ textAlign: "center" }}>Total</th>
                  <th style={{ textAlign: "center" }}>%</th>
                  <th style={{ textAlign: "center" }}>Submit</th>
                  <th style={{ textAlign: "center" }}>Durasi</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedRankings.map((entry) => {
                  const rankStyle =
                    entry.rank === 1 ? { background: "linear-gradient(90deg, #fffbeb, #fef9c3)" } :
                    entry.rank === 2 ? { background: "linear-gradient(90deg, #f8fafc, #f1f5f9)" } :
                    entry.rank === 3 ? { background: "linear-gradient(90deg, #fff7ed, #ffedd5)" } :
                    {};

                  return (
                    <tr key={entry.submission.id} style={rankStyle}>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}>
                          {rankIcons[entry.rank] ?? null}
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.1rem" }}>{entry.rank}</span>
                          {entry.is_tie && (
                            <span style={{ fontSize: "0.7rem", color: "var(--color-danger)", fontWeight: 700 }}>*</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, color: "var(--color-primary)", background: "var(--color-primary-lighter)", padding: "0.2rem 0.6rem", borderRadius: "8px" }}>
                          {entry.participant.draw_number ?? "—"}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{entry.participant.full_name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          {entry.participant.gender === "male" ? "Putra" : "Putri"}
                        </div>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 800, color: "var(--color-info)" }}>{entry.submission.pai_score}</td>
                      <td style={{ textAlign: "center", fontWeight: 800, color: "var(--color-secondary)" }}>{entry.submission.btq_score}</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.1rem", color: "var(--color-primary)" }}>
                          {entry.submission.total_score}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{entry.submission.percentage}%</td>
                      <td style={{ textAlign: "center", fontSize: "0.82rem", fontWeight: 700 }}>
                        {entry.submission.submitted_at
                          ? format(new Date(entry.submission.submitted_at), "HH:mm:ss")
                          : "—"}
                      </td>
                      <td style={{ textAlign: "center", fontSize: "0.82rem", fontWeight: 700 }}>
                        {formatDurationDisplay(entry.submission.duration_seconds)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {entry.submission.is_finalized ? (
                          <span className="clay-badge clay-badge-success" style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem" }}>
                            <Lock size={11} /> Final
                          </span>
                        ) : (
                          <span className="clay-badge clay-badge-neutral" style={{ fontSize: "0.72rem" }}>Sementara</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rankings.some((r) => r.is_tie) && (
          <div className="clay-alert clay-alert-info" style={{ marginTop: "1rem", fontSize: "0.8rem" }}>
            <span>ℹ️</span>
            <span>* Peserta bertanda bintang memiliki skor sama. Tiebreak menggunakan waktu submit tercepat sesuai peraturan MAPSI XXVII.</span>
          </div>
        )}
      </div>

      {signaturesModalOpen && (
        <SignaturesModal
          initial={signatures}
          onClose={() => setSignaturesModalOpen(false)}
          onSave={handleSaveSignatures}
        />
      )}

      <ConfirmDialog
        isOpen={showConfirmFinalize}
        title="Finalisasi Hasil Ujian?"
        message="Setelah difinalisasi, ranking tidak dapat diubah kembali oleh peserta. Pastikan semua data telah diverifikasi. Tindakan ini permanen."
        confirmLabel="Ya, Finalisasi Sekarang"
        variant="warning"
        isLoading={isFinalizing}
        onConfirm={handleFinalize}
        onCancel={() => setShowConfirmFinalize(false)}
      />
    </div>
  );
}

