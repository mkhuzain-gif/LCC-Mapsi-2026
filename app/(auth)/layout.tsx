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
        overflow: "hidden",
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          left: "-100px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(109,40,217,0.15), transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-80px",
          right: "-80px",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(8,145,178,0.12), transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "10%",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.1), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Main card */}
      <div style={{ width: "100%", maxWidth: 480, position: "relative" }}>
        {/* Dynamic Branding */}
        <AuthHeader />

        {children}

        {/* Dynamic Footer */}
        <AuthFooter />
      </div>
    </div>
  );
}

