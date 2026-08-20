import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { UserRole, Profile } from "@/lib/types/database";

// Standalone admin client if SUPABASE_SERVICE_ROLE_KEY is provided
function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Standalone anon client without session persistence for creating user via signup
function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// GET: List all admin and committee user profiles
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify caller is admin or committee
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Hanya Administrator yang dapat mengakses daftar pengguna" },
        { status: 403 }
      );
    }

    // Query all admin and committee profiles
    const { data: profiles, error: pError } = await supabase
      .from("profiles")
      .select("*")
      .in("role", ["admin", "committee"])
      .order("created_at", { ascending: false });

    if (pError) {
      console.error("Error fetching profiles:", pError);
      return NextResponse.json({ error: pError.message }, { status: 500 });
    }

    return NextResponse.json({ users: profiles || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Create a new user (admin or committee/juri)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Hanya Administrator yang dapat menambah akun pengguna" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, full_name, role } = body as {
      email?: string;
      password?: string;
      full_name?: string;
      role?: UserRole;
    };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }
    const cleanRole: UserRole = role === "committee" ? "committee" : "admin";
    const cleanFullName = full_name?.trim() || (cleanRole === "committee" ? "Dewan Juri / Panitia" : "Administrator");

    const serviceSupabase = getServiceSupabase();
    let newUserId: string | null = null;

    if (serviceSupabase) {
      // Create user directly with confirmed email using Service Role
      const { data: newUser, error: createError } = await serviceSupabase.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanFullName,
          role: cleanRole,
        },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
      newUserId = newUser.user?.id || null;
    } else {
      // Fallback: Standalone client signup
      const anonSupabase = getAnonSupabase();
      const { data: signUpData, error: signUpError } = await anonSupabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: cleanFullName,
            role: cleanRole,
          },
        },
      });

      if (signUpError) {
        return NextResponse.json({ error: signUpError.message }, { status: 400 });
      }
      newUserId = signUpData.user?.id || null;
    }

    // Ensure profile row exists in public.profiles with specified role
    if (newUserId) {
      const now = new Date().toISOString();
      const { error: upsertErr } = await supabase.from("profiles").upsert({
        id: newUserId,
        email: email.trim().toLowerCase(),
        full_name: cleanFullName,
        role: cleanRole,
        updated_at: now,
      });

      if (upsertErr) {
        console.error("Profile upsert warning:", upsertErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Akun ${cleanRole === "committee" ? "Dewan Juri / Panitia" : "Administrator"} berhasil dibuat.`,
      user: {
        id: newUserId,
        email: email.trim().toLowerCase(),
        full_name: cleanFullName,
        role: cleanRole,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH: Update user profile or password
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Hanya Administrator yang dapat mengubah data pengguna" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, full_name, role, password } = body as {
      id: string;
      full_name?: string;
      role?: UserRole;
      password?: string;
    };

    if (!id) {
      return NextResponse.json({ error: "User ID diperlukan" }, { status: 400 });
    }

    // Update profile data in database
    const updateData: Partial<Profile> = {
      updated_at: new Date().toISOString(),
    };
    if (full_name !== undefined) updateData.full_name = full_name.trim();
    if (role !== undefined) updateData.role = role;

    const { error: pUpdateErr } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", id);

    if (pUpdateErr) {
      return NextResponse.json({ error: pUpdateErr.message }, { status: 500 });
    }

    // If password update requested
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
      }

      const serviceSupabase = getServiceSupabase();
      if (serviceSupabase) {
        const { error: pwdErr } = await serviceSupabase.auth.admin.updateUserById(id, {
          password,
        });
        if (pwdErr) {
          return NextResponse.json({ error: pwdErr.message }, { status: 400 });
        }
      } else if (id === caller.id) {
        // If admin updating their own password
        const { error: ownPwdErr } = await supabase.auth.updateUser({ password });
        if (ownPwdErr) {
          return NextResponse.json({ error: ownPwdErr.message }, { status: 400 });
        }
      } else {
        return NextResponse.json({
          warning: "Profil diperbarui. Untuk mereset password akun lain tanpa email konfirmasi, tambahkan SUPABASE_SERVICE_ROLE_KEY di .env.local",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Data pengguna berhasil diperbarui.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Delete a user profile
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Hanya Administrator yang dapat menghapus pengguna" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID diperlukan" }, { status: 400 });
    }

    if (id === caller.id) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif" },
        { status: 400 }
      );
    }

    // Delete from auth.users if service role exists
    const serviceSupabase = getServiceSupabase();
    if (serviceSupabase) {
      await serviceSupabase.auth.admin.deleteUser(id);
    }

    // Delete from public.profiles
    const { error: delErr } = await supabase.from("profiles").delete().eq("id", id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Akun pengguna berhasil dihapus" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
