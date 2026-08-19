"use client";

import { useState, useCallback } from "react";
import { TopHeader } from "@/components/shared/TopHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Edit2, Trash2, X, CalendarClock, Play, Square,
  Key, Eye, EyeOff, Copy, CheckCircle, Lock,
} from "lucide-react";
import type { ExamSession } from "@/lib/types/database";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const STATUS_BADGE: Record<string, string> = {
  scheduled: "clay-badge-warning",
  active: "clay-badge-success",
  completed: "clay-badge-neutral",
  cancelled: "clay-badge-danger",
};
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Terjadwal",
  active: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

interface SessionModalProps {
  initial?: ExamSession | null;
  onClose: () => void;
  onSaved: () => void;
}

function SessionModal({ initial, onClose, onSaved }: SessionModalProps) {
  const supabase = createClient();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    stage: initial?.stage ?? "stage_1",
    duration_minutes: initial?.duration_minutes ?? 90,
    start_time: initial?.start_time ? format(new Date(initial.start_time), "yyyy-MM-dd'T'HH:mm") : "",
    end_time: initial?.end_time ? format(new Date(initial.end_time), "yyyy-MM-dd'T'HH:mm") : "",
    description: initial?.description ?? "",
    ranking_visible: initial?.ranking_visible ?? false,
    token: initial?.token ?? generateToken(),
  });

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Judul sesi harus diisi"); return; }
    setIsLoading(true);
    try {
      const payload = {
        title: form.title,
        stage: form.stage,
        duration_minutes: form.duration_minutes,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        description: form.description || null,
        ranking_visible: form.ranking_visible,
        token: form.token.toUpperCase(),
      };

      if (initial) {
        const { error } = await supabase.from("exam_sessions").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", initial.id);
        if (error) throw error;
        toast.success("Sesi diperbarui");
      } else {
        const { error } = await supabase.from("exam_sessions").insert({ ...payload, status: "scheduled", token_active: false });
        if (error) throw error;
        toast.success("Sesi ujian dibuat");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error("Gagal menyimpan sesi", err instanceof Error ? err.message : "");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="clay-modal-overlay" onClick={onClose}>
      <div className="clay-modal" style={{ padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem" }}>
            {initial ? "Edit Sesi Ujian" : "Buat Sesi Ujian Baru"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">Judul Sesi *</label>
            <input className="clay-input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Contoh: LCC MAPSI XXVII — Tahap 1" />
          </div>

          <div className="modal-grid-2">
            <div className="form-group">
              <label className="form-label">Tahap</label>
              <select className="clay-select" value={form.stage} onChange={(e) => set("stage", e.target.value)}>
                {["stage_1","stage_2","stage_3","stage_4","stage_5","stage_6"].map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Durasi (menit)</label>
              <input className="clay-input" type="number" min={10} max={180} value={form.duration_minutes} onChange={(e) => set("duration_minutes", parseInt(e.target.value))} />
            </div>
          </div>

          <div className="modal-grid-2">
            <div className="form-group">
              <label className="form-label">Waktu Mulai</label>
              <input className="clay-input" type="datetime-local" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Waktu Selesai</label>
              <input className="clay-input" type="datetime-local" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">Token Ujian *</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                className="clay-input"
                value={form.token}
                onChange={(e) => set("token", e.target.value.toUpperCase())}
                style={{ fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.1em", flex: 1, minWidth: 140 }}
                placeholder="TOKEN"
              />
              <button type="button" className="clay-btn clay-btn-ghost clay-btn-sm" onClick={() => set("token", generateToken())} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                Generate Baru
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">Deskripsi</label>
            <textarea className="clay-input" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} style={{ resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <input
              type="checkbox"
              id="ranking_visible_checkbox"
              checked={form.ranking_visible}
              onChange={(e) => set("ranking_visible", e.target.checked)}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="ranking_visible_checkbox" style={{ fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}>
              Tampilkan ranking secara publik (untuk layar besar)
            </label>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button type="button" className="clay-btn clay-btn-ghost" onClick={onClose} disabled={isLoading}>Batal</button>
            <button type="submit" className="clay-btn clay-btn-primary" disabled={isLoading} id="session-modal-save-btn">
              {isLoading ? <><span className="clay-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Menyimpan...</> : (initial ? "Simpan" : "Buat Sesi")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SessionsClient({ initialSessions }: { initialSessions: ExamSession[] }) {
  const supabase = createClient();
  const toast = useToast();
  const [sessions, setSessions] = useState<ExamSession[]>(initialSessions);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExamSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from("exam_sessions").select("*").order("created_at", { ascending: false });
    if (data) setSessions(data);
    setIsLoading(false);
  }, [supabase]);

  const toggleStatus = async (session: ExamSession, newStatus: "active" | "scheduled" | "completed") => {
    setIsLoading(true);
    try {
      const update: Partial<ExamSession> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "active") {
        update.start_time = new Date().toISOString();
        update.token_active = true;
      }
      if (newStatus === "completed") {
        update.end_time = new Date().toISOString();
        update.token_active = false;
      }
      const { error } = await supabase.from("exam_sessions").update(update).eq("id", session.id);
      if (error) throw error;
      toast.success(
        newStatus === "active" ? "Ujian dimulai!" :
        newStatus === "completed" ? "Ujian dihentikan" : "Status diubah"
      );
      await refresh();
    } catch (err: unknown) {
      toast.error("Gagal mengubah status", err instanceof Error ? err.message : "");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleToken = async (session: ExamSession) => {
    const { error } = await supabase.from("exam_sessions").update({ token_active: !session.token_active }).eq("id", session.id);
    if (error) { toast.error("Gagal mengubah token"); return; }
    toast.success(session.token_active ? "Token dinonaktifkan" : "Token diaktifkan");
    await refresh();
  };

  const copyToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(id);
      toast.success("Token disalin!");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("exam_sessions").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Sesi dihapus");
      setDeleteTarget(null);
      await refresh();
    } catch (err: unknown) {
      toast.error("Gagal menghapus", err instanceof Error ? err.message : "");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <TopHeader
        title="Manajemen Sesi Ujian"
        subtitle={`${sessions.length} sesi tersedia`}
        role="admin"
        actions={
          <button className="clay-btn clay-btn-primary clay-btn-sm" onClick={() => { setEditTarget(null); setModalOpen(true); }} id="sessions-add-btn">
            <Plus size={14} /> Buat Sesi
          </button>
        }
      />

      <div className="page-container">
        {sessions.length === 0 ? (
          <div className="clay-card" style={{ padding: "4rem 2rem" }}>
            <div className="clay-empty-state">
              <div className="clay-empty-icon"><CalendarClock size={36} color="var(--color-primary)" /></div>
              <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>Belum ada sesi ujian</p>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Buat sesi ujian untuk memulai kompetisi</p>
              <button className="clay-btn clay-btn-primary" onClick={() => setModalOpen(true)}>+ Buat Sesi</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {sessions.map((session) => (
              <div key={session.id} className="clay-card" style={{ padding: "1.25rem", width: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Main info & status */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", wordBreak: "break-word" }}>
                          {session.title}
                        </h3>
                        <span className={`clay-badge ${STATUS_BADGE[session.status]}`}>
                          {session.status === "active" && <span className="status-dot status-dot-live" style={{ width: 8, height: 8 }} />}
                          {STATUS_LABEL[session.status]}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.85rem 1.25rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                          📋 {session.stage.replace("_", " ").toUpperCase()}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                          ⏱️ {session.duration_minutes} menit
                        </span>
                        {session.start_time && (
                          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                            🕐 {format(new Date(session.start_time), "dd MMM yyyy HH:mm", { locale: id })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Token section and Action buttons in responsive flex wrap */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    {/* Token section */}
                    <div
                      style={{
                        background: "var(--color-surface-2)",
                        borderRadius: "14px",
                        padding: "0.5rem 0.85rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        border: `2px solid ${session.token_active ? "var(--color-success-light)" : "var(--color-border)"}`,
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Key size={15} color={session.token_active ? "var(--color-success)" : "var(--color-text-muted)"} style={{ flexShrink: 0 }} />
                        <code style={{
                          fontFamily: "monospace",
                          fontWeight: 900,
                          fontSize: "1rem",
                          letterSpacing: "0.08em",
                          color: session.token_active ? "var(--color-success)" : "var(--color-text-muted)",
                          filter: showToken[session.id] ? "none" : "blur(4px)",
                          userSelect: showToken[session.id] ? "auto" : "none",
                          transition: "filter 0.2s",
                        }}>
                          {session.token}
                        </code>
                        <button
                          type="button"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "2px", display: "flex", alignItems: "center" }}
                          onClick={() => setShowToken((s) => ({ ...s, [session.id]: !s[session.id] }))}
                          title={showToken[session.id] ? "Sembunyikan" : "Tampilkan"}
                        >
                          {showToken[session.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "2px", display: "flex", alignItems: "center" }}
                          onClick={() => copyToken(session.token, session.id)}
                          title="Salin token"
                          id={`copy-token-${session.id}`}
                        >
                          {copied === session.id ? <CheckCircle size={15} color="var(--color-success)" /> : <Copy size={15} />}
                        </button>
                      </div>
                      <button
                        type="button"
                        className={`clay-btn clay-btn-sm ${session.token_active ? "clay-btn-ghost" : "clay-btn-success"}`}
                        onClick={() => toggleToken(session)}
                        id={`toggle-token-${session.id}`}
                        style={{ whiteSpace: "nowrap", padding: "0.3rem 0.75rem", fontSize: "0.78rem" }}
                      >
                        {session.token_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
                      {session.status === "scheduled" && (
                        <button
                          type="button"
                          className="clay-btn clay-btn-success clay-btn-sm"
                          onClick={() => toggleStatus(session, "active")}
                          id={`start-session-${session.id}`}
                        >
                          <Play size={14} /> Mulai
                        </button>
                      )}
                      {session.status === "active" && (
                        <button
                          type="button"
                          className="clay-btn clay-btn-danger clay-btn-sm"
                          onClick={() => toggleStatus(session, "completed")}
                          id={`stop-session-${session.id}`}
                        >
                          <Square size={14} /> Hentikan
                        </button>
                      )}
                      {session.status === "completed" && (
                        <span className="clay-badge clay-badge-neutral" style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem" }}>
                          <Lock size={12} /> Selesai
                        </span>
                      )}
                      <button
                        type="button"
                        className="clay-btn clay-btn-ghost clay-btn-sm"
                        onClick={() => { setEditTarget(session); setModalOpen(true); }}
                        id={`edit-session-${session.id}`}
                        title="Edit sesi"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="clay-btn clay-btn-sm"
                        style={{ background: "var(--color-danger-lighter)", color: "var(--color-danger)", boxShadow: "var(--clay-shadow-sm)" }}
                        onClick={() => setDeleteTarget(session)}
                        id={`delete-session-${session.id}`}
                        title="Hapus sesi"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <SessionModal initial={editTarget} onClose={() => { setModalOpen(false); setEditTarget(null); }} onSaved={refresh} />
      )}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Sesi Ujian?"
        message={`Sesi "${deleteTarget?.title}" dan semua data ujian terkait akan dihapus permanen.`}
        confirmLabel="Ya, Hapus"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
