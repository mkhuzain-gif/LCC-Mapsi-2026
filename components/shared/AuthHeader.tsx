"use client";

import { useState, useEffect } from "react";
import { GraduationCap } from "lucide-react";
import { loadAppConfig, type AppConfig, APP_CONFIG_KEY } from "@/app/admin/settings/SettingsClient";

export function AuthHeader() {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    setConfig(loadAppConfig());

    const handleConfigChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as AppConfig;
      setConfig({ ...detail });
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === APP_CONFIG_KEY) {
        setConfig(loadAppConfig());
      }
    };

    window.addEventListener("mapsi_config_changed", handleConfigChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("mapsi_config_changed", handleConfigChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const appName = config?.appName || "LCC MAPSI";
  const edition = config?.edition || "XXVII";
  const eventYear = config?.eventYear || "2026";
  const logoUrl = config?.logoDataUrl || "/icon-192.png";

  return (
    <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
      {/* Logo Container */}
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: "18px",
          background: "linear-gradient(135deg, var(--color-primary-light), var(--color-primary))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 0.6rem",
          boxShadow: "var(--clay-shadow-sm)",
          overflow: "hidden",
          padding: 4,
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: "14px",
              background: "white",
              padding: "3px",
            }}
          />
        ) : (
          <GraduationCap size={30} color="white" />
        )}
      </div>

      {/* App Title */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "1.5rem",
          background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1.2,
          margin: 0,
        }}
      >
        {appName} {edition}
      </h1>

      {/* Subtitle */}
      <p style={{ color: "var(--color-text-muted)", fontWeight: 600, fontSize: "0.82rem", marginTop: "0.2rem" }}>
        Sistem Ujian Online PAI & BTQ {eventYear}
      </p>
    </div>
  );
}

export function AuthFooter() {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    setConfig(loadAppConfig());

    const handleConfigChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as AppConfig;
      setConfig({ ...detail });
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === APP_CONFIG_KEY) {
        setConfig(loadAppConfig());
      }
    };

    window.addEventListener("mapsi_config_changed", handleConfigChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("mapsi_config_changed", handleConfigChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const edition = config?.edition || "XXVII";
  const eventYear = config?.eventYear || "2026";

  return (
    <div style={{ textAlign: "center", marginTop: "1rem" }}>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("mapsi_trigger_pwa_install"))}
        style={{
          background: "rgba(109,40,217,0.08)",
          color: "var(--color-primary)",
          border: "1px solid rgba(109,40,217,0.2)",
          padding: "0.35rem 0.85rem",
          borderRadius: "99px",
          fontSize: "0.75rem",
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          marginBottom: "0.5rem",
          transition: "all 0.2s",
        }}
        id="auth-pwa-install-trigger"
      >
        <span>📲</span> Install Aplikasi LCC MAPSI
      </button>
      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--color-text-light)",
          fontWeight: 500,
          margin: 0,
        }}
      >
        © {eventYear} Panitia MAPSI {edition}. All rights reserved.
      </p>
    </div>
  );
}
