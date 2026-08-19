import type { Metadata } from "next";
import { AuthHeader, AuthFooter } from "@/components/shared/AuthHeader";

export const metadata: Metadata = {
  title: "Login",
  description: "Masuk ke sistem LCC MAPSI",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0ebff 0%, #e0d7ff 50%, #dbeafe 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        position: "relative",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      {/* Decorative background blurs */}
      <div
        style={{
          position: "absolute",
          top: "-80px",
          left: "-80px",
          width: "320px",
          height: "320px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(109,40,217,0.12), transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-60px",
          right: "-60px",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(8,145,178,0.1), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Main card wrapper */}
      <div style={{ width: "100%", maxWidth: 430, position: "relative", zIndex: 1, margin: "auto" }}>
        {/* Dynamic Branding */}
        <AuthHeader />

        {children}

        {/* Dynamic Footer */}
        <AuthFooter />
      </div>
    </div>
  );
}
