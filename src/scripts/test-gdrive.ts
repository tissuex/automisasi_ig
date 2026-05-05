/**
 * Test Script — Google Drive API
 * ================================
 * Verifikasi bahwa Service Account auth berhasil
 * dan bisa download file dari Google Drive.
 *
 * Usage:
 *   npx tsx src/scripts/test-gdrive.ts <FILE_ID>
 *
 * Cara dapat FILE_ID:
 *   Buka file di Google Drive → lihat URL:
 *   https://drive.google.com/file/d/<FILE_ID>/view
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

// ─── Validasi Env ─────────────────────────────────────────────

const clientEmail = process.env.GDRIVE_CLIENT_EMAIL;
const privateKey = process.env.GDRIVE_PRIVATE_KEY;

if (!clientEmail || !privateKey) {
  console.error("❌ Missing GDRIVE_CLIENT_EMAIL atau GDRIVE_PRIVATE_KEY di .env.local");
  process.exit(1);
}

// ─── Setup Auth ───────────────────────────────────────────────

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: clientEmail,
    private_key: privateKey.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({ version: "v3", auth });

// ─── Test Functions ───────────────────────────────────────────

/** Test 1: Cek apakah auth berhasil */
async function testAuth() {
  console.log("🔑 Test 1: Autentikasi Service Account...");
  console.log(`   Email: ${clientEmail}`);

  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    if (token) {
      console.log("   ✅ Auth berhasil! Access token diperoleh.\n");
      return true;
    }
  } catch (error: any) {
    console.error(`   ❌ Auth gagal: ${error.message}\n`);
    return false;
  }
}

/** Test 2: Ambil metadata file */
async function testGetMetadata(fileId: string) {
  console.log(`📋 Test 2: Ambil metadata file (${fileId})...`);

  try {
    const response = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, createdTime, modifiedTime",
    });

    const file = response.data;
    console.log(`   ✅ File ditemukan!`);
    console.log(`   📄 Nama     : ${file.name}`);
    console.log(`   🏷️  MIME Type: ${file.mimeType}`);
    console.log(`   📏 Ukuran   : ${formatBytes(Number(file.size || 0))}`);
    console.log(`   📅 Dibuat   : ${file.createdTime}`);
    console.log(`   🔄 Diubah   : ${file.modifiedTime}\n`);

    return file;
  } catch (error: any) {
    console.error(`   ❌ Gagal ambil metadata: ${error.message}`);
    if (error.code === 404) {
      console.error("   💡 Hint: Pastikan file sudah di-share ke Service Account email.");
    }
    console.log();
    return null;
  }
}

/** Test 3: Download file */
async function testDownload(fileId: string, fileName: string) {
  console.log(`⬇️  Test 3: Download file...`);

  try {
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);
    console.log(`   ✅ Download berhasil! Size: ${formatBytes(buffer.length)}`);

    // Simpan ke folder temp di project
    const outputDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, fileName);
    fs.writeFileSync(outputPath, buffer);
    console.log(`   💾 Disimpan ke: ${outputPath}\n`);

    return buffer;
  } catch (error: any) {
    console.error(`   ❌ Download gagal: ${error.message}\n`);
    return null;
  }
}

/** Test 4: List file di shared folder (opsional, tanpa fileId) */
async function testListFiles() {
  console.log("📂 Test 4: List file yang bisa diakses Service Account...");

  try {
    const response = await drive.files.list({
      pageSize: 10,
      fields: "files(id, name, mimeType, size)",
      orderBy: "modifiedTime desc",
    });

    const files = response.data.files;
    if (!files || files.length === 0) {
      console.log("   ⚠️  Tidak ada file yang bisa diakses.");
      console.log("   💡 Pastikan folder sudah di-share ke Service Account.\n");
      return;
    }

    console.log(`   ✅ Ditemukan ${files.length} file:\n`);
    files.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file.name}`);
      console.log(`      ID: ${file.id}`);
      console.log(`      Type: ${file.mimeType}`);
      console.log(`      Size: ${formatBytes(Number(file.size || 0))}`);
      console.log();
    });
  } catch (error: any) {
    console.error(`   ❌ Gagal list files: ${error.message}\n`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const fileId = process.argv[2];

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   🧪 Google Drive API — Test Script     ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // Test 1: Auth
  const authOk = await testAuth();
  if (!authOk) {
    console.error("🛑 Auth gagal. Cek GDRIVE_CLIENT_EMAIL & GDRIVE_PRIVATE_KEY.");
    process.exit(1);
  }

  if (fileId) {
    // Test 2: Metadata
    const metadata = await testGetMetadata(fileId);

    // Test 3: Download
    if (metadata) {
      await testDownload(fileId, metadata.name || "downloaded-file");
    }
  } else {
    console.log("ℹ️  Tidak ada FILE_ID diberikan. Skip test metadata & download.\n");
    console.log("   Usage: npx tsx src/scripts/test-gdrive.ts <FILE_ID>\n");
  }

  // Test 4: List files
  await testListFiles();

  console.log("═══════════════════════════════════════════");
  console.log("✅ Test selesai!");
}

main().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
