import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";
import type { UserRole } from "@/lib/types/database";

export const metadata = {
  title: "Pengaturan Aplikasi | LCC MAPSI",
  description: "Kelola logo dan nama aplikasi LCC MAPSI",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  const role: UserRole = (profile?.role as UserRole) ?? "admin";

  return (
    <SettingsClient
      role={role}
      currentUser={{
        id: user.id,
        email: user.email || profile?.email || "",
        fullName: profile?.full_name || "",
      }}
    />
  );
}
