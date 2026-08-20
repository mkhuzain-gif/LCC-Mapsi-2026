"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, CheckCircle, Info } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Cek apakah sudah terinstall sebagai PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Deteksi iOS
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(iOS);

    // Cek jika sudah pernah ditolak dalam 3 hari terakhir
    const dismissed = localStorage.getItem("pwa_install_dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < threeDays) {
        // Jangan auto-munculkan banner, tapi tetap siapkan event jika user klik manual
      } else {
        setTimeout(() => setShowBanner(true), 2500);
      }
    } else {
      setTimeout(() => setShowBanner(true), 2500);
    }

    // Android / Chrome → tangkap event install
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    const handleManualPrompt = () => {
      setShowBanner(true);
      if (!deferredPrompt) {
        setShowInstructions(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("mapsi_trigger_pwa_install", handleManualPrompt);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("mapsi_trigger_pwa_install", handleManualPrompt);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowInstructions(true);
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
          setShowBanner(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Install prompt error:", err);
        setShowInstructions(true);
      }
    } else {
      // Jika event belum tertangkap atau browser in-app
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowInstructions(false);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Banner install utama */}
      {showBanner && !showInstructions && (
        <div
          style={{
            position: "fixed",
            bottom: "max(env(safe-area-inset-bottom, 1rem), 1rem)",
            left: "1rem",
            right: "1rem",
            zIndex: 9999,
            maxWidth: 480,
            width: "calc(100% - 2rem)",
            boxSizing: "border-box",
            margin: "0 auto",
            animation: "slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          id="pwa-install-banner"
        >
          <div
            style={{
              background: "linear-gradient(135deg, #3b0764 0%, #6d28d9 60%, #7c3aed 100%)",
              borderRadius: 20,
              padding: "0.9rem 1.1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              boxShadow:
                "0 20px 50px rgba(109,40,217,0.5), 0 4px 16px rgba(0,0,0,0.3)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
                padding: 2,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <img
                src="/icon-192.png"
                alt="LCC MAPSI"
                style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }}
              />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "white",
                  fontWeight: 800,
                  fontSize: "0.88rem",
                  lineHeight: 1.25,
                }}
              >
                Install Aplikasi LCC MAPSI
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "0.72rem",
                  marginTop: "0.15rem",
                  lineHeight: 1.3,
                }}
              >
                {isIOS
                  ? "Tambahkan ke Layar Utama iPhone"
                  : "Akses cepat & stabil seperti aplikasi"}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
              <button
                onClick={handleInstall}
                style={{
                  background: "white",
                  color: "#6d28d9",
                  border: "none",
                  padding: "0.5rem 0.85rem",
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  transition: "all 0.2s",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
                }}
                id="pwa-install-btn"
              >
                <Download size={14} /> Install
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  background: "rgba(255,255,255,0.18)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.25)",
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                aria-label="Tutup"
                id="pwa-dismiss-btn"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal instruksi Install (Android / iOS / In-App) */}
      {showInstructions && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15,10,30,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "1rem",
            animation: "fadeIn 0.3s ease",
          }}
          onClick={() => setShowInstructions(false)}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1e1138, #2e1754)",
              borderRadius: "24px 24px 20px 20px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: 440,
              border: "1.5px solid rgba(167,139,250,0.3)",
              boxShadow: "0 -20px 60px rgba(109,40,217,0.4)",
              animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)",
              color: "white",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Smartphone size={22} color="#a78bfa" />
                <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "white" }}>
                  {isIOS ? "Install di iPhone / Safari" : "Cara Install Aplikasi"}
                </div>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "white",
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {isIOS ? (
              // Instruksi iPhone / iOS Safari
              [
                {
                  step: "1",
                  icon: "⬆️",
                  text: 'Ketuk tombol Bagikan / Share (ikon kotak dengan panah atas) di toolbar Safari',
                },
                {
                  step: "2",
                  icon: "➕",
                  text: 'Gulir ke bawah dan ketuk menu "Tambahkan ke Layar Utama" (Add to Home Screen)',
                },
                {
                  step: "3",
                  icon: "✅",
                  text: 'Ketuk "Tambah" di pojok kanan atas. Aplikasi akan muncul di layar utama!',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    marginBottom: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: "0.75rem",
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {item.step}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "1rem" }}>{item.icon}</span>{" "}
                    <span
                      style={{
                        color: "rgba(255,255,255,0.9)",
                        fontSize: "0.82rem",
                        lineHeight: 1.45,
                      }}
                    >
                      {item.text}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              // Instruksi Android / Chrome
              <>
                <div
                  style={{
                    padding: "0.6rem 0.8rem",
                    borderRadius: 12,
                    background: "rgba(245,158,11,0.15)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    color: "#fde68a",
                    fontSize: "0.78rem",
                    marginBottom: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Info size={16} style={{ flexShrink: 0 }} />
                  <span>Pastikan membuka web ini di browser <strong>Google Chrome</strong> (bukan dari dalam aplikasi pesan).</span>
                </div>

                {[
                  {
                    step: "1",
                    icon: "⋮",
                    text: 'Ketuk menu titik tiga (⋮) di pojok kanan atas Google Chrome',
                  },
                  {
                    step: "2",
                    icon: "📲",
                    text: 'Pilih "Install Aplikasi" atau "Tambahkan ke Layar Utama"',
                  },
                  {
                    step: "3",
                    icon: "✨",
                    text: 'Ketuk "Install". Aplikasi LCC MAPSI siap digunakan tanpa membuka browser!',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      marginBottom: "0.75rem",
                      padding: "0.75rem",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: "0.75rem",
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {item.step}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.9)",
                          fontSize: "0.82rem",
                          lineHeight: 1.45,
                        }}
                      >
                        {item.text}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}

            <button
              onClick={() => setShowInstructions(false)}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                color: "white",
                border: "none",
                padding: "0.85rem",
                borderRadius: 14,
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: "pointer",
                marginTop: "0.5rem",
                boxShadow: "0 8px 24px rgba(109,40,217,0.4)",
              }}
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
