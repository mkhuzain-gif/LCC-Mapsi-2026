import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { ServiceWorkerRegistration } from "@/components/shared/ServiceWorkerRegistration";
import { PWAInstallPrompt } from "@/components/shared/PWAInstallPrompt";

// ─── Viewport (Next.js 14/15/16) ──────────────────────────────
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#6d28d9",
  viewportFit: "cover",
};

// ─── Metadata PWA Lengkap ────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "LCC MAPSI XXVII 2026 — Sistem Ujian Online PAI & BTQ",
    template: "%s | LCC MAPSI XXVII 2026",
  },
  description:
    "Sistem ujian online Lomba Cerdas Cermat MAPSI XXVII 2026. Platform manajemen peserta, bank soal PAI & BTQ, ujian online, dan rekap hasil secara otomatis.",
  keywords: ["MAPSI", "LCC", "PAI", "BTQ", "ujian online", "lomba", "2026", "Islamic education"],
  authors: [{ name: "Panitia MAPSI XXVII 2026" }],

  // ── PWA Manifest ──
  manifest: "/manifest.json",

  // ── Apple PWA ──
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LCC MAPSI",
  },

  // ── Icons ──
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },

  // ── Open Graph ──
  openGraph: {
    title: "LCC MAPSI XXVII 2026",
    description: "Sistem Ujian Online Lomba Cerdas Cermat MAPSI — PAI & BTQ",
    type: "website",
    locale: "id_ID",
    siteName: "LCC MAPSI XXVII 2026",
  },

  // ── Misc ──
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        {/* Apple & Microsoft PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LCC MAPSI" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />

        <meta name="msapplication-TileColor" content="#6d28d9" />
        <meta name="msapplication-TileImage" content="/icon-512.png" />
        <meta name="msapplication-tap-highlight" content="no" />

        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>
        <ToastProvider>
          {children}
          <PWAInstallPrompt />
        </ToastProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
