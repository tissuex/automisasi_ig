/**
 * Test Script — Instagram Graph API
 * ====================================
 * Verifikasi bahwa posting ke Instagram berhasil
 * menggunakan file dari Google Drive.
 *
 * Usage:
 *   npx tsx src/scripts/test-instagram.ts <GDRIVE_FILE_ID> "<CAPTION>"
 *
 * ⚠️ PERHATIAN: Script ini BENAR-BENAR posting ke Instagram!
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { google } from "googleapis";
import { postToInstagram } from "../lib/instagram/client";

// ─── Validasi Args ────────────────────────────────────────────

const fileId = process.argv[2];
const caption = process.argv[3] || "Test post dari Auto-Poster 🚀";

if (!fileId) {
  console.error("❌ Usage: npx tsx src/scripts/test-instagram.ts <GDRIVE_FILE_ID> [CAPTION]");
  process.exit(1);
}

// ─── Validasi Env ─────────────────────────────────────────────

const requiredEnvs = [
  "GDRIVE_CLIENT_EMAIL",
  "GDRIVE_PRIVATE_KEY",
  "IG_USER_ID",
  "IG_ACCESS_TOKEN",
];

for (const key of requiredEnvs) {
  if (!process.env[key]) {
    console.error(`❌ Missing env: ${key}`);
    process.exit(1);
  }
}

// ─── Setup Google Drive ───────────────────────────────────────

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GDRIVE_CLIENT_EMAIL,
    private_key: process.env.GDRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({ version: "v3", auth });

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  🧪 Instagram Post — Test Script        ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // Step 1: Ambil metadata file dari Google Drive
  console.log(`📋 Step 1: Cek file Google Drive (${fileId})...`);
  
  const metaRes = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, webContentLink",
  });

  const file = metaRes.data;
  console.log(`   📄 Nama     : ${file.name}`);
  console.log(`   🏷️  MIME Type: ${file.mimeType}`);
  console.log(`   📏 Ukuran   : ${file.size} bytes\n`);

  // Tentukan media type berdasarkan MIME type
  const isVideo = file.mimeType?.startsWith("video/");
  const mediaType = isVideo ? "VIDEO" : "IMAGE";

  // Step 2: Generate public URL
  // Menggunakan Google Drive direct download link
  // ⚠️ File HARUS di-share sebagai "Anyone with the link"
  const mediaUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  console.log(`🔗 Step 2: Media URL (${mediaType})`);
  console.log(`   ${mediaUrl}\n`);

  // Step 3: Post ke Instagram
  console.log(`📸 Step 3: Posting ke Instagram...`);
  console.log(`   Caption: ${caption}\n`);

  try {
    const result = await postToInstagram({
      mediaUrl,
      caption,
      mediaType: mediaType as "IMAGE" | "VIDEO",
    });

    console.log("\n═══════════════════════════════════════════");
    console.log("🎉 BERHASIL posting ke Instagram!");
    console.log(`   Container ID : ${result.containerId}`);
    console.log(`   IG Post ID   : ${result.igPostId}`);
    console.log("═══════════════════════════════════════════\n");
  } catch (error: any) {
    console.error("\n═══════════════════════════════════════════");
    console.error("❌ GAGAL posting ke Instagram!");
    console.error(`   Error: ${error.message}`);
    console.error("═══════════════════════════════════════════\n");

    if (error.message.includes("URL is not reachable") || error.message.includes("download")) {
      console.log("💡 Hint: Pastikan file Google Drive sudah di-share sebagai:");
      console.log('   "Anyone with the link" → Viewer');
      console.log("   (Bukan hanya share ke Service Account)");
    }

    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
