"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, Mail, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/shared/ToastProvider";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email) errs.email = "Email harus diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Format email tidak valid";
    if (!password) errs.password = "Password harus diisi";
    else if (password.length < 6) errs.password = "Password minimal 6 karakter";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Login gagal", error.message === "Invalid login credentials"
          ? "Email atau password salah"
          : error.message
        );
        return;
      }

      if (data.user) {
        // Fetch profile
        let { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        // If logging in via admin portal and role is participant/null, auto-promote to admin
        if (!profile || profile.role === "participant") {
          await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              email: data.user.email ?? email,
              role: "admin",
              updated_at: new Date().toISOString(),
            });

          profile = {
            id: data.user.id,
            email: data.user.email ?? email,
            role: "admin",
            full_name: profile?.full_name ?? null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }

        const role = profile.role ?? "admin";
        toast.success("Login berhasil", `Selamat datang kembali, ${profile.full_name || email}!`);

        if (role === "committee") {
          router.push("/committee/monitoring");
        } else {
          router.push("/admin/dashboard");
        }
      }
    } catch {
      toast.error("Terjadi kesalahan", "Coba lagi beberapa saat");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="clay-card" style={{ padding: "1.75rem 1.75rem", width: "100%", boxSizing: "border-box" }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "1.25rem",
          marginBottom: "0.25rem",
        }}
      >
        Masuk ke Sistem
      </h2>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.825rem", marginBottom: "1.25rem", fontWeight: 500 }}>
        Login untuk Admin & Panitia
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div className="form-group" style={{ marginBottom: "1rem" }}>
          <label className="form-label" htmlFor="login-email" style={{ fontSize: "0.8rem" }}>
            Email
          </label>
          <div style={{ position: "relative" }}>
            <Mail
              size={15}
              style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              id="login-email"
              type="email"
              className="clay-input"
              style={{ paddingLeft: "2.4rem", paddingRight: "0.85rem", fontSize: "0.875rem", height: "42px" }}
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isLoading}
            />
          </div>
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>

        {/* Password */}
        <div className="form-group" style={{ marginBottom: "1.25rem" }}>
          <label className="form-label" htmlFor="login-password" style={{ fontSize: "0.8rem" }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <Lock
              size={15}
              style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              className="clay-input"
              style={{ paddingLeft: "2.4rem", paddingRight: "2.8rem", fontSize: "0.875rem", height: "42px" }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                display: "flex",
                padding: "4px",
              }}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && <span className="form-error">{errors.password}</span>}
        </div>

        <button
          type="submit"
          className="clay-btn clay-btn-primary"
          style={{ width: "100%", justifyContent: "center", padding: "0.7rem 1.5rem", fontSize: "0.95rem" }}
          disabled={isLoading}
          id="login-submit-btn"
        >
          {isLoading ? (
            <>
              <span className="clay-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Memproses...
            </>
          ) : (
            <>
              <LogIn size={16} />
              Masuk
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="clay-divider" style={{ margin: "1rem 0" }} />

      {/* Participant link */}
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "0.825rem", color: "var(--color-text-muted)", fontWeight: 500, margin: 0 }}>
          Peserta ujian?{" "}
          <Link
            href="/participant-login"
            style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "none" }}
          >
            Login di sini →
          </Link>
        </p>
      </div>
    </div>
  );
}
