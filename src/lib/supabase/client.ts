/**
 * Supabase Client
 * ================
 * Menyediakan dua client:
 * 1. `supabase` — Public client (anon key) untuk operasi client-side / read-only.
 * 2. `supabaseAdmin` — Service role client untuk operasi server-side (bypass RLS).
 *
 * Gunakan `supabaseAdmin` HANYA di API routes / server actions.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ─── Environment Variables ────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validasi env vars saat module di-load
if (!supabaseUrl) {
  throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// ─── Public Client (Anon Key) ─────────────────────────────────

/**
 * Supabase client dengan anon key.
 * - Bisa digunakan di client-side dan server-side.
 * - Tunduk pada Row Level Security (RLS).
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // Tidak perlu persistSession untuk use-case API/cron
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// ─── Admin Client (Service Role Key) ──────────────────────────

/**
 * Supabase client dengan service role key.
 * - HANYA gunakan di server-side (API routes, server actions).
 * - Bypass RLS — full access ke semua tabel.
 * - Lazy-initialized untuk menghindari error di client-side.
 */
function createAdminClient(): SupabaseClient<Database> {
  if (!supabaseServiceRoleKey) {
    throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(supabaseUrl!, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Admin client — lazy singleton */
let _adminClient: SupabaseClient<Database> | null = null;

/**
 * Mendapatkan Supabase admin client (service role).
 * Gunakan ini di API routes untuk bypass RLS.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!_adminClient) {
    _adminClient = createAdminClient();
  }
  return _adminClient;
}
