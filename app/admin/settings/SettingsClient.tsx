"use client";

import { useState, useRef, useEffect } from "react";
import { TopHeader } from "@/components/shared/TopHeader";
import { useToast } from "@/components/shared/ToastProvider";
import {
  Settings, Upload, Save, RotateCcw, Image as ImageIcon,
  Type, Hash, Calendar, Trash2, CheckCircle,
} from "lucide-react";
import type { UserRole } from "@/lib/types/database";

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
    // Dispatch event agar komponen lain (Sidebar) bisa reload
    window.dispatchEvent(new CustomEvent("mapsi_config_changed", { detail: cfg }));
  }
}

interface SettingsClientProps {
  role: UserRole;
}

export function SettingsClient({ role }: SettingsClientProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Load dari localStorage saat mount
  useEffect(() => {
    const cfg = loadAppConfig();
    setConfig(cfg);
    setPreviewUrl(cfg.logoDataUrl);
  }, []);

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

  const handleSave = () => {
    saveAppConfig(config);
    setIsSaved(true);
    toast.success("Pengaturan Disimpan", "Logo dan nama aplikasi berhasil diperbarui.");
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    setConfig(DEFAULT_APP_CONFIG);
    setPreviewUrl("");
    saveAppConfig(DEFAULT_APP_CONFIG);
    toast.info("Reset Berhasil", "Pengaturan dikembalikan ke bawaan.");
  };

  return (
    <div>
      <TopHeader
        title="Pengaturan Aplikasi"
        subtitle="Kelola logo dan nama aplikasi — berlaku tiap tahun penyelenggaraan"
        role={role}
        actions={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="clay-btn clay-btn-ghost clay-btn-sm"
              onClick={handleReset}
              id="settings-reset-btn"
            >
              <RotateCcw size={14} /> Reset Default
            </button>
            <button
              className="clay-btn clay-btn-primary clay-btn-sm"
              onClick={handleSave}
              id="settings-save-btn"
              style={isSaved ? { background: "var(--color-success)" } : {}}
            >
              {isSaved ? <CheckCircle size={14} /> : <Save size={14} />}
              {isSaved ? "Tersimpan!" : "Simpan Pengaturan"}
            </button>
          </div>
        }
      />

      <div style={{ padding: "1.5rem 2rem", maxWidth: 860 }}>

        {/* ======== SECTION: Logo ======== */}
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
                Upload logo untuk ditampilkan di sidebar dan sertifikat
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1.5rem", alignItems: "start" }}>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
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

        {/* ======== SECTION: Nama Aplikasi ======== */}
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
                Sesuaikan setiap tahun penyelenggaraan tanpa coding
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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

        {/* Info box */}
        <div className="clay-alert clay-alert-info" style={{ marginTop: "1.25rem", fontSize: "0.8rem" }}>
          <span>💡</span>
          <span>
            Pengaturan disimpan di browser lokal. Untuk menggunakan di perangkat lain atau tahun berikutnya,
            cukup ganti <strong>Edisi</strong> dan <strong>Tahun Pelaksanaan</strong> lalu klik{" "}
            <strong>Simpan Pengaturan</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}
