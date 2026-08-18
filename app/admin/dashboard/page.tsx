import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminDashboardClient } from "./DashboardClient";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Parallel data fetching
  const [
    { count: totalParticipants },
    { data: submissions },
    { data: sessions },
    { data: announcements },
  ] = await Promise.all([
    supabase.from("participants").select("*", { count: "exact", head: true }),
    supabase.from("exam_submissions").select("status, total_score, rank, participant_id"),
    supabase.from("exam_sessions").select("*").order("created_at", { ascending: false }).limit(3),
    supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(5),
  ]);

  const stats = {
    totalParticipants: totalParticipants ?? 0,
    submittedCount: submissions?.filter((s) => ["submitted", "auto_submitted"].includes(s.status)).length ?? 0,
    inProgressCount: submissions?.filter((s) => s.status === "in_progress").length ?? 0,
    notStartedCount: submissions?.filter((s) => s.status === "not_started").length ?? 0,
    activeSession: sessions?.find((s) => s.status === "active") ?? null,
    latestSession: sessions?.[0] ?? null,
  };

  return (
    <AdminDashboardClient
      stats={stats}
      sessions={sessions ?? []}
      announcements={announcements ?? []}
    />
  );
}
