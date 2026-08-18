"use client";

import { useState, useEffect } from "react";
import { TopHeader } from "@/components/shared/TopHeader";
import {
  Users, CheckCircle2, Loader2, Clock, Trophy, CalendarClock,
  Activity, Megaphone, TrendingUp, Shield, AlertTriangle,
} from "lucide-react";
import type { ExamSession, Announcement } from "@/lib/types/database";
import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";

interface DashboardStats {
  totalParticipants: number;
  submittedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  activeSession: ExamSession | null;
  latestSession: ExamSession | null;
}

interface AdminDashboardClientProps {
  stats: DashboardStats;
  sessions: ExamSession[];
  announcements: Announcement[];
}

function useCountdown(targetDate: string | null | undefined) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!targetDate) return;
    const update = () => {
      const secs = differenceInSeconds(new Date(targetDate), new Date());
      setRemaining(Math.max(0, secs));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const hrs = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  return { remaining, display: `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}` };
}

export function AdminDashboardClient({ stats, sessions, announcements }: AdminDashboardClientProps) {
  const countdown = useCountdown(
    stats.activeSession?.end_time ?? stats.latestSession?.start_time
  );

  const statusColor = {
    scheduled: "clay-badge-warning",
    active: "clay-badge-success",
    completed: "clay-badge-neutral",
    cancelled: "clay-badge-danger",
  };

  const statusLabel = {
    scheduled: "Belum Dimulai",
    active: "Sedang Berlangsung",
    completed: "Selesai",
    cancelled: "Dibatalkan",
  };

  const completionPct = stats.totalParticipants > 0
    ? Math.round((stats.submittedCount / stats.totalParticipants) * 100)
    : 0;

  const kpiCards = [
    {
      icon: <Users size={28} />,
      label: "Total Peserta",
      value: stats.totalParticipants,
      unit: "peserta",
      color: "clay-kpi-primary",
      iconBg: "linear-gradient(135deg, var(--color-primary-lighter), var(--color-primary-light))",
      iconColor: "var(--color-primary)",
      href: "/admin/participants",
    },
    {
      icon: <CheckCircle2 size={28} />,
      label: "Sudah Submit",
      value: stats.submittedCount,
      unit: "peserta",
      color: "clay-kpi-success",
      iconBg: "linear-gradient(135deg, var(--color-success-lighter), var(--color-success-light))",
      iconColor: "var(--color-success)",
      href: "/admin/results",
    },
    {
      icon: <Loader2 size={28} />,
      label: "Sedang Mengerjakan",
      value: stats.inProgressCount,
      unit: "peserta",
      color: "clay-kpi-info",
      iconBg: "linear-gradient(135deg, var(--color-info-lighter), var(--color-info-light))",
      iconColor: "var(--color-info)",
      href: "/admin/monitoring",
    },
    {
      icon: <Clock size={28} />,
      label: "Belum Mulai",
      value: stats.notStartedCount,
      unit: "peserta",
      color: "clay-kpi-accent",
      iconBg: "linear-gradient(135deg, var(--color-accent-lighter), var(--color-accent-light))",
      iconColor: "var(--color-accent)",
      href: "/admin/monitoring",
    },
  ];

  return (
    <div>
      <TopHeader
        title="Dashboard"
        subtitle="LCC MAPSI XXVII 2026 — Sistem Ujian Online PAI & BTQ"
        role="admin"
        actions={
          <Link href="/admin/monitoring" className="clay-btn clay-btn-secondary clay-btn-sm">
            <Activity size={15} />
            Live Monitoring
          </Link>
        }
      />

      <div style={{ padding: "2rem" }}>
        {/* Active Session Banner */}
        {stats.activeSession && (
          <div
            style={{
              background: "linear-gradient(135deg, var(--color-success-lighter), #dcfce7)",
              border: "2px solid var(--color-success-light)",
              borderRadius: "var(--radius-clay)",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.75rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              boxShadow: "var(--clay-shadow-success)",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "var(--color-success-light)",
                animation: "livePulse 2s infinite",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--color-success)" }}>
                ✅ Ujian Sedang Berlangsung
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--color-success)", opacity: 0.8, fontWeight: 600 }}>
                {stats.activeSession.title} — Waktu tersisa:{" "}
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 900 }}>
                  {countdown.display}
                </span>
              </div>
            </div>
            <Link href="/admin/monitoring" className="clay-btn clay-btn-success clay-btn-sm">
              Monitor Ujian →
            </Link>
          </div>
        )}

        {/* Countdown to next session */}
        {!stats.activeSession && stats.latestSession?.status === "scheduled" && stats.latestSession.start_time && (
          <div
            style={{
              background: "linear-gradient(135deg, var(--color-accent-lighter), #fef9c3)",
              border: "2px solid var(--color-accent-light)",
              borderRadius: "var(--radius-clay)",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.75rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              boxShadow: "var(--clay-shadow-accent)",
              flexWrap: "wrap",
            }}
          >
            <Clock size={22} color="var(--color-accent)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "var(--color-accent)" }}>
                ⏳ Ujian Dimulai Dalam
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", color: "var(--color-accent)" }}>
                {countdown.display}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-warning)", fontWeight: 600 }}>
                {stats.latestSession.title} — Mulai:{" "}
                {format(new Date(stats.latestSession.start_time), "dd MMMM yyyy, HH:mm", { locale: id })}
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid-kpi" style={{ marginBottom: "2rem" }}>
          {kpiCards.map((card) => (
            <Link href={card.href} key={card.label} style={{ textDecoration: "none" }}>
              <div className={`clay-kpi-card ${card.color}`}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "16px",
                      background: card.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "var(--clay-shadow-sm)",
                      color: card.iconColor,
                    }}
                  >
                    {card.icon}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 900,
                    fontSize: "2rem",
                    lineHeight: 1,
                    marginBottom: "0.25rem",
                  }}
                >
                  {card.value.toLocaleString("id-ID")}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                  {card.label}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Progress + Sessions Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* Completion Progress */}
          <div className="clay-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
              <TrendingUp size={20} color="var(--color-primary)" />
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>
                Progress Penyelesaian
              </h3>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                {stats.submittedCount} dari {stats.totalParticipants} peserta
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", color: "var(--color-primary)" }}>
                {completionPct}%
              </span>
            </div>

            <div className="clay-progress clay-progress-primary">
              <div className="clay-progress-bar" style={{ width: `${completionPct}%` }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginTop: "1.25rem" }}>
              <div style={{ textAlign: "center", padding: "0.75rem", background: "var(--color-success-lighter)", borderRadius: "12px" }}>
                <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--color-success)" }}>{stats.submittedCount}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-success)", fontWeight: 600 }}>Selesai</div>
              </div>
              <div style={{ textAlign: "center", padding: "0.75rem", background: "var(--color-info-lighter)", borderRadius: "12px" }}>
                <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--color-info)" }}>{stats.inProgressCount}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-info)", fontWeight: 600 }}>Mengerjakan</div>
              </div>
              <div style={{ textAlign: "center", padding: "0.75rem", background: "var(--color-accent-lighter)", borderRadius: "12px" }}>
                <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--color-accent)" }}>{stats.notStartedCount}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-accent)", fontWeight: 600 }}>Belum Mulai</div>
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div className="clay-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <CalendarClock size={20} color="var(--color-primary)" />
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>
                  Sesi Ujian
                </h3>
              </div>
              <Link href="/admin/sessions" className="clay-btn clay-btn-ghost clay-btn-sm">
                Kelola →
              </Link>
            </div>

            {sessions.length === 0 ? (
              <div className="clay-empty-state" style={{ padding: "2rem" }}>
                <p style={{ color: "var(--color-text-muted)", fontWeight: 600, fontSize: "0.875rem" }}>
                  Belum ada sesi dibuat
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      background: "var(--color-surface-2)",
                      borderRadius: "12px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {session.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
                        {session.duration_minutes} menit • {session.stage}
                      </div>
                    </div>
                    <span className={`clay-badge ${statusColor[session.status]}`}>
                      {statusLabel[session.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Announcements */}
        <div className="clay-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Megaphone size={20} color="var(--color-primary)" />
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>
                Pengumuman Terbaru
              </h3>
            </div>
          </div>

          {announcements.length === 0 ? (
            <div className="clay-empty-state" style={{ padding: "1.5rem" }}>
              <Megaphone size={32} color="var(--color-text-light)" />
              <p style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
                Belum ada pengumuman
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {announcements.map((ann) => {
                const typeClass = {
                  info: "clay-alert-info",
                  warning: "clay-alert-warning",
                  success: "clay-alert-success",
                  critical: "clay-alert-danger",
                }[ann.type];
                return (
                  <div key={ann.id} className={`clay-alert ${typeClass}`}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "2px" }}>{ann.title}</div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>{ann.content}</div>
                      <div style={{ fontSize: "0.75rem", opacity: 0.65, marginTop: "4px" }}>
                        {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true, locale: id })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
