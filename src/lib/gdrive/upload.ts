/**
 * Media Upload Utility (Supabase Storage)
 * =========================================
 * Upload file ke Supabase Storage bucket "media" dan dapatkan public URL.
 * Menggantikan Google Drive upload karena Service Account tidak punya
 * storage quota.
 *
 * File disimpan di bucket publik sehingga URL bisa langsung diakses
 * oleh Instagram API tanpa perlu autentikasi.
 */

import { getSupabaseAdmin } from "@/lib/supabase/client";

const BUCKET_NAME = "media";

/**
 * Upload file ke Supabase Storage.
 * @param fileBuffer - Buffer berisi konten file
 * @param fileName - Nama file asli
 * @param mimeType - MIME type file (e.g., "image/jpeg", "video/mp4")
 * @returns Public URL file yang bisa diakses langsung
 */
export async function uploadMedia(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  console.log(`⬆️  Uploading to Supabase Storage: ${fileName} (${mimeType})`);

  const db = getSupabaseAdmin();

  // Generate unique filename untuk menghindari konflik
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `uploads/${timestamp}_${safeName}`;

  // Upload ke Supabase Storage
  const { data, error } = await db.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload gagal: ${error.message}`);
  }

  console.log(`   ✅ Uploaded! Path: ${data.path}`);

  // Dapatkan public URL
  const { data: urlData } = db.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  const publicUrl = urlData.publicUrl;

  if (!publicUrl) {
    throw new Error("Gagal mendapatkan public URL");
  }

  console.log(`   🔗 Public URL: ${publicUrl}`);

  return publicUrl;
}

/**
 * Deteksi media_type Instagram dari MIME type file.
 * @param mimeType - MIME type file
 * @returns "IMAGE" atau "VIDEO"
 */
export function detectMediaType(mimeType: string): "IMAGE" | "VIDEO" {
  if (mimeType.startsWith("video/")) {
    return "VIDEO";
  }
  return "IMAGE";
}
