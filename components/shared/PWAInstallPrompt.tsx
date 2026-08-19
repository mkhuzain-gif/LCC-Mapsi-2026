"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

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
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

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

    // Cek jika sudah pernah ditolak (dalam 7 hari)
    const dismissed = localStorage.getItem("pwa_install_dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < sevenDays) return;
    }

    // Deteksi iOS
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(iOS);

    if (iOS) {
      // Tampilkan banner iOS setelah 3 detik
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android / Desktop → tangkap event install
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    const handleManualPrompt = () => {
      setShowBanner(true);
      if (iOS) setShowIOSInstructions(true);
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
  }, [isIOS]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSInstructions(false);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Banner install utama */}
      <div
        style={{
          position: "fixed",
          bottom: "env(safe-area-inset-bottom, 1rem)",
          left: "1rem",
          right: "1rem",
          zIndex: 9999,
          maxWidth: 480,
          margin: "0 auto",
          animation: "slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        id="pwa-install-banner"
      >
        <div
          style={{
            background: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 60%, #7c3aed 100%)",
            borderRadius: 20,
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            boxShadow:
              "0 20px 60px rgba(109,40,217,0.5), 0 4px 16px rgba(0,0,0,0.3)",
            border: "1.5px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
              padding: 3,
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
                fontSize: "0.9rem",
                lineHeight: 1.3,
              }}
            >
              Install Aplikasi LCC MAPSI
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.75rem",
                marginTop: "0.1rem",
                lineHeight: 1.4,
              }}
            >
              {isIOS
                ? "Tambahkan ke layar utama iPhone kamu"
                : "Akses lebih cepat tanpa buka browser"}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
            <button
              onClick={handleInstall}
              style={{
                background: "rgba(255,255,255,0.95)",
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
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
              id="pwa-install-btn"
            >
              {isIOS ? (
                <>
                  <Smartphone size={14} /> Cara Install
                </>
              ) : (
                <>
                  <Download size={14} /> Install
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                width: 36,
                height: 36,
                borderRadius: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              aria-label="Tutup"
              id="pwa-dismiss-btn"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal instruksi iOS */}
      {showIOSInstructions && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15,10,30,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "1rem",
            animation: "fadeIn 0.3s ease",
          }}
          onClick={handleDismiss}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1a1033, #2d1b69)",
              borderRadius: "24px 24px 20px 20px",
              padding: "2rem",
              width: "100%",
              maxWidth: 400,
              border: "1.5px solid rgba(167,139,250,0.3)",
              boxShadow: "0 -20px 60px rgba(109,40,217,0.3)",
              animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)",
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
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "1.1rem",
                  color: "white",
                }}
              >
                📱 Cara Install di iPhone
              </div>
              <button
                onClick={handleDismiss}
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

            {[
              {
                step: "1",
                icon: "⬆️",
                text: 'Ketuk ikon Share (kotak dengan panah atas) di toolbar Safari',
              },
              {
                step: "2",
                icon: "➕",
                text: 'Scroll ke bawah dan ketuk "Add to Home Screen"',
              },
              {
                step: "3",
                icon: "✅",
                text: 'Ketuk "Add" di pojok kanan atas untuk menambahkan',
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "0.8rem",
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  {item.step}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>{" "}
                  <span
                    style={{
                      color: "rgba(255,255,255,0.85)",
                      fontSize: "0.85rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.text}
                  </span>
                </div>
              </div>
            ))}

            <button
              onClick={handleDismiss}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                color: "white",
                border: "none",
                padding: "0.9rem",
                borderRadius: 14,
                fontWeight: 800,
                fontSize: "0.95rem",
                cursor: "pointer",
                marginTop: "0.5rem",
                boxShadow: "0 8px 24px rgba(109,40,217,0.4)",
              }}
            >
              Mengerti, Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
