/**
 * Clean Script — Hapus semua data di tabel schedules & post_logs
 * Jalankan: npx tsx src/scripts/clean.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/types";

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function clean() {
  console.log("🗑️  Membersihkan data...\n");

  // Hapus post_logs dulu (FK ke schedules)
  const { error: logErr } = await db.from("post_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (logErr) {
    console.error("❌ Gagal hapus post_logs:", logErr.message);
  } else {
    console.log("   ✅ post_logs dikosongkan");
  }

  // Hapus schedules
  const { error: schedErr } = await db.from("schedules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (schedErr) {
    console.error("❌ Gagal hapus schedules:", schedErr.message);
  } else {
    console.log("   ✅ schedules dikosongkan");
  }

  console.log("\n🎉 Selesai! Jalankan `npm run seed` untuk data fresh.");
}

clean().catch((err) => {
  console.error("❌ Clean error:", err);
  process.exit(1);
});
