"use client";

import { useState, useEffect, useCallback } from "react";
import { TopHeader } from "@/components/shared/TopHeader";
import { createClient } from "@/lib/supabase/client";
import {
  Monitor, Users, CheckCircle2, Loader2, Clock,
  AlertTriangle, RefreshCw, Activity, Shield,
} from "lucide-react";
import type { ExamSubmission, Participant, ActivityLog } from "@/lib/types/database";
import { formatDistanceToNow, format, differenceInMinutes } from "date-fns";
import { id } from "date-fns/locale";

interface MonitoringEntry {
  participant: Participant;
  submission: ExamSubmission | null;
  suspicious_events: ActivityLog[];
}

const STATUS_CONFIG = {
  not_started: { label: "Belum Mulai", badge: "clay-badge-neutral", dot: "status-dot-neutral" },
  in_progress: { label: "Mengerjakan", badge: "clay-badge-info", dot: "status-dot-online" },
  submitted: { label: "Selesai", badge: "clay-badge-success", dot: "status-dot-online" },
  auto_submitted: { label: "Auto-Submit", badge: "clay-badge-warning", dot: "status-dot-warning" },
  disqualified: { label: "Diskualifikasi", badge: "clay-badge-danger", dot: "status-dot-danger" },
};

interface MonitoringClientProps {
  role: "admin" | "committee";
  initialData: MonitoringEntry[];
  sessionId: string | null;
}

export function MonitoringClient({ role, initialData, sessionId }: MonitoringClientProps) {
  const supabase = createClient();
  const [data, setData] = useState<MonitoringEntry[]>(initialData);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    const { data: submissions } = await supabase
      .from("exam_submissions")
      .select("*, participant:participants(*)")
      .eq("session_id", sessionId);

    const { data: participants } = await supabase
      .from("participants")
      .select("*");

    const { data: activityLogs } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("session_id", sessionId)
      .in("severity", ["warning", "critical"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (participants) {
      const entries: MonitoringEntry[] = participants.map((p) => ({
        participant: p,
        submission: (submissions as (ExamSubmission & { participant: Participant })[] | null)?.find((s) => s.participant_id === p.id) ?? null,
        suspicious_events: activityLogs?.filter((l) => l.participant_id === p.id) ?? [],
      }));
      setData(entries);
      setLogs(activityLogs ?? []);
      setLastUpdate(new Date());
    }
    setIsLoading(false);
  }, [supabase, sessionId]);

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`monitoring-${sessionId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "exam_submissions",
        filter: `session_id=eq.${sessionId}`,
      }, () => { refresh(); })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "activity_logs",
        filter: `session_id=eq.${sessionId}`,
      }, () => { refresh(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, sessionId, refresh]);

  const filtered = data.filter((entry) => {
    const matchSearch = !search ||
      entry.participant.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (entry.participant.draw_number ?? "").includes(search);
    const entryStatus = entry.submission?.status ?? "not_started";
    const matchStatus = !filterStatus || entryStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const summaryStats = {
    total: data.length,
    notStarted: data.filter((e) => !e.submission || e.submission.status === "not_started").length,
    inProgress: data.filter((e) => e.submission?.status === "in_progress").length,
    submitted: data.filter((e) => ["submitted", "auto_submitted"].includes(e.submission?.status ?? "")).length,
    suspicious: data.filter((e) => e.suspicious_events.length > 0).length,
  };

  return (
    <div>
      <TopHeader
        title="Live Monitoring Ujian"
        subtitle={sessionId ? "Pembaruan otomatis via Supabase Realtime" : "Tidak ada sesi aktif"}
        role={role}
        actions={
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
              Update: {format(lastUpdate, "HH:mm:ss")}
            </span>
            <button className="clay-btn clay-btn-ghost clay-btn-sm" onClick={refresh} disabled={isLoading} id="monitoring-refresh-btn">
              <RefreshCw size={14} className={isLoading ? "spin" : ""} />
            </button>
          </div>
        }
      />

      <div style={{ padding: "1.5rem 2rem" }}>
        {/* Live indicator */}
        {sessionId && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <div className="status-dot status-dot-live" />
            <span style={{ fontWeight: 700, color: "var(--color-success)", fontSize: "0.875rem" }}>
              Monitoring aktif — data diperbarui secara real-time
            </span>
          </div>
        )}

        {/* Summary KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { icon: <Users size={22} />, label: "Total", value: summaryStats.total, color: "var(--color-primary)", bg: "var(--color-primary-lighter)" },
            { icon: <Clock size={22} />, label: "Belum Mulai", value: summaryStats.notStarted, color: "var(--color-text-muted)", bg: "#f3f4f6" },
            { icon: <Loader2 size={22} />, label: "Mengerjakan", value: summaryStats.inProgress, color: "var(--color-info)", bg: "var(--color-info-lighter)" },
            { icon: <CheckCircle2 size={22} />, label: "Selesai", value: summaryStats.submitted, color: "var(--color-success)", bg: "var(--color-success-lighter)" },
            { icon: <AlertTriangle size={22} />, label: "Mencurigakan", value: summaryStats.suspicious, color: "var(--color-danger)", bg: "var(--color-danger-lighter)" },
          ].map((s) => (
            <div key={s.label} className="clay-card-sm" style={{ padding: "1rem", textAlign: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "12px", background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.5rem" }}>
                {s.icon}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.4rem", color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem", alignItems: "start" }}>
          {/* Participant Table */}
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
              <input className="clay-input" style={{ flex: 1 }} placeholder="Cari nama atau nomor undian..." value={search} onChange={(e) => setSearch(e.target.value)} id="monitoring-search" />
              <select className="clay-select" style={{ flex: "0 0 180px" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} id="monitoring-filter-status">
                <option value="">Semua Status</option>
                <option value="not_started">Belum Mulai</option>
                <option value="in_progress">Mengerjakan</option>
                <option value="submitted">Selesai</option>
                <option value="auto_submitted">Auto-Submit</option>
                <option value="disqualified">Diskualifikasi</option>
              </select>
            </div>

            <div className="clay-table-wrapper">
              <table className="clay-table">
                <thead>
                  <tr>
                    <th>No. Undian</th>
                    <th>Nama Peserta</th>
                    <th>Status</th>
                    <th>Waktu Mulai</th>
                    <th>Submit / Sisa</th>
                    <th style={{ textAlign: "center" }}>⚠️</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => {
                    const sub = entry.submission;
                    const statusKey = (sub?.status ?? "not_started") as keyof typeof STATUS_CONFIG;
                    const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.not_started;
                    const isInProgress = sub?.status === "in_progress";
                    const hasSuspicious = entry.suspicious_events.length > 0;

                    return (
                      <tr key={entry.participant.id} style={hasSuspicious ? { background: "rgba(220,38,38,0.04)" } : undefined}>
                        <td>
                          <span style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 900,
                            color: "var(--color-primary)",
                            background: "var(--color-primary-lighter)",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "8px",
                            fontSize: "0.9rem",
                          }}>
                            {entry.participant.draw_number ?? "—"}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{entry.participant.full_name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {entry.participant.school_name}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span className={`status-dot ${cfg.dot}`} />
                            <span className={`clay-badge ${cfg.badge}`} style={{ fontSize: "0.75rem" }}>{cfg.label}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                          {sub?.started_at ? format(new Date(sub.started_at), "HH:mm:ss") : "—"}
                        </td>
                        <td style={{ fontSize: "0.82rem" }}>
                          {sub?.submitted_at ? (
                            <span style={{ fontWeight: 700, color: "var(--color-success)" }}>
                              {format(new Date(sub.submitted_at), "HH:mm:ss")}
                            </span>
                          ) : isInProgress && sub?.started_at ? (
                            <span style={{ color: "var(--color-warning)", fontWeight: 700 }}>
                              {differenceInMinutes(new Date(), new Date(sub.started_at))} mnt
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {hasSuspicious ? (
                            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}>
                              <AlertTriangle size={15} color="var(--color-danger)" />
                              <span style={{ fontWeight: 800, fontSize: "0.8rem", color: "var(--color-danger)" }}>
                                {entry.suspicious_events.length}
                              </span>
                            </span>
                          ) : (
                            <span style={{ color: "var(--color-text-light)" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Log */}
          <div className="clay-card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
              <Activity size={18} color="var(--color-danger)" />
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem" }}>
                Log Aktivitas Mencurigakan
              </h3>
            </div>

            {logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                <Shield size={32} style={{ margin: "0 auto 0.5rem", display: "block", opacity: 0.4 }} />
                <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>Tidak ada aktivitas mencurigakan</p>
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: "auto" }}>
                {logs.map((log) => (
                  <div key={log.id} className="clay-activity-item">
                    <div
                      className="clay-activity-dot"
                      style={{ background: log.severity === "critical" ? "var(--color-danger)" : "var(--color-warning)" }}
                    />
                    <div style={{ flex: 1, fontSize: "0.8rem" }}>
                      <div style={{ fontWeight: 700, color: log.severity === "critical" ? "var(--color-danger)" : "var(--color-warning)" }}>
                        {log.event_type.replace(/_/g, " ").toUpperCase()}
                      </div>
                      <div style={{ color: "var(--color-text-muted)", marginTop: "2px" }}>
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: id })}
                      </div>
                      {log.details && typeof log.details === "object" && (
                        <pre style={{ fontSize: "0.72rem", background: "var(--color-surface-2)", padding: "0.4rem", borderRadius: "6px", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
