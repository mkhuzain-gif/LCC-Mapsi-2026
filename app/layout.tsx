import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { ServiceWorkerRegistration } from "@/components/shared/ServiceWorkerRegistration";
import { PWAInstallPrompt } from "@/components/shared/PWAInstallPrompt";

// ─── Viewport (terpisah dari metadata per Next.js 16) ───────
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6d28d9" },
    { media: "(prefers-color-scheme: dark)", color: "#4c1d95" },
  ],
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
      { url: "/icon-512.jpg", sizes: "512x512", type: "image/jpeg" },
    ],
    apple: [
      { url: "/icon-512.jpg", sizes: "512x512" },
    ],
    shortcut: "/icon-512.jpg",
  },

  // ── Open Graph (share ke media sosial) ──
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
        {/* Apple PWA meta tags tambahan */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LCC MAPSI" />
        <link rel="apple-touch-icon" href="/icon-512.jpg" />

        {/* Microsoft PWA */}
        <meta name="msapplication-TileColor" content="#6d28d9" />
        <meta name="msapplication-TileImage" content="/icon-512.jpg" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Prevent phone number detection */}
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
