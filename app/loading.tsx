export default function Loading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(135deg, #f0ebff 0%, #e0d7ff 50%, #dbeafe 100%)",
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
          width: 90,
          height: 90,
          borderRadius: 24,
          background: "#ffffff",
          boxShadow: "0 12px 36px rgba(109, 40, 217, 0.2), 0 4px 12px rgba(0,0,0,0.06)",
          border: "2px solid rgba(255,255,255,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
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
            borderRadius: 16,
          }}
        />
      </div>

      <div
        style={{
          fontFamily: "var(--font-display, 'Plus Jakarta Sans', sans-serif)",
          fontWeight: 900,
          fontSize: "1.25rem",
          background: "linear-gradient(135deg, #6d28d9, #0891b2)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-0.01em",
          marginBottom: "0.3rem",
        }}
      >
        LCC MAPSI XXVII
      </div>

      <div
        style={{
          fontSize: "0.825rem",
          color: "#6b7280",
          fontWeight: 600,
          marginBottom: "1.5rem",
        }}
      >
        Sistem Ujian Online PAI & BTQ 2026
      </div>

      {/* Claymorphism Spinner */}
      <div
        style={{
          width: 28,
          height: 28,
          border: "3px solid #ddd6fe",
          borderTopColor: "#6d28d9",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}
