-- ==========================================================
-- LCC MAPSI XXVII 2026 — Auto Confirm Email & Fix Unconfirmed Users
-- Jalankan skrip ini di Supabase SQL Editor
-- ==========================================================

-- 1. Konfirmasi segera semua akun yang saat ini berstatus unconfirmed
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- 2. Buat fungsi trigger agar setiap akun baru (Juri/Panitia/Admin) 
--    otomatis langsung terkonfirmasi tanpa perlu verifikasi email
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
  RETURN NEW;
END;
$$;

-- 3. Pasang trigger BEFORE INSERT pada auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_user();
