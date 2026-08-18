import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SessionsClient } from "./SessionsClient";

export const metadata: Metadata = { title: "Manajemen Sesi Ujian" };

export default async function SessionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessions } = await supabase
    .from("exam_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  return <SessionsClient initialSessions={sessions ?? []} />;
}
