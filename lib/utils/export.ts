import * as XLSX from "xlsx";
import type { RankingEntry } from "@/lib/types/database";
import { formatDuration } from "./scoring";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export interface SignatureInfo {
  juri1: { name: string; nip: string };
  juri2: { name: string; nip: string };
  juri3: { name: string; nip: string };
  ketua: { name: string; nip: string };
}

// =============================================
// Excel Export
// =============================================

export function exportRankingsToExcel(
  rankings: RankingEntry[],
  filename?: string,
  signatures?: SignatureInfo
) {
  const data = rankings.map((entry) => ({
    "Ranking": entry.rank,
    "Nomor Undian": entry.participant.draw_number ?? "-",
    "Nama Peserta": entry.participant.full_name,
    "Jenis Kelamin": entry.participant.gender === "male" ? "Putra" : "Putri",
    "Skor PAI": entry.submission.pai_score,
    "Skor BTQ": entry.submission.btq_score,
    "Skor Total": entry.submission.total_score,
    "Benar": entry.submission.correct_count,
    "Salah": entry.submission.wrong_count,
    "Tidak Dijawab": entry.submission.unanswered_count,
    "Persentase (%)": entry.submission.percentage,
    "Waktu Mulai": entry.submission.started_at
      ? format(new Date(entry.submission.started_at), "HH:mm:ss", { locale: id })
      : "-",
    "Waktu Submit": entry.submission.submitted_at
      ? format(new Date(entry.submission.submitted_at), "HH:mm:ss", { locale: id })
      : "-",
    "Durasi": entry.submission.duration_seconds
      ? formatDuration(entry.submission.duration_seconds)
      : "-",
    "Status": entry.submission.status,
    "Seri": entry.is_tie ? "Ya" : "Tidak",
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Auto column widths
  const colWidths = Object.keys(data[0] ?? {}).map((k) => ({
    wch: Math.max(k.length, ...data.map((r) => String(r[k as keyof typeof r] ?? "").length)),
  }));
  ws["!cols"] = colWidths;

  // Add signatures at the bottom if provided
  if (signatures) {
    const juriHeaderRow = ["", "Dewan Juri I", "", "", "Dewan Juri II", "", "", "Dewan Juri III"];
    const juriNameRow = ["", signatures.juri1.name || "-", "", "", signatures.juri2.name || "-", "", "", signatures.juri3.name || "-"];
    const juriNipRow = ["", `NIP. ${signatures.juri1.nip || "-"}`, "", "", `NIP. ${signatures.juri2.nip || "-"}`, "", "", `NIP. ${signatures.juri3.nip || "-"}`];

    const ketuaTitleRow = ["", "", "", "Mengetahui,", "", "", "", ""];
    const ketuaHeaderRow = ["", "", "", "Ketua Panitia MAPSI XXVII", "", "", "", ""];
    const ketuaNameRow = ["", "", "", signatures.ketua.name || "-", "", "", "", ""];
    const ketuaNipRow = ["", "", "", `NIP. ${signatures.ketua.nip || "-"}`, "", "", "", ""];

    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [],
        [],
        juriHeaderRow,
        [],
        [],
        juriNameRow,
        juriNipRow,
        [],
        ketuaTitleRow,
        ketuaHeaderRow,
        [],
        [],
        ketuaNameRow,
        ketuaNipRow,
      ],
      { origin: -1 }
    );
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ranking");

  const fname = filename ?? `ranking-mapsi-xxvii-${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fname);
}

export function exportParticipantsToExcel(
  participants: Array<Record<string, unknown>>,
  filename?: string
) {
  const ws = XLSX.utils.json_to_sheet(participants);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Peserta");
  XLSX.writeFile(wb, filename ?? `peserta-mapsi-xxvii-${Date.now()}.xlsx`);
}

// =============================================
// Print / PDF (browser print API)
// =============================================

export function printRankings(
  rankings: RankingEntry[],
  sessionTitle: string,
  signatures?: SignatureInfo
) {
  const rows = rankings
    .map(
      (entry) => `
      <tr>
        <td class="center rank-${entry.rank <= 3 ? entry.rank : "other"}">
          ${entry.rank}${entry.is_tie ? ' <span class="tie">*</span>' : ""}
        </td>
        <td class="center">${entry.participant.draw_number ?? "-"}</td>
        <td>${entry.participant.full_name}</td>
        <td class="center">${entry.submission.pai_score}</td>
        <td class="center">${entry.submission.btq_score}</td>
        <td class="center bold">${entry.submission.total_score}</td>
        <td class="center">${entry.submission.percentage}%</td>
        <td class="center">${entry.submission.submitted_at ? format(new Date(entry.submission.submitted_at), "HH:mm:ss") : "-"}</td>
        <td class="center">${entry.submission.duration_seconds ? formatDuration(entry.submission.duration_seconds) : "-"}</td>
      </tr>`
    )
    .join("");

  const sigBlock = signatures
    ? `
      <div class="signatures-wrapper">
        <div class="juri-row">
          <div class="sig-box">
            <p>Dewan Juri I</p>
            <div class="sig-space"></div>
            <p class="sig-name"><u>${signatures.juri1.name || "...................................."}</u></p>
            <p class="sig-nip">NIP. ${signatures.juri1.nip || "-"}</p>
          </div>
          <div class="sig-box">
            <p>Dewan Juri II</p>
            <div class="sig-space"></div>
            <p class="sig-name"><u>${signatures.juri2.name || "...................................."}</u></p>
            <p class="sig-nip">NIP. ${signatures.juri2.nip || "-"}</p>
          </div>
          <div class="sig-box">
            <p>Dewan Juri III</p>
            <div class="sig-space"></div>
            <p class="sig-name"><u>${signatures.juri3.name || "...................................."}</u></p>
            <p class="sig-nip">NIP. ${signatures.juri3.nip || "-"}</p>
          </div>
        </div>
        <div class="ketua-row">
          <div class="sig-box center-box">
            <p>Mengetahui,</p>
            <p><b>Ketua Panitia MAPSI XXVII</b></p>
            <div class="sig-space"></div>
            <p class="sig-name"><u>${signatures.ketua.name || "...................................."}</u></p>
            <p class="sig-nip">NIP. ${signatures.ketua.nip || "-"}</p>
          </div>
        </div>
      </div>
    `
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Rekap Hasil — ${sessionTitle}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
        h1 { text-align: center; font-size: 16px; margin-bottom: 4px; }
        h2 { text-align: center; font-size: 13px; font-weight: normal; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; }
        th { background: #6d28d9; color: white; font-size: 11px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .rank-1 { color: #f59e0b; font-weight: bold; font-size: 14px; }
        .rank-2 { color: #94a3b8; font-weight: bold; }
        .rank-3 { color: #fb923c; font-weight: bold; }
        .tie { color: red; font-size: 10px; vertical-align: super; }
        .footer { text-align: center; margin-top: 16px; font-size: 10px; color: #666; page-break-after: avoid; }
        
        .signatures-wrapper { margin-top: 35px; page-break-inside: avoid; }
        .juri-row { display: flex; justify-content: space-around; text-align: center; margin-bottom: 30px; }
        .ketua-row { display: flex; justify-content: center; text-align: center; }
        .sig-box { width: 30%; font-size: 11px; }
        .center-box { width: 45%; }
        .sig-space { height: 55px; }
        .sig-name { font-weight: bold; font-size: 11px; }
        .sig-nip { font-size: 10px; color: #444; }

        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>REKAPITULASI HASIL UJIAN</h1>
      <h2>LCC MAPSI XXVII 2026 — ${sessionTitle}</h2>
      <h2>Dicetak: ${format(new Date(), "dd MMMM yyyy, HH:mm", { locale: id })}</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th><th>No. Undian</th><th>Nama Peserta</th>
            <th>PAI</th><th>BTQ</th><th>Total</th>
            <th>%</th><th>Submit</th><th>Durasi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        * Penanda seri — tiebreak menggunakan waktu submit tercepat.<br>
        Total peserta: ${rankings.length} | Dibuat oleh Sistem LCC MAPSI XXVII 2026
      </div>
      ${sigBlock}
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  }
}

// =============================================
// QR Code (uses browser canvas / dynamic import)
// =============================================
export async function generateParticipantQR(
  participant: { draw_number: string | null; access_code: string | null; full_name: string }
): Promise<string> {
  const QRCode = await import("qrcode");
  const payload = JSON.stringify({
    draw: participant.draw_number,
    code: participant.access_code,
    name: participant.full_name,
    event: "LCC MAPSI XXVII 2026",
  });
  return await QRCode.toDataURL(payload, { width: 200, margin: 2, color: { dark: "#1e1b4b", light: "#ffffff" } });
}

