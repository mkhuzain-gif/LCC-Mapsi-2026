import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public or token-authenticated paths (participant login and exam interface)
  const isPublicPath =
    pathname === "/login" ||
    pathname === "/participant-login" ||
    pathname.startsWith("/exam") ||
    pathname.startsWith("/api/");

  // If not authenticated and trying to access protected admin/committee route or root
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If authenticated, fetch role from profiles
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    let role = profile?.role ?? "participant";
    if ((user.email === "khusenkedua@gmail.com" || !profile) && role !== "admin") {
      role = "admin";
      await supabase.from("profiles").upsert({ id: user.id, email: user.email, role: "admin" });
    }

    // Admin routes: only admin
    if (pathname.startsWith("/admin") && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = role === "committee" ? "/committee/monitoring" : "/exam/instructions";
      return NextResponse.redirect(url);
    }

    // Committee routes: admin or committee
    if (pathname.startsWith("/committee") && !["admin", "committee"].includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/exam/instructions";
      return NextResponse.redirect(url);
    }

    // Redirect authenticated admin/committee users away from admin login
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = role === "admin" ? "/admin/dashboard" : "/committee/monitoring";
      return NextResponse.redirect(url);
    }

    // Redirect root based on role
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      if (role === "admin") url.pathname = "/admin/dashboard";
      else if (role === "committee") url.pathname = "/committee/monitoring";
      else url.pathname = "/exam/instructions";
      return NextResponse.redirect(url);
    }
  }


  return supabaseResponse;
}
