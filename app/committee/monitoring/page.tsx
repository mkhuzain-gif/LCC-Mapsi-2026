import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { MonitoringClient } from "@/components/monitoring/MonitoringClient";

export const metadata: Metadata = { title: "Live Monitoring" };

export default async function CommitteeMonitoringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: activeSession } = await supabase
    .from("exam_sessions")
    .select("id")
    .eq("status", "active")
    .single();

  const sessionId = activeSession?.id ?? null;

  const [{ data: participants }, { data: submissions }, { data: logs }] = await Promise.all([
    supabase.from("participants").select("*").order("draw_number"),
    sessionId
      ? supabase.from("exam_submissions").select("*").eq("session_id", sessionId)
      : Promise.resolve({ data: [] }),
    sessionId
      ? supabase.from("activity_logs").select("*").eq("session_id", sessionId).in("severity", ["warning", "critical"]).order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] }),
  ]);

  const initialData = (participants ?? []).map((p) => ({
    participant: p,
    submission: (submissions ?? []).find((s) => s.participant_id === p.id) ?? null,
    suspicious_events: (logs ?? []).filter((l) => l.participant_id === p.id),
  }));

  return <MonitoringClient role="committee" initialData={initialData} sessionId={sessionId} />;
}
