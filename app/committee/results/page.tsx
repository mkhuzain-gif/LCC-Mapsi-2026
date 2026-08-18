import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ResultsClient } from "@/app/admin/results/ResultsClient";

export const metadata: Metadata = { title: "Hasil Ujian" };

export default async function CommitteeResultsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: sessions }, { data: submissions }, { data: participants }] = await Promise.all([
    supabase.from("exam_sessions").select("*").order("created_at", { ascending: false }),
    supabase.from("exam_submissions").select("*").in("status", ["submitted", "auto_submitted"]),
    supabase.from("participants").select("*"),
  ]);

  return (
    <ResultsClient
      sessions={sessions ?? []}
      submissions={submissions ?? []}
      participants={participants ?? []}
      role="committee"
    />
  );
}
