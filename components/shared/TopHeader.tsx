"use client";

import { Bell, Search } from "lucide-react";
import type { UserRole } from "@/lib/types/database";

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  role: UserRole;
  actions?: React.ReactNode;
}

export function TopHeader({ title, subtitle, role, actions }: TopHeaderProps) {
  const roleBadge = {
    admin: { label: "Administrator", class: "clay-badge clay-badge-primary" },
    committee: { label: "Panitia", class: "clay-badge clay-badge-info" },
    participant: { label: "Peserta", class: "clay-badge clay-badge-success" },
  }[role];

  return (
    <header className="clay-header">
      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.2rem",
              color: "var(--color-text)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          <span className={roleBadge.class}>{roleBadge.label}</span>
        </div>
        {subtitle && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "2px", fontWeight: 500 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {actions}
        </div>
      )}

      {/* Notification bell */}
      <button
        id="header-notifications-btn"
        style={{
          background: "var(--color-surface-2)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "12px",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          boxShadow: "var(--clay-shadow-sm)",
          flexShrink: 0,
        }}
        aria-label="Notifikasi"
      >
        <Bell size={18} color="var(--color-text-muted)" />
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--color-danger)",
            border: "2px solid white",
          }}
        />
      </button>
    </header>
  );
}
