/**
 * Seed Script — Tabel schedules
 * ===============================
 * Jalankan dengan: npx tsx src/scripts/seed.ts
 *
 * Menambahkan data dummy ke tabel schedules untuk testing.
 * PERLU: .env.local sudah terisi dengan Supabase credentials.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/types";

// ─── Setup Client ─────────────────────────────────────────────

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY di .env.local");
  process.exit(1);
}

const db = createClient<Database>(url, key, {
  auth: { persistSession: false },
});

// ─── Seed Data ────────────────────────────────────────────────

const seedSchedules = [
  {
    gdrive_file_id: "1ABC_contoh_file_id_gambar_1",
    media_type: "IMAGE" as const,
    caption:
      "🌅 Selamat pagi! Post otomatis pertama dari Auto-Poster.\n\n#automation #instagram #nextjs",
    scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 jam dari sekarang
    status: "pending" as const,
  },
  {
    gdrive_file_id: "1DEF_contoh_file_id_video_1",
    media_type: "VIDEO" as const,
    caption:
      "🎥 Video showcase produk terbaru!\n\n#video #reels #product",
    scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 jam dari sekarang
    status: "pending" as const,
  },
  {
    gdrive_file_id: "1GHI_contoh_file_id_gambar_2",
    media_type: "IMAGE" as const,
    caption:
      "✨ Tips & Tricks hari ini.\n\n#tips #tutorial #creative",
    scheduled_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 menit yang lalu (due)
    status: "pending" as const,
  },
];

// ─── Execute ──────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Memulai seeding data schedules...\n");

  // Insert seed data
  const { data, error } = await db
    .from("schedules")
    .insert(seedSchedules)
    .select();

  if (error) {
    console.error("❌ Gagal seed:", error.message);
    console.error("   Detail:", error.details);
    console.error("   Hint:", error.hint);
    process.exit(1);
  }

  console.log(`✅ Berhasil insert ${data.length} jadwal:\n`);
  data.forEach((row, i) => {
    console.log(`   ${i + 1}. [${row.media_type}] ${row.caption.slice(0, 40)}...`);
    console.log(`      ID: ${row.id}`);
    console.log(`      Scheduled: ${row.scheduled_at}`);
    console.log(`      Status: ${row.status}\n`);
  });

  // Tampilkan total data di tabel
  const { count } = await db
    .from("schedules")
    .select("*", { count: "exact", head: true });

  console.log(`📊 Total jadwal di database: ${count}`);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
