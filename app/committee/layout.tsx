import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import type { UserRole } from "@/lib/types/database";

export default async function CommitteeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "committee"].includes(profile.role ?? "")) {
    redirect("/login");
  }

  const role = profile.role as UserRole;
  const userName = profile.full_name ?? profile.email ?? "Panitia";

  return (
    <div className="main-layout">
      <Sidebar role={role} userName={userName} />
      <div className="main-content">{children}</div>
    </div>
  );
}
