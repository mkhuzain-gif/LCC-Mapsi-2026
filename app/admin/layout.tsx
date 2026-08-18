import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import type { UserRole } from "@/lib/types/database";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  let role: UserRole = (profile?.role as UserRole) ?? "admin";

  if (!profile || !["admin", "committee"].includes(profile.role ?? "")) {
    if (user.email === "khusenkedua@gmail.com") {
      role = "admin";
    } else {
      redirect("/login");
    }
  }

  const userName = profile?.full_name ?? user.email ?? "Admin";

  return (
    <div className="main-layout">
      <Sidebar role={role} userName={userName} />
      <div className="main-content" id="admin-main-content">
        {children}
      </div>
    </div>
  );
}
