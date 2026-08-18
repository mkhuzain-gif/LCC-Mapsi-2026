"use client";

import { useState, useCallback, useRef } from "react";
import { TopHeader } from "@/components/shared/TopHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Search, Filter, Download, Upload, RefreshCw,
  Edit2, Trash2, Hash, QrCode, UserCheck, ChevronLeft,
  ChevronRight, X, ChevronUp, ChevronDown, FileSpreadsheet,
} from "lucide-react";
import type { Participant } from "@/lib/types/database";
import { participantSchema } from "@/lib/validations";
import * as XLSX from "xlsx";

type SortField = "full_name" | "draw_number" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;
const STAGES = ["stage_1", "stage_2", "stage_3", "stage_4", "stage_5", "stage_6"];
const GENDER_LABEL: Record<string, string> = { male: "Putra", female: "Putri" };
const STATUS_BADGE: Record<string, string> = {
  registered: "clay-badge-neutral",
  active: "clay-badge-info",
  submitted: "clay-badge-success",
  disqualified: "clay-badge-danger",
};
const STATUS_LABEL: Record<string, string> = {
  registered: "Terdaftar",
  active: "Aktif",
  submitted: "Selesai",
  disqualified: "Didiskualifikasi",
};

const getErrorMessage = (err: unknown): string => {
  if (!err) return "Terjadi kesalahan yang tidak diketahui";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (typeof obj.details === "string" && obj.details) return obj.details;
    if (typeof obj.hint === "string" && obj.hint) return obj.hint;
  }
  return "Gagal menyimpan peserta";
};

interface ParticipantModalProps {
  initial?: Participant | null;
  onClose: () => void;
  onSaved: () => void;
}

function ParticipantModal({ initial, onClose, onSaved }: ParticipantModalProps) {
  const supabase = createClient();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    draw_number: initial?.draw_number ?? "",
    full_name: initial?.full_name ?? "",
    gender: initial?.gender ?? "male",
    stage: initial?.stage ?? "",
    notes: initial?.notes ?? "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const drawNum = form.draw_number.trim() || null;
    let accessCode = initial?.access_code ?? null;
    if (drawNum && !accessCode) {
      accessCode = `P${drawNum}`;
    }

    const payload = {
      draw_number: drawNum,
      access_code: accessCode,
      full_name: form.full_name.trim(),
      gender: form.gender,
      school_name: initial?.school_name || "-",
      district: initial?.district || "-",
      contingent: null,
      stage: form.stage || null,
      notes: form.notes?.trim() || null,
    };

    const result = participantSchema.safeParse(payload);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errs[issue.path[0] as string] = issue.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsLoading(true);

    try {
      if (initial) {
        const { error } = await supabase
          .from("participants")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", initial.id);
        if (error) throw error;
        toast.success("Peserta diperbarui", `${form.full_name} berhasil diperbarui`);
      } else {
        const { error } = await supabase.from("participants").insert(payload);
        if (error) throw error;
        toast.success("Peserta ditambahkan", `${form.full_name} berhasil ditambahkan`);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      toast.error("Gagal menyimpan", msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="clay-modal-overlay" onClick={onClose}>
      <div className="clay-modal clay-modal-lg" style={{ padding: "2rem" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem" }}>
            {initial ? "Edit Peserta" : "Tambah Peserta Baru"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }} aria-label="Tutup">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ gridColumn: "1 / -1" }} className="form-group">
              <label className="form-label">Nama Lengkap *</label>
              <input className="clay-input" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Nama lengkap peserta" />
              {errors.full_name && <span className="form-error">{errors.full_name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">No. Undian</label>
              <input className="clay-input" value={form.draw_number} onChange={(e) => set("draw_number", e.target.value)} placeholder="Contoh: 001 (opsional)" />
              {errors.draw_number && <span className="form-error">{errors.draw_number}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Jenis Kelamin *</label>
              <select className="clay-select" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="male">Putra</option>
                <option value="female">Putri</option>
              </select>
              {errors.gender && <span className="form-error">{errors.gender}</span>}
            </div>

            <div style={{ gridColumn: "1 / -1" }} className="form-group">
              <label className="form-label">Tahap / Stage</label>
              <select className="clay-select" value={form.stage} onChange={(e) => set("stage", e.target.value)}>
                <option value="">-- Pilih Tahap --</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }} className="form-group">
              <label className="form-label">Catatan</label>
              <textarea
                className="clay-input"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Catatan tambahan (opsional)"
                rows={2}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
            <button type="button" className="clay-btn clay-btn-ghost" onClick={onClose} disabled={isLoading}>Batal</button>
            <button type="submit" className="clay-btn clay-btn-primary" disabled={isLoading} id="participant-modal-save-btn">
              {isLoading ? (
                <><span className="clay-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Menyimpan...</>
              ) : (
                <>{initial ? "Simpan Perubahan" : "Tambah Peserta"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main component
export function ParticipantsClient({ initialParticipants }: { initialParticipants: Participant[] }) {
  const supabase = createClient();
  const toast = useToast();

  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [sortField, setSortField] = useState<SortField>("draw_number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Participant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from("participants").select("*").order("draw_number");
    if (data) setParticipants(data);
    setIsLoading(false);
  }, [supabase]);

  // Filtering & sorting
  const filtered = participants
    .filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        p.full_name.toLowerCase().includes(q) ||
        (p.draw_number ?? "").toLowerCase().includes(q) ||
        (p.access_code ?? "").toLowerCase().includes(q);
      const matchGender = !filterGender || p.gender === filterGender;
      const matchStatus = !filterStatus || p.status === filterStatus;
      const matchStage = !filterStage || p.stage === filterStage;
      return matchSearch && matchGender && matchStatus && matchStage;
    })
    .sort((a, b) => {
      const va = (a[sortField] ?? "") as string;
      const vb = (b[sortField] ?? "") as string;
      const cmp = va.localeCompare(vb, "id");
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} style={{ opacity: 0.3 }} />;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  // Generate draw numbers
  const generateDrawNumbers = async () => {
    if (!confirm("Generate nomor undian untuk semua peserta yang belum memiliki nomor? Ini akan menimpa nomor yang sudah ada.")) return;
    setIsLoading(true);
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const updates = shuffled.map((p, i) => ({
      id: p.id,
      draw_number: String(i + 1).padStart(3, "0"),
      access_code: `P${String(i + 1).padStart(3, "0")}`,
    }));

    for (const upd of updates) {
      await supabase.from("participants").update({
        draw_number: upd.draw_number,
        access_code: upd.access_code,
      }).eq("id", upd.id);
    }
    toast.success("Nomor undian dibuat", `${updates.length} nomor undian berhasil digenerate`);
    await refresh();
    setIsLoading(false);
  };

  // Download Excel Template for Importing Participants
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "No. Undian": "001",
        "Nama Lengkap": "Ahmad Fauzi",
        "Jenis Kelamin": "Putra",
        "Tahap": "stage_1",
        "Catatan": "Peserta Utama",
      },
      {
        "No. Undian": "002",
        "Nama Lengkap": "Siti Nurhaliza",
        "Jenis Kelamin": "Putri",
        "Tahap": "stage_1",
        "Catatan": "",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 12 }, // No. Undian
      { wch: 25 }, // Nama Lengkap
      { wch: 15 }, // Jenis Kelamin
      { wch: 15 }, // Tahap
      { wch: 20 }, // Catatan
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Peserta");
    XLSX.writeFile(wb, "template_import_peserta_mapsi.xlsx");
    toast.info("Template diunduh", "Gunakan template ini untuk mengisi data peserta");
  };

  // Import from Excel
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

        const toInsert = rows.map((row) => {
          const drawNumRaw = row["No. Undian"] ?? row["no_undian"] ?? row["draw_number"] ?? null;
          const fullName = row["Nama Lengkap"] ?? row["nama_lengkap"] ?? row["full_name"] ?? "";
          const genderRaw = (row["Jenis Kelamin"] ?? row["gender"] ?? "male").toString().trim().toLowerCase();
          const gender = genderRaw.includes("putri") || genderRaw === "female" || genderRaw === "p" ? "female" : "male";
          const stage = row["Tahap"] ?? row["stage"] ?? "";
          const notes = row["Catatan"] ?? row["notes"] ?? "";

          const cleanDrawNum = drawNumRaw ? String(drawNumRaw).trim() : null;
          const accessCode = cleanDrawNum ? `P${cleanDrawNum}` : null;

          return {
            draw_number: cleanDrawNum,
            access_code: accessCode,
            full_name: String(fullName).trim(),
            gender,
            school_name: row["Sekolah"] ?? row["school_name"] ?? "-",
            district: row["Kabupaten/Kota"] ?? row["district"] ?? "-",
            contingent: null,
            stage: stage ? String(stage).trim() : null,
            notes: notes ? String(notes).trim() : null,
          };
        }).filter((p) => p.full_name);

        if (toInsert.length === 0) {
          toast.warning("Import gagal", "Tidak ada data valid dalam file Excel");
          return;
        }

        const { error } = await supabase.from("participants").insert(toInsert);
        if (error) throw error;
        toast.success("Import berhasil", `${toInsert.length} peserta berhasil diimport`);
        await refresh();
      } catch (err: unknown) {
        const msg = getErrorMessage(err);
        toast.error("Import gagal", msg);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Export to Excel
  const handleExport = () => {
    const data = filtered.map((p, i) => ({
      No: i + 1,
      "No. Undian": p.draw_number ?? "-",
      "Nama Lengkap": p.full_name,
      "Jenis Kelamin": GENDER_LABEL[p.gender],
      "Tahap": p.stage ?? "-",
      "Status": STATUS_LABEL[p.status],
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Peserta");
    XLSX.writeFile(wb, `peserta-mapsi-xxvii-2026-${Date.now()}.xlsx`);
    toast.success("Export berhasil", `${data.length} data peserta berhasil diekspor`);
  };

  // Delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("participants").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Peserta dihapus", `${deleteTarget.full_name} berhasil dihapus`);
      setDeleteTarget(null);
      await refresh();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      toast.error("Gagal menghapus", msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <TopHeader
        title="Manajemen Peserta"
        subtitle={`${participants.length} peserta terdaftar`}
        role="admin"
        actions={
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="clay-btn clay-btn-ghost clay-btn-sm" onClick={() => refresh()} id="participants-refresh-btn">
              <RefreshCw size={14} />
            </button>
            <button className="clay-btn clay-btn-ghost clay-btn-sm" onClick={handleDownloadTemplate} id="participants-template-btn">
              <FileSpreadsheet size={14} /> Template Excel
            </button>
            <button className="clay-btn clay-btn-ghost clay-btn-sm" onClick={() => fileInputRef.current?.click()} id="participants-import-btn">
              <Upload size={14} /> Import Excel
            </button>
            <button className="clay-btn clay-btn-secondary clay-btn-sm" onClick={handleExport} id="participants-export-btn">
              <Download size={14} /> Export
            </button>
            <button className="clay-btn clay-btn-accent clay-btn-sm" onClick={generateDrawNumbers} id="participants-draw-btn">
              <Hash size={14} /> Generate Undian
            </button>
            <button
              className="clay-btn clay-btn-primary clay-btn-sm"
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              id="participants-add-btn"
            >
              <Plus size={14} /> Tambah
            </button>
          </div>
        }
      />

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: "none" }} aria-label="Import file Excel" />

      <div style={{ padding: "1.5rem 2rem" }}>
        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
            <Search size={15} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }} />
            <input
              className="clay-input"
              style={{ paddingLeft: "2.4rem" }}
              placeholder="Cari nama, nomor undian..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              id="participants-search"
            />
          </div>

          <select className="clay-select" style={{ flex: "0 0 140px" }} value={filterGender} onChange={(e) => { setFilterGender(e.target.value); setPage(1); }} id="participants-filter-gender">
            <option value="">Semua JK</option>
            <option value="male">Putra</option>
            <option value="female">Putri</option>
          </select>

          <select className="clay-select" style={{ flex: "0 0 160px" }} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} id="participants-filter-status">
            <option value="">Semua Status</option>
            <option value="registered">Terdaftar</option>
            <option value="active">Aktif</option>
            <option value="submitted">Selesai</option>
            <option value="disqualified">Didiskualifikasi</option>
          </select>

          <select className="clay-select" style={{ flex: "0 0 150px" }} value={filterStage} onChange={(e) => { setFilterStage(e.target.value); setPage(1); }} id="participants-filter-stage">
            <option value="">Semua Tahap</option>
            {STAGES.map((s) => <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>)}
          </select>

          {(search || filterGender || filterStatus || filterStage) && (
            <button
              className="clay-btn clay-btn-ghost clay-btn-sm"
              onClick={() => { setSearch(""); setFilterGender(""); setFilterStatus(""); setFilterStage(""); setPage(1); }}
              id="participants-clear-filter-btn"
            >
              <X size={14} /> Reset
            </button>
          )}
        </div>

        {/* Results info */}
        <div style={{ fontSize: "0.825rem", color: "var(--color-text-muted)", fontWeight: 600, marginBottom: "0.75rem" }}>
          Menampilkan {paginated.length} dari {filtered.length} peserta
          {(search || filterGender || filterStatus || filterStage) && ` (difilter dari ${participants.length} total)`}
        </div>

        {/* Table */}
        <div className="clay-table-wrapper">
          <table className="clay-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>No</th>
                <th onClick={() => toggleSort("draw_number")} style={{ cursor: "pointer" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>No. Undian <SortIcon field="draw_number" /></span>
                </th>
                <th onClick={() => toggleSort("full_name")} style={{ cursor: "pointer" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>Nama <SortIcon field="full_name" /></span>
                </th>
                <th>JK</th>
                <th onClick={() => toggleSort("status")} style={{ cursor: "pointer" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>Status <SortIcon field="status" /></span>
                </th>
                <th style={{ textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="clay-skeleton" style={{ height: 20, borderRadius: 8 }} /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="clay-empty-state">
                      <div className="clay-empty-icon"><UserCheck size={32} color="var(--color-primary)" /></div>
                      <p style={{ fontWeight: 700 }}>Tidak ada peserta ditemukan</p>
                      <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                        Coba ubah filter atau tambah peserta baru
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((p, idx) => (
                  <tr key={p.id}>
                    <td style={{ color: "var(--color-text-muted)", fontWeight: 600, fontSize: "0.8rem" }}>
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td>
                      <span style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 900,
                        fontSize: "0.9rem",
                        color: "var(--color-primary)",
                        background: "var(--color-primary-lighter)",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "8px",
                      }}>
                        {p.draw_number ?? "—"}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{p.full_name}</div>
                    </td>
                    <td>
                      <span className={`clay-badge ${p.gender === "male" ? "clay-badge-info" : "clay-badge-primary"}`}>
                        {GENDER_LABEL[p.gender]}
                      </span>
                    </td>
                    <td>
                      <span className={`clay-badge ${STATUS_BADGE[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                        <button
                          className="clay-btn clay-btn-ghost clay-btn-sm"
                          style={{ padding: "0.3rem 0.6rem" }}
                          onClick={() => { setEditTarget(p); setModalOpen(true); }}
                          title="Edit"
                          id={`edit-participant-${p.id}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="clay-btn clay-btn-sm"
                          style={{ padding: "0.3rem 0.6rem", background: "var(--color-danger-lighter)", color: "var(--color-danger)", boxShadow: "var(--clay-shadow-sm)" }}
                          onClick={() => setDeleteTarget(p)}
                          title="Hapus"
                          id={`delete-participant-${p.id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
            <button
              className="clay-btn clay-btn-ghost clay-btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              id="participants-prev-btn"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: "var(--color-text-muted)" }}>…</span>}
                  <button
                    className={`clay-btn clay-btn-sm ${page === p ? "clay-btn-primary" : "clay-btn-ghost"}`}
                    style={{ minWidth: 36 }}
                    onClick={() => setPage(p)}
                    id={`participants-page-${p}`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              className="clay-btn clay-btn-ghost clay-btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              id="participants-next-btn"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalOpen && (
        <ParticipantModal
          initial={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSaved={refresh}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Peserta?"
        message={`Peserta "${deleteTarget?.full_name}" akan dihapus secara permanen. Semua data ujian terkait juga akan terhapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
