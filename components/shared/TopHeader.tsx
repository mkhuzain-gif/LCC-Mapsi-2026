"use client";

import { Bell, Menu } from "lucide-react";
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

  const handleToggleSidebar = () => {
    window.dispatchEvent(new CustomEvent("mapsi_toggle_sidebar"));
  };

  return (
    <header className="clay-header">
      {/* Mobile Hamburger Button */}
      <button
        type="button"
        onClick={handleToggleSidebar}
        className="mobile-hamburger-btn"
        aria-label="Buka Menu Navigasi"
        id="topheader-menu-btn"
      >
        <Menu size={20} color="var(--color-primary)" />
      </button>

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.15rem",
              color: "var(--color-text)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          <span className={roleBadge.class} style={{ fontSize: "0.72rem", padding: "0.15rem 0.55rem" }}>
            {roleBadge.label}
          </span>
        </div>
        {subtitle && (
          <p className="hide-mobile-subtitle" style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "2px", fontWeight: 500 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          {actions}
        </div>
      )}

      {/* Notification bell */}
      <button
        id="header-notifications-btn"
        className="header-bell-btn"
        aria-label="Notifikasi"
      >
        <Bell size={18} color="var(--color-text-muted)" />
        <span className="header-bell-dot" />
      </button>
    </header>
  );
}

