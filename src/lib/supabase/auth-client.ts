/**
 * Supabase Auth Client (Browser)
 * ================================
 * Client khusus untuk browser-side authentication.
 * Session disimpan di localStorage agar user tetap login.
 * Singleton pattern — hanya satu instance.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _authClient: SupabaseClient | null = null;

export function getAuthClient(): SupabaseClient {
  if (!_authClient) {
    _authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _authClient;
}
