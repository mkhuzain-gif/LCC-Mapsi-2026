import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ujian Online",
  description: "LCC MAPSI XXVII 2026 — Ujian PAI & BTQ Online",
};

export default function ExamLayout({ children }: { children: React.ReactNode }) {
  // No sidebar for exam — full screen
  return <>{children}</>;
}
