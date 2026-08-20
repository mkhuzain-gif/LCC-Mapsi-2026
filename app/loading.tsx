import Image from "next/image";

export default function Loading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          background: "#ffffff",
          boxShadow: "0 10px 30px rgba(109, 40, 217, 0.15), 0 2px 8px rgba(0,0,0,0.06)",
          border: "1.5px solid #f0ebff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
          marginBottom: "1.25rem",
          animation: "pulse 1.8s ease-in-out infinite",
        }}
      >
        <img
          src="/icon-192.png"
          alt="Logo LCC MAPSI"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>

      <div
        style={{
          fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)",
          fontWeight: 800,
          fontSize: "1.15rem",
          color: "#6d28d9",
          letterSpacing: "-0.01em",
          marginBottom: "0.4rem",
        }}
      >
        LCC MAPSI XXVII
      </div>

      <div
        style={{
          fontSize: "0.8rem",
          color: "#6b7280",
          fontWeight: 600,
          marginBottom: "1.5rem",
        }}
      >
        Sistem Ujian Online PAI & BTQ
      </div>

      {/* Modern animated loader */}
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #ede9fe",
          borderTopColor: "#6d28d9",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}
