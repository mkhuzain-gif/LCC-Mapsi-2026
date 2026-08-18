import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ParticipantsClient } from "./ParticipantsClient";

export const metadata: Metadata = { title: "Manajemen Peserta" };

export default async function ParticipantsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: participants } = await supabase
    .from("participants")
    .select("*")
    .order("draw_number");

  return <ParticipantsClient initialParticipants={participants ?? []} />;
}
