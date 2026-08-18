# LCC MAPSI XXVII 2026 — Sistem Ujian Online PAI & BTQ

Platform manajemen kompetisi PAI & BTQ online untuk **Lomba Cerdas Cermat MAPSI XXVII 2026**.

## 🚀 Fitur Utama

- ✅ Dashboard admin dengan statistik real-time
- ✅ Manajemen peserta (CRUD, import Excel, generate nomor undian, QR code)
- ✅ Bank soal PAI (75 soal) + BTQ (25 soal) dengan filter kategori & kesulitan
- ✅ Manajemen sesi ujian + token akses
- ✅ Interface ujian fullscreen dengan countdown timer 90 menit
- ✅ Autosave jawaban selama pengerjaan
- ✅ Anti-cheat: deteksi tab switch, fullscreen exit, copy, right-click
- ✅ Penilaian otomatis + ranking dengan tiebreak waktu submit
- ✅ Live monitoring via Supabase Realtime
- ✅ Export Excel / Print PDF
- ✅ Finalisasi & kunci hasil
- ✅ Role-based access: Admin / Panitia / Peserta
- ✅ Pengaturan aplikasi dinamis (Logo, Nama, Edisi, Tahun) & PWA Ready

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Claymorphism Design System |
| Backend | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | Supabase Auth (cookie-based) |
| Validation | Zod |
| Export | xlsx (Excel), Browser Print API (PDF) |
| Icons | Lucide React |

## 📋 Setup & Instalasi

### 1. Clone / Buka Proyek

```bash
cd "d:\PROJEK MAPSI\LCC MAPSI 2026"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Siapkan Supabase Project

1. Buat project baru di [app.supabase.com](https://app.supabase.com)
2. Pergi ke **Settings → API**
3. Salin `Project URL` dan `anon public key`

### 4. Konfigurasi Environment

```bash
# Salin template environment
copy .env.local.example .env.local
```

Kemudian edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Jalankan Migrasi Database

1. Buka **Supabase Dashboard → SQL Editor**
2. Salin isi file `supabase/migrations/001_initial_schema.sql`
3. Jalankan (Execute)

### 6. Buat Admin User

1. Buka **Supabase Dashboard → Authentication → Users**
2. Klik **Add user** → masukkan email & password admin
3. Di **SQL Editor**, jalankan:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@email-anda.com';
```

### 7. Jalankan Development Server

```bash
npm run dev
```

Akses di: `http://localhost:3000`

---

## 👤 Akses Pengguna

| Role | URL Login | Keterangan |
|---|---|---|
| Admin | `/login` | Akses penuh |
| Panitia | `/login` | Read + monitoring + export |
| Peserta | `/participant-login` | Login dengan kode akses + token ujian |

## 🏃 Alur Kompetisi

```
Admin setup → Input Peserta → Generate Nomor Undian → Input Soal
    ↓
Buat Sesi Ujian → Generate Token → Aktifkan Token → Mulai Sesi
    ↓
Peserta Login (kode akses + token) → Instruksi → Ujian 90 Menit
    ↓
Auto-Scoring → Ranking Otomatis (tiebreak: waktu submit)
    ↓
Review → Finalisasi → Export Hasil
```

## 📁 Struktur Proyek

```
├── app/
│   ├── (auth)/            # Login pages
│   ├── admin/             # Admin dashboard & management
│   ├── committee/         # Committee read-only views
│   └── exam/              # Participant exam interface
├── components/
│   ├── shared/            # Sidebar, Header, Toast, ConfirmDialog, AuthHeader
│   ├── exam/              # ExamInterface
│   └── monitoring/        # Live monitoring component
├── lib/
│   ├── supabase/          # Client, server, middleware helpers
│   ├── hooks/             # useCountdownTimer, useAntiCheat, useAutosave
│   ├── utils/             # scoring.ts, export.ts
│   ├── types/             # TypeScript database types
│   └── validations/       # Zod schemas
└── supabase/
    └── migrations/        # SQL schema + RLS policies
```

## 📜 Lisensi

Dikembangkan untuk keperluan **LCC MAPSI XXVII 2026**. Tidak untuk distribusi komersial.

---

> ⚠️ **Catatan:** Sistem ini mendukung pelaksanaan ujian PAI & BTQ secara online. **Babak Cerdas Cermat (Quiz Bowl)** dilaksanakan secara offline dan **tidak termasuk** dalam sistem ini.
