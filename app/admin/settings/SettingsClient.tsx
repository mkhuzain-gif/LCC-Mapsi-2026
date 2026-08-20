"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TopHeader } from "@/components/shared/TopHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import {
  Settings, Upload, Save, RotateCcw, Image as ImageIcon,
  Type, Hash, Calendar, Trash2, CheckCircle, Users,
  UserPlus, Key, Shield, Eye, EyeOff, Edit2, RefreshCw,
  Search, Lock, Check, UserCheck, AlertCircle, Info,
} from "lucide-react";
import type { UserRole, Profile } from "@/lib/types/database";

export const APP_CONFIG_KEY = "mapsi_app_config";

export interface AppConfig {
  appName: string;       // contoh: "LCC MAPSI"
  appSubtitle: string;   // contoh: "XXVII 2026"
  eventYear: string;     // contoh: "2026"
  edition: string;       // contoh: "XXVII"
  logoDataUrl: string;   // base64 atau ""
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  appName: "LCC MAPSI",
  appSubtitle: "XXVII 2026",
  eventYear: "2026",
  edition: "XXVII",
  logoDataUrl: "",
};

export function loadAppConfig(): AppConfig {
  if (typeof window === "undefined") return DEFAULT_APP_CONFIG;
  try {
    const saved = localStorage.getItem(APP_CONFIG_KEY);
    if (saved) return { ...DEFAULT_APP_CONFIG, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_APP_CONFIG;
}

export function saveAppConfig(cfg: AppConfig) {
  if (typeof window !== "undefined") {
    localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent("mapsi_config_changed", { detail: cfg }));
  }
}

interface SettingsClientProps {
  role: UserRole;
  currentUser?: {
    id: string;
    email: string;
    fullName: string;
  };
}

export function SettingsClient({ role, currentUser }: SettingsClientProps) {
  const toast = useToast();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<"general" | "users" | "security">("general");

  // Logo & App Name Config State
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Users Management State
  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "committee" as UserRole,
  });

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "committee" as UserRole,
    password: "",
  });

  // Delete User State
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Own Password Change State
  const [ownPasswordForm, setOwnPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showOwnPassword, setShowOwnPassword] = useState(false);
  const [isUpdatingOwnPassword, setIsUpdatingOwnPassword] = useState(false);

  // Load config on mount
  useEffect(() => {
    const cfg = loadAppConfig();
    setConfig(cfg);
    setPreviewUrl(cfg.logoDataUrl);
  }, []);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      // First try API route
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const json = await res.json();
        if (json.users) {
          setUsersList(json.users);
          setIsLoadingUsers(false);
          return;
        }
      }

      // Fallback directly query Supabase profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["admin", "committee"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
      } else if (data) {
        setUsersList(data as Profile[]);
      }
    } catch (err) {
      console.error("fetchUsers catch:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  // Handle Logo Upload
  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Format Tidak Valid", "Hanya file gambar (PNG, JPG, SVG, WebP) yang diperbolehkan.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File Terlalu Besar", "Ukuran logo maksimal 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewUrl(dataUrl);
      setConfig((prev) => ({ ...prev, logoDataUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoFile(file);
  };

  const handleRemoveLogo = () => {
    setPreviewUrl("");
    setConfig((prev) => ({ ...prev, logoDataUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveConfig = () => {
    saveAppConfig(config);
    setIsSaved(true);
    toast.success("Pengaturan Disimpan", "Logo dan identitas aplikasi berhasil diperbarui.");
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetConfig = () => {
    setConfig(DEFAULT_APP_CONFIG);
    setPreviewUrl("");
    saveAppConfig(DEFAULT_APP_CONFIG);
    toast.info("Reset Berhasil", "Pengaturan dikembalikan ke bawaan.");
  };

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email || !addForm.email.includes("@")) {
      toast.error("Input Tidak Valid", "Masukkan alamat email yang valid");
      return;
    }
    if (!addForm.password || addForm.password.length < 6) {
      toast.error("Password Terlalu Pendek", "Password minimal harus 6 karakter");
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat akun");
      }

      toast.success("Akun Berhasil Dibuat", data.message || `Akun ${addForm.email} siap digunakan.`);
      setShowAddModal(false);
      setAddForm({
        full_name: "",
        email: "",
        password: "",
        role: "committee",
      });
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal Membuat Akun", msg);
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Handle Edit User
  const handleOpenEditUser = (user: Profile) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || "",
      role: user.role,
      password: "",
    });
    setShowEditPassword(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdatingUser(true);
    try {
      const payload: Record<string, unknown> = {
        id: editingUser.id,
        full_name: editForm.full_name,
        role: editForm.role,
      };
      if (editForm.password && editForm.password.trim().length >= 6) {
        payload.password = editForm.password.trim();
      }

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui pengguna");
      }

      toast.success("Berhasil Diperbarui", "Data pengguna dan hak akses telah diperbarui.");
      setEditingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal Memperbarui", msg);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users?id=${userToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus pengguna");
      }

      toast.success("Akun Dihapus", `Akun ${userToDelete.email} berhasil dihapus.`);
      setUserToDelete(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal Menghapus", msg);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Handle Own Password Change
  const handleUpdateOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ownPasswordForm.newPassword.length < 6) {
      toast.error("Password Kurang Panjang", "Password baru minimal 6 karakter.");
      return;
    }
    if (ownPasswordForm.newPassword !== ownPasswordForm.confirmPassword) {
      toast.error("Password Tidak Cocok", "Konfirmasi password baru tidak cocok.");
      return;
    }

    setIsUpdatingOwnPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: ownPasswordForm.newPassword,
      });

      if (error) {
        throw error;
      }

      toast.success("Password Berhasil Diganti", "Silakan gunakan password baru ini pada login berikutnya.");
      setOwnPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengganti password";
      toast.error("Gagal", msg);
    } finally {
      setIsUpdatingOwnPassword(false);
    }
  };

  // Filtered Users List
  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      (u.email || "").toLowerCase().includes(q) ||
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <TopHeader
        title="Pengaturan Aplikasi"
        subtitle="Kelola logo, identitas kompetisi, serta akun Dewan Juri dan Administrator"
        role={role}
        actions={
          activeTab === "general" ? (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="clay-btn clay-btn-ghost clay-btn-sm"
                onClick={handleResetConfig}
                id="settings-reset-btn"
              >
                <RotateCcw size={14} /> Reset Default
              </button>
              <button
                className="clay-btn clay-btn-primary clay-btn-sm"
                onClick={handleSaveConfig}
                id="settings-save-btn"
                style={isSaved ? { background: "var(--color-success)" } : {}}
              >
                {isSaved ? <CheckCircle size={14} /> : <Save size={14} />}
                {isSaved ? "Tersimpan!" : "Simpan Pengaturan"}
              </button>
            </div>
          ) : activeTab === "users" ? (
            <button
              className="clay-btn clay-btn-primary clay-btn-sm"
              onClick={() => setShowAddModal(true)}
              id="add-user-top-btn"
            >
              <UserPlus size={15} /> Tambah Akun Juri / Admin
            </button>
          ) : null
        }
      />

      <div className="page-container" style={{ maxWidth: 940 }}>

        {/* Tab Navigation */}
        <div
          className="clay-tabs"
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            className={`clay-tab ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", flex: "1 1 auto", justifyContent: "center" }}
            id="tab-btn-general"
          >
            <Settings size={16} /> Identitas & Logo
          </button>
          <button
            type="button"
            className={`clay-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", flex: "1 1 auto", justifyContent: "center" }}
            id="tab-btn-users"
          >
            <Users size={16} /> Akun Juri & Panitia
          </button>
          <button
            type="button"
            className={`clay-tab ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", flex: "1 1 auto", justifyContent: "center" }}
            id="tab-btn-security"
          >
            <Shield size={16} /> Keamanan & Password Saya
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: IDENTITAS & LOGO APLIKASI */}
        {/* ============================================================ */}
        {activeTab === "general" && (
          <div>
            {/* Logo Section */}
            <div className="clay-card" style={{ marginBottom: "1.5rem", padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "linear-gradient(135deg, var(--color-primary-lighter), var(--color-primary-light))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ImageIcon size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>
                    Logo Aplikasi
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    Upload logo resmi untuk ditampilkan di sidebar dan halaman login
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "start" }}>
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    flex: 1,
                    minWidth: 220,
                    border: `2px dashed ${isDragging ? "var(--color-primary)" : "var(--color-border)"}`,
                    borderRadius: 16,
                    padding: "2rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.75rem",
                    cursor: "pointer",
                    background: isDragging ? "var(--color-primary-lighter)" : "var(--color-surface-2)",
                    transition: "all 0.2s ease",
                    textAlign: "center",
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: "var(--color-primary-lighter)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Upload size={24} color="var(--color-primary)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                      {isDragging ? "Lepaskan file di sini" : "Klik atau Seret & Lepas"}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                      PNG, JPG, SVG, WebP • Maks 2 MB
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div style={{
                  width: 130,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.75rem",
                }}>
                  <div style={{
                    width: 110,
                    height: 110,
                    borderRadius: 20,
                    background: "var(--color-surface-2)",
                    border: "2px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    boxShadow: "var(--clay-shadow-sm)",
                  }}>
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview Logo"
                        style={{ width: "100%", height: "100%", objectFit: "contain", padding: "0.5rem" }}
                      />
                    ) : (
                      <div style={{ textAlign: "center", color: "var(--color-text-light)" }}>
                        <ImageIcon size={28} />
                        <div style={{ fontSize: "0.7rem", marginTop: "0.3rem" }}>Belum ada logo</div>
                      </div>
                    )}
                  </div>
                  {previewUrl && (
                    <button
                      type="button"
                      className="clay-btn clay-btn-ghost clay-btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleRemoveLogo(); }}
                      style={{ color: "var(--color-danger)", fontSize: "0.75rem", width: "100%" }}
                    >
                      <Trash2 size={13} /> Hapus Logo
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
                id="settings-logo-input"
              />
            </div>

            {/* Nama & Identitas Section */}
            <div className="clay-card" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "linear-gradient(135deg, #fef3c7, #fbbf24)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Type size={18} color="var(--color-warning)" />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>
                    Nama & Identitas Aplikasi
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    Dapat disesuaikan secara instan untuk tiap edisi lomba tanpa coding
                  </div>
                </div>
              </div>

              <div className="grid-settings-form">
                {/* App Name */}
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Type size={14} color="var(--color-primary)" /> Nama Aplikasi
                  </label>
                  <input
                    className="clay-input"
                    id="settings-app-name"
                    value={config.appName}
                    onChange={(e) => setConfig((p) => ({ ...p, appName: e.target.value }))}
                    placeholder="Contoh: LCC MAPSI"
                    style={{ fontWeight: 700 }}
                  />
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>
                    Nama utama yang tampil di sidebar (baris pertama)
                  </div>
                </div>

                {/* Edition */}
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Hash size={14} color="var(--color-primary)" /> Edisi / Angka Romawi
                  </label>
                  <input
                    className="clay-input"
                    id="settings-edition"
                    value={config.edition}
                    onChange={(e) => setConfig((p) => ({ ...p, edition: e.target.value }))}
                    placeholder="Contoh: XXVII"
                  />
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>
                    Angka edisi penyelenggaraan
                  </div>
                </div>

                {/* Year */}
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Calendar size={14} color="var(--color-primary)" /> Tahun Pelaksanaan
                  </label>
                  <input
                    className="clay-input"
                    id="settings-year"
                    value={config.eventYear}
                    onChange={(e) => setConfig((p) => ({
                      ...p,
                      eventYear: e.target.value,
                      appSubtitle: `${config.edition} ${e.target.value}`,
                    }))}
                    placeholder="Contoh: 2026"
                    maxLength={4}
                  />
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>
                    Tahun penyelenggaraan LCC MAPSI
                  </div>
                </div>

                {/* Subtitle preview */}
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Settings size={14} color="var(--color-primary)" /> Subtitle Sidebar (otomatis)
                  </label>
                  <input
                    className="clay-input"
                    id="settings-subtitle"
                    value={config.appSubtitle}
                    onChange={(e) => setConfig((p) => ({ ...p, appSubtitle: e.target.value }))}
                    placeholder="Contoh: XXVII 2026"
                  />
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>
                    Teks baris kedua di bawah nama aplikasi pada sidebar
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div style={{
                marginTop: "1.5rem",
                padding: "1rem 1.25rem",
                borderRadius: 14,
                background: "var(--color-surface-2)",
                border: "1.5px solid var(--color-border)",
              }}>
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 700, marginBottom: "0.6rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Preview Sidebar Logo
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "14px",
                    background: "linear-gradient(135deg, var(--color-primary-light), var(--color-primary))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "var(--clay-shadow-sm)", flexShrink: 0, overflow: "hidden",
                  }}>
                    {previewUrl ? (
                      <img src={previewUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "3px" }} />
                    ) : (
                      <Settings size={22} color="white" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.9rem", color: "var(--color-primary)" }}>
                      {config.appName || "LCC MAPSI"}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                      {config.appSubtitle || "XXVII 2026"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: MANAJEMEN AKUN JURI & PANITIA (DATABASE DIRECT) */}
        {/* ============================================================ */}
        {activeTab === "users" && (
          <div>
            {/* Info Banner */}
            <div
              className="clay-alert clay-alert-info"
              style={{ marginBottom: "1.25rem", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}
            >
              <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: "0.82rem", lineHeight: 1.5 }}>
                <strong>Akun Terintegrasi Database:</strong> Tambahkan akun untuk <strong>Dewan Juri</strong> atau <strong>Panitia</strong> di bawah ini. Ketika perangkat dibawa oleh juri, juri dapat langsung memasukkan email &amp; password mereka pada halaman Login tanpa perlu konfigurasi tambahan.
              </div>
            </div>

            {/* Main Users Card */}
            <div className="clay-card" style={{ padding: "1.5rem" }}>
              {/* Header & Filter Controls */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg, #cffafe, #22d3ee)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Users size={18} color="var(--color-secondary)" />
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>
                      Daftar Akun Pengguna (Juri &amp; Admin)
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      {usersList.length} Akun terdaftar di database Supabase
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    type="button"
                    className="clay-btn clay-btn-ghost clay-btn-sm"
                    onClick={fetchUsers}
                    disabled={isLoadingUsers}
                    title="Refresh Data"
                  >
                    <RefreshCw size={14} className={isLoadingUsers ? "animate-spin" : ""} /> Refresh
                  </button>
                  <button
                    type="button"
                    className="clay-btn clay-btn-primary clay-btn-sm"
                    onClick={() => setShowAddModal(true)}
                    id="add-user-btn"
                  >
                    <UserPlus size={14} /> + Tambah Juri / Admin
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ position: "relative", marginBottom: "1.25rem" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.85rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  className="clay-input"
                  style={{ paddingLeft: "2.4rem", fontSize: "0.85rem" }}
                  placeholder="Cari nama juri, email, atau role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              {/* Table / User List */}
              {isLoadingUsers ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                  <div className="clay-spinner" style={{ margin: "0 auto 1rem" }} />
                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                    Memuat data akun pengguna dari database...
                  </div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--color-text-muted)" }}>
                  <Users size={36} style={{ margin: "0 auto 0.5rem", opacity: 0.5 }} />
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Tidak Ada Akun Pengguna</div>
                  <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    {userSearch ? "Tidak ditemukan pengguna yang cocok dengan pencarian." : "Klik '+ Tambah Juri / Admin' untuk membuat akun juri baru."}
                  </div>
                </div>
              ) : (
                <div className="clay-table-wrapper" style={{ boxShadow: "none", border: "1px solid var(--color-border)", borderRadius: 14 }}>
                  <table className="clay-table">
                    <thead>
                      <tr>
                        <th>Nama Pengguna / Identitas</th>
                        <th>Email Login</th>
                        <th>Hak Akses / Peran</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const isCurrent = currentUser?.id === u.id || currentUser?.email === u.email;
                        const isJuri = u.role === "committee";
                        return (
                          <tr key={u.id}>
                            {/* Full Name & Avatar */}
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: "50%",
                                    background: isJuri
                                      ? "linear-gradient(135deg, var(--color-secondary-light), var(--color-secondary))"
                                      : "linear-gradient(135deg, var(--color-primary-light), var(--color-primary))",
                                    color: "white",
                                    fontWeight: 800,
                                    fontSize: "0.8rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  {(u.full_name || u.email || "U").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                                    {u.full_name || (isJuri ? "Dewan Juri" : "Admin")}
                                  </div>
                                  {isCurrent && (
                                    <span style={{ fontSize: "0.68rem", color: "var(--color-primary)", fontWeight: 700 }}>
                                      ● Akun Anda yang Aktif
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td>
                              <span style={{ fontSize: "0.85rem", color: "var(--color-text)", fontFamily: "monospace" }}>
                                {u.email}
                              </span>
                            </td>

                            {/* Role Badge */}
                            <td>
                              {isJuri ? (
                                <span className="clay-badge clay-badge-secondary">
                                  ⚖️ Dewan Juri / Panitia
                                </span>
                              ) : (
                                <span className="clay-badge clay-badge-primary">
                                  👑 Administrator
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td>
                              <span className="clay-badge clay-badge-success">
                                <Check size={12} /> Aktif
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                                <button
                                  type="button"
                                  className="clay-btn clay-btn-ghost clay-btn-sm"
                                  onClick={() => handleOpenEditUser(u)}
                                  title="Edit Nama / Ganti Password Juri"
                                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                                >
                                  <Edit2 size={12} /> Edit / Password
                                </button>
                                <button
                                  type="button"
                                  className="clay-btn clay-btn-danger clay-btn-sm"
                                  onClick={() => setUserToDelete(u)}
                                  disabled={isCurrent}
                                  title={isCurrent ? "Tidak dapat menghapus akun Anda sendiri" : "Hapus Akun"}
                                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", opacity: isCurrent ? 0.4 : 1 }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: KEAMANAN & GANTI PASSWORD SAYA */}
        {/* ============================================================ */}
        {activeTab === "security" && (
          <div className="clay-card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, var(--color-primary-lighter), var(--color-primary))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Key size={18} color="white" />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>
                  Ganti Password Akun Saya
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Perbarui kata sandi untuk akun {currentUser?.email || "Anda"}
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateOwnPassword} style={{ maxWidth: 460 }}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="own-new-password">
                  Password Baru
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={15}
                    style={{
                      position: "absolute",
                      left: "0.85rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-text-muted)",
                    }}
                  />
                  <input
                    id="own-new-password"
                    type={showOwnPassword ? "text" : "password"}
                    className="clay-input"
                    style={{ paddingLeft: "2.4rem", paddingRight: "2.5rem" }}
                    placeholder="Minimal 6 karakter"
                    value={ownPasswordForm.newPassword}
                    onChange={(e) => setOwnPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    disabled={isUpdatingOwnPassword}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOwnPassword(!showOwnPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-muted)",
                      display: "flex",
                    }}
                  >
                    {showOwnPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="form-label" htmlFor="own-confirm-password">
                  Ulangi Password Baru
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={15}
                    style={{
                      position: "absolute",
                      left: "0.85rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-text-muted)",
                    }}
                  />
                  <input
                    id="own-confirm-password"
                    type={showOwnPassword ? "text" : "password"}
                    className="clay-input"
                    style={{ paddingLeft: "2.4rem" }}
                    placeholder="Ulangi password baru"
                    value={ownPasswordForm.confirmPassword}
                    onChange={(e) => setOwnPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    disabled={isUpdatingOwnPassword}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="clay-btn clay-btn-primary"
                disabled={isUpdatingOwnPassword}
                id="update-own-password-btn"
              >
                {isUpdatingOwnPassword ? (
                  <>
                    <span className="clay-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Menyimpan Password...
                  </>
                ) : (
                  <>
                    <Save size={15} /> Perbarui Password Saya
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* ============================================================ */}
      {/* MODAL: TAMBAH AKUN JURI / PANITIA / ADMIN BARU */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="clay-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="clay-modal"
            style={{ maxWidth: 480, padding: "1.75rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <UserPlus size={20} color="var(--color-primary)" />
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>
                  Tambah Akun Juri / Panitia
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              {/* Nama Lengkap */}
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="new-user-fullname">
                  Nama Lengkap / Identitas Juri
                </label>
                <input
                  id="new-user-fullname"
                  type="text"
                  className="clay-input"
                  placeholder="Contoh: Dewan Juri 1 - PAI"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm((p) => ({ ...p, full_name: e.target.value }))}
                  required
                />
              </div>

              {/* Email */}
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="new-user-email">
                  Email Login
                </label>
                <input
                  id="new-user-email"
                  type="email"
                  className="clay-input"
                  placeholder="contoh: juri1@mapsi.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  Email ini digunakan saat juri/panitia melakukan login
                </div>
              </div>

              {/* Password */}
              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label className="form-label" htmlFor="new-user-password">
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="new-user-password"
                    type={showAddPassword ? "text" : "password"}
                    className="clay-input"
                    style={{ paddingRight: "2.5rem" }}
                    placeholder="Minimal 6 karakter"
                    value={addForm.password}
                    onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-muted)",
                      display: "flex",
                    }}
                  >
                    {showAddPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="form-label">
                  Hak Akses / Peran Akun
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  {/* Juri / Committee */}
                  <label
                    style={{
                      border: `2px solid ${addForm.role === "committee" ? "var(--color-secondary)" : "var(--color-border)"}`,
                      background: addForm.role === "committee" ? "var(--color-secondary-lighter)" : "var(--color-surface-2)",
                      borderRadius: 14,
                      padding: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="radio"
                        name="user-role"
                        value="committee"
                        checked={addForm.role === "committee"}
                        onChange={() => setAddForm((p) => ({ ...p, role: "committee" }))}
                      />
                      <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--color-secondary)" }}>
                        ⚖️ Dewan Juri
                      </span>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", paddingLeft: "1.4rem" }}>
                      Akses Live Monitoring &amp; Hasil Nilai
                    </span>
                  </label>

                  {/* Admin */}
                  <label
                    style={{
                      border: `2px solid ${addForm.role === "admin" ? "var(--color-primary)" : "var(--color-border)"}`,
                      background: addForm.role === "admin" ? "var(--color-primary-lighter)" : "var(--color-surface-2)",
                      borderRadius: 14,
                      padding: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input
                        type="radio"
                        name="user-role"
                        value="admin"
                        checked={addForm.role === "admin"}
                        onChange={() => setAddForm((p) => ({ ...p, role: "admin" }))}
                      />
                      <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--color-primary)" }}>
                        👑 Administrator
                      </span>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", paddingLeft: "1.4rem" }}>
                      Akses Penuh Semua Menu
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="clay-btn clay-btn-ghost"
                  onClick={() => setShowAddModal(false)}
                  disabled={isCreatingUser}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="clay-btn clay-btn-primary"
                  disabled={isCreatingUser}
                  id="save-new-user-btn"
                >
                  {isCreatingUser ? (
                    <>
                      <span className="clay-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Menyimpan ke Database...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={15} /> Buat Akun &amp; Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT AKUN / RESET PASSWORD JURI */}
      {/* ============================================================ */}
      {editingUser && (
        <div className="clay-modal-overlay" onClick={() => setEditingUser(null)}>
          <div
            className="clay-modal"
            style={{ maxWidth: 460, padding: "1.75rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Edit2 size={18} color="var(--color-primary)" />
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>
                  Edit Akun {editingUser.email}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser}>
              {/* Nama Lengkap */}
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" htmlFor="edit-user-fullname">
                  Nama Lengkap / Identitas
                </label>
                <input
                  id="edit-user-fullname"
                  type="text"
                  className="clay-input"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                  required
                />
              </div>

              {/* Role */}
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">
                  Peran / Hak Akses
                </label>
                <select
                  className="clay-select"
                  value={editForm.role}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                >
                  <option value="committee">⚖️ Dewan Juri / Panitia (Monitoring &amp; Hasil)</option>
                  <option value="admin">👑 Administrator (Akses Penuh)</option>
                </select>
              </div>

              {/* Reset Password Optional */}
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="form-label" htmlFor="edit-user-new-pwd">
                  Reset Password Baru (Opsional)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="edit-user-new-pwd"
                    type={showEditPassword ? "text" : "password"}
                    className="clay-input"
                    style={{ paddingRight: "2.5rem" }}
                    placeholder="Kosongkan jika tidak ingin ganti"
                    value={editForm.password}
                    onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-muted)",
                      display: "flex",
                    }}
                  >
                    {showEditPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  Isi minimal 6 karakter jika ingin mereset password akun ini
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="clay-btn clay-btn-ghost"
                  onClick={() => setEditingUser(null)}
                  disabled={isUpdatingUser}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="clay-btn clay-btn-primary"
                  disabled={isUpdatingUser}
                >
                  {isUpdatingUser ? (
                    <>
                      <span className="clay-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Menyimpan Perubahan...
                    </>
                  ) : (
                    <>
                      <Save size={15} /> Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONFIRM DIALOG: DELETE USER */}
      {/* ============================================================ */}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        title="Hapus Akun Pengguna?"
        message={`Apakah Anda yakin ingin menghapus akun ${userToDelete?.email} (${userToDelete?.full_name || "Pengguna"})? Pengguna ini tidak akan dapat login lagi.`}
        confirmLabel="Ya, Hapus Akun"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeletingUser}
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
