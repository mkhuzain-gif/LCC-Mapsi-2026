"use client";

import { useState, useCallback, useRef } from "react";
import { TopHeader } from "@/components/shared/TopHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Search, Download, Upload, Edit2, Trash2,
  X, BookOpen, ChevronUp, ChevronDown, Filter, FileCode,
} from "lucide-react";
import type { Question, ExamSession } from "@/lib/types/database";

const DIFFICULTY_BADGE: Record<string, string> = {
  high: "clay-badge-danger",
  medium: "clay-badge-warning",
  low: "clay-badge-success",
};
const DIFFICULTY_LABEL: Record<string, string> = { high: "HOTS", medium: "Sedang", low: "Mudah" };
const TYPE_LABEL: Record<string, string> = { multiple_choice: "Pilihan Ganda", true_false: "Benar/Salah" };

interface QuestionModalProps {
  initial?: Question | null;
  sessions: { id: string; title: string; stage: string }[];
  onClose: () => void;
  onSaved: () => void;
}

function QuestionModal({ initial, sessions, onClose, onSaved }: QuestionModalProps) {
  const supabase = createClient();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    subject: initial?.subject ?? "PAI",
    question_type: initial?.question_type ?? "multiple_choice",
    difficulty: initial?.difficulty ?? "medium",
    question_text: initial?.question_text ?? "",
    option_a: initial?.option_a ?? "",
    option_b: initial?.option_b ?? "",
    option_c: initial?.option_c ?? "",
    option_d: initial?.option_d ?? "",
    correct_answer: initial?.correct_answer ?? "A",
    explanation: initial?.explanation ?? "",
    session_id: initial?.session_id ?? "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question_text.trim()) {
      toast.error("Validasi gagal", "Teks soal tidak boleh kosong");
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        ...form,
        session_id: form.session_id || null,
        option_a: form.question_type === "multiple_choice" ? form.option_a : null,
        option_b: form.question_type === "multiple_choice" ? form.option_b : null,
        option_c: form.question_type === "multiple_choice" ? form.option_c : null,
        option_d: form.question_type === "multiple_choice" ? form.option_d : null,
        correct_answer: form.question_type === "true_false" ? form.correct_answer : form.correct_answer,
      };

      if (initial) {
        const { error } = await supabase.from("questions").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", initial.id);
        if (error) throw error;
        toast.success("Soal diperbarui");
      } else {
        const { error } = await supabase.from("questions").insert(payload);
        if (error) throw error;
        toast.success("Soal ditambahkan");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error("Gagal menyimpan soal", err instanceof Error ? err.message : "");
    } finally {
      setIsLoading(false);
    }
  };

  const isMC = form.question_type === "multiple_choice";

  return (
    <div className="clay-modal-overlay" onClick={onClose}>
      <div className="clay-modal clay-modal-xl" style={{ padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem" }}>
            {initial ? "Edit Soal" : "Tambah Soal Baru"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-grid-3">
            <div className="form-group">
              <label className="form-label">Mata Pelajaran *</label>
              <select className="clay-select" value={form.subject} onChange={(e) => set("subject", e.target.value)}>
                <option value="PAI">PAI (Pendidikan Agama Islam)</option>
                <option value="BTQ">BTQ (Baca Tulis Quran)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Jenis Soal *</label>
              <select className="clay-select" value={form.question_type} onChange={(e) => {
                set("question_type", e.target.value);
                set("correct_answer", e.target.value === "true_false" ? "True" : "A");
              }}>
                <option value="multiple_choice">Pilihan Ganda</option>
                <option value="true_false">Benar / Salah</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tingkat Kesulitan *</label>
              <select className="clay-select" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
                <option value="high">HOTS (Tinggi)</option>
                <option value="medium">Sedang</option>
                <option value="low">Mudah</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">Sesi Ujian (Opsional)</label>
            <select className="clay-select" value={form.session_id} onChange={(e) => set("session_id", e.target.value)}>
              <option value="">-- Bank Soal Umum --</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.stage})</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label className="form-label">Teks Soal *</label>
            <textarea
              className="clay-input"
              value={form.question_text}
              onChange={(e) => set("question_text", e.target.value)}
              placeholder="Tulis pertanyaan di sini..."
              rows={4}
              style={{ resize: "vertical" }}
            />
          </div>

          {isMC && (
            <div className="modal-grid-2">
              {(["a", "b", "c", "d"] as const).map((opt) => (
                <div key={opt} className="form-group">
                  <label className="form-label">Pilihan {opt.toUpperCase()}</label>
                  <input
                    className="clay-input"
                    value={form[`option_${opt}`]}
                    onChange={(e) => set(`option_${opt}`, e.target.value)}
                    placeholder={`Teks pilihan ${opt.toUpperCase()}`}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">Jawaban Benar *</label>
            {isMC ? (
              <select className="clay-select" value={form.correct_answer} onChange={(e) => set("correct_answer", e.target.value)}>
                <option value="A">A — {form.option_a || "(Pilihan A)"}</option>
                <option value="B">B — {form.option_b || "(Pilihan B)"}</option>
                <option value="C">C — {form.option_c || "(Pilihan C)"}</option>
                <option value="D">D — {form.option_d || "(Pilihan D)"}</option>
              </select>
            ) : (
              <select className="clay-select" value={form.correct_answer} onChange={(e) => set("correct_answer", e.target.value)}>
                <option value="True">Benar (True)</option>
                <option value="False">Salah (False)</option>
              </select>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label className="form-label">Pembahasan (Opsional)</label>
            <textarea
              className="clay-input"
              value={form.explanation}
              onChange={(e) => set("explanation", e.target.value)}
              placeholder="Penjelasan jawaban..."
              rows={2}
              style={{ resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button type="button" className="clay-btn clay-btn-ghost" onClick={onClose} disabled={isLoading}>Batal</button>
            <button type="submit" className="clay-btn clay-btn-primary" disabled={isLoading} id="question-modal-save-btn">
              {isLoading ? <><span className="clay-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Menyimpan...</> : (initial ? "Simpan Perubahan" : "Tambah Soal")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main component
export function QuestionsClient({
  initialQuestions,
  sessions,
}: {
  initialQuestions: Question[];
  sessions: { id: string; title: string; stage: string }[];
}) {
  const supabase = createClient();
  const toast = useToast();

  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [activeTab, setActiveTab] = useState<"all" | "PAI" | "BTQ">("all");
  const [search, setSearch] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from("questions").select("*").order("subject").order("order_number");
    if (data) setQuestions(data);
    setIsLoading(false);
  }, [supabase]);

  const filtered = questions.filter((q) => {
    const matchTab = activeTab === "all" || q.subject === activeTab;
    const matchSearch = !search || q.question_text.toLowerCase().includes(search.toLowerCase());
    const matchDiff = !filterDiff || q.difficulty === filterDiff;
    const matchType = !filterType || q.question_type === filterType;
    const matchSession = !filterSession || q.session_id === filterSession || (filterSession === "general" && !q.session_id);
    return matchTab && matchSearch && matchDiff && matchType && matchSession;
  });

  const paiCount = questions.filter((q) => q.subject === "PAI").length;
  const btqCount = questions.filter((q) => q.subject === "BTQ").length;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("questions").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Soal dihapus");
      setDeleteTarget(null);
      await refresh();
    } catch (err: unknown) {
      toast.error("Gagal menghapus", err instanceof Error ? err.message : "");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadJsonTemplate = () => {
    const templateData = [
      {
        subject: "PAI",
        question_type: "multiple_choice",
        difficulty: "high",
        question_text: "Berikut ini yang merupakan salah satu sifat wajib bagi Allah SWT yang tergolong sifat Salbiyah adalah...",
        option_a: "Wujud",
        option_b: "Qidam",
        option_c: "Qadirun",
        option_d: "Alimun",
        correct_answer: "B",
        explanation: "Sifat Qidam (Terdahulu/Mendahului) merupakan salah satu dari 5 sifat Salbiyah Allah SWT."
      },
      {
        subject: "PAI",
        question_type: "multiple_choice",
        difficulty: "medium",
        question_text: "Kitab Al-Qur'an diturunkan kepada Nabi Muhammad SAW secara bertahap selama kurang lebih...",
        option_a: "10 tahun",
        option_b: "15 tahun",
        option_c: "22 tahun 2 bulan 22 hari",
        option_d: "25 tahun",
        correct_answer: "C",
        explanation: "Al-Qur'an diturunkan secara berangsur-angsur selama 22 tahun 2 bulan 22 hari."
      },
      {
        subject: "BTQ",
        question_type: "multiple_choice",
        difficulty: "high",
        question_text: "Apabila ada Nun Sukun (نْ) bertemu dengan huruf Kaf (ك), maka hukum bacaannya adalah...",
        option_a: "Izhar Halqi",
        option_b: "Ikhfa Haqiqi",
        option_c: "Idgham Bighunnah",
        option_d: "Iqlab",
        correct_answer: "B",
        explanation: "Huruf Kaf merupakan salah satu dari 15 huruf Ikhfa Haqiqi sehingga dibaca samar-samar."
      },
      {
        subject: "BTQ",
        question_type: "multiple_choice",
        difficulty: "medium",
        question_text: "Hukum bacaan Alif Lam Syamsiyah dibaca secara...",
        option_a: "Jelas dan tegas",
        option_b: "Mendengung / melebur ke huruf berikutnya",
        option_c: "Samar di bibir",
        option_d: "Membalik suara",
        correct_answer: "B",
        explanation: "Alif Lam Syamsiyah dibaca lebur ke dalam huruf syamsiyah setelahnya."
      }
    ];

    const jsonStr = JSON.stringify(templateData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_bank_soal_mapsi.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.info("Template JSON Diunduh", "Gunakan format contoh ini untuk mengisi soal PAI & BTQ");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        const rows = Array.isArray(parsed) ? parsed : [parsed];

        if (rows.length === 0) {
          toast.warning("Import gagal", "File JSON tidak berisi data soal");
          return;
        }

        const toInsert = rows.map((row: any) => {
          const mapelRaw = (row.subject || row.mapel || row.mata_pelajaran || "PAI").toString().toUpperCase();
          const subject: "PAI" | "BTQ" = mapelRaw.includes("BTQ") ? "BTQ" : "PAI";

          const typeRaw = (row.question_type || row.jenis || row.jenis_soal || "multiple_choice").toString().toLowerCase();
          const question_type: "multiple_choice" | "true_false" = typeRaw.includes("true") || typeRaw.includes("salah") || typeRaw.includes("benar") ? "true_false" : "multiple_choice";

          const diffRaw = (row.difficulty || row.level || row.kesulitan || "medium").toString().toLowerCase();
          let difficulty: "high" | "medium" | "low" = "medium";
          if (diffRaw.includes("high") || diffRaw.includes("hots") || diffRaw.includes("tinggi") || diffRaw.includes("sulit")) {
            difficulty = "high";
          } else if (diffRaw.includes("low") || diffRaw.includes("mudah") || diffRaw.includes("gampang")) {
            difficulty = "low";
          }

          const qText = (row.question_text || row.pertanyaan || row.soal || row.text || "").toString().trim();
          const optA = (row.option_a || row.pilihan_a || row.a || null)?.toString().trim() || null;
          const optB = (row.option_b || row.pilihan_b || row.b || null)?.toString().trim() || null;
          const optC = (row.option_c || row.pilihan_c || row.c || null)?.toString().trim() || null;
          const optD = (row.option_d || row.pilihan_d || row.d || null)?.toString().trim() || null;

          const ansRaw = (row.correct_answer || row.jawaban_benar || row.jawaban || "A").toString().trim().toUpperCase();
          const explanation = (row.explanation || row.pembahasan || row.penjelasan || null)?.toString().trim() || null;

          return {
            subject,
            question_type,
            difficulty,
            question_text: qText,
            option_a: question_type === "multiple_choice" ? optA : null,
            option_b: question_type === "multiple_choice" ? optB : null,
            option_c: question_type === "multiple_choice" ? optC : null,
            option_d: question_type === "multiple_choice" ? optD : null,
            correct_answer: ansRaw,
            explanation,
          };
        }).filter((q: any) => q.question_text);

        if (toInsert.length === 0) {
          toast.warning("Import gagal", "Tidak ada soal valid dalam file JSON");
          return;
        }

        const { error } = await supabase.from("questions").insert(toInsert);
        if (error) throw error;
        toast.success("Import JSON Berhasil", `${toInsert.length} soal berhasil diimport ke bank soal`);
        await refresh();
      } catch (err: unknown) {
        toast.error("Import JSON Gagal", err instanceof Error ? err.message : "Format file JSON tidak valid");
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <TopHeader
        title="Bank Soal PAI & BTQ"
        subtitle={`${questions.length} soal tersedia • ${paiCount} PAI • ${btqCount} BTQ`}
        role="admin"
        actions={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="clay-btn clay-btn-ghost clay-btn-sm" onClick={handleDownloadJsonTemplate} id="questions-template-btn">
              <FileCode size={14} /> Template JSON
            </button>
            <button className="clay-btn clay-btn-primary clay-btn-sm" onClick={() => fileRef.current?.click()} id="questions-import-btn">
              <Upload size={14} /> Import JSON
            </button>
          </div>
        }
      />
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImport} style={{ display: "none" }} />

      <div className="page-container">
        {/* Stats row */}
        <div className="grid-stats-5">
          {[
            { label: "Total Soal", value: questions.length, color: "var(--color-primary)" },
            { label: "PAI", value: paiCount, color: "var(--color-info)" },
            { label: "BTQ", value: btqCount, color: "var(--color-secondary)" },
            { label: "HOTS", value: questions.filter((q) => q.difficulty === "high").length, color: "var(--color-danger)" },
            { label: "Sedang", value: questions.filter((q) => q.difficulty === "medium").length, color: "var(--color-warning)" },
          ].map((s) => (
            <div key={s.label} className="clay-card-sm" style={{ padding: "0.85rem 0.5rem", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="clay-tabs" style={{ marginBottom: "1.25rem", display: "inline-flex", maxWidth: "100%", overflowX: "auto" }}>
          {(["all", "PAI", "BTQ"] as const).map((t) => (
            <button key={t} className={`clay-tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)} id={`questions-tab-${t}`}>
              {t === "all" ? `Semua (${questions.length})` : t === "PAI" ? `PAI (${paiCount})` : `BTQ (${btqCount})`}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search size={15} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }} />
            <input className="clay-input" style={{ paddingLeft: "2.4rem" }} placeholder="Cari teks soal..." value={search} onChange={(e) => setSearch(e.target.value)} id="questions-search" />
          </div>
          <select className="clay-select" style={{ flex: "0 0 140px" }} value={filterDiff} onChange={(e) => setFilterDiff(e.target.value)} id="questions-filter-diff">
            <option value="">Semua Level</option>
            <option value="high">HOTS</option>
            <option value="medium">Sedang</option>
            <option value="low">Mudah</option>
          </select>
          <select className="clay-select" style={{ flex: "0 0 160px" }} value={filterType} onChange={(e) => setFilterType(e.target.value)} id="questions-filter-type">
            <option value="">Semua Jenis</option>
            <option value="multiple_choice">Pilihan Ganda</option>
            <option value="true_false">Benar/Salah</option>
          </select>
        </div>

        {/* Table */}
        <div className="clay-table-wrapper">
          <table className="clay-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>No</th>
                <th>Mapel</th>
                <th style={{ width: "40%" }}>Pertanyaan</th>
                <th>Jenis</th>
                <th>Level</th>
                <th style={{ textAlign: "center" }}>Jawaban</th>
                <th style={{ textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><div className="clay-skeleton" style={{ height: 18 }} /></td>)}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="clay-empty-state">
                      <div className="clay-empty-icon"><BookOpen size={32} color="var(--color-primary)" /></div>
                      <p style={{ fontWeight: 700 }}>Belum ada soal</p>
                      <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Upload file JSON berisi kumpulan soal PAI & BTQ</p>
                      <button className="clay-btn clay-btn-primary" onClick={() => fileRef.current?.click()}>
                        <Upload size={14} /> Import JSON Soal
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((q, idx) => (
                  <tr key={q.id}>
                    <td style={{ color: "var(--color-text-muted)", fontWeight: 600, fontSize: "0.8rem" }}>{idx + 1}</td>

                    <td>
                      <span className={`clay-badge ${q.subject === "PAI" ? "clay-badge-info" : "clay-badge-secondary"}`}>{q.subject}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.4, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {q.question_text}
                      </div>
                      {q.question_type === "multiple_choice" && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                          A: {q.option_a?.substring(0, 30)}...
                        </div>
                      )}
                    </td>
                    <td><span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{TYPE_LABEL[q.question_type]}</span></td>
                    <td><span className={`clay-badge ${DIFFICULTY_BADGE[q.difficulty]}`}>{DIFFICULTY_LABEL[q.difficulty]}</span></td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 900,
                        fontSize: "0.9rem",
                        color: "var(--color-success)",
                        background: "var(--color-success-lighter)",
                        padding: "0.2rem 0.7rem",
                        borderRadius: "8px",
                      }}>
                        {q.correct_answer}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                        <button className="clay-btn clay-btn-ghost clay-btn-sm" style={{ padding: "0.3rem 0.6rem" }} onClick={() => { setEditTarget(q); setModalOpen(true); }} title="Edit" id={`edit-question-${q.id}`}><Edit2 size={14} /></button>
                        <button className="clay-btn clay-btn-sm" style={{ padding: "0.3rem 0.6rem", background: "var(--color-danger-lighter)", color: "var(--color-danger)", boxShadow: "var(--clay-shadow-sm)" }} onClick={() => setDeleteTarget(q)} title="Hapus" id={`delete-question-${q.id}`}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <QuestionModal initial={editTarget} sessions={sessions} onClose={() => { setModalOpen(false); setEditTarget(null); }} onSaved={refresh} />
      )}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Soal?"
        message="Soal ini akan dihapus secara permanen dari bank soal."
        confirmLabel="Ya, Hapus"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
