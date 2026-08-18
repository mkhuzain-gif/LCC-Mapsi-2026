import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { QuestionsClient } from "./QuestionsClient";

export const metadata: Metadata = { title: "Bank Soal" };

export default async function QuestionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .order("subject")
    .order("order_number");

  const { data: sessions } = await supabase
    .from("exam_sessions")
    .select("id, title, stage")
    .order("created_at", { ascending: false });

  return <QuestionsClient initialQuestions={questions ?? []} sessions={sessions ?? []} />;
}
