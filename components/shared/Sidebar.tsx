"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Users, BookOpen, CalendarClock,
  Monitor, Trophy, LogOut, ChevronLeft, ChevronRight,
  Menu, GraduationCap, Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types/database";
import { loadAppConfig, type AppConfig, APP_CONFIG_KEY } from "@/app/admin/settings/SettingsClient";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    roles: ["admin"],
  },
  {
    href: "/admin/participants",
    label: "Peserta",
    icon: <Users size={20} />,
    roles: ["admin"],
  },
  {
    href: "/admin/questions",
    label: "Bank Soal",
    icon: <BookOpen size={20} />,
    roles: ["admin"],
  },
  {
    href: "/admin/sessions",
    label: "Sesi Ujian",
    icon: <CalendarClock size={20} />,
    roles: ["admin"],
  },
  {
    href: "/admin/monitoring",
    label: "Monitoring",
    icon: <Monitor size={20} />,
    roles: ["admin"],
  },
  {
    href: "/admin/results",
    label: "Hasil & Ranking",
    icon: <Trophy size={20} />,
    roles: ["admin"],
  },
  {
    href: "/admin/settings",
    label: "Pengaturan",
    icon: <Settings size={20} />,
    roles: ["admin"],
  },
  {
    href: "/committee/monitoring",
    label: "Live Monitoring",
    icon: <Monitor size={20} />,
    roles: ["committee"],
  },
  {
    href: "/committee/results",
    label: "Hasil Ujian",
    icon: <Trophy size={20} />,
    roles: ["committee"],
  },
];

interface SidebarProps {
  role: UserRole;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Load app config from localStorage and listen for changes
  useEffect(() => {
    setAppConfig(loadAppConfig());

    const handleConfigChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as AppConfig;
      setAppConfig({ ...detail });
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === APP_CONFIG_KEY) {
        setAppConfig(loadAppConfig());
      }
    };

    window.addEventListener("mapsi_config_changed", handleConfigChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("mapsi_config_changed", handleConfigChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const roleLabel = role === "admin" ? "Administrator" : role === "committee" ? "Panitia" : "Peserta";
  const roleBadgeClass = role === "admin" ? "clay-badge clay-badge-primary" : "clay-badge clay-badge-info";

  const displayName = appConfig?.appName || "LCC MAPSI";
  const displaySubtitle = appConfig?.appSubtitle || "XXVII 2026";
  const effectiveLogoUrl = appConfig?.logoDataUrl || "/icon-192.png";

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        style={{
          padding: "1.5rem 1.25rem",
          borderBottom: "1.5px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "14px",
            background: "linear-gradient(135deg, var(--color-primary-light), var(--color-primary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--clay-shadow-sm)",
            flexShrink: 0,
            overflow: "hidden",
            padding: 3,
          }}
        >
          {effectiveLogoUrl ? (
            <img
              src={effectiveLogoUrl}
              alt="Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: "11px",
                background: "white",
                padding: "2px",
              }}
            />
          ) : (
            <GraduationCap size={22} color="white" />
          )}
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.9rem", color: "var(--color-primary)" }}>
              {displayName}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
              {displaySubtitle}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "1rem 0.75rem", overflowY: "auto" }}>
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`clay-nav-item ${isActive ? "active" : ""}`}
              style={{ justifyContent: collapsed ? "center" : "flex-start" }}
              title={collapsed ? item.label : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout + role badge (semua dalam satu grup di paling bawah) */}
      <div style={{ padding: "0.75rem", borderTop: "1.5px solid var(--color-border)" }}>
        {/* Username card: avatar + nama + badge Administrator sejajar dalam satu kartu */}
        {!collapsed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem",
              borderRadius: "14px",
              background: "var(--color-surface-2)",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--color-primary-lighter), var(--color-primary-light))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.9rem",
                color: "var(--color-primary)",
                flexShrink: 0,
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userName}
              </div>
              {/* Badge Administrator di dalam kartu, sejajar dengan nama */}
              <span className={roleBadgeClass} style={{ fontSize: "0.7rem", padding: "0.1rem 0.5rem" }}>
                {roleLabel}
              </span>
            </div>
          </div>
        )}

        {/* Logout button */}
        <button
          className="clay-nav-item"
          style={{
            width: "100%",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "var(--color-danger)",
            border: "none",
            background: "none",
          }}
          onClick={handleLogout}
          title={collapsed ? "Keluar" : undefined}
          id="sidebar-logout-btn"
        >
          <LogOut size={20} />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>

      {/* Collapse toggle - desktop */}
      <button
        className="hide-mobile"
        onClick={() => setCollapsed(!collapsed)}
        id="sidebar-collapse-btn"
        style={{
          position: "absolute",
          top: "50%",
          right: -14,
          transform: "translateY(-50%)",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "white",
          border: "1.5px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "var(--clay-shadow-sm)",
          zIndex: 10,
        }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay active"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`clay-sidebar show-mobile ${mobileOpen ? "mobile-open" : ""}`}
        style={{ width: collapsed ? 72 : 260, position: "fixed" }}
      >
        {sidebarContent}
      </aside>
      <aside
        className={`clay-sidebar hide-mobile`}
        style={{ width: collapsed ? 72 : 260, position: "fixed" }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      id="mobile-menu-btn"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.5rem",
        borderRadius: "10px",
        color: "var(--color-text)",
      }}
      aria-label="Toggle menu"
    >
      <Menu size={22} />
    </button>
  );
}
