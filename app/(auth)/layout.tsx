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
        minHeight: "100dvh",
        width: "100%",
        maxWidth: "100vw",
        background: "linear-gradient(135deg, #f0ebff 0%, #e0d7ff 50%, #dbeafe 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        position: "relative",
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehaviorX: "none",
        boxSizing: "border-box",
      }}
    >
      {/* Decorative background blurs inside isolated overflow-hidden container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "-80px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(109,40,217,0.12), transparent)",
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
          }}
        />
      </div>

      {/* Main card wrapper */}
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          position: "relative",
          zIndex: 1,
          margin: "auto",
          boxSizing: "border-box",
        }}
      >
        {/* Dynamic Branding */}
        <AuthHeader />

        {children}

        {/* Dynamic Footer */}
        <AuthFooter />
      </div>
    </div>
  );
}
